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

const SSL_ASSET_ROOT = `${import.meta.env.BASE_URL}ssl/`;
const SSL_SCRIPT_ROOT = `${SSL_ASSET_ROOT}scripts/`;
const PYODIDE_RUNTIME_ROOT = "/home/pyodide/ssl";
const LOADED_PROGRAMMING_MODULES = new Set();
const PROGRAMMING_SCRIPTS = {
  welcome: "welcome.dbg",
  math: "math.dbg",
  timestable: "timestable.dbg",
  input: "input.dbg",
};
const PROGRAMMING_SCRIPT_LABELS = {
  welcome: "Welcome",
  math: "Math",
  timestable: "Times table",
  input: "Input",
};

const PROGRAMMING_KEYWORDS = new Set([
  "set",
  "sig",
  "jmp",
  "label",
  "ret",
  "pop",
  "push",
  "gt",
  "lt",
  "eq",
  "cjmp",
  "hjmp",
  "chjmp",
  "add",
  "sub",
  "div",
  "mul",
]);

const PROGRAMMING_REGISTERS = new Set([
  "a",
  "b",
  "c",
  "stdin",
  "stdout",
  "result",
  "accumulator",
  "p1",
  "p2",
  "p3",
]);

const PROGRAMMING_JUMP_KEYWORDS = new Set(["jmp", "cjmp", "hjmp", "chjmp"]);

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeProgrammingHtml = (text) =>
  String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char);

const wrapProgrammingToken = (className, text) =>
  `<span class="${className}">${escapeProgrammingHtml(text)}</span>`;

const renderProgrammingLine = (line) => {
  let html = "";
  let index = 0;
  let nextRole = null;

  while (index < line.length) {
    const char = line[index];

    if (/\s/.test(char)) {
      let end = index + 1;
      while (end < line.length && /\s/.test(line[end])) {
        end += 1;
      }
      html += escapeProgrammingHtml(line.slice(index, end));
      index = end;
      continue;
    }

    if (char === "%") {
      html += wrapProgrammingToken("ssl-comment", line.slice(index));
      break;
    }

    if (char === '"') {
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === "\\" && end + 1 < line.length) {
          end += 2;
          continue;
        }
        if (line[end] === '"') {
          end += 1;
          break;
        }
        end += 1;
      }
      html += wrapProgrammingToken("ssl-string", line.slice(index, end));
      index = end;
      continue;
    }

    if (char === "#" && (index === 0 || /\s/.test(line[index - 1]))) {
      let end = index + 1;
      while (end < line.length && /[A-Za-z0-9_]/.test(line[end])) {
        end += 1;
      }
      html += wrapProgrammingToken("ssl-directive", line.slice(index, end));
      index = end;
      continue;
    }

    if (char === "[") {
      let end = index + 1;
      while (end < line.length && line[end] !== "]") {
        end += 1;
      }
      if (end < line.length) {
        end += 1;
        html += wrapProgrammingToken("ssl-variable", line.slice(index, end));
        index = end;
        continue;
      }
    }

    if (char === "-" ? /[0-9]/.test(line[index + 1] || "") : /[0-9]/.test(char)) {
      const numberMatch = line.slice(index).match(/^-?(?:\d+(?:\.\d+)?|\.\d+)/);
      if (numberMatch) {
        html += wrapProgrammingToken("ssl-number", numberMatch[0]);
        index += numberMatch[0].length;
        continue;
      }
    }

    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < line.length && /[A-Za-z0-9_]/.test(line[end])) {
        end += 1;
      }
      const word = line.slice(index, end);
      let className = "ssl-identifier";

      if (nextRole === "label") {
        className = "ssl-label";
      } else if (nextRole === "signal") {
        className = "ssl-signal";
      } else if (nextRole === "jump") {
        className = "ssl-label-ref";
      } else if (PROGRAMMING_KEYWORDS.has(word)) {
        className = "ssl-keyword";
      } else if (PROGRAMMING_REGISTERS.has(word)) {
        className = "ssl-register";
      } else {
        let cursor = end;
        while (cursor < line.length && /\s/.test(line[cursor])) {
          cursor += 1;
        }
        if (line[cursor] === ":") {
          className = "ssl-label";
        }
      }

      html += wrapProgrammingToken(className, word);
      index = end;

      if (PROGRAMMING_KEYWORDS.has(word)) {
        if (word === "label") {
          nextRole = "label";
        } else if (word === "sig") {
          nextRole = "signal";
        } else if (PROGRAMMING_JUMP_KEYWORDS.has(word)) {
          nextRole = "jump";
        } else {
          nextRole = null;
        }
      } else {
        nextRole = null;
      }
      continue;
    }

    if ("+-*/".includes(char)) {
      html += wrapProgrammingToken("ssl-operator", char);
      index += 1;
      continue;
    }

    if ("(){}:;,.".includes(char)) {
      html += wrapProgrammingToken("ssl-punctuation", char);
      index += 1;
      continue;
    }

    html += escapeProgrammingHtml(char);
    index += 1;
  }

  return html;
};

