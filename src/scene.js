import * as THREE from '../vendor/three.module.js';
import { getWeather } from './game.js';

// Every object in the city is built here. Shared geometry and instancing keep the
// thousands of little windows, roof plants and pieces of rubble inexpensive.
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function randomFor(seed) {
  let n = (Number(seed) || 1) >>> 0;
  return () => { n += 0x6d2b79f5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function createScene(container, initialState) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // The city is stationary. Camera movement does not invalidate its sun shadows.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.className = 'world-canvas';
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;image-rendering:pixelated;touch-action:none;';
  renderer.domElement.setAttribute('aria-label', '폐허가 된 도시와 옥상 생존 캠프. 드래그해서 둘러보고 마우스 휠로 확대할 수 있습니다.');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x72928d, 0.0042);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.2, 850);
  const hemi = new THREE.HemisphereLight(0xc8e0d7, 0x405146, 2.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffdfad, 3.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -31; sun.shadow.camera.right = 31;
  sun.shadow.camera.top = 31; sun.shadow.camera.bottom = -31;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 150;
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.12;
  scene.add(sun, sun.target);
  const fireLight = new THREE.PointLight(0xff9d39, 50, 18, 1.8);
  fireLight.castShadow = false;
  scene.add(fireLight);
  // Only three local lights affect the scene; the other lanterns use cheap glow pools.
  const porchLight = new THREE.PointLight(0xffcb7b, 24, 12, 1.8);
  const workLight = new THREE.PointLight(0xffd69a, 20, 11, 1.8);
  scene.add(porchLight, workLight);

  const skyGeometry = new THREE.SphereGeometry(700, 24, 12);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x426f7b) }, bottom: { value: new THREE.Color(0xd4d6ad) } },
    vertexShader: 'varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vPosition; void main(){float h=clamp(normalize(vPosition).y*1.6,0.0,1.0);gl_FragColor=vec4(mix(bottom,top,pow(h,.72)),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    fog: false
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);

  let quality = 'high', view = 'camp', width = 1, height = 1;
  let world, signature, roofY = 36, roofWidth = 23, roofDepth = 19;
  let fireFlames = [], smoke, rain, dog, ally, survivor, walkingSurvivor, cloudMaterial, flagGroups = {}, resourceStacks = {};
  let roofCamps = [], residentActors = [], laundry = [], glowPools = [], windRotors = [];
  let animatedActors = [], actorBatches = [], conditionalBatches = [];
  let lanternMaterial, floorMaterial, wetMaterial, focusId = 'home', activePlayer = true;
  let elapsed = 0, yaw = 0, pitch = 0, zoom = 1, pointer = null, disposed = false;
  let renderElapsed = 0, nextShadowUpdate = 0, visualSignature = '', projectionDirty = true;
  let measuredFrames = 0, metricWindow = 0, renderFps = 0;
  const cameraTarget = new THREE.Vector3(), cameraDesired = new THREE.Vector3();
  const hiddenActorMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  let rainPositions, rainBase, smokePositions;
  let lastState = initialState;
  const tmpColor = new THREE.Color();
  const daySky = new THREE.Color(0x63939d), nightSky = new THREE.Color(0x14283d);
  const dayHorizon = new THREE.Color(0xd2d7b8), nightHorizon = new THREE.Color(0x526981);
  const dayFog = new THREE.Color(0x93aaa1), nightFog = new THREE.Color(0x253f52);
  const sunColor = new THREE.Color(0xffdfad), duskColor = new THREE.Color(0xf7a171);

  const visibleBuildings = state => (state.buildings || []).filter(building => building.id !== 'home').slice(0, 5);
  const worldKey = state => `${state.seed}:${state.roof?.type}:${state.roof?.height}:${visibleBuildings(state).map(building => `${building.id}/${building.height}`).join(',')}`;

  function disposeWorld() {
    if (!world) return;
    const geometries = new Set(), materials = new Set();
    world.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    scene.remove(world);
  }

  function buildWorld(state) {
    disposeWorld();
    world = new THREE.Group(); scene.add(world);
    fireFlames = []; flagGroups = {}; resourceStacks = {};
    roofCamps = []; residentActors = []; laundry = []; glowPools = []; windRotors = [];
    animatedActors = []; actorBatches = []; conditionalBatches = [];
    signature = worldKey(state);
    const rand = randomFor(state.seed);
    const range = (a, b) => a + rand() * (b - a);
    const pick = a => a[Math.floor(rand() * a.length)];
    roofY = clamp(Number(state.roof?.height) || 12, 5, 25) * 3.3;
    const type = state.roof?.type || 'garden';
    roofWidth = type === 'wide' ? 26 : type === 'utility' ? 23 : 22;
    roofDepth = type === 'wide' ? 17.5 : type === 'utility' ? 19 : 21;
    const halfW = roofWidth / 2, halfD = roofDepth / 2;
    const geometries = {
      box: new THREE.BoxGeometry(1, 1, 1),
      window: new THREE.PlaneGeometry(1, 1),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
      cone: new THREE.ConeGeometry(1, 1, 5),
      rock: new THREE.IcosahedronGeometry(1, 0),
      leaf: new THREE.IcosahedronGeometry(1, 0),
      disc: new THREE.CircleGeometry(1, 16)
    };
    const mats = {};
    const material = (name, color, options = {}) => {
      // Diffuse lighting fits the low-resolution art and avoids PBR per-pixel cost.
      const { roughness, metalness, ...surface } = options;
      if (!mats[name]) mats[name] = new THREE.MeshLambertMaterial({ color, flatShading: true, ...surface });
      return mats[name];
    };
    const m = {
      wall: material('wall', 0x7b8275), roof: material('roof', 0x777e6d), roofEdge: material('roofEdge', 0x999d83),
      stained: material('stained', 0x505d52), concreteDark: material('concreteDark', 0x596b67),
      concretePale: material('concretePale', 0x89998e), brick: material('brick', 0x716c5a),
      glass: material('glass', 0x263d40, { roughness: .4, metalness: .12 }), glassBlue: material('glassBlue', 0x536e6b, { roughness: .5 }),
      glassBroken: material('glassBroken', 0x192c30), windowFrame: material('windowFrame', 0x778b7f),
      metal: material('metal', 0x5b6a5d, { metalness: .28 }), darkMetal: material('darkMetal', 0x2b3b35, { metalness: .25 }),
      rust: material('rust', 0x76513b), wood: material('wood', 0x726447), woodLight: material('woodLight', 0x9a865b), woodDark: material('woodDark', 0x423e2c),
      moss: material('moss', 0x626f3c), grass: material('grass', 0x687b40), grassLight: material('grassLight', 0x91964b),
      leaves: material('leaves', 0x3a6246), leavesLight: material('leavesLight', 0x4d7046), leavesDark: material('leavesDark', 0x294a3c),
      soil: material('soil', 0x484d35), tent: material('tent', 0x68724a), tentLight: material('tentLight', 0x929067),
      fabric: material('fabric', 0x384a3f), canvas: material('canvas', 0xc0b790), orange: material('orange', 0xb76534),
      red: material('red', 0x7d4031), black: material('black', 0x192820), cream: material('cream', 0xc8b895),
      skin: material('skin', 0xb99469), hair: material('hair', 0x342f27), pants: material('pants', 0x354d53),
      blue: material('blue', 0x557879), road: material('road', 0x485953), marking: material('marking', 0x929a79)
    };
    floorMaterial = m.roof;
    lanternMaterial = material('lantern', 0xffdfa4, { emissive: 0xffb961, emissiveIntensity: .45 });
    wetMaterial = new THREE.MeshBasicMaterial({ color: 0x6f9696, transparent: true, opacity: .12, depthWrite: false });
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xffbd67, transparent: true, opacity: .18, depthWrite: false });
    const slots = [[-28,-23], [25,-27], [-50,-38], [48,-44], [-6,-54]];
    const neighboringBuildings = visibleBuildings(state).map((building, i) => ({ ...building, x: slots[i][0], z: slots[i][1], y: clamp(Number(building.height) || 9, 4, 25) * 3.3 }));
    if (!neighboringBuildings.length) neighboringBuildings.push({ id: 'legacy-neighbor', x: -25, z: -23, y: Math.max(13, roofY - 4), height: 10 });
    const batches = new Map();
    const temp = new THREE.Object3D();
    function batch(geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
      const local = Math.abs(x) < halfW + 4 && Math.abs(z) < halfD + 4 && y > roofY - 1;
      const key = `${geo}:${mat.uuid}:${local ? 'camp' : 'city'}`;
      if (!batches.has(key)) batches.set(key, { geo: geometries[geo], mat, castsShadow: local && geo !== 'window', transforms: [] });
      temp.position.set(x, y, z); temp.scale.set(sx, sy, sz); temp.rotation.set(rx, ry, rz); temp.updateMatrix();
      batches.get(key).transforms.push(temp.matrix.clone());
    }
    const box = (mat, x, y, z, sx, sy, sz, ry = 0) => batch('box', mat, x, y, z, sx, sy, sz, 0, ry);
    function mesh(geo, mat, parent, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
      const obj = new THREE.Mesh(geometries[geo] || geo, mat);
      obj.position.set(x, y, z); obj.scale.set(sx, sy, sz); obj.rotation.set(rx, ry, rz);
      obj.castShadow = true; obj.receiveShadow = true; parent.add(obj); return obj;
    }
    function rod(parent, start, end, radius, mat) {
      const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), d = b.clone().sub(a);
      const obj = mesh('cylinder', mat, parent, 0, 0, 0, radius, d.length(), radius);
      obj.position.copy(a.add(b).multiplyScalar(.5)); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return obj;
    }
    function batchRod(start, end, radius, mat) {
      const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), direction = b.clone().sub(a);
      const length = direction.length();
      temp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      batch('cylinder', mat, (a.x+b.x)/2, (a.y+b.y)/2, (a.z+b.z)/2, radius, length, radius, temp.rotation.x, temp.rotation.y, temp.rotation.z);
    }
    // Facility pieces and whole neighboring camps share geometry/material batches.
    // Their parent group can still be hidden as a single upgrade is unlocked.
    function compact(group, visibleOnly = false) {
      const combined = new Map(), remove = [];
      group.updateMatrixWorld(true);
      const inverse = group.matrixWorld.clone().invert();
      group.traverse(object => {
        if (!object.isMesh || object.isInstancedMesh || visibleOnly&&!object.visible) return;
        let ancestor=object;
        while(ancestor!==group) { if(ancestor.userData.animated)return;ancestor=ancestor.parent; }
        const key = `${object.geometry.uuid}:${object.material.uuid}`;
        if (!combined.has(key)) combined.set(key, { geometry: object.geometry, material: object.material, matrices: [], shadows: object.castShadow });
        combined.get(key).matrices.push(inverse.clone().multiply(object.matrixWorld));
        remove.push(object);
      });
      for (const object of remove) object.parent.remove(object);
      for (const data of combined.values()) {
        const instances = new THREE.InstancedMesh(data.geometry, data.material, data.matrices.length);
        data.matrices.forEach((matrix, i) => instances.setMatrixAt(i, matrix));
        instances.instanceMatrix.needsUpdate = true;
        instances.castShadow = data.shadows;
        instances.receiveShadow = true;
        instances.computeBoundingSphere();
        group.add(instances);
      }
    }
    function lantern(parent, x, y, z, size = 1, pool = true) {
      mesh('box', m.darkMetal, parent, x, y+.22*size, z, .32*size, .08*size, .32*size);
      mesh('box', lanternMaterial, parent, x, y, z, .21*size, .36*size, .21*size);
      mesh('box', m.darkMetal, parent, x, y-.22*size, z, .29*size, .08*size, .29*size);
      if (pool) {
        const glow = mesh('disc', glowMaterial, parent, x, .035, z, 1.6*size, 1.6*size, 1, -Math.PI/2);
        glow.castShadow = false; glow.receiveShadow = false;
        glowPools.push(glow);
      }
    }
    function triangle(parent, positions, mat) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.computeVertexNormals();
      const obj = new THREE.Mesh(g, mat); obj.castShadow = true; obj.receiveShadow = true; parent.add(obj); return obj;
    }
    function tree(x, y, z, size = 1, rooftop = false) {
      batch('cylinder', m.woodDark, x, y + size * 1.1, z, size * .17, size * 2.2, size * .17);
      for (let t = 0; t < (rooftop ? 3 : 4); t++) {
        batch('leaf', t % 2 ? m.leaves : m.leavesLight, x + range(-.65, .65) * size, y + size * range(2, 3.1), z + range(-.5, .5) * size,
          range(.7, 1.05) * size, range(.9, 1.4) * size, range(.7, 1.05) * size, 0, range(0, TAU));
      }
    }
    function building(x, z, w, d, h, architecture, isMain = false) {
      const distance = Math.hypot(x, z);
      const detailed = isMain || distance < 70;
      const floorStep = distance > 175 ? 3 : distance > 105 ? 2 : 1;
      const facade = isMain ? m.wall : pick([m.wall, m.concreteDark, m.concretePale, m.brick]);
      box(facade, x, h * .5, z, w, h, d);
      box(m.roofEdge, x, h + .15, z, w + .3, .3, d + .3);
      const floors = Math.floor(h / 3.05), columnsX = Math.max(2, Math.floor(w / 2.3)), columnsZ = Math.max(2, Math.floor(d / 2.4));
      for (let f = 0; f < floors; f += floorStep) {
        const y = 1.7 + f * 3.05;
        for (let c = 0; c < columnsX; c++) {
          if (rand() < .065) continue;
          const wx = x - w / 2 + (c + .5) * w / columnsX;
          const glass = rand() < .36 ? m.glassBroken : rand() < .65 ? m.glass : m.glassBlue;
          batch('window', glass, wx, y, z + d * .5 + .045, w / columnsX * .64, 1.63 * (floorStep > 1 ? 1.3 : 1), 1);
          if (detailed && (isMain || architecture === 1)) {
            box(m.windowFrame, wx, y - .85, z + d * .5 + .16, w / columnsX * .76, .12, .43);
            box(m.windowFrame, wx, y, z + d * .5 + .09, .065, 1.64, .10);
          }
          if (detailed && architecture === 2 && f % 2 === 0) box(m.concretePale, wx, y - .85, z + d * .5 + .38, w / columnsX * .91, .38, .8);
          if (rand() < .022 && detailed) box(m.metal, wx + .38, y - .8, z + d * .5 + .28, .64, .4, .5);
        }
        for (let c = 0; c < columnsZ; c++) {
          if (rand() < .1) continue;
          const wz = z - d / 2 + (c + .5) * d / columnsZ;
          for (const side of [-1, 1]) {
            batch('window', rand() < .4 ? m.glassBroken : m.glassBlue, x + side * (w * .5 + .045), y, wz, d / columnsZ * .65, 1.55 * (floorStep > 1 ? 1.3 : 1), 1, 0, side * Math.PI / 2);
            if (detailed && (isMain || architecture === 2)) box(m.windowFrame, x + side * (w * .5 + .12), y - .82, wz, .3, .1, d / columnsZ * .75);
          }
        }
        if (detailed && architecture === 1 && f % 3 === 0) box(m.concretePale, x, y + 1.15, z + d * .5 + .075, w, .16, .13);
      }
      if (!isMain) {
        const rooftopRoomW = w * range(.23, .46), rooftopRoomD = d * range(.22, .42);
        box(facade, x - w * .18, h + 1.35, z - d * .2, rooftopRoomW, 2.4, rooftopRoomD);
        box(m.roofEdge, x - w * .18, h + 2.65, z - d * .2, rooftopRoomW + .35, .2, rooftopRoomD + .3);
        if (rand() < .55) batch('cylinder', m.metal, x + w * .26, h + 1.15, z - d * .22, 1.05, 2, 1.05);
        if (rand() < .32) {
          box(m.darkMetal, x - w * .2, h + 4.2, z - d * .2, .10, 4, .10);
          box(m.metal, x - w * .2, h + 5.2, z - d * .2, 2.5, .08, .08);
        }
        for (let j = 0; j < Math.floor(w / 3); j++) {
          const tx = x + range(-w * .4, w * .4), tz = z + range(-d * .4, d * .4);
          box(m.moss, tx, h + .33, tz, range(1.2, 4), .08, range(1.2, 3.5));
          if (rand() < .23) tree(tx, h + .35, tz, range(.6, 1.4), true);
        }
        if (rand() < .52) {
          const ivyX = x + range(-w * .35, w * .35), length = range(3, Math.min(h, 13));
          for (let i = 0; i < length * 1.5; i++) batch('rock', pick([m.leaves, m.leavesDark]), ivyX + Math.sin(i) * .4, h - i * .65, z + d * .5 + .15, range(.45, .8), .6, .35);
        }
      }
    }

    // A city with streets, different generations of housing and dense rooftop growth.
    box(m.soil, 0, -.55, -60, 700, 1, 700);
    for (let gx = -7; gx <= 7; gx++) {
      box(m.road, gx * 28, -.02, -65, 6.5, .08, 560);
      for (let gz = -9; gz <= 3; gz++) {
        if (gx === -7) box(m.road, 0, .015, gz * 27, 460, .09, 6);
        const x = gx * 28 + range(-3, 3), z = gz * 27 + range(-3, 3);
        if (Math.abs(x) < 34 && Math.abs(z) < 33) continue;
        if (neighboringBuildings.some(building => Math.abs(x-building.x)<19 && Math.abs(z-building.z)<18)) continue;
        const near = Math.hypot(x, z) < 100;
        const rawHeight = range(14, 56) * (rand() < .15 ? 1.7 : 1);
        const h = near ? Math.min(rawHeight, roofY + range(-11, 5)) : rawHeight;
        const w = range(9, 19), d = range(10, 18);
        building(x, z, w, d, h, Math.floor(rand() * 3));
        if (near || rand() < .6) tree(x + w * .65, .08, z + d * .28, range(2, 4));
        if (rand() < .7) box(m.marking, x + 12, .075, z, .16, .015, 5);
        if (near && rand() < .3) {
          const cx = x + 11.5, cz = z + 4;
          box(pick([m.rust, m.concretePale, m.blue]), cx, .8, cz, 1.6, .85, 3.2);
          box(m.glass, cx, 1.35, cz + .1, 1.35, .55, 1.8);
        }
      }
    }

    // Uneven green ridgelines beyond the apartments, and a Seoul-inspired tower.
    for (let i = 0; i < 32; i++) {
      batch('leaf', i % 2 ? m.leavesDark : m.concreteDark, -360 + i * 25, range(-5, 4), -285 - range(0, 55), range(32, 62), range(37, 66), range(24, 45));
    }
    cloudMaterial = material('cloud', 0xc7d1c1, { transparent: true, opacity: .36, depthWrite: false });
    for (let i = 0; i < 18; i++) {
      const cx = range(-280, 220), cz = range(-360, -170), cy = range(104, 138);
      for (let j = 0; j < 3; j++) batch('leaf', cloudMaterial, cx + j * 12, cy + range(-2, 2), cz + range(-5, 5), range(14, 22), range(2.2, 4), range(6, 13));
    }
    const towerX = -89, towerZ = -245, towerBase = 49;
    batch('cylinder', m.concretePale, towerX, towerBase + 22, towerZ, 1.1, 44, 1.1);
    batch('cylinder', m.concreteDark, towerX, towerBase + 41, towerZ, 4.1, 6, 4.1);
    batch('cylinder', m.glass, towerX, towerBase + 43.6, towerZ, 3.9, 2.2, 3.9);
    batch('cone', m.concretePale, towerX, towerBase + 48, towerZ, 2.9, 4, 2.9);
    batch('cylinder', m.darkMetal, towerX, towerBase + 57, towerZ, .24, 18, .24);

    building(0, 0, roofWidth, roofDepth, roofY - .55, 1, true);
    // Exploration targets have a consistent place in the skyline before occupation.
    for (const neighbor of neighboringBuildings) building(neighbor.x, neighbor.z, 13, 12, neighbor.y-.3, 1, true);
    box(m.roof, 0, roofY - .25, 0, roofWidth + .6, .5, roofDepth + .6);
    // A stepped utility deck and an L-shaped annex make seeds feel like places.
    if (type === 'split') {
      box(m.wall, -halfW + 4.4, roofY + .75, -halfD + 3, 8.8, 1.5, 6);
      box(m.roofEdge, -halfW + 4.4, roofY + 1.54, -halfD + 3, 9, .18, 6.1);
      for (let i = 0; i < 5; i++) box(m.roofEdge, -3.6, roofY + .14 + i * .15, -3.7 - i * .42, 2.2, .28 + i * .3, .44);
    }
    if (type === 'garden') {
      box(m.wall, -halfW - 1.9, (roofY - 1) * .5, -4.7, 4, roofY - 1, 8.8);
      box(m.roofEdge, -halfW - 1.9, roofY -.25, -4.7, 4.2, .5, 9);
      box(m.roofEdge, -halfW - 4, roofY + .45, -4.7, .22, .9, 9);
    }
    box(m.roofEdge, -halfW -.15, roofY + .42, 0, .28, .84, roofDepth + .65);
    box(m.roofEdge, halfW + .15, roofY + .42, 0, .28, .84, roofDepth + .65);
    box(m.roofEdge, 0, roofY + .5, -halfD -.15, roofWidth + .5, 1, .28);
    box(m.roofEdge, 0, roofY + .17, halfD + .15, roofWidth + .5, .34, .28);
    for (let i = 0; i < 42; i++) {
      const x = range(-halfW + .3, halfW - .3), z = range(-halfD + .3, halfD - .3);
      box(rand() < .65 ? m.stained : m.roofEdge, x, roofY + .015, z, range(.1, 1.8), .025, range(.2, 1));
    }
    // Long seams, a few puddles, and cracks break the flat slab into real concrete.
    for (let x = -halfW + 3; x < halfW; x += 4) box(m.stained, x, roofY + .02, 0, .035, .025, roofDepth);
    for (let z = -halfD + 3; z < halfD; z += 4) box(m.stained, 0, roofY + .023, z, roofWidth, .025, .035);
    for (let i = 0; i < 24; i++) box(m.stained, range(-halfW, halfW), roofY + .035, range(-halfD, halfD), range(.25, 1.3), .025, .035, range(-2, 2));
    for (let i = 0; i < 170; i++) {
      const edge = rand() < .65;
      const x = edge ? (rand() < .5 ? -1 : 1) * range(halfW - 2.5, halfW -.25) : range(-halfW + .3, halfW -.3);
      const z = edge ? range(-halfD + .3, halfD -.4) : (rand() < .5 ? -1 : 1) * range(halfD - 2.3, halfD -.3);
      box(m.moss, x, roofY + .04, z, range(.25, 1.3), .035, range(.25, 1.2));
      for (let j = 0; j < 3; j++) batch('cone', j % 2 ? m.grass : m.grassLight, x + range(-.3, .3), roofY + range(.12, .3), z + range(-.3, .3), range(.045, .1), range(.24, .6), .045, range(-.2, .2), range(0, TAU));
    }
    for (let i = 0; i < 65; i++) {
      const z = range(-halfD, halfD), side = rand() < .65 ? -1 : 1;
      batch('rock', pick([m.leavesDark, m.leaves]), side * (halfW + .2), roofY - range(.3, 8.5), z, .28, range(.3, .8), range(.3, .8));
    }
    tree(-halfW + 1.4, roofY, -halfD + 1.5, 1.25, true);
    tree(halfW - 1.2, roofY, -halfD + 1.3, .8, true);

    const camp = new THREE.Group(); camp.position.y = roofY; world.add(camp);
    const homeCamp = { id: 'home', group: camp, x: 0, y: roofY, z: 0, levels: {}, residentPositions: [[5.6,-5.0], [halfW-4.75,halfD-3], [-halfW+3,-halfD+4.9]] };
    roofCamps.push(homeCamp);
    // A repaired footpath, rug, drainage channel and washed-out paint give the slab a history.
    for(let i=0;i<10;i++) box(i%3?m.concretePale:m.roofEdge,-1.15,roofY+.055,-5.4+i*.62,1.48,.07,.56);
    for(let i=0;i<8;i++) box(m.cream,halfW-4.8,roofY+.06,-4.9+i*.85,.1,.025,.45);
    box(m.darkMetal,halfW-1.0,roofY+.028,0,.32,.035,roofDepth-3);
    for(let i=0;i<12;i++) box(m.metal,halfW-1.0,roofY+.05,-halfD+2+i*(roofDepth-4)/12,.38,.025,.06);
    box(m.red,-4.3,roofY+.19,3.7,3.1,.055,1.23,-.12);
    for(let i=0;i<7;i++) box(m.canvas,-5.5+i*.38,roofY+.225,3.7,.065,.025,1.21,-.12);
    box(m.canvas,-4.3,roofY+.224,3.16,3.1,.025,.08,-.12);
    box(m.canvas,-4.3,roofY+.224,4.24,3.1,.025,.08,-.12);
    for(const [x,z,sx,sz] of [[-7.6,-4.1,1.2,.48],[halfW-2.3,2.4,.48,1.2],[1.9,-8.4,1.6,.38]]) {
      const puddle=mesh('disc',wetMaterial,camp,x,.043,z,sx,sz,1,-Math.PI/2);puddle.castShadow=false;puddle.receiveShadow=false;
    }
    // Wooden boards under the shelter and fire.
    for (let i = 0; i < 18; i++) box(i % 3 ? m.wood : m.woodLight, -.7, roofY + .09, -1.25 + i * .39, 11.8, .14, .36);
    // Stairs access shed behind the tent, with a slightly open heavy steel door.
    const shedHeight = type === 'utility' ? 3.5 : 2.9;
    box(m.wall, -halfW + 3, roofY + shedHeight / 2, -halfD + 2.3, 4.7, shedHeight, 3.8);
    box(m.roofEdge, -halfW + 3, roofY + shedHeight + .1, -halfD + 2.3, 5.1, .2, 4.1);
    box(m.darkMetal, -halfW + 3.4, roofY + 1.15, -halfD + 4.23, 1.3, 2.3, .05);
    box(m.metal, -halfW + 3.9, roofY + 1.15, -halfD + 4.38, 1.1, 2.3, .08, -.3);
    box(m.orange, -halfW + 3.95, roofY + 2.6, -halfD + 4.32, 1.15, .19, .05);
    // A porch lamp, desk lantern and festoon lights form several small islands of warmth.
    lantern(camp,-halfW+4.0,2.45,-halfD+4.7,.9);
    porchLight.position.set(-halfW+4.0,roofY+2.3,-halfD+4.9);
    const lightStart=[-5.4,roofY+4.05,-3.2],lightEnd=[7.8,roofY+4.45,-3.8];
    for(const point of [lightStart,lightEnd]) box(m.woodDark,point[0],roofY+2.12,point[2],.1,4.25,.1);
    for(let i=0;i<9;i++) {
      const t=i/8,next=(i+1)/8;
      const x=lightStart[0]+(lightEnd[0]-lightStart[0])*t;
      const y=lightStart[1]+(lightEnd[1]-lightStart[1])*t-Math.sin(t*Math.PI)*.65;
      const z=lightStart[2]+(lightEnd[2]-lightStart[2])*t;
      batch('rock',lanternMaterial,x,y-.17,z,.11,.16,.11);
      box(m.darkMetal,x,y-.04,z,.07,.14,.07);
      if(i<8) batchRod([x,y,z],[lightStart[0]+(lightEnd[0]-lightStart[0])*next,lightStart[1]+(lightEnd[1]-lightStart[1])*next-Math.sin(next*Math.PI)*.65,lightStart[2]+(lightEnd[2]-lightStart[2])*next],.015,m.black);
    }
    // Olive A-frame canvas tent, open on its front side.
    const tent = new THREE.Group(); tent.position.set(-4.5, .17, .55); tent.rotation.y = -.12; camp.add(tent);
    const tentMat = m.tent.clone(); tentMat.side = THREE.DoubleSide;
    const tentLight = m.tentLight.clone(); tentLight.side = THREE.DoubleSide;
    const tentDark = m.black.clone(); tentDark.side = THREE.DoubleSide;
    const tri = (a, b, c, mat) => triangle(tent, [...a, ...b, ...c], mat);
    tri([-2.7,0,-2.3], [0,3.2,-2.3], [0,3.2,2.3], tentMat); tri([-2.7,0,-2.3], [0,3.2,2.3], [-2.7,0,2.3], tentMat);
    tri([0,3.2,-2.3], [2.7,0,-2.3], [2.7,0,2.3], tentLight); tri([0,3.2,-2.3], [2.7,0,2.3], [0,3.2,2.3], tentLight);
    tri([-2.7,0,-2.3], [2.7,0,-2.3], [0,3.2,-2.3], tentMat);
    tri([-2.5,.03,2.23], [0,3.0,2.23], [2.5,.03,2.23], tentDark);
    tri([-2.7,0,2.33], [0,3.2,2.33], [-1.15,.08,2.61], tentMat);
    tri([0,3.2,2.33], [2.7,0,2.33], [1.65,.08,2.6], tentLight);
    mesh('box', m.fabric, tent, 0, .1, 1.55, 3.4, .1, 1.8);
    mesh('box', m.orange, tent, -.65, .22, 1.6, .95, .23, 1.6);
    mesh('box', m.cream, tent, -.65, .32, 1.01, .83, .18, .35);
    rod(tent, [0,0,2.45], [0,3.23,2.45], .037, m.woodLight);
    rod(tent, [0,3.22,-2.3], [0,3.22,2.5], .037, m.woodLight);
    for (const side of [-1, 1]) for (const front of [-1, 1]) {
      rod(tent, [side * 2.1,.72,front*2.3], [side*3.2,.05,front*2.95], .014, m.canvas);
      mesh('box', m.darkMetal, tent, side*3.2,.07,front*2.95,.08,.22,.08);
    }

    // Fire is animated separately; everything around it is batched.
    const fireX = 1.7, fireZ = 3.05;
    batch('cylinder', m.black, fireX, roofY + .18, fireZ, 1.05, .18, 1.05);
    for (let i = 0; i < 11; i++) {
      const angle = i / 11 * TAU;
      batch('rock', i % 3 ? m.stained : m.roofEdge, fireX + Math.cos(angle), roofY + .3, fireZ + Math.sin(angle), .26, .21, .24, range(0, 1), angle);
    }
    for (let i = 0; i < 5; i++) batch('cylinder', i % 2 ? m.woodDark : m.wood, fireX + range(-.3,.3), roofY + .28, fireZ + range(-.3,.3), .13, 1.28, .13, Math.PI / 2, i * 1.2, .13);
    const flameMat = material('flame', 0xffa336, { emissive: 0xff721d, emissiveIntensity: 2.1, transparent: true, opacity: .87 });
    const coreMat = material('flameCore', 0xffeda3, { emissive: 0xffbc48, emissiveIntensity: 2.9 });
    for (let i = 0; i < 7; i++) {
      const f = mesh('cone', i < 2 ? coreMat : flameMat, camp, fireX + range(-.35,.35), .65, fireZ + range(-.32,.32), range(.16,.27), range(.6,1.1), range(.15,.25));
      f.userData.base = f.scale.clone(); f.userData.phase = range(0,TAU); f.userData.animated = true; fireFlames.push(f);
    }
    fireLight.position.set(fireX, roofY + 1.3, fireZ);
    const smokeGeo = new THREE.BufferGeometry(); smokePositions = new Float32Array(27 * 3);
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({color:0xb1b1a0, size:.16, transparent:true, opacity:.22, depthWrite:false}));
    smoke.position.set(fireX, roofY+.8, fireZ); world.add(smoke);

    function person(parent, x, z, color, seated = false) {
      const g = new THREE.Group(); g.position.set(x, .18, z); parent.add(g);
      animatedActors.push(g);
      const jacket = material(`jacket${color}`, color);
      const torso=new THREE.Group();g.add(torso);g.userData.torso=torso;
      mesh('box', jacket, torso, 0, seated ? 1.08 : 1.25, 0, .62,.85,.43);
      const head=new THREE.Group();head.position.y=seated?1.65:1.82;torso.add(head);g.userData.head=head;
      mesh('box', m.skin, head, 0, .1, .025, .4,.45,.4);
      mesh('box', m.hair, head, 0, .32, -.02, .45,.16,.44);
      mesh('box', m.blue, head, 0, .4, -.05, .48,.16,.48);
      g.userData.legs=[];g.userData.arms=[];
      for (const s of [-1,1]) {
        if (seated) {
          mesh('box', m.pants, g, s*.19,.65,.26,.26,.28,.73);
          mesh('box', m.pants, g, s*.19,.32,.58,.25,.59,.25);
          mesh('box', m.black, g, s*.19,.07,.7,.28,.16,.44);
          rod(g,[s*.39,1.38,.03],[s*.37,1.06,.56],.13,jacket);
          mesh('box',m.skin,g,s*.37,1.06,.61,.18,.18,.23);
        } else {
          const leg=new THREE.Group();leg.position.set(s*.19,.9,0);g.add(leg);g.userData.legs.push(leg);
          mesh('box',m.pants,leg,0,-.43,0,.25,.85,.29);
          mesh('box',m.black,leg,0,-.82,.08,.3,.15,.47);
          const arm=new THREE.Group();arm.position.set(s*.45,1.51,0);torso.add(arm);g.userData.arms.push(arm);
          mesh('box',jacket,arm,0,-.33,0,.23,.67,.27);
          mesh('box',m.skin,arm,0,-.74,0,.2,.18,.23);
        }
      }
      return g;
    }
    const chair = new THREE.Group(); chair.position.set(3.35,.16,.15); chair.rotation.y=-.25; camp.add(chair);
    for (const side of [-1, 1]) {
      rod(chair,[side*.52,.03,-.4],[side*.52,1.18,.48],.032,m.metal);
      rod(chair,[side*.52,.03,.48],[side*.52,1.68,-.44],.032,m.metal);
    }
    mesh('box',m.fabric,chair,0,.68,.04,1.06,.09,.86);
    mesh('box',m.fabric,chair,0,1.19,-.4,1.04,.9,.07,-.14);
    survivor=person(camp,3.35,.2,0x987241,true); survivor.rotation.y=-.25;
    walkingSurvivor=person(camp,3.35,.2,0x987241,false);walkingSurvivor.visible=false;
    // The notebook and mug make the seated reading motion visible at the default zoom.
    mesh('box',m.canvas,survivor,0,1.04,.67,.61,.045,.41,-.35);
    mesh('box',m.red,survivor,0,1.0,.69,.64,.035,.44,-.35);
    // The worktable accumulates useful-looking clutter rather than generic cubes.
    const tableX=6.1,tableZ=-3.15;
    for (const x of [-1.8,1.8]) for (const z of [-.6,.6]) box(m.woodDark,tableX+x,roofY+.9,tableZ+z,.16,1.8,.16);
    for (let i=0;i<5;i++) box(i%2?m.woodLight:m.wood,tableX,roofY+1.84,tableZ-.7+i*.35,4.25,.17,.32);
    box(m.red,tableX-1.05,roofY+2.17,tableZ,1.0,.53,.62);
    box(m.darkMetal,tableX-1.05,roofY+2.45,tableZ,.47,.09,.23);
    box(m.canvas,tableX+.55,roofY+1.96,tableZ,1.25,.035,.75,.16);
    box(m.metal,tableX+1.5,roofY+2.01,tableZ+.3,.6,.15,.15,.3);
    batch('cylinder',m.cream,tableX+.35,roofY+2.11,tableZ-.45,.13,.35,.13);
    lantern(camp,tableX-1.7,2.24,tableZ+.15,.85);
    workLight.position.set(tableX-1.6,roofY+2.5,tableZ+.3);
    box(m.wood,tableX,roofY+.74,tableZ+1.65,3.8,.18,.58);
    for(const x of [-1.4,1.4]) box(m.woodDark,tableX+x,roofY+.36,tableZ+1.65,.2,.7,.45);

    // Large galvanized tank with bands, supports, cap, pipe, and a small tap.
    const tx=halfW-2.35,tz=halfD-3.0;
    batch('cylinder',m.concretePale,tx,roofY+2.12,tz,1.23,2.9,1.23);
    for(const h of [.8,1.45,2.6,3.52]) batch('cylinder',m.darkMetal,tx,roofY+h,tz,1.25,.07,1.25);
    batch('cone',m.metal,tx,roofY+3.76,tz,1.24,.46,1.24);
    batch('cylinder',m.darkMetal,tx,roofY+4.05,tz,.24,.3,.24);
    for(const x of [-.82,.82]) for(const z of [-.82,.82]) box(m.rust,tx+x,roofY+.38,tz+z,.11,.76,.11);
    box(m.metal,tx+1.35,roofY+1.1,tz,.13,2.15,.13);
    box(m.metal,tx+1.14,roofY+.28,tz+.1,.53,.12,.13);
    batch('cylinder',m.blue,tx-2,roofY+.52,tz+.8,.42,1.04,.42);
    batch('cylinder',m.darkMetal,tx-2,roofY+1.05,tz+.8,.43,.06,.43);
    // A bowl by the tank is one of the dog's regular stops.
    batch('cylinder',m.rust,4.4,roofY+.2,4.65,.38,.15,.38);
    batch('cylinder',m.blue,4.4,roofY+.29,4.65,.31,.015,.31);
    lantern(camp,tx-1.5,1.35,tz-.8,.7);
    // An old tire, a cable spool, exhausts and folded tarps.
    const tireGeo=new THREE.TorusGeometry(.48,.16,5,12);
    mesh(tireGeo,m.black,camp,halfW-1.7,.45,halfD-1.2,1,1,1,.65,.15);
    mesh(tireGeo,m.black,camp,halfW-2.5,.22,halfD-1.1,1,1,1,Math.PI/2);
    for(let i=0;i<3;i++) box(m.fabric,-halfW+1.3,roofY+.2+i*.13,2.2,1.8,.12,.9,.06);
    batch('cylinder',m.metal,halfW-1.8,roofY+.7,-halfD+2.1,.4,1.4,.4);
    batch('cylinder',m.darkMetal,halfW-1.8,roofY+1.45,-halfD+2.1,.63,.14,.63);
    const antennaX=halfW-.7,antennaZ=-halfD+.8;
    box(m.darkMetal,antennaX,roofY+4,antennaZ,.07,8,.07);
    box(m.metal,antennaX,roofY+7,antennaZ,3,.06,.06);
    for(let i=0;i<5;i++) box(m.metal,antennaX-1.3+i*.65,roofY+7,antennaZ,.045,.05,.75);
    rod(camp,[antennaX,5.2,antennaZ],[antennaX-2.1,.05,antennaZ+1.8],.012,m.canvas);
    // A short improvised railing behind the living area.
    for(let i=0;i<7;i++) box(m.woodDark,-1.5+i*1.3,roofY+.8,-halfD+.4,.14,1.6,.14);
    for(const h of [.65,1.4]) box(m.wood,-.1+2.5,roofY+h,-halfD+.4,8.2,.13,.11);
    // Washing dries over the quiet side of the roof, independent of simulation speed.
    const washX=-halfW+1.1;
    for(const z of [1.8,5.7]) box(m.woodDark,washX,roofY+1.85,z,.1,3.7,.1);
    batchRod([washX,roofY+3.6,1.8],[washX,roofY+3.5,5.7],.014,m.canvas);
    for(let i=0;i<4;i++) {
      const cloth=new THREE.Group();cloth.position.set(washX,3.55-i*.027,2.2+i*.84);camp.add(cloth);
      mesh('box',i%2?m.fabric:m.canvas,cloth,0,-.5,0,.055,.95,.63);
      mesh('box',m.woodLight,cloth,0,-.035,-.22,.11,.12,.055);
      mesh('box',m.woodLight,cloth,0,-.035,.22,.11,.12,.055);
      cloth.userData.phase=i*1.4;cloth.userData.animated=true;laundry.push(cloth);
    }

    const supplyPosition={food:[-1.7,5.8],water:[-.1,6.7],parts:[-8,5.5],medicine:[-1.0,6.9]};
    for(const [key,pos] of Object.entries(supplyPosition)) {
      const group=new THREE.Group(); group.position.set(pos[0],.17,pos[1]); camp.add(group); resourceStacks[key]=[];
      for(let i=0;i<5;i++) {
        const item=new THREE.Group(); item.position.set((i%2)*.78,Math.floor(i/2)*.62,0); item.userData.animated=true; group.add(item); resourceStacks[key].push(item);
        if(key==='water') {
          mesh('box',m.blue,item,0,.29,0,.55,.58,.46);
          mesh('box',m.cream,item,0,.64,0,.2,.09,.14);
          mesh('box',m.darkMetal,item,.06,.65,0,.26,.05,.12);
        } else {
          const mat=key==='medicine'?m.cream:m.wood;
          mesh('box',mat,item,0,.29,0,.7,.58,.62);
          if(key==='medicine') { mesh('box',m.red,item,0,.29,.316,.13,.34,.025); mesh('box',m.red,item,0,.29,.32,.33,.12,.025); }
          else { for(const y of [.08,.48]) mesh('box',m.woodDark,item,0,y,.321,.72,.06,.035); for(const x of [-.28,.28]) mesh('box',m.woodLight,item,x,.28,.33,.045,.5,.035); }
        }
      }
    }

    dog=new THREE.Group(); dog.position.set(-.2,.2,1.3); dog.rotation.y=-.55; camp.add(dog);
    animatedActors.push(dog);
    const dogBody=new THREE.Group();dog.add(dogBody);dog.userData.body=dogBody;
    mesh('box',m.woodLight,dogBody,0,.49,0,.39,.5,.85);
    const dogHead=new THREE.Group();dogHead.position.set(0,.66,.47);dogBody.add(dogHead);dog.userData.head=dogHead;
    mesh('box',m.cream,dogHead,0,0,.06,.37,.42,.37);
    mesh('box',m.woodDark,dogHead,0,-.02,.29,.23,.18,.21);
    mesh('box',m.red,dogHead,0,-.12,-.14,.39,.095,.095);
    dog.userData.legs=[];
    for(const side of [-1,1]) {
      mesh('cone',m.woodDark,dogHead,side*.15,.28,-.04,.12,.3,.11,0,0,side*.18);
      mesh('box',m.black,dogHead,side*.13,.1,.243,.035,.04,.03);
      for(const z of [-.27,.29]) {
        const leg=new THREE.Group();leg.position.set(side*.14,.36,z);dog.add(leg);
        mesh('box',m.cream,leg,0,-.18,0,.11,.37,.12);
        leg.userData.phase=side*(z<0?1:-1);dog.userData.legs.push(leg);
      }
    }
    const dogTail=mesh('box',m.woodLight,dogBody,0,.67,-.65,.13,.13,.54,-.65); dog.userData.tail=dogTail;
    dog.userData.path=[[-.2,1.2,6],[0,-1.5,4],[2.1,-2.3,5],[4.4,-1.5,3],[5.2,1.2,3],[4.4,4.0,7],[2.3,5.0,4],[.1,4.8,3],[-1.25,3.55,5],[-.4,1.65,12]];
    dog.userData.segments=[];dog.userData.duration=0;
    for(let i=0;i<dog.userData.path.length;i++) {
      const from=dog.userData.path[i],to=dog.userData.path[(i+1)%dog.userData.path.length];
      const travel=Math.hypot(to[0]-from[0],to[1]-from[1])/.65;
      dog.userData.segments.push({from,to,start:dog.userData.duration,wait:from[2],travel,index:i});
      dog.userData.duration+=from[2]+travel;
    }
    ally = null;

    for(const flag of ['collector','garden','barricade','radio']) { const g=new THREE.Group(); camp.add(g);flagGroups[flag]=g; }
    const collector=flagGroups.collector;
    for(const x of [-2.3,.8]) for(const z of [-8.0,-5.8]) mesh('box',m.woodLight,collector,x,1.6,z,.1,3.2,.1);
    mesh('box',m.blue,collector,-.75,3.03,-6.9,3.3,.08,2.45,0,0,.11);
    mesh('cylinder',m.blue,collector,.7,.6,-6.3,.55,1.2,.55);
    rod(collector,[.8,2.89,-6.0],[.8,1.1,-6.3],.055,m.metal);
    const garden=flagGroups.garden;
    for(let i=0;i<3;i++) {
      const x=2.8+i*2.1,z=-6.8;
      mesh('box',m.wood,garden,x,.25,z,1.8,.5,2.6);
      mesh('box',m.soil,garden,x,.52,z,1.6,.03,2.4);
      for(let p=0;p<7;p++) mesh('leaf',p%2?m.grass:m.leavesLight,garden,x+range(-.65,.65),.77,z+range(-1,1),.25,.4,.25);
    }
    const barrier=flagGroups.barricade; barrier.position.set(-halfW+3.4,0,-halfD+4.65);
    for(let i=0;i<5;i++) mesh('box',i%2?m.woodLight:m.wood,barrier,0,.34+i*.38,0,1.75,.25,.12,0,0,i%2?.11:-.14);
    rod(barrier,[-.8,.1,.1],[.7,2.2,.1],.06,m.metal);
    const radio=flagGroups.radio;
    mesh('box',m.darkMetal,radio,tableX+.75,2.12,tableZ-.15,.85,.44,.5);
    mesh('box',m.cream,radio,tableX+.54,2.17,tableZ+.11,.34,.2,.02);
    mesh('cylinder',m.black,radio,tableX+.98,2.13,tableZ+.14,.12,.045,.12,Math.PI/2);
    rod(radio,[tableX+.87,2.36,tableZ],[tableX+1.11,3.38,tableZ],.012,m.metal);

    function levelGroup(roof, name, level) {
      const group=new THREE.Group();roof.group.add(group);
      if(!roof.levels[name])roof.levels[name]=[];
      roof.levels[name].push({level,group});return group;
    }
    for(const name of ['collector','garden','barricade','radio']) homeCamp.levels[name]=[{level:1,group:flagGroups[name]}];
    let upgrade=levelGroup(homeCamp,'collector',2);
    for(const x of [.35,1.1]) {
      mesh('cylinder',m.cream,upgrade,x,.8,-5.25,.29,1.55,.29);
      mesh('cylinder',m.darkMetal,upgrade,x,1.58,-5.25,.31,.07,.31);
    }
    rod(upgrade,[.35,1.65,-5.25],[.7,1.65,-6.3],.04,m.metal);
    upgrade=levelGroup(homeCamp,'collector',3);
    mesh('box',m.blue,upgrade,1.15,.6,-4.45,1.0,.85,.75);
    mesh('box',m.darkMetal,upgrade,1.15,1.06,-4.45,1.15,.09,.85);
    rod(upgrade,[1.45,.46,-4.45],[1.45,.46,-8.4],.04,m.blue);
    rod(upgrade,[1.45,.46,-8.4],[7.3,.46,-8.4],.04,m.blue);
    mesh('box',lanternMaterial,upgrade,1.15,.8,-4.06,.12,.12,.025);

    upgrade=levelGroup(homeCamp,'garden',2);
    for(let row=0;row<2;row++) {
      const z=-8.1+row*.6;
      mesh('cylinder',m.cream,upgrade,5.1,.9,z,.13,6.0,.13,0,0,Math.PI/2);
      for(let i=0;i<8;i++) mesh('leaf',i%2?m.grass:m.leavesLight,upgrade,2.5+i*.73,1.13,z,.19,.31,.22);
    }
    for(const x of [2.4,7.7]) mesh('box',m.wood,upgrade,x,.42,-7.8,.15,.84,1.2);
    upgrade=levelGroup(homeCamp,'garden',3);
    for(const x of [2.1,8.2]) for(const z of [-8.9,-5.35]) mesh('box',m.metal,upgrade,x,1.58,z,.055,3.16,.055);
    for(const z of [-8.9,-5.35]) rod(upgrade,[2.1,3.16,z],[8.2,3.16,z],.045,m.metal);
    mesh('box',m.canvas,upgrade,5.15,3.2,-7.12,6.3,.06,3.7,0,0,-.04);

    upgrade=levelGroup(homeCamp,'barricade',2);
    for(let layer=0;layer<2;layer++) for(let i=0;i<3;i++) mesh('box',m.canvas,upgrade,-halfW+2.2+i*.77,.23+layer*.39,-halfD+5.0+layer*.16,.72,.37,.46,0,.07*(i-1));
    upgrade=levelGroup(homeCamp,'barricade',3);
    for(let i=0;i<7;i++) mesh('box',m.darkMetal,upgrade,-halfW+2.5+i*.28,1.3,-halfD+4.88,.06,2.6,.08);
    for(const y of [.2,2.5]) mesh('box',m.metal,upgrade,-halfW+3.36,y,-halfD+4.89,1.85,.1,.1);

    upgrade=levelGroup(homeCamp,'radio',2);
    mesh('box',m.darkMetal,upgrade,tableX+1.48,2.16,tableZ-.45,.55,.6,.4);
    mesh('box',m.cream,upgrade,tableX+1.48,2.18,tableZ-.235,.41,.31,.025);
    upgrade=levelGroup(homeCamp,'radio',3);
    mesh('cylinder',m.blue,upgrade,antennaX,5.9,antennaZ,.65,.13,.65,Math.PI/2,.8);
    mesh('rock',lanternMaterial,upgrade,antennaX,8.05,antennaZ,.12,.16,.12);

    for(let level=1;level<=3;level++) {
      upgrade=levelGroup(homeCamp,'storage',level);
      const x=-halfW+1.55,z=halfD-2.7-(level-1)*1.1;
      for(let board=0;board<4;board++) mesh('box',m.woodDark,upgrade,x,.1,z-.42+board*.28,2.0,.18,.23);
      mesh('box',level%2?m.woodLight:m.blue,upgrade,x,.65,z,1.8,.92,.86);
      for(const s of [-1,1]) mesh('box',m.woodDark,upgrade,x+s*.65,.66,z+.45,.055,.91,.04);
      upgrade=levelGroup(homeCamp,'beds',level);
      const bx=-halfW+3.7,bz=halfD-1.6-(level-1)*1.45;
      mesh('box',m.wood,upgrade,bx,.3,bz,2.35,.19,.95);
      mesh('box',level%2?m.fabric:m.blue,upgrade,bx,.44,bz,2.2,.12,.88);
      mesh('box',m.cream,upgrade,bx-.76,.57,bz,.52,.16,.8);
      for(const x of [-.9,.9]) mesh('box',m.woodDark,upgrade,bx+x,.14,bz,.15,.28,.8);
    }
    upgrade=levelGroup(homeCamp,'power',1);
    for(let i=0;i<2;i++) {
      mesh('box',m.metal,upgrade,halfW-3.0+i*1.75,1.0,-halfD+2.35,1.65,.08,2.5,.22);
      mesh('box',m.blue,upgrade,halfW-3.0+i*1.75,1.06,-halfD+2.36,1.48,.035,2.32,.22);
      for(let j=0;j<4;j++)mesh('box',m.windowFrame,upgrade,halfW-3.0+i*1.75,1.075+Math.sin(.22)*(-.85+j*.56),-halfD+1.5+j*.56,1.48,.025,.025,.22);
    }
    upgrade=levelGroup(homeCamp,'power',2);
    mesh('box',m.darkMetal,upgrade,halfW-3.05,.42,-halfD+4.2,1.25,.84,.8);
    mesh('box',m.red,upgrade,halfW-3.05,.85,-halfD+4.2,.93,.045,.58);
    upgrade=levelGroup(homeCamp,'power',3);
    mesh('cylinder',m.metal,upgrade,halfW-.8,3.0,-halfD+2.9,.09,6.0,.09);
    const rotor=new THREE.Group();rotor.position.set(halfW-.8,5.7,-halfD+2.65);rotor.userData.animated=true;upgrade.add(rotor);windRotors.push(rotor);
    for(let i=0;i<3;i++) {
      const blade=new THREE.Group();blade.rotation.z=i*TAU/3;rotor.add(blade);
      mesh('box',m.cream,blade,0,.72,0,.19,1.6,.065,0,0,.12);
    }
    mesh('cylinder',m.darkMetal,rotor,0,0,.04,.18,.19,.18,Math.PI/2);
    for(let level=1;level<=3;level++) {
      upgrade=levelGroup(homeCamp,'workshop',level);
      mesh('box',m.woodDark,upgrade,tableX+level*.38-1.0,2.7,tableZ-.77,.31,.56,.1);
      mesh('box',m.metal,upgrade,tableX+level*.38-1.0,2.88,tableZ-.7,.055,.55,.065,0,0,.22);
      if(level===3)mesh('box',m.blue,upgrade,tableX+1.1,2.1,tableZ+.05,.63,.37,.59);
    }

    // Occupied roofs become small, connected homes instead of ending the run.
    for(let index=0;index<neighboringBuildings.length;index++) {
      const neighbor=neighboringBuildings[index];
      const group=new THREE.Group();group.position.set(neighbor.x,neighbor.y,neighbor.z);world.add(group);
      const roof={id:neighbor.id,group,x:neighbor.x,y:neighbor.y,z:neighbor.z,levels:{},residentPositions:[[1.4,-1.35],[3.4,-2.0],[-5.5,-.4]]};roofCamps.push(roof);
      const base=new THREE.Group();group.add(base);roof.base=base;
      for(let i=0;i<13;i++)mesh('box',i%3?m.wood:m.woodLight,base,-2,.08,-.2+i*.3,5.5,.1,.27);
      for(const x of [-6.15,6.15])mesh('box',m.roofEdge,base,x,.39,0,.18,.78,11.8);
      for(const z of [-5.7,5.7])mesh('box',m.roofEdge,base,0,.39,z,12.4,.78,.18);
      mesh('box',m.concretePale,base,-3.7,1.1,-3.8,3.6,2.2,2.6);
      mesh('box',m.darkMetal,base,-2.8,.9,-2.44,.85,1.8,.045);
      const roofTent=new THREE.Group();roofTent.position.set(-2,.15,.2);base.add(roofTent);
      const canopy=index%2?m.fabric:m.tentLight;
      mesh('box',canopy,roofTent,-.75,1.08,0,2.2,.07,2.7,0,0,.8);
      mesh('box',canopy,roofTent,.75,1.08,0,2.2,.07,2.7,0,0,-.8);
      mesh('box',m.black,roofTent,0,.3,0,2.75,.07,2.6);
      rod(base,[-5.1,3.05,2.0],[4.8,3.45,1.7],.015,m.black);
      for(const x of [-5.1,4.8])mesh('box',m.wood,base,x,1.72,1.8,.085,3.45,.085);
      for(let i=0;i<6;i++)mesh('rock',lanternMaterial,base,-4.6+i*1.8,3.0+i*.071,1.9,.1,.13,.1);
      lantern(base,2.9,1.5,3.7,.8);
      mesh('box',m.wood,base,2.9,.9,3.7,1.8,.12,.9);
      for(const x of [2.25,3.55])mesh('box',m.woodDark,base,x,.45,3.7,.1,.9,.7);
      // A sagging carrier rope links the roof edge to the nearest safe anchor.
      const end=[neighbor.x>0?-5.8:5.8,1.2,4.5];
      const start=[(neighbor.x>0?halfW-1:-halfW+1)-neighbor.x,roofY-neighbor.y+1.2,-halfD+1-neighbor.z];
      for(let segment=0;segment<6;segment++) {
        const a=segment/6,b=(segment+1)/6;
        rod(base,[start[0]+(end[0]-start[0])*a,start[1]+(end[1]-start[1])*a-Math.sin(a*Math.PI)*1.1,start[2]+(end[2]-start[2])*a],
          [start[0]+(end[0]-start[0])*b,start[1]+(end[1]-start[1])*b-Math.sin(b*Math.PI)*1.1,start[2]+(end[2]-start[2])*b],.018,m.canvas);
      }
      compact(base);
      for(let level=1;level<=3;level++) {
        let g=levelGroup(roof,'garden',level);
        const gx=.2+(level-1)*1.8;
        mesh('box',m.wood,g,gx,.23,-3.55,1.55,.46,3.1);mesh('box',m.soil,g,gx,.48,-3.55,1.4,.03,2.96);
        for(let p=0;p<8;p++)mesh('leaf',p%2?m.grass:m.leavesLight,g,gx+(p%2?-.36:.36),.8,-4.65+Math.floor(p/2)*.69,.22,.35,.25);
        if(level>1)rod(g,[gx+.7,.55,-5.1],[gx+.7,.55,-2.0],.035,m.blue);
        g=levelGroup(roof,'collector',level);
        mesh('cylinder',level%2?m.blue:m.concretePale,g,4.95,.77,-3.85+(level-1)*1.6,.56,1.5,.56);
        mesh('cylinder',m.darkMetal,g,4.95,1.55,-3.85+(level-1)*1.6,.57,.07,.57);
        g=levelGroup(roof,'barricade',level);
        for(let i=0;i<3;i++)mesh('box',level===3?m.metal:m.woodLight,g,-2.8,.3+i*.65,-2.3+(level-1)*.06,1.15,.22,.09,0,0,(i%2?.1:-.1));
        g=levelGroup(roof,'beds',level);
        mesh('box',m.wood,g,-4.9,.25,2.7+(level-1)*.82,2.0,.14,.68);
        mesh('box',level%2?m.canvas:m.fabric,g,-4.9,.37,2.7+(level-1)*.82,1.85,.1,.62);
        g=levelGroup(roof,'storage',level);
        mesh('box',level%2?m.wood:m.blue,g,.8+(level-1)*.9,.38,4.2,.82,.75,.8);
        g=levelGroup(roof,'power',level);
        mesh('box',m.blue,g,-4.4+(level-1)*1.1,2.46,-3.9,1,.08,2,.18);
        g=levelGroup(roof,'radio',level);
        mesh('box',m.darkMetal,g,3.0+(level-1)*.27,1.16,3.65,.25,.36,.42);
        if(level===1)rod(g,[3.0,1.3,3.65],[3.2,2.1,3.65],.012,m.metal);
        g=levelGroup(roof,'workshop',level);
        mesh('box',m.woodDark,g,1.0+(level-1)*.45,1.0,2.0,.36,.12,.85);
        mesh('box',m.metal,g,1.0+(level-1)*.45,1.13,2.0,.12,.18,.34);
      }
      if(neighbor.id==='legacy-neighbor') { ally=person(group,0,4.2,0x5b6e72,false);ally.rotation.y=.65; }
    }
    for(const roof of roofCamps) for(const levels of Object.values(roof.levels)) for(const level of levels)compact(level.group);
    // Merge occupied roof details across every upgrade level. Visibility changes
    // only update instance matrices, so a late settlement stays close to the first
    // camp's draw count instead of issuing a draw for each building and facility.
    const conditionalMap=new Map();
    world.updateMatrixWorld(true);
    for(const roof of roofCamps) {
      const groups=Object.values(roof.levels).flatMap(levels=>levels.map(level=>level.group));
      if(roof.base)groups.push(roof.base);
      for(const group of groups)group.traverse(object=>{
        if(!object.isMesh)return;
        let parent=object;
        while(parent!==group){if(parent.userData.animated)return;parent=parent.parent;}
        const key=`${object.geometry.uuid}:${object.material.uuid}:${object.castShadow}`;
        if(!conditionalMap.has(key))conditionalMap.set(key,{geometry:object.geometry,material:object.material,parts:[],shadows:object.castShadow});
        const data=conditionalMap.get(key);
        for(let i=0;i<(object.isInstancedMesh?object.count:1);i++) {
          const matrix=new THREE.Matrix4();
          if(object.isInstancedMesh)object.getMatrixAt(i,matrix);
          matrix.premultiply(object.matrixWorld);
          data.parts.push({matrix,group,roof:roof.group});
        }
        object.visible=false;
      });
    }
    for(const data of conditionalMap.values()) {
      const instances=new THREE.InstancedMesh(data.geometry,data.material,data.parts.length);
      instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);instances.frustumCulled=false;instances.castShadow=data.shadows;instances.receiveShadow=data.shadows;
      world.add(instances);conditionalBatches.push({instances,parts:data.parts});
    }
    // A bounded actor pool covers the named cast and a few later residents.
    for(let index=0;index<8;index++) {
      const actor=person(world,0,0,[0x5b6e72,0xaa7657,0x748054,0x7a6770][index%4],false);
      actor.visible=false;actor.userData.phase=index*2.37;residentActors.push(actor);
    }
    // Animated parts use material batches too: adding residents does not add a draw per limb.
    const actorMap=new Map();
    for(const actor of animatedActors) {
      actor.updateWorldMatrix(true,true);
      actor.traverse(part=>{
        if(!part.isMesh)return;
        const key=`${part.geometry.uuid}:${part.material.uuid}`;
        if(!actorMap.has(key))actorMap.set(key,{geometry:part.geometry,material:part.material,parts:[]});
        actorMap.get(key).parts.push({part,actor});part.visible=false;
      });
    }
    for(const data of actorMap.values()) {
      const instances=new THREE.InstancedMesh(data.geometry,data.material,data.parts.length);
      instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);instances.frustumCulled=false;instances.castShadow=true;
      world.add(instances);actorBatches.push({instances,parts:data.parts});
    }
    compact(camp,true);

    for(const data of batches.values()) {
      const im=new THREE.InstancedMesh(data.geo,data.mat,data.transforms.length);
      data.transforms.forEach((matrix,i)=>im.setMatrixAt(i,matrix)); im.instanceMatrix.needsUpdate=true;
      im.castShadow=data.castsShadow; im.receiveShadow=data.castsShadow;
      im.matrixAutoUpdate=false; im.computeBoundingSphere(); world.add(im);
    }
    // Local rain volume, so storms remain readable without filling the whole city.
    rainBase=new Float32Array(440*3); rainPositions=new Float32Array(440*6);
    for(let i=0;i<440;i++){rainBase[i*3]=range(-35,35);rainBase[i*3+1]=range(0,32);rainBase[i*3+2]=range(-32,28);}
    const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
    rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xd0e0d7,transparent:true,opacity:.24,depthWrite:false}));
    rain.position.y=roofY;rain.frustumCulled=false;world.add(rain);
    visualSignature=''; renderer.shadowMap.needsUpdate=true; updateFlags(state);
  }

  function updateFlags(state) {
    const key=`${JSON.stringify(state.flags)}:${JSON.stringify(state.facilities)}:${(state.buildings||[]).map(building=>`${building.id}/${building.claimed}/${JSON.stringify(building.facilities)}`).join(',')}:${(state.residents||[]).map(resident=>`${resident.id}/${resident.buildingId}/${resident.assignment}`).join(',')}:${state.action?.id}:${Object.entries(state.resources||{}).map(([name,value])=>name+Math.ceil(value/(name==='parts'?4:3))).join(',')}`;
    if(key===visualSignature)return;
    visualSignature=key;renderer.shadowMap.needsUpdate=true;
    const flags=state.flags||{};
    dog.visible=!!flags.dog;if(ally)ally.visible=!!flags.ally;
    activePlayer=!['scavenge','water','claim_roof','investigate_school','investigate_tower','investigate_river'].includes(state.action?.id)&&!String(state.action?.id||'').startsWith('route_');
    for(const roof of roofCamps) {
      const building=(state.buildings||[]).find(candidate=>candidate.id===roof.id);
      roof.group.visible=roof.id==='home'||roof.id==='legacy-neighbor'&&!!flags.ally||!!building?.claimed;
      const facilities=roof.id==='home'?(state.facilities||building?.facilities||flags):(building?.facilities||{});
      for(const [name,levels] of Object.entries(roof.levels))for(const entry of levels)entry.group.visible=Number(facilities[name]||0)>=entry.level;
    }
    residentActors.forEach((actor,index)=>{
      const resident=state.residents?.[index];
      const roof=resident&&roofCamps.find(candidate=>candidate.id===(resident.buildingId||'home'));
      actor.visible=!!resident&&!!roof?.group.visible;
      if(!actor.visible)return;
      actor.userData.assignment=resident.assignment||'rest';actor.userData.roof=roof;
      const assignment=actor.userData.assignment;
      const point=roof.residentPositions[assignment==='water'?1:assignment==='guard'?2:0];
      actor.userData.baseX=roof.x+point[0]+(index%2)*.7;
      actor.userData.baseZ=roof.z+point[1]+(index%3)*.34;
      if(assignment==='rest') {actor.userData.baseX=roof.x+(roof.id==='home'?-.5:1.5);actor.userData.baseZ=roof.z+1.2+(index%3)*.65;}
      actor.position.set(actor.userData.baseX,roof.y+.18,actor.userData.baseZ);
    });
    for(const batch of conditionalBatches) {
      batch.parts.forEach(({matrix,group,roof},index)=>batch.instances.setMatrixAt(index,group.visible&&roof.visible?matrix:hiddenActorMatrix));
      batch.instances.instanceMatrix.needsUpdate=true;
    }
    for(const [name,stack] of Object.entries(resourceStacks)) {
      const value=Number(state.resources?.[name])||0;
      const count=value>0?clamp(Math.ceil(value/(name==='parts'?4:3)),1,5):0;
      stack.forEach((item,i)=>item.visible=i<count);
    }
  }

  function updateCamera(delta=1/60) {
    const radius=(view==='wide'?58:38)*zoom;
    const angle=.72+yaw;
    const focus=roofCamps.find(roof=>roof.id===focusId&&roof.group.visible)||roofCamps[0];
    cameraTarget.set(focus.x-1.8,focus.y+2.0,focus.z-1.0);
    cameraDesired.set(cameraTarget.x+Math.sin(angle)*radius,cameraTarget.y+radius*(.30+pitch),cameraTarget.z+Math.cos(angle)*radius);
    camera.position.lerp(cameraDesired,Math.min(1,delta*10));
    camera.lookAt(cameraTarget);
    // Asymmetric framing leaves breathing room for the game controls on the left.
    if(projectionDirty){camera.setViewOffset(width,height,-width*.095,0,width,height);projectionDirty=false;}
  }
  function resize() {
    if(disposed)return;
    width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);
    const scale=quality==='low'?Math.min(.6,760/width):Math.min(.85,1000/width);
    renderer.setSize(Math.round(width*scale),Math.round(height*scale),false);
    camera.aspect=width/height;camera.updateProjectionMatrix();projectionDirty=true;
    updateCamera(1);
  }
  function animatePerson(actor, moving, working, phase=0) {
    const step=Math.sin(elapsed*5.2+phase);
    actor.userData.legs.forEach((leg,index)=>leg.rotation.x=moving?step*(index%2?-.42:.42):0);
    actor.userData.arms.forEach((arm,index)=>arm.rotation.x=working?-.62+Math.sin(elapsed*2.15+index*.8+phase)*.24:moving?step*(index%2?.32:-.32):Math.sin(elapsed*.7+phase)*.045);
    actor.userData.torso.rotation.x=working?.14+Math.sin(elapsed*1.2+phase)*.04:0;
    actor.userData.head.rotation.y=Math.sin(elapsed*.37+phase)*.2;
    actor.userData.head.rotation.x=working?.13:Math.sin(elapsed*.53+phase)*.04;
  }
  function animateResidents(state) {
    const cycle=elapsed%94;
    const campWork=!!state.action&&!['rest','heal'].includes(state.action.id);
    const standing=campWork||cycle>=34&&cycle<76;
    survivor.visible=activePlayer&&!standing;walkingSurvivor.visible=activePlayer&&standing;
    survivor.userData.head.rotation.x=.18+Math.sin(elapsed*.7)*.045;
    survivor.userData.head.rotation.y=Math.sin(elapsed*.27)*.18;
    survivor.rotation.z=Math.sin(elapsed*.65)*.014;
    if(walkingSurvivor.visible) {
      const outward=cycle<45;
      const travelling=!campWork&&(cycle<45||cycle>65);
      const progress=campWork?1:outward?clamp((cycle-34)/11,0,1):cycle>65?1-clamp((cycle-65)/11,0,1):1;
      const fraction=progress<.4?progress/.4:(progress-.4)/.6;
      const startX=progress<.4?3.35:5.0,startZ=progress<.4?.2:1.2;
      const endX=progress<.4?5.0:6.1,endZ=progress<.4?1.2:-1.8;
      walkingSurvivor.position.set(startX+(endX-startX)*fraction,.18+(travelling?Math.abs(Math.sin(elapsed*5.2))*.035:0),startZ+(endZ-startZ)*fraction);
      walkingSurvivor.rotation.y=travelling?Math.atan2(endX-startX,endZ-startZ)+(outward?0:Math.PI):Math.PI;
      animatePerson(walkingSurvivor,travelling,!travelling);
    }
    for(const actor of residentActors) {
      if(!actor.visible)continue;
      const {assignment,baseX,baseZ,phase,roof}=actor.userData;
      const guard=assignment==='guard',resting=assignment==='rest',working=!guard&&!resting;
      actor.position.x=baseX+(guard?Math.sin(elapsed*.14+phase)*.7:resting?Math.sin(elapsed*.09+phase)*.25:0);
      actor.position.z=baseZ+(resting?Math.cos(elapsed*.09+phase)*.22:0);
      actor.position.y=roof.y+.18+(guard?Math.abs(Math.sin(elapsed*3+phase))*.02:0);
      actor.rotation.y=assignment==='water'?Math.PI/2:assignment==='farm'?Math.PI:guard?Math.sin(elapsed*.14+phase)*.65:Math.sin(elapsed*.12+phase)*.4;
      animatePerson(actor,guard,working,phase);
    }
    if(ally?.visible) {ally.rotation.y=.65+Math.sin(elapsed*.22)*.2;animatePerson(ally,false,false,.8);}
  }
  function animateDog() {
    if(!dog.visible)return;
    const clock=elapsed%dog.userData.duration;
    let leg=dog.userData.segments[dog.userData.segments.length-1];
    for(const segment of dog.userData.segments)if(clock<segment.start+segment.wait+segment.travel){leg=segment;break;}
    const waiting=clock-leg.start<leg.wait;
    const progress=waiting?0:(clock-leg.start-leg.wait)/leg.travel;
    const sleeping=waiting&&leg.index===9;
    dog.position.set(leg.from[0]+(leg.to[0]-leg.from[0])*progress,.16+(waiting?0:Math.abs(Math.sin(elapsed*9))*.035),leg.from[1]+(leg.to[1]-leg.from[1])*progress);
    dog.rotation.y=waiting&&leg.index===5?0:Math.atan2(leg.to[0]-leg.from[0],leg.to[1]-leg.from[1]);
    dog.scale.y=sleeping?.62+Math.sin(elapsed*1.3)*.012:1;
    dog.userData.head.rotation.x=sleeping?.25:waiting?.4+Math.sin(elapsed*2.8)*.12:Math.sin(elapsed*5)*.045;
    dog.userData.head.rotation.y=waiting&&!sleeping?Math.sin(elapsed*.9)*.18:0;
    dog.userData.tail.rotation.y=Math.sin(elapsed*(waiting?4.0:7.5))*(sleeping?.035:.38);
    dog.userData.legs.forEach(part=>part.rotation.x=sleeping?-1.15:waiting?0:Math.sin(elapsed*9)*part.userData.phase*.54);
  }
  function updateActorBatches() {
    for(const actor of animatedActors)if(actor.visible)actor.updateWorldMatrix(true,true);
    for(const batch of actorBatches) {
      batch.parts.forEach(({part,actor},index)=>batch.instances.setMatrixAt(index,actor.visible?part.matrixWorld:hiddenActorMatrix));
      batch.instances.instanceMatrix.needsUpdate=true;
    }
  }
  function update(state,deltaSeconds=1/60) {
    if(disposed)return;
    lastState=state; const delta=clamp(Number(deltaSeconds)||0,0,.15);elapsed+=delta;
    if(signature!==worldKey(state)) {buildWorld(state); updateCamera(1);}
    renderElapsed+=delta;
    // High-refresh monitors otherwise submit hundreds of full city frames a second.
    if(deltaSeconds!==0&&renderElapsed<1/60)return;
    const frameDelta=renderElapsed;renderElapsed%=1/60;
    updateFlags(state);
    if(elapsed>nextShadowUpdate){renderer.shadowMap.needsUpdate=true;nextShadowUpdate=elapsed+2;}
    const hour=(8+(Number(state.time)||0)/60)%24;
    const daylight=clamp(Math.sin((hour-6)/24*TAU)*1.45+.13,0,1);
    const sunset=clamp(1-Math.abs(hour-18)/2.2,0,1)*.63+clamp(1-Math.abs(hour-6.2)/1.7,0,1)*.35;
    const weather=getWeather(state);
    const raining=weather==='rain'||weather==='storm'||weather?.id==='rain'||weather?.id==='storm'||weather?.type==='rain'||weather?.type==='storm';
    const night=1-daylight;
    skyMaterial.uniforms.top.value.copy(nightSky).lerp(daySky,daylight);
    skyMaterial.uniforms.bottom.value.copy(nightHorizon).lerp(dayHorizon,daylight).lerp(tmpColor.set(0xd2a17d),sunset);
    scene.fog.color.copy(nightFog).lerp(dayFog,daylight);
    if(raining){scene.fog.color.lerp(tmpColor.set(0x667d80),.5);skyMaterial.uniforms.top.value.lerp(tmpColor.set(0x526977),.55);}
    scene.fog.density=raining?.0062:.0042;
    cloudMaterial.opacity=raining?.58:.2+daylight*.17;
    hemi.intensity=.91+daylight*1.55;
    hemi.color.set(daylight>.3?0xc5ded6:0x99b6d3);
    sun.intensity=(.35+daylight*3.0)*(raining?.42:1);
    sun.color.copy(sunColor).lerp(duskColor,sunset);
    const sunAngle=hour/24*TAU;
    sun.position.set(-35+Math.sin(sunAngle)*20,roofY+35+daylight*25,20);
    sun.target.position.set(0,roofY,0);
    fireLight.intensity=(28+(1-daylight)*31)*(1+Math.sin(elapsed*14)*.08+Math.sin(elapsed*23)*.035);
    porchLight.intensity=3+night*31;workLight.intensity=2+night*24;
    lanternMaterial.emissiveIntensity=.14+night*2.5;
    if(glowPools.length)glowPools[0].material.opacity=.012+night*.17;
    floorMaterial.color.set(raining?0x596c64:0x777e6d);wetMaterial.opacity=raining?.28:.08;
    for(const flame of fireFlames){const f=1+Math.sin(elapsed*9+flame.userData.phase)*.22;flame.scale.y=flame.userData.base.y*f;flame.position.y=.5+flame.scale.y*.32;flame.rotation.z=Math.sin(elapsed*5+flame.userData.phase)*.16;}
    for(let i=0;i<27;i++){const h=(elapsed*.74+i*.23)%6;smokePositions[i*3]=Math.sin(i*1.7+elapsed*.3)*(.12+h*.1)+h*.12;smokePositions[i*3+1]=h;smokePositions[i*3+2]=Math.cos(i+elapsed*.2)*(.1+h*.07);}
    smoke.geometry.attributes.position.needsUpdate=true;
    animateDog();animateResidents(state);updateActorBatches();
    for(const cloth of laundry)cloth.rotation.z=Math.sin(elapsed*(raining?1.3:.7)+cloth.userData.phase)*(raining?.15:.06);
    for(const rotor of windRotors)rotor.rotation.z=elapsed*(raining?2.7:1.0);
    rain.visible=!!raining;
    if(raining){for(let i=0;i<440;i++){const at=i*6,b=i*3;const ry=(rainBase[b+1]-elapsed*15)%32;const y=ry<0?ry+32:ry;rainPositions[at]=rainBase[b];rainPositions[at+1]=y;rainPositions[at+2]=rainBase[b+2];rainPositions[at+3]=rainBase[b]-.14;rainPositions[at+4]=y-.9;rainPositions[at+5]=rainBase[b+2]+.09;}rain.geometry.attributes.position.needsUpdate=true;}
    updateCamera(frameDelta);
    renderer.render(scene,camera);
    measuredFrames++;if(elapsed-metricWindow>=1){renderFps=Math.round(measuredFrames/(elapsed-metricWindow));measuredFrames=0;metricWindow=elapsed;}
  }
    const down=e=>{if(e.button!==0)return;pointer={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture?.(e.pointerId);renderer.domElement.style.cursor='grabbing';};
  const move=e=>{if(!pointer)return;yaw=clamp(yaw+(e.clientX-pointer.x)*.003,-.58,.58);pitch=clamp(pitch+(e.clientY-pointer.y)*.0015,-.08,.24);pointer={x:e.clientX,y:e.clientY};};
  const up=()=>{pointer=null;renderer.domElement.style.cursor='grab';};
  const wheel=e=>{e.preventDefault();zoom=clamp(zoom+e.deltaY*.00065,.7,1.4);};
  renderer.domElement.style.cursor='grab';
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);
  renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
  renderer.domElement.addEventListener('wheel',wheel,{passive:false});
  const observer=new ResizeObserver(resize);observer.observe(container);
  buildWorld(initialState);resize();update(initialState,0);
  return {
    update,resize,
    getMetrics(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,renderFps,occupiedRoofs:roofCamps.filter(roof=>roof.group.visible).length,visibleResidents:residentActors.filter(actor=>actor.visible).length};},
    setQuality(value){quality=value==='low'?'low':'high';renderer.shadowMap.enabled=quality==='high';resize();update(lastState,0);},
    setView(value){view=value==='wide'?'wide':'camp';zoom=1;yaw=0;pitch=0;},
    setFocus(buildingId='home'){focusId=buildingId;view='camp';zoom=1;yaw=0;pitch=0;},
    dispose(){if(disposed)return;disposed=true;observer.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);renderer.domElement.removeEventListener('wheel',wheel);disposeWorld();skyGeometry.dispose();skyMaterial.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
  };
}
