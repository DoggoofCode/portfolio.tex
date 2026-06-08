import * as THREE from "three";

const LATENT_DIMENSIONS = 20;
const VAE_LATENTS_URL = `${import.meta.env.BASE_URL}vae_content/latents.json`;

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

export const programming_demo = (container) => {
  container.classList.add("programming-demo-host");
  container.replaceChildren();

  const toolbar = document.createElement("div");
  toolbar.className = "playground-toolbar";

  const title = document.createElement("p");
  title.className = "playground-title no-indent";
  title.textContent = "Playground";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "playground-run";
  button.textContent = "Run code";

  toolbar.appendChild(title);
  toolbar.appendChild(button);

  const grid = document.createElement("div");
  grid.className = "playground-grid";

  const inputPanel = document.createElement("label");
  inputPanel.className = "playground-panel";
  inputPanel.htmlFor = "programming-demo-editor";

  const inputLabel = document.createElement("span");
  inputLabel.className = "playground-label";
  inputLabel.textContent = "Input";

  const editor = document.createElement("textarea");
  editor.id = "programming-demo-editor";
  editor.className = "playground-editor";
  editor.spellcheck = false;
  editor.autocomplete = "off";
  editor.autocapitalize = "off";
  editor.autocorrect = "off";
  editor.value = 'PRINT "Hello, world!"\nSET value = 42\nPRINT value';

  inputPanel.appendChild(inputLabel);
  inputPanel.appendChild(editor);

  const outputPanel = document.createElement("div");
  outputPanel.className = "playground-panel";

  const outputLabel = document.createElement("span");
  outputLabel.className = "playground-label";
  outputLabel.textContent = "Output";

  const output = document.createElement("pre");
  output.id = "programming-demo-output";
  output.className = "playground-output";
  output.setAttribute("aria-live", "polite");

  outputPanel.appendChild(outputLabel);
  outputPanel.appendChild(output);

  grid.appendChild(inputPanel);
  grid.appendChild(outputPanel);

  const renderOutput = () => {
    const source = editor.value.trimEnd();
    output.textContent = source;
  };

  button.addEventListener("click", renderOutput);
  editor.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
      event.preventDefault();
      renderOutput();
    }
  });

  container.appendChild(toolbar);
  container.appendChild(grid);
  renderOutput();
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

const colorForLabel = (label) => {
  const normalized = Number.isFinite(label) ? Math.abs(Math.trunc(label)) : 0;
  return new THREE.Color().setHSL(((normalized % 10) * 0.1 + 0.02) % 1, 0.52, 0.48);
};

const buildLatentUrl = () => VAE_LATENTS_URL;

let vaeLatentsPromise = null;

