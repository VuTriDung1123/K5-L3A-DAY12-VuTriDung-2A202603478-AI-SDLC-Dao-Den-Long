import * as THREE from "three";
import { createHelloState, stepHelloState } from "../core/helloSim.js";

export function mountHelloScene(container: HTMLElement, hudInfo: HTMLElement | null): () => void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b14);
  scene.fog = new THREE.FogExp2(0x070b14, 0.08);

  const camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / Math.max(1, container.clientHeight),
    0.1,
    100
  );
  camera.position.set(0, 4.5, 8);
  camera.lookAt(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0x3a4a6b, 0.7);
  scene.add(ambient);

  const islandGeo = new THREE.CylinderGeometry(4.2, 4.8, 0.6, 24);
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x1b2538, roughness: 0.9 });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.position.y = -0.3;
  scene.add(island);

  const pillarGeo = new THREE.CylinderGeometry(0.25, 0.35, 1.4, 8);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2f3b52, roughness: 0.8 });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.set(0, 0.7, 0);
  scene.add(pillar);

  const lanternGeo = new THREE.OctahedronGeometry(0.35, 0);
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffc46b,
    emissive: 0xff9b2f,
    emissiveIntensity: 1.5,
  });
  const lanternMesh = new THREE.Mesh(lanternGeo, lanternMat);
  scene.add(lanternMesh);

  const lanternLight = new THREE.PointLight(0xffb454, 4, 14);
  scene.add(lanternLight);

  let simState = createHelloState(42);
  let accumulator = 0;
  let lastTime = performance.now();
  let frameId = 0;
  const fixedDt = 1 / 30;

  const onResize = (): void => {
    const width = container.clientWidth;
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener("resize", onResize);

  const animate = (now: number): void => {
    const delta = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    accumulator += delta;

    while (accumulator >= fixedDt) {
      simState = stepHelloState(simState, fixedDt);
      accumulator -= fixedDt;
    }

    lanternMesh.position.set(simState.lanternPos.x, simState.lanternPos.y, simState.lanternPos.z);
    lanternMesh.rotation.y = simState.angle;
    lanternLight.position.copy(lanternMesh.position);
    lanternLight.intensity = 3.5 * simState.glow;

    if (hudInfo) {
      hudInfo.textContent = `Step ${simState.step} | Lantern (${simState.lanternPos.x.toFixed(2)}, ${simState.lanternPos.y.toFixed(2)}, ${simState.lanternPos.z.toFixed(2)})`;
    }

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  };

  frameId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener("resize", onResize);
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };
}
