// Traffic that drives the avenue grid, the police who answer the wanted level, and the
// wanted system itself: crimes add heat, stars follow the heat, and heat cools when no
// officer has seen Rio for a while.
import { AVENUES_X, STREETS_Z } from './city-buildings.js';
import { createCar, placeCar, stepCarPhysics, steerToward, CAR_COLORS } from './vehicles-driving.js';
import { pick, range } from './random.js';

export class WantedSystem {
  constructor() {
    this.heat = 0;
    this.unseenFor = 99;
    this.floor = 0; // a mission can hold the heat at a minimum level
  }
  get stars() {
    return Math.max(this.floor, Math.min(5, Math.ceil(this.heat / 25)));
  }
  addCrime(points) {
    this.heat = Math.min(130, this.heat + points);
    this.unseenFor = 0;
  }
  setFloor(stars) {
    this.floor = stars;
    if (this.stars < stars) this.heat = Math.max(this.heat, stars * 25 - 24);
  }
  clearFloor() { this.floor = 0; }
  /** `seen` = a police unit is close enough to watch the player this frame. */
  update(dt, seen, coolRate = 3.2) {
    if (seen) this.unseenFor = 0;
    else {
      this.unseenFor += dt;
      if (this.unseenFor > 6) this.heat = Math.max(this.floor * 25 - 24 > 0 ? (this.floor ? this.floor * 25 - 24 : 0) : 0, this.heat - coolRate * dt);
      if (this.floor === 0 && this.unseenFor > 6) this.heat = Math.max(0, this.heat - coolRate * dt);
    }
  }
  clear() { this.heat = 0; this.floor = 0; this.unseenFor = 99; }
}

function intersections() {
  const pts = [];
  for (const x of AVENUES_X) for (const z of STREETS_Z) pts.push({ x, z });
  return pts;
}
const INTERSECTIONS = intersections();

function nextWaypoint(random, car) {
  const p = car.group.position;
  let best = null, bd = 1e9;
  for (const pt of INTERSECTIONS) {
    const d = Math.hypot(pt.x - p.x, pt.z - p.z);
    if (d < bd) { bd = d; best = pt; }
  }
  // From the nearest intersection, drive to a neighbouring one (or straight on).
  const options = INTERSECTIONS.filter((pt) =>
    (Math.abs(pt.x - best.x) < 1 && Math.abs(pt.z - best.z) > 30) ||
    (Math.abs(pt.z - best.z) < 1 && Math.abs(pt.x - best.x) > 30));
  const dest = pick(random, options.length ? options : INTERSECTIONS);
  const lane = 4.6;
  return { x: dest.x + (Math.abs(dest.x - best.x) < 1 ? (dest.z > best.z ? -lane : lane) : 0),
           z: dest.z + (Math.abs(dest.z - best.z) < 1 ? (dest.x > best.x ? lane : -lane) : 0),
           ix: dest.x, iz: dest.z };
}

/** Spawn the ambient traffic fleet on the grid. */
export function spawnTraffic(scene, random, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const car = createCar(scene, pick(random, CAR_COLORS));
    const start = pick(random, INTERSECTIONS);
    placeCar(car, start.x + range(random, -4, 4), start.z + range(random, -30, 30), pick(random, [0, Math.PI / 2, Math.PI, -Math.PI / 2]));
    car.traffic = { waypoint: nextWaypoint(random, car), cruise: range(random, 10, 15) };
    cars.push(car);
  }
  return cars;
}

/** One step of traffic: follow waypoints, slow for the car ahead, turn at intersections. */
export function stepTraffic(cars, dt, random, colliders, allCars) {
  for (const car of cars) {
    if (car.dead || car.parked) continue;
    const t = car.traffic;
    if (!t) continue;
    const p = car.group.position;
    if (Math.hypot(p.x - t.waypoint.ix, p.z - t.waypoint.iz) < 9) t.waypoint = nextWaypoint(random, car);
    let throttle = 0.75;
    const fwd = { x: Math.sin(car.angle), z: Math.cos(car.angle) };
    for (const other of allCars) {
      if (other === car || other.dead) continue;
      const dx = other.group.position.x - p.x, dz = other.group.position.z - p.z;
      const ahead = dx * fwd.x + dz * fwd.z;
      const side = Math.abs(dx * fwd.z - dz * fwd.x);
      if (ahead > 0 && ahead < 10 && side < 2.6) { throttle = ahead < 5 ? -0.2 : 0.15; break; }
    }
    if (car.speed > t.cruise) throttle = 0;
    const { steer, gap } = steerToward(car, t.waypoint.x, t.waypoint.z);
    if (Math.abs(gap) > 2.4) throttle = -0.4; // badly turned around: back up
    stepCarPhysics(car, dt, { throttle, steer, brake: false }, colliders, 17);
  }
}

/** Keep the police fleet at the strength the wanted level calls for, and drive the chase. */
export function stepPolice(police, dt, scene, target, wanted, colliders, allCars, random) {
  const want = wanted.stars === 0 ? 0 : Math.min(5, wanted.stars + 1);
  while (police.length < want) {
    const car = createCar(scene, 0x16161c, { police: true });
    const a = range(random, 0, Math.PI * 2);
    placeCar(car, target.x + Math.sin(a) * 75, target.z + Math.cos(a) * 75, a + Math.PI);
    police.push(car);
    allCars.push(car);
  }
  let nearest = 999;
  for (let i = police.length - 1; i >= 0; i--) {
    const car = police[i];
    if (car.dead) continue;
    const p = car.group.position;
    const d = Math.hypot(p.x - target.x, p.z - target.z);
    nearest = Math.min(nearest, d);
    if (wanted.stars === 0 && d > 40) { // heat is gone: peel off and despawn far away
      if (d > 130) { scene.remove(car.group); police.splice(i, 1); continue; }
    }
    if (d > 190) { // too far behind: respawn on a road near the action
      const a = range(random, 0, Math.PI * 2);
      placeCar(car, target.x + Math.sin(a) * 80, target.z + Math.cos(a) * 80, a + Math.PI);
      continue;
    }
    const { steer } = steerToward(car, target.x, target.z);
    stepCarPhysics(car, dt, { throttle: d > 6 ? 1 : 0.2, steer, brake: false }, colliders, 38);
  }
  return nearest;
}
