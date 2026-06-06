import * as THREE from "three";

const setupRenderer = (container) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);
  return renderer;
};

export const demo_1 = (container) => {
  const width = container.clientWidth || 600;
  const height = container.clientHeight || 240;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0.4, 5.2);

  const renderer = setupRenderer(container);

  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(3, 4, 6);
  scene.add(ambient, key);

  const geometry = new THREE.TorusKnotGeometry(0.5, 0.16, 120, 16);
  const material = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.2,
    roughness: 0.55,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(0.4, 0.3, 0);
  scene.add(mesh);

  const render = () => {
    renderer.render(scene, camera);
  };

  render();

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onPointerDown = (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!dragging) {
      return;
    }
    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    mesh.rotation.y += deltaX * 0.01;
    mesh.rotation.x += deltaY * 0.01;
    render();
  };

  const onPointerUp = (event) => {
    dragging = false;
    renderer.domElement.releasePointerCapture(event.pointerId);
  };

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", () => {
    dragging = false;
  });

  const resize = () => {
    const nextWidth = container.clientWidth;
    const nextHeight = container.clientHeight;
    if (!nextWidth || !nextHeight) {
      return;
    }
    renderer.setSize(nextWidth, nextHeight, false);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    render();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(container);
};

export const vae_structure_demo = demo_1;
