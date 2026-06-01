import { marked } from "marked";
import * as demos from "./demos.js";

const PROJECTS_HEADING = "Projects";
const EXPERIENCE_HEADING = "Experience";
const ACHIEVEMENTS_HEADING = "In-School Achievements";

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
    console.log(`[md] Section not found: "${heading}"`, {
      normalized: normalizeHeading(heading),
      headings: tokens
        .filter((token) => token.type === "heading")
        .map((token) => ({ text: token.text, normalized: normalizeHeading(token.text) })),
    });
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

  projects.forEach((project, index) => {
    const details = document.createElement("details");
    if (index === 0) {
      details.open = true;
    }

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
  typesetMath([accordion, introTarget]);
};

const renderExperience = (tokens) => {
  const section = getSection(tokens, EXPERIENCE_HEADING);
  if (!section) {
    setFallback("experience-fallback", "Experience section not found in content.md.");
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

  const introTarget = document.getElementById("experience-intro");
  if (introTarget && introTokens.length > 0) {
    introTarget.innerHTML = marked.parser(introTokens);
  }

  const entriesTarget = document.getElementById("experience-entries");
  if (!entriesTarget) {
    setFallback("experience-fallback", "Experience container missing.");
    return;
  }

  entriesTarget.innerHTML = "";

  if (entries.length === 0) {
    setFallback("experience-fallback", "No experience entries found.");
    return;
  }

  entries.forEach((entry) => {
    const tokensCopy = [...entry.tokens];
    let meta = null;
    if (tokensCopy[0]?.type === "paragraph") {
      const match = tokensCopy[0].text.match(/^(Dates?|Period)\s*:\s*(.+)$/i);
      if (match) {
        meta = match[2].trim();
        tokensCopy.shift();
      }
    }

    const article = document.createElement("article");
    article.className = "entry";

    const header = document.createElement("div");
    header.className = "entry-header";

    const title = document.createElement("h3");
    title.textContent = entry.title;
    header.appendChild(title);

    if (meta) {
      const metaSpan = document.createElement("span");
      metaSpan.className = "entry-meta";
      metaSpan.textContent = meta;
      header.appendChild(metaSpan);
    }

    const body = document.createElement("div");
    body.className = "entry-body";
    body.innerHTML = marked.parser(tokensCopy);

    article.appendChild(header);
    article.appendChild(body);
    entriesTarget.appendChild(article);
  });

  clearFallback("experience-fallback");

  typesetMath([entriesTarget, introTarget]);
};

const renderSection = (tokens, heading, containerId, fallbackId) => {
  const section = getSection(tokens, heading);
  if (!section) {
    setFallback(fallbackId, `${heading} section not found in content.md.`);
    return;
  }

  const target = document.getElementById(containerId);
  if (!target) {
    setFallback(fallbackId, `${heading} container missing.`);
    return;
  }

  target.innerHTML = marked.parser(section.tokens);
  clearFallback(fallbackId);
  typesetMath([target]);
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

const loadContent = async () => {
  try {
    console.log("[md] Loading content.md...");
    const response = await fetch("/content.md", { cache: "no-store" });
    if (!response.ok) {
      console.log("[md] content.md fetch failed", response.status);
      setFallback("projects-fallback", "Unable to load content.md.");
      setFallback("experience-fallback", "Unable to load content.md.");
      setFallback("achievements-fallback", "Unable to load content.md.");
      return;
    }
    const markdown = await response.text();
    console.log("[md] content.md loaded", markdown.length);

    if (!marked || typeof marked.lexer !== "function") {
      console.log("[md] marked not available");
      setFallback("projects-fallback", "Markdown parser unavailable.");
      setFallback("experience-fallback", "Markdown parser unavailable.");
      setFallback("achievements-fallback", "Markdown parser unavailable.");
      return;
    }

    const tokens = marked.lexer(markdown);
    console.log("[md] headings", tokens.filter((token) => token.type === "heading").map((t) => t.text));
    renderProjects(tokens);
    renderExperience(tokens);
    renderSection(tokens, ACHIEVEMENTS_HEADING, "achievements-content", "achievements-fallback");
  } catch (error) {
    console.log("[md] content.md load error", error);
    setFallback("projects-fallback", "Failed to load content.md.");
    setFallback("experience-fallback", "Failed to load content.md.");
    setFallback("achievements-fallback", "Failed to load content.md.");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadContent();
});
