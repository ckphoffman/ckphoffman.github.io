// ---- Site config: edit these two lines ----
const EMAIL = "anne.puyuxiao@outlook.com";  // leave empty to hide email buttons
const REPO_URL = "https://github.com/ckphoffman/ckphoffman.github.io";  // enables "Source" links

const demos = [
  {
    slug: "camera-angles",
    title: "Camera Angle Studio",
    blurb: "A 3D room with a full-body subject. Tilt, pan, roll and move the camera and see the bystander view and the resulting photo side by side.",
    tags: ["Three.js", "WebGL"],
  },
  {
    slug: "dof",
    title: "Depth of Field Lab",
    blurb: "Calculator for depth of field, pixel density and circle of confusion, with a parameter sweep chart and a test suite for the maths.",
    tags: ["JavaScript", "Tested"],
  },
  {
    slug: "entrance-pupil",
    title: "Entrance Pupil Explorer",
    blurb: "Drag focal length and f-number and watch the entrance pupil (D = f / N) redraw at true physical scale.",
    tags: ["SVG", "Interactive"],
  },
  {
    slug: "git-explained",
    title: "How Git Works",
    blurb: "Click through add, commit, branch, merge and push and watch files move between working tree, staging area, local repo and remote.",
    tags: ["Education", "State machine"],
  },
  {
    slug: "latex-journey",
    title: "The LaTeX Compile Journey",
    blurb: "An animated walk from .tex source to PDF: tokenising, macro expansion, box building, line and page breaking.",
    tags: ["Education", "Animation"],
  },
];

const tools = [
  {
    title: "Stock Data & Volatility Toolkit",
    blurb: "Collects daily and minute-level market data, calculates ATR and intraday volatility, and ranks stocks by large daily moves, with CSV exports.",
    tags: ["Python", "pandas", "Market data"],
  },
  {
    slug: "douyin-message-exporter",
    title: "Message Exporter (JSON/CSV)",
    blurb: "Built spec-first: a written design doc and implementation plan, then tests for data safety and selection logic.",
    tags: ["Spec → plan → tests", "CSV"],
  },
  {
    slug: "douyin-im-exporter",
    title: "Chat HTML Exporter",
    blurb: "Exports chat history to a self-contained HTML archive using cursor-based pagination, with unit tests for formatting.",
    tags: ["Pagination", "Unit tests"],
  },
  {
    slug: "douyin-dm-downloader",
    title: "DM History Downloader",
    blurb: "Downloads the full history with one contact as HTML and TXT, replacing media with readable placeholders.",
    tags: ["Content script"],
  },
  {
    slug: "douyin-works-downloader",
    title: "My Works Downloader",
    blurb: "Lists and downloads the videos I've published, including private ones, from my own profile.",
    tags: ["Downloads API"],
  },
  {
    slug: "douyin-self-archive",
    title: "Self Archive",
    blurb: "A local-first utility to organise and back up my own published posts inside an authenticated session.",
    tags: ["Local-first"],
  },
  {
    slug: "douyin-notification-links",
    title: "Notification Link Finder",
    blurb: "Reveals the linked video behind a notification and filters the feed to replies or likes in one click.",
    tags: ["UX"],
  },
];

const srcUrl = (path) => (REPO_URL ? `${REPO_URL}/tree/main/${path}` : null);

function demoCard(p, i) {
  const el = document.createElement("article");
  el.className = "demo reveal";
  const href = `demos/${p.slug}/`;
  const src = srcUrl(`demos/${p.slug}`);
  el.innerHTML = `
    <a class="thumb" href="${href}" target="_blank" rel="noopener" aria-label="Open ${p.title}"><img src="assets/shots/${p.slug}.jpg" alt="Screenshot of ${p.title}" loading="lazy"></a>
    <div class="demo-body">
      <p class="demo-num">${String(i + 1).padStart(2, "0")}</p>
      <h3><a href="${href}" target="_blank" rel="noopener">${p.title}</a></h3>
      <p>${p.blurb}</p>
      <div class="links">
        <a class="btn small primary" href="${href}" target="_blank" rel="noopener">Open live <span aria-hidden="true">↗</span></a>
        ${src ? `<a class="arrow-link" href="${src}" target="_blank" rel="noopener">Source ↗</a>` : ""}
      </div>
    </div>`;
  return el;
}

function toolRow(p) {
  const el = document.createElement("article");
  el.className = "tool reveal";
  const src = p.slug ? srcUrl(`projects/${p.slug}`) : null;
  el.innerHTML = `
    <h4>${p.title}</h4>
    <p>${p.blurb}</p>
    <div class="tool-foot">
      <div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
      ${src ? `<a class="arrow-link" href="${src}" target="_blank" rel="noopener">Source ↗</a>` : ""}
    </div>`;
  return el;
}

document.getElementById("demo-grid").append(...demos.map(demoCard));
document.getElementById("tool-grid").append(...tools.map(toolRow));

// Demos + tools + YouTube v1/v2 + dissertation + traffic system.
document.getElementById("count").textContent = demos.length + tools.length + 2 + 2;
document.getElementById("demo-count").textContent = demos.length;

document.querySelectorAll("[data-src]").forEach((a) => {
  const url = srcUrl(a.dataset.src);
  if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; } else a.remove();
});

const emailLink = document.getElementById("email-link");
if (EMAIL) {
  emailLink.href = `mailto:${EMAIL}`;
  emailLink.textContent = EMAIL;
  document.getElementById("hero-email").href = `mailto:${EMAIL}`;
} else {
  emailLink.remove();
}

const repoLink = document.getElementById("repo-link");
if (REPO_URL) repoLink.href = REPO_URL; else repoLink.remove();

document.getElementById("year").textContent = new Date().getFullYear();


const nav = document.querySelector(".nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// Fade sections in as they enter the viewport.
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("in"));
}
