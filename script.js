import { marked } from "marked";
import * as demos from "./demos.js";
import { RESOURCE_BASE } from "./resource-config.js";
import { DEV_MODE, SITE_PASSWORD, ALLOW_LOCAL_BYPASS } from "./site-config.js";

const PROJECTS_HEADING = "Projects";
const ACHIEVEMENTS_HEADING = "In-School Achievements";
const APPENDIX_HEADING = "Appendix Notes";
const PASSWORD_KEY = "portfolio_unlocked";

const normalizeHeading = (text) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const setFallback = (id, message) => {
  const fallback = document.getElementById(id);
  if (fallback) {
    fallback.textContent = message;
  }
};

const clearFallback = (id) => {
  const fallback = document.getElementById(id);
  if (fallback) {
    fallback.remove();
  }
};

const stripDevBlocks = (markdown) =>
  markdown.replace(/<!--\s*dev:start\s*-->[\s\S]*?<!--\s*dev:end\s*-->\s*/gi, "");

const isLocalHost = () =>
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname) ||
  window.location.hostname.endsWith(".local");

const shouldRequirePassword = () => {
  if (!DEV_MODE) {
    return false;
  }
  if (ALLOW_LOCAL_BYPASS && isLocalHost()) {
    return false;
  }
  return Boolean(SITE_PASSWORD && SITE_PASSWORD.trim().length > 0);
};

const lockSite = () => {
  document.body.classList.add("locked");
  const gate = document.getElementById("password-gate");
  if (gate) {
    gate.hidden = false;
  }
};

const unlockSite = () => {
  document.body.classList.remove("locked");
  const gate = document.getElementById("password-gate");
  if (gate) {
    gate.hidden = true;
  }
};

const initGate = () => {
  const gate = document.getElementById("password-gate");
  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-input");
  const error = document.getElementById("gate-error");

  if (!gate || !form || !input) {
    return;
  }

  if (!shouldRequirePassword()) {
    gate.hidden = true;
    document.body.classList.remove("locked");
    return;
  }

  lockSite();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value === SITE_PASSWORD) {
      if (error) {
        error.textContent = "";
      }
      unlockSite();
      input.value = "";
      return;
    }
    if (error) {
      error.textContent = "Incorrect password.";
    }
  });
};

const typesetMath = (nodes) => {
  if (!window.MathJax) {
    return;
  }

  const targets = nodes.filter(Boolean);
  if (targets.length === 0) {
    return;
  }

  const runTypeset = () => {
    if (window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise(targets);
    }
  };

  if (window.MathJax.startup?.promise) {
    window.MathJax.startup.promise.then(runTypeset);
  } else {
    runTypeset();
  }
};

const getSection = (tokens, heading) => {
  const sectionIndex = tokens.findIndex(
    (token) => token.type === "heading" && normalizeHeading(token.text) === normalizeHeading(heading)
  );

  if (sectionIndex === -1) {
    return null;
  }

  const sectionDepth = tokens[sectionIndex].depth;
  const sectionTokens = [];

  for (let i = sectionIndex + 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "heading" && token.depth <= sectionDepth) {
      break;
    }
    sectionTokens.push(token);
  }

  return { depth: sectionDepth, tokens: sectionTokens };
};

const renderProjects = (tokens) => {
  const section = getSection(tokens, PROJECTS_HEADING);
  if (!section) {
    setFallback("projects-fallback", "Projects section not found in content.md.");
    return;
  }

  const { depth: sectionDepth, tokens: sectionTokens } = section;
  const introTokens = [];
  const projects = [];
  let currentProject = null;

  sectionTokens.forEach((token) => {
    if (token.type === "heading" && token.depth === sectionDepth + 1) {
      if (currentProject) {
        projects.push(currentProject);
      }
      currentProject = { title: token.text, tokens: [] };
      return;
    }

    if (currentProject) {
      currentProject.tokens.push(token);
      return;
    }

    introTokens.push(token);
  });

  if (currentProject) {
    projects.push(currentProject);
  }

  const introTarget = document.getElementById("projects-intro");
  if (introTarget && introTokens.length > 0) {
    introTarget.innerHTML = marked.parser(introTokens);
  }

  const accordion = document.getElementById("projects-accordion");
  if (!accordion) {
    setFallback("projects-fallback", "Projects container missing.");
    return;
  }

  accordion.innerHTML = "";

  if (projects.length === 0) {
    setFallback("projects-fallback", "No project entries found.");
    return;
  }

  projects.forEach((project) => {
    const details = document.createElement("details");
    details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = project.title;

    const body = document.createElement("div");
    body.className = "accordion-body";
    body.innerHTML = marked.parser(project.tokens);

    details.appendChild(summary);
    details.appendChild(body);
    accordion.appendChild(details);
  });

  clearFallback("projects-fallback");

  initDemos(accordion);
  initResources(accordion);
  initResources(introTarget);
  typesetMath([accordion, introTarget]);
};