const loadLatents = async () => {
  if (!vaeLatentsPromise) {
    vaeLatentsPromise = (async () => {
      const response = await fetch(buildLatentUrl(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load ${buildLatentUrl()}`);
      }

      const raw = await response.json();
      if (!Array.isArray(raw)) {
        throw new Error("Latent data must be an array.");
      }

      return raw
        .map((entry) => ({
          label: Number(entry?.label),
          z: Array.isArray(entry?.z) ? entry.z.map((value) => Number(value)) : [],
        }))
        .filter((entry) => entry.z.length >= LATENT_DIMENSIONS && entry.z.every(Number.isFinite));
    })();
  }

  return vaeLatentsPromise;
};

const createSelect = (value, onChange) => {
  const select = document.createElement("select");
  select.className = "vae-scatter-select";

  for (let i = 0; i < LATENT_DIMENSIONS; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `d${String(i + 1).padStart(2, "0")}`;
    select.appendChild(option);
  }

  select.value = String(value);
  select.addEventListener("change", () => onChange(Number.parseInt(select.value, 10)));
  return select;
};

const createLegend = (labels) => {
  const legend = document.createElement("div");
  legend.className = "vae-scatter-legend";

  labels.forEach((label) => {
    const item = document.createElement("span");
    item.className = "vae-scatter-legend-item";

    const swatch = document.createElement("span");
    swatch.className = "vae-scatter-swatch";
    swatch.style.background = `#${colorForLabel(label).getHexString()}`;

    const text = document.createElement("span");
    text.textContent = String(label);

    item.appendChild(swatch);
    item.appendChild(text);
    legend.appendChild(item);
  });

  return legend;
};

const createPointTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) {
   return null;
  }

  const gradient = context.createRadialGradient(32, 32, 4, 32, 32, 30);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.45, "rgba(255,255,255,1)");
  gradient.addColorStop(0.7, "rgba(255,255,255,0.75)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

const isDesktopInteractive = () =>
  window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches;

export const vae_structure_demo = async (container) => {
  const host = document.createElement("div");
  host.className = "vae-scatter-demo";
  container.replaceChildren(host);
  container.classList.add("vae-scatter-host");

  const chart = document.createElement("div");
  chart.className = "vae-scatter-chart";

  let latents = [];
  let currentX = 0;
  let currentY = 1;
  const desktopInteractive = isDesktopInteractive();

  const footer = document.createElement("div");
  footer.className = "vae-scatter-footer";

  const legend = createLegend([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  const controls = document.createElement("div");
  controls.className = "vae-scatter-controls";

  const renderer = setupRenderer(chart);
  renderer.setClearColor(0xffffff, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;

  const plotGroup = new THREE.Group();
  scene.add(plotGroup);

  const gridMaterial = new THREE.LineBasicMaterial({
   color: 0xd6d6d6,
   transparent: true,
   opacity: 0.65,
  });
  const axisMaterial = new THREE.LineBasicMaterial({
   color: 0x8b8b8b,
   transparent: true,
   opacity: 0.9,
  });
  const frameMaterial = new THREE.LineBasicMaterial({
   color: 0x5f5f5f,
   transparent: true,
   opacity: 0.35,
  });

  const gridLines = new THREE.LineSegments(new THREE.BufferGeometry(), gridMaterial);
  const axisLines = new THREE.LineSegments(new THREE.BufferGeometry(), axisMaterial);
  const frameLines = new THREE.LineSegments(new THREE.BufferGeometry(), frameMaterial);
  plotGroup.add(gridLines, axisLines, frameLines);

  const pointTexture = createPointTexture();
  const pointsGeometry = new THREE.BufferGeometry();
  const pointsMaterial = new THREE.PointsMaterial({
   size: 4.5,
   map: pointTexture || undefined,
   alphaMap: pointTexture || undefined,
   alphaTest: 0.06,
   vertexColors: true,
   transparent: true,
   opacity: 0.95,
   depthWrite: false,
   sizeAttenuation: false,
  });
  const points = new THREE.Points(pointsGeometry, pointsMaterial);
  plotGroup.add(points);

  const xSelect = createSelect(0, (value) => {
   currentX = value;
   updateAxes();
  });
  const ySelect = createSelect(1, (value) => {
   currentY = value;
   updateAxes();
  });

  controls.appendChild(xSelect);
  controls.appendChild(ySelect);
  footer.appendChild(legend);
  footer.appendChild(controls);

  host.appendChild(chart);
  host.appendChild(footer);

  chart.classList.toggle("is-interactive", desktopInteractive);
  chart.style.touchAction = desktopInteractive ? "none" : "auto";

  let updatePlot = () => {};
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panX = 0;
  let panY = 0;
  let zoom = 1;

  const clampZoom = (value) => Math.min(8, Math.max(0.5, value));

  const applyCamera = () => {
   camera.zoom = zoom;
   camera.position.x = panX;
   camera.position.y = panY;
   camera.updateProjectionMatrix();
   updatePlot();
  };

  const updateAxes = () => {
   updatePlot();
  };

  const resizeCamera = () => {
   const width = chart.clientWidth || 1;
   const height = chart.clientHeight || 1;
   const aspect = width / height;
   renderer.setSize(width, height, false);
   camera.left = -aspect;
   camera.right = aspect;
   camera.top = 1;
   camera.bottom = -1;
   camera.updateProjectionMatrix();
   updatePlot();
  };

  updatePlot = () => {
   if (!latents.length) {
     return;
   }

   const width = chart.clientWidth || 1;
   const height = chart.clientHeight || 1;
   const aspect = width / height;
   const xExtent = aspect;
   const yExtent = 1;
   const worldWidth = (camera.right - camera.left) / camera.zoom;
   const worldHeight = (camera.top - camera.bottom) / camera.zoom;
   const centerX = camera.position.x;
   const centerY = camera.position.y;

   let xMin = Infinity;
   let xMax = -Infinity;
   let yMin = Infinity;
   let yMax = -Infinity;

   for (const entry of latents) {
     const x = entry.z[currentX];
     const y = entry.z[currentY];
     if (x < xMin) xMin = x;
     if (x > xMax) xMax = x;
     if (y < yMin) yMin = y;
     if (y > yMax) yMax = y;
   }

   const xRange = xMax - xMin || 1;
   const yRange = yMax - yMin || 1;
   const positions = new Float32Array(latents.length * 3);
   const colors = new Float32Array(latents.length * 3);

   latents.forEach((entry, index) => {
     const x = ((entry.z[currentX] - xMin) / xRange) * 2 - 1;
     const y = ((entry.z[currentY] - yMin) / yRange) * 2 - 1;
     const color = colorForLabel(entry.label);
     const offset = index * 3;
     positions[offset] = x * xExtent * 0.88;
     positions[offset + 1] = y * yExtent * 0.88;
     positions[offset + 2] = 0;
     colors[offset] = color.r;
     colors[offset + 1] = color.g;
     colors[offset + 2] = color.b;
   });

   pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
   pointsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
   pointsGeometry.computeBoundingSphere();

   const gridSegments = [];
   const step = 0.5;
   const spanX = Math.max(worldWidth * 5, 8);
   const spanY = Math.max(worldHeight * 5, 8);
   const startX = Math.floor((centerX - spanX) / step) * step;
   const endX = Math.ceil((centerX + spanX) / step) * step;
   const startY = Math.floor((centerY - spanY) / step) * step;
   const endY = Math.ceil((centerY + spanY) / step) * step;

   for (let x = startX; x <= endX; x += step) {
     gridSegments.push(x, startY, 0, x, endY, 0);
   }

   for (let y = startY; y <= endY; y += step) {
     gridSegments.push(startX, y, 0, endX, y, 0);
   }

   const frame = [];

   const axes = [
     0, startY, 0, 0, endY, 0,
     startX, 0, 0, endX, 0, 0,
   ];

   const gridGeometry = new THREE.BufferGeometry();
   gridGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(gridSegments), 3));
   gridLines.geometry.dispose();
   gridLines.geometry = gridGeometry;

   const axisGeometry = new THREE.BufferGeometry();
   axisGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(axes), 3));
   axisLines.geometry.dispose();
   axisLines.geometry = axisGeometry;

   const frameGeometry = new THREE.BufferGeometry();
   frameGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(frame), 3));
   frameLines.geometry.dispose();
   frameLines.geometry = frameGeometry;

   renderer.render(scene, camera);
  };

  if (desktopInteractive) {
   chart.style.cursor = "grab";

   const onPointerDown = (event) => {
     if (event.button !== 0) {
       return;
     }
     isDragging = true;
     dragStartX = event.clientX;
     dragStartY = event.clientY;
     panX = camera.position.x;
     panY = camera.position.y;
     chart.style.cursor = "grabbing";
     chart.setPointerCapture(event.pointerId);
   };

   const onPointerMove = (event) => {
     if (!isDragging) {
       return;
     }
     const width = chart.clientWidth || 1;
     const height = chart.clientHeight || 1;
     const viewportScale = Math.min(0.08, 60 / Math.max(width, height));
     const worldWidth = (camera.right - camera.left) / camera.zoom;
     const worldHeight = (camera.top - camera.bottom) / camera.zoom;
     const deltaX = event.clientX - dragStartX;
     const deltaY = event.clientY - dragStartY;
     panX -= (deltaX / width) * worldWidth * viewportScale;
     panY += (deltaY / height) * worldHeight * viewportScale;
     applyCamera();
   };

   const onPointerUp = (event) => {
     isDragging = false;
     chart.style.cursor = "grab";
     if (chart.hasPointerCapture(event.pointerId)) {
       chart.releasePointerCapture(event.pointerId);
     }
   };

   const onWheel = (event) => {
     event.preventDefault();
     const width = chart.clientWidth || 1;
     const height = chart.clientHeight || 1;
     const viewportScale = Math.min(0.5, 420 / Math.max(width, height));
     const factor = Math.exp(-event.deltaY * 0.0012 * viewportScale);
     zoom = clampZoom(zoom * factor);
     applyCamera();
   };

   chart.addEventListener("pointerdown", onPointerDown);
   chart.addEventListener("pointermove", onPointerMove);
   chart.addEventListener("pointerup", onPointerUp);
   chart.addEventListener("pointerleave", () => {
     isDragging = false;
     chart.style.cursor = "grab";
   });
   chart.addEventListener("wheel", onWheel, { passive: false });
  }

  const observer = new ResizeObserver(() => {
   resizeCamera();
   applyCamera();
  });
  observer.observe(chart);

  try {
   latents = await loadLatents();
   resizeCamera();
   updatePlot();
  } catch (error) {
   console.error(error);
  }
};