const renderProgrammingHighlight = (source) =>
  String(source ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => renderProgrammingLine(line))
    .join("\n");

const extractLinkedModules = (script) => {
  const matches = script.matchAll(/^#link\s+([^\s]+)\s*$/gim);
  return [...new Set(Array.from(matches, (match) => match[1]))];
};

const normalizeProgrammingModule = (moduleName) =>
  moduleName.trim().replace(/^\/+/, "").replace(/\.py$/i, "");

const ANSI_SGR_COLORS = {
  30: "black",
  31: "red",
  32: "green",
  33: "yellow",
  34: "blue",
  35: "magenta",
  36: "cyan",
  37: "white",
  90: "bright-black",
  91: "bright-red",
  92: "bright-green",
  93: "bright-yellow",
  94: "bright-blue",
  95: "bright-magenta",
  96: "bright-cyan",
  97: "bright-white",
};

const ANSI_BG_COLORS = {
  40: "black",
  41: "red",
  42: "green",
  43: "yellow",
  44: "blue",
  45: "magenta",
  46: "cyan",
  47: "white",
  100: "bright-black",
  101: "bright-red",
  102: "bright-green",
  103: "bright-yellow",
  104: "bright-blue",
  105: "bright-magenta",
  106: "bright-cyan",
  107: "bright-white",
};

const createAnsiState = () => ({
  bold: false,
  italic: false,
  underline: false,
  fg: null,
  bg: null,
});

const applyAnsiCodes = (state, codes) => {
  const list = codes.length > 0 ? codes : [0];
  list.forEach((code) => {
    if (code === 0) {
      Object.assign(state, createAnsiState());
      return;
    }
    if (code === 1) {
      state.bold = true;
      return;
    }
    if (code === 3) {
      state.italic = true;
      return;
    }
    if (code === 4) {
      state.underline = true;
      return;
    }
    if (code === 22) {
      state.bold = false;
      return;
    }
    if (code === 23) {
      state.italic = false;
      return;
    }
    if (code === 24) {
      state.underline = false;
      return;
    }
    if (code === 39) {
      state.fg = null;
      return;
    }
    if (code === 49) {
      state.bg = null;
      return;
    }
    if (ANSI_SGR_COLORS[code]) {
      state.fg = ANSI_SGR_COLORS[code];
      return;
    }
    if (ANSI_BG_COLORS[code]) {
      state.bg = ANSI_BG_COLORS[code];
    }
  });
};

const createAnsiSpan = (state, text) => {
  const span = document.createElement("span");
  span.textContent = text;
  if (state.bold) {
    span.classList.add("ansi-bold");
  }
  if (state.italic) {
    span.classList.add("ansi-italic");
  }
  if (state.underline) {
    span.classList.add("ansi-underline");
  }
  if (state.fg) {
    span.classList.add(`ansi-fg-${state.fg}`);
  }
  if (state.bg) {
    span.classList.add(`ansi-bg-${state.bg}`);
  }
  return span;
};

const renderAnsiOutput = (target, rawText) => {
  target.replaceChildren();
  if (!rawText) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const state = createAnsiState();
  const ansiPattern = /\x1b\[([0-9;]*)m/g;
  let cursor = 0;
  let match;

  while ((match = ansiPattern.exec(rawText)) !== null) {
    const text = rawText.slice(cursor, match.index);
    if (text) {
      fragment.appendChild(createAnsiSpan(state, text));
    }
    const codes = match[1]
      ? match[1]
          .split(";")
          .map((value) => Number.parseInt(value, 10))
          .filter(Number.isFinite)
      : [0];
    applyAnsiCodes(state, codes);
    cursor = match.index + match[0].length;
  }

  const tail = rawText.slice(cursor);
  if (tail) {
    fragment.appendChild(createAnsiSpan(state, tail));
  }

  target.appendChild(fragment);
};

const ensureProgrammingModule = async (pyodide, moduleName) => {
  const normalized = normalizeProgrammingModule(moduleName);
  if (!normalized) {
    return;
  }

  const runtimePath = `${PYODIDE_RUNTIME_ROOT}/${normalized}.py`;
  if (LOADED_PROGRAMMING_MODULES.has(runtimePath)) {
    return;
  }

  const response = await fetch(`${SSL_ASSET_ROOT}${normalized}.py`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load ${normalized}.py`);
  }

  const source = await response.text();
  const directory = runtimePath.slice(0, runtimePath.lastIndexOf("/"));
  pyodide.FS.mkdirTree(directory);
  pyodide.FS.writeFile(runtimePath, source, { encoding: "utf8" });
  LOADED_PROGRAMMING_MODULES.add(runtimePath);
};

let programmingRuntimePromise = null;

const loadProgrammingRuntime = async () => {
  if (!programmingRuntimePromise) {
    programmingRuntimePromise = (async () => {
      const [
        { loadPyodide, version: pyodideVersion },
        interpreterResponse,
        browserResponse,
      ] = await Promise.all([
        import("pyodide"),
        fetch(`${SSL_ASSET_ROOT}interpreter.py`, { cache: "no-store" }),
        fetch(`${SSL_ASSET_ROOT}browser.py`, { cache: "no-store" }),
      ]);

      if (!interpreterResponse.ok) {
        throw new Error("Failed to load interpreter.py");
      }
      if (!browserResponse.ok) {
        throw new Error("Failed to load browser.py");
      }
      const [interpreterSource, browserSource] = await Promise.all([
        interpreterResponse.text(),
        browserResponse.text(),
      ]);
      const pyodide = await loadPyodide({
        indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
      });

      pyodide.FS.mkdirTree(PYODIDE_RUNTIME_ROOT);
      pyodide.FS.writeFile(`${PYODIDE_RUNTIME_ROOT}/interpreter.py`, interpreterSource, {
        encoding: "utf8",
      });
      pyodide.FS.writeFile(`${PYODIDE_RUNTIME_ROOT}/browser.py`, browserSource, {
        encoding: "utf8",
      });
      pyodide.runPython(`import sys; sys.path.insert(0, ${JSON.stringify(PYODIDE_RUNTIME_ROOT)}); import browser`);

      const ensureLinkedModules = async (script) => {
        const linkedModules = extractLinkedModules(script);
        await Promise.all(linkedModules.map((moduleName) => ensureProgrammingModule(pyodide, moduleName)));
      };

      const runBrowser = (script) =>
        pyodide.runPython(`import browser; browser.run_browser(${JSON.stringify(script)})`);

      const resumeBrowser = (value) =>
        pyodide.runPython(`import browser; browser.resume_browser(${JSON.stringify(value)})`);

      return { pyodide, ensureLinkedModules, runBrowser, resumeBrowser };
    })().catch((error) => {
      programmingRuntimePromise = null;
      throw error;
    });
  }

  return programmingRuntimePromise;
};

const loadProgrammingScript = async (scriptName) => {
  const filename = PROGRAMMING_SCRIPTS[scriptName] || PROGRAMMING_SCRIPTS.welcome;
  const response = await fetch(`${SSL_SCRIPT_ROOT}${filename}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}`);
  }
  return response.text();
};

export const programming_demo = (container) => {
  container.classList.add("programming-demo-host");
  container.replaceChildren();
  const initialScriptPromise = loadProgrammingScript("welcome");
  const wrapper = container.parentElement;
  let isExpanded = false;

  const toolbar = document.createElement("div");
  toolbar.className = "playground-toolbar";

  const title = document.createElement("p");
  title.className = "playground-title no-indent";
  title.textContent = "Playground";

  const controls = document.createElement("div");
  controls.className = "playground-toolbar-controls";

  const scriptSelect = document.createElement("select");
  scriptSelect.id = "programming-demo-default-script";
  scriptSelect.className = "playground-script-select";
  scriptSelect.setAttribute("aria-label", "Choose default script");
  scriptSelect.title = "Choose default script";
  Object.entries(PROGRAMMING_SCRIPTS).forEach(([value, filename]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = PROGRAMMING_SCRIPT_LABELS[value] || filename.replace(/\.dbg$/i, "");
    scriptSelect.appendChild(option);
  });
  scriptSelect.value = "welcome";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "playground-run";
  button.textContent = "Run code";
  button.disabled = true;

  controls.appendChild(scriptSelect);
  controls.appendChild(button);

  const sizeButton = document.createElement("button");
  sizeButton.type = "button";
  sizeButton.className = "playground-size-toggle";
  sizeButton.textContent = "Widen";
  sizeButton.setAttribute("aria-label", "Widen playground");
  controls.appendChild(sizeButton);

  toolbar.appendChild(title);
  toolbar.appendChild(controls);

  const grid = document.createElement("div");
  grid.className = "playground-grid";

  const inputPanel = document.createElement("label");
  inputPanel.className = "playground-panel";
  inputPanel.htmlFor = "programming-demo-editor";

  const inputLabel = document.createElement("span");
  inputLabel.className = "playground-label";
  inputLabel.textContent = "Input";

  const editorShell = document.createElement("div");
  editorShell.className = "playground-editor-shell";

  const editorHighlight = document.createElement("pre");
  editorHighlight.className = "playground-editor-highlight";
  editorHighlight.setAttribute("aria-hidden", "true");

  const editor = document.createElement("textarea");
  editor.id = "programming-demo-editor";
  editor.className = "playground-editor";
  editor.spellcheck = false;
  editor.autocomplete = "off";
  editor.autocapitalize = "off";
  editor.autocorrect = "off";
  editor.value = "Loading welcome script...";

  editorShell.appendChild(editorHighlight);
  editorShell.appendChild(editor);
  inputPanel.appendChild(inputLabel);
  inputPanel.appendChild(editorShell);

  const outputPanel = document.createElement("div");
  outputPanel.className = "playground-panel";

  const outputLabel = document.createElement("span");
  outputLabel.className = "playground-label";
  outputLabel.textContent = "Output";

  const terminalShell = document.createElement("div");
  terminalShell.className = "playground-terminal-shell";

  const output = document.createElement("div");
  output.id = "programming-demo-output";
  output.className = "playground-terminal-console";
  output.setAttribute("aria-live", "polite");

  const terminalTranscriptPane = document.createElement("div");
  terminalTranscriptPane.className = "playground-terminal-transcript";

  output.appendChild(terminalTranscriptPane);

  outputPanel.appendChild(outputLabel);
  outputPanel.appendChild(terminalShell);
  terminalShell.appendChild(output);

  grid.appendChild(inputPanel);
  grid.appendChild(outputPanel);

  container.appendChild(toolbar);
  container.appendChild(grid);

  const syncEditorHighlight = () => {
    editorHighlight.innerHTML = renderProgrammingHighlight(editor.value);
    editorHighlight.scrollTop = editor.scrollTop;
    editorHighlight.scrollLeft = editor.scrollLeft;
  };

  const syncEditorScroll = () => {
    editorHighlight.scrollTop = editor.scrollTop;
    editorHighlight.scrollLeft = editor.scrollLeft;
  };

  let terminalAwaitingInput = false;

  const scrollTerminalToBottom = () => {
    output.scrollTop = output.scrollHeight;
  };

  const clearTerminal = () => {
    terminalTranscriptPane.replaceChildren();
    terminalAwaitingInput = false;
  };

  const appendTerminalOutput = (text) => {
    if (!text) {
      return;
    }
    const line = document.createElement("div");
    line.className = "playground-terminal-output-chunk";
    renderAnsiOutput(line, text);
    terminalTranscriptPane.appendChild(line);
    scrollTerminalToBottom();
  };

  const askTerminalPrompt = (prompt) =>
    new Promise((resolve) => {
      terminalAwaitingInput = true;
      const promptText = prompt || "Input: ";
      const promptRow = document.createElement("div");
      promptRow.className = "playground-terminal-prompt";

      const promptLabel = document.createElement("span");
      promptLabel.className = "playground-terminal-prompt-label";
      promptLabel.textContent = promptText;

      const promptInput = document.createElement("input");
      promptInput.className = "playground-terminal-prompt-input";
      promptInput.type = "text";
      promptInput.autocomplete = "off";
      promptInput.spellcheck = false;
      promptInput.autocapitalize = "off";
      promptInput.autocorrect = "off";
      promptInput.setAttribute("aria-label", "Terminal input");

      promptRow.appendChild(promptLabel);
      promptRow.appendChild(promptInput);
      terminalTranscriptPane.appendChild(promptRow);
      scrollTerminalToBottom();

      promptInput.value = "";
      promptInput.focus();

      const finishPrompt = () => {
        const value = promptInput.value;
        terminalAwaitingInput = false;
        promptInput.remove();
        const promptValue = document.createElement("span");
        promptValue.className = "playground-terminal-prompt-value";
        promptValue.textContent = value;
        promptRow.appendChild(promptValue);
        scrollTerminalToBottom();
        resolve(value);
      };

      promptInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finishPrompt();
        }
      });
    });

  const renderOutput = async () => {
    try {
      const source = editor.value.trimEnd();
      const runtime = await loadProgrammingRuntime();
      await runtime.ensureLinkedModules(source);
      clearTerminal();
      let nextResult = JSON.parse(runtime.runBrowser(source));
      while (true) {
        appendTerminalOutput(nextResult.output || "");
        if (nextResult.kind === "input") {
          const value = await askTerminalPrompt(nextResult.prompt);
          nextResult = JSON.parse(runtime.resumeBrowser(value));
          continue;
        }
        break;
      }
    } catch (error) {
      clearTerminal();
      appendTerminalOutput(`Interpreter execution failed.\n${error instanceof Error ? error.message : String(error)}`);
      button.disabled = false;
    }
  };

  const setExpanded = (nextExpanded) => {
    isExpanded = nextExpanded;
    if (wrapper) {
      wrapper.classList.toggle("demo-wrap--expanded", isExpanded);
    }
    sizeButton.textContent = isExpanded ? "Narrow" : "Widen";
    sizeButton.setAttribute("aria-label", isExpanded ? "Narrow playground" : "Widen playground");
  };

  button.addEventListener("click", renderOutput);
  sizeButton.addEventListener("click", () => {
    setExpanded(!isExpanded);
  });
  scriptSelect.addEventListener("change", async () => {
    try {
      const selectedScript = scriptSelect.value;
      editorDirty = false;
      editor.value = "Loading script...";
      syncEditorHighlight();
      const script = await loadProgrammingScript(selectedScript);
      if (scriptSelect.value === selectedScript && !editorDirty) {
        editor.value = script;
        syncEditorHighlight();
        clearTerminal();
        await renderOutput();
      }
    } catch (error) {
      clearTerminal();
      appendTerminalOutput(`Failed to load sample script.\n${error instanceof Error ? error.message : String(error)}`);
    }
  });
  editor.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.setRangeText("  ", start, end, "end");
      syncEditorHighlight();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
      event.preventDefault();
      void renderOutput();
    }
  });

  clearTerminal();
  appendTerminalOutput("Loading Pyodide interpreter...");
  let editorDirty = false;
  editor.addEventListener("input", () => {
    editorDirty = true;
    syncEditorHighlight();
  });
  editor.addEventListener("scroll", syncEditorScroll);
  syncEditorHighlight();

  void initialScriptPromise.then((script) => {
    if (!editorDirty && scriptSelect.value === "welcome") {
      editor.value = script;
      syncEditorHighlight();
    }
  }).catch((error) => {
    if (!editorDirty && scriptSelect.value === "welcome") {
      editor.value = `Failed to load welcome.dbg\n${error instanceof Error ? error.message : String(error)}`;
      syncEditorHighlight();
    }
  });

  void loadProgrammingRuntime()
    .then(() => {
      button.disabled = false;
      return renderOutput();
    })
    .catch((error) => {
      button.disabled = false;
      clearTerminal();
      appendTerminalOutput(`Pyodide initialization failed.\n${error instanceof Error ? error.message : String(error)}`);
    });

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