const renderAccordionSection = ({ tokens, heading, introId, accordionId, fallbackId }) => {
  const section = getSection(tokens, heading);
  if (!section) {
    setFallback(fallbackId, `${heading} section not found in content.md.`);
    return;
  }

  const introTarget = document.getElementById(introId);
  const accordion = document.getElementById(accordionId);
  if (!introTarget || !accordion) {
    setFallback(fallbackId, `${heading} container missing.`);
    return;
  }

  const { depth: sectionDepth, tokens: sectionTokens } = section;
  const introTokens = [];
  const entries = [];
  let currentEntry = null;

  sectionTokens.forEach((token) => {
    if (token.type === "heading" && token.depth === sectionDepth + 1) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = { title: token.text, tokens: [] };
      return;
    }

    if (currentEntry) {
      currentEntry.tokens.push(token);
      return;
    }

    introTokens.push(token);
  });

  if (currentEntry) {
    entries.push(currentEntry);
  }

  if (entries.length === 0) {
    introTarget.innerHTML = marked.parser(sectionTokens);
    accordion.innerHTML = "";
    clearFallback(fallbackId);
    initResources(introTarget);
    typesetMath([introTarget]);
    return;
  }

  introTarget.innerHTML = introTokens.length ? marked.parser(introTokens) : "";
  accordion.innerHTML = "";

  entries.forEach((entry) => {
    const details = document.createElement("details");
    details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = entry.title;

    const body = document.createElement("div");
    body.className = "accordion-body";
    body.innerHTML = marked.parser(entry.tokens);

    details.appendChild(summary);
    details.appendChild(body);
    accordion.appendChild(details);
  });

  clearFallback(fallbackId);
  initResources(accordion);
  initResources(introTarget);
  typesetMath([accordion, introTarget]);
};

const initDemos = (container) => {
  if (!container) {
    return;
  }

  const demoNodes = Array.from(container.querySelectorAll("*")).filter((node) =>
    node.tagName.startsWith("DEMO-")
  );

  demoNodes.forEach((node) => {
    if (node.dataset.demoInitialized === "true") {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "demo-wrap";
    const originalParent = node.parentElement;
    if (!originalParent) {
      return;
    }

    originalParent.insertBefore(wrapper, node);
    wrapper.appendChild(node);

    node.classList.add("demo-shell");

    const fnName = node.tagName.toLowerCase().replace(/-/g, "_");
    const fn = demos[fnName] || window[fnName];
    if (typeof fn === "function") {
      fn(node);
      node.dataset.demoInitialized = "true";
      return;
    }

    node.textContent = `Missing ${fnName}()`;
    node.dataset.demoInitialized = "true";
  });
};

const buildResourceUrl = (location) => {
  const base = (RESOURCE_BASE || "").replace(/\/$/, "");
  const path = (location || "").replace(/^\/+/, "");
  return base && path ? `${base}/${path}` : base || path;
};

const isHtmlResponse = (response) => {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("text/html");
};

const isHtmlLocation = (location) => /\.html?$/i.test(location);

let indexSignaturePromise = null;

const getResponseSize = (response) => {
  const contentRange = response.headers.get("content-range");
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)$/);
    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    return Number.parseInt(contentLength, 10);
  }

  return null;
};

const getIndexSignature = async () => {
  if (!indexSignaturePromise) {
    indexSignaturePromise = (async () => {
      try {
        const response = await fetch("/index.html", { cache: "no-store" });
        if (!response.ok) {
          return { etag: null, size: null };
        }

        const text = await response.text();
        const sizeHeader = response.headers.get("content-length");
        const size = sizeHeader ? Number.parseInt(sizeHeader, 10) : text.length;
        const etag = response.headers.get("etag");
        return { etag, size };
      } catch (error) {
        return { etag: null, size: null };
      }
    })();
  }

  return indexSignaturePromise;
};

