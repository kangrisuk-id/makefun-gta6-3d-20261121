// Deterministic screenshot scenes behind ?shot=title|onfoot|chase|mission&seed=1.
// Each scene is staged with the real game code — real traffic, real police, the real mission
// chain — and framed with a fixed camera, so a headless browser captures the game as it plays.
import { createCar, placeCar } from './vehicles-driving.js';
import { createPedestrian } from './pedestrians-crowd.js';
import { makeRandom } from './random.js';

export function stageScene(name, G, helpers) {
  const { rio, rig, camera } = { rio: helpers.rio, rig: helpers.rig, camera: G.camera };

  if (name === 'onfoot') {
    helpers.startGame(true);
    G.cash = 900;
    rio.group.position.set(14, 0, 56.5); // on the marina street itself, traffic all around
    rio.group.rotation.y = Math.PI / 2; // facing east, down the marina street
    rig.yaw = Math.PI / 2;
    rig.pitch = 0.3;
    rig.dist = 9;
    // a few locals on the sidewalks right here, so the street is alive in frame
    for (const at of [{ x: 19, z: 48 }, { x: 25, z: 71.5 }, { x: 4, z: 71 }]) {
      G.peds.push(createPedestrian(G.scene, makeRandom(at.x * 31 + 5), { at }));
    }
    return;
  }

  if (name === 'chase') {
    helpers.startGame(true);
    G.cash = 3900;
    G.health = 82;
    G.missions.index = 3; // LOSE THE HEAT
    G.missions.started = false;
    G.nextMissionAt = 0.3;
    placeCar(G.coupe, 6, 55.4, Math.PI / 2);
    helpers.enterCar(G.coupe);
    let staged = false;
    const stagedCops = [];
    G.shotTick = () => {
      const car = G.playerCar;
      if (!car) return;
      if (G.missions.started && G.wanted.stars < 4) G.wanted.addCrime(40); // up to four stars
      if (G.wanted.heat > 100) G.wanted.heat = 100; // hold it at four
      if (!staged && G.time > 0.6) {
        staged = true;
        for (const [dx, dz] of [[-9, -5.5], [-11, 2.5]]) {
          const cop = createCar(G.scene, 0x16161c, { police: true });
          placeCar(cop, car.group.position.x + dx, car.group.position.z + dz, Math.PI / 2);
          cop.speed = 21;
          G.policeCars.push(cop);
          G.allCars.push(cop);
          stagedCops.push({ cop, dx, dz });
        }
      }
      // the staged units hold formation on Rio's tail, so the frame always reads as a chase
      for (const s of stagedCops) {
        s.cop.group.position.set(car.group.position.x + s.dx, 0, car.group.position.z + s.dz);
        s.cop.angle = Math.PI / 2;
        s.cop.speed = car.speed;
      }
      car.speed = Math.max(car.speed, 19.5); // keep the run at speed
      car.angle = Math.PI / 2;
      car.group.position.z += (55.4 - car.group.position.z) * 0.06; // hold the lane
      const p = car.group.position;
      camera.position.set(p.x - 21, 7.5, p.z - 2);
      camera.lookAt(p.x + 20, 1, p.z);
    };
    return;
  }

  if (name === 'mission') {
    helpers.startGame(true);
    G.cash = 3250;
    G.health = 76;
    G.ammo = 9;
    G.missions.index = 4; // LAST RUN ON THE BAY
    G.missions.started = false;
    G.nextMissionAt = 0.3;
    rio.group.position.set(-196, 0, 149);
    rio.group.rotation.y = Math.PI; // facing the warehouse yard
    placeCar(G.coupe, -184, 152, 0.4);
    G.shotTick = () => {
      const p = rio.group.position;
      camera.position.set(p.x + 2.5, 4.4, p.z + 11.5);
      camera.lookAt(p.x - 2, 1.4, p.z - 16);
    };
    return;
  }

  // title (and anything else): street level on the marina street, looking east down the
  // palm-lined corridor to the pier, the beach and the sunset over the ocean.
  G.shotTick = () => {
    camera.position.set(168, 3.6, 64);
    camera.lookAt(322, 7, 48);
  };
}