const isIndexFallback = async (response) => {
  const signature = await getIndexSignature();
  if (!signature) {
    return null;
  }

  const responseEtag = response.headers.get("etag");
  if (signature.etag && responseEtag) {
    return signature.etag === responseEtag;
  }

  const responseSize = getResponseSize(response);
  if (signature.size && responseSize) {
    return signature.size === responseSize;
  }

  return null;
};

const checkResource = async (url, allowHtml) => {
  try {
    const headResponse = await fetch(url, { method: "HEAD" });
    if (headResponse.ok) {
      const isHtml = isHtmlResponse(headResponse);
      if (!isHtml) {
        return true;
      }
      if (!allowHtml) {
        return false;
      }
      const fallback = await isIndexFallback(headResponse);
      if (fallback === false) {
        return true;
      }
      if (fallback === true) {
        return false;
      }
    }
    if (headResponse.status !== 405) {
      return false;
    }
  } catch (error) {
    return false;
  }

  try {
    const getResponse = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
    });
    if (!getResponse.ok) {
      return false;
    }

    const isHtml = isHtmlResponse(getResponse);
    if (!isHtml) {
      return true;
    }
    if (!allowHtml) {
      return false;
    }

    const fallback = await isIndexFallback(getResponse);
    if (fallback === false) {
      return true;
    }
    if (fallback === true) {
      return false;
    }

    return false;
  } catch (error) {
    return false;
  }
};

const initResources = (container) => {
  if (!container) {
    return;
  }

  const resourceNodes = Array.from(container.querySelectorAll("*")).filter((node) =>
    node.tagName.startsWith("RESOURCE-")
  );

  resourceNodes.forEach((node) => {
    const location = node.getAttribute("location");
    if (!location) {
      node.textContent = "Missing resource location.";
      return;
    }

    const label = node.getAttribute("label") || location.split("/").pop() || location;
    const bar = document.createElement("div");
    bar.className = "resource-bar";

    const name = document.createElement("span");
    name.className = "resource-name";
    name.textContent = label;

    const link = document.createElement("a");
    link.className = "resource-link";
    link.href = buildResourceUrl(location);
    link.textContent = "Checking…";
    link.setAttribute("aria-disabled", "true");
    link.classList.add("resource-link--disabled");

    bar.appendChild(name);
    bar.appendChild(link);

    node.replaceWith(bar);

    const url = link.href;
    checkResource(url, isHtmlLocation(location)).then((available) => {
      if (!link.isConnected) {
        return;
      }

      if (available) {
        link.textContent = "Download";
        link.setAttribute("download", "");
        link.removeAttribute("aria-disabled");
        link.classList.remove("resource-link--disabled");
        return;
      }

      link.textContent = "Missing file";
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.classList.add("resource-link--disabled");
    });
  });
};

const loadContent = async () => {
  try {
    const response = await fetch("/content.md", { cache: "no-store" });
    if (!response.ok) {
      setFallback("projects-fallback", "Unable to load content.md.");
      setFallback("achievements-fallback", "Unable to load content.md.");
      setFallback("appendix-fallback", "Unable to load content.md.");
      return;
    }
    const markdown = await response.text();
    const source = DEV_MODE ? markdown : stripDevBlocks(markdown);

    if (!marked || typeof marked.lexer !== "function") {
      setFallback("projects-fallback", "Markdown parser unavailable.");
      setFallback("achievements-fallback", "Markdown parser unavailable.");
      setFallback("appendix-fallback", "Markdown parser unavailable.");
      return;
    }

    const tokens = marked.lexer(source);
    renderProjects(tokens);
    renderAccordionSection({
      tokens,
      heading: ACHIEVEMENTS_HEADING,
      introId: "achievements-intro",
      accordionId: "achievements-accordion",
      fallbackId: "achievements-fallback",
    });
    renderAccordionSection({
      tokens,
      heading: APPENDIX_HEADING,
      introId: "appendix-intro",
      accordionId: "appendix-accordion",
      fallbackId: "appendix-fallback",
    });
  } catch (error) {
    setFallback("projects-fallback", "Failed to load content.md.");
    setFallback("achievements-fallback", "Failed to load content.md.");
    setFallback("appendix-fallback", "Failed to load content.md.");
  }
};

const updateNavVisibility = () => {
  document.body.classList.toggle("scrolled", window.scrollY > 0);
};

document.addEventListener("DOMContentLoaded", () => {
  initGate();
  loadContent();
  updateNavVisibility();
  window.addEventListener("scroll", updateNavVisibility, { passive: true });
});
