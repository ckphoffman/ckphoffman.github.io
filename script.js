// ---- Site config: edit these two lines ----
const EMAIL = "anne.puyuxiao@outlook.com";  // leave empty to hide email buttons
const REPO_URL = "https://github.com/ckphoffman/ckphoffman.github.io";  // enables "Source" links

const demos = [
  {
    slug: "camera-angles",
    title: "Camera Angle Studio",
    blurb: "A 3D room with a full-body subject. Tilt, pan, roll and move the camera and see the bystander view and the resulting photo side by side — plus one-click presets like “long legs” or Dutch angle.",
    tags: ["Three.js", "WebGL", "Photography"],
  },
  {
    slug: "dof",
    title: "Depth of Field Lab",
    blurb: "Calculator for depth of field, sensor pixel density and circle of confusion, with a parameter sweep chart. Pure JS with a Node test suite for the optics maths.",
    tags: ["Vanilla JS", "node --test", "Optics"],
  },
  {
    slug: "entrance-pupil",
    title: "Entrance Pupil Explorer",
    blurb: "Drag focal length and f-number and watch the entrance pupil (D = f / N) redraw at true physical scale.",
    tags: ["SVG", "Interactive", "Photography"],
  },
  {
    slug: "git-explained",
    title: "How Git Works",
    blurb: "Click through git add, commit, branch, merge and push and watch files move between working tree, staging area, local repo and remote.",
    tags: ["Education", "State machine", "Git"],
  },
  {
    slug: "latex-journey",
    title: "The LaTeX Compile Journey",
    blurb: "An animated walk from .tex source to PDF: tokenising, macro expansion, box building, line and page breaking, and output.",
    tags: ["Education", "Animation", "LaTeX"],
  },
];

const tools = [
  {
    slug: "douyin-im-exporter",
    title: "IM HTML Exporter",
    blurb: "Exports chat history into a clean, self-contained HTML archive using cursor-based pagination and automated unit tests for formatting reliability.",
    tags: ["MV3", "Page bridge", "Unit tests"],
  },
  {
    slug: "douyin-message-exporter",
    title: "Message Exporter (JSON/CSV)",
    blurb: "Built spec-first: a written design doc and implementation plan, then tests for DOM safety and selection logic. Exports selected conversations to JSON and CSV.",
    tags: ["Spec → plan → tests", "DOM", "CSV"],
  },
  {
    slug: "douyin-dm-downloader",
    title: "DM History Downloader",
    blurb: "Downloads the full history with one contact as HTML and TXT, replacing images, videos and stickers with readable placeholders.",
    tags: ["MV3", "Content script"],
  },
  {
    slug: "douyin-works-downloader",
    title: "My Works Downloader",
    blurb: "Lists and downloads the videos I've published — including private ones — from my own logged-in profile.",
    tags: ["MV3", "Downloads API"],
  },
  {
    slug: "douyin-self-archive",
    title: "Self Archive",
    blurb: "A local-first archiving utility that helps creators organise and back up their own published media posts directly within an authenticated browser session.",
    tags: ["webRequest", "MV3"],
  },
  {
    slug: "douyin-notification-links",
    title: "Notification Link Finder",
    blurb: "Hover a notification to reveal the linked video's URL, and filter the feed to “liked your comment” / “replied to you” in one click.",
    tags: ["UX tweak", "Content script"],
  },
];

const srcUrl = (path) => (REPO_URL ? `${REPO_URL}/tree/main/${path}` : null);

function card(p, kind) {
  const el = document.createElement("article");
  el.className = `card ${kind}`;
  const src = srcUrl(kind === "demo" ? `demos/${p.slug}` : `projects/${p.slug}`);
  el.innerHTML = `
    ${kind === "demo" ? `<a class="thumb" href="demos/${p.slug}/" target="_blank" rel="noopener"><img src="assets/shots/${p.slug}.jpg" alt="Screenshot of ${p.title}" loading="lazy"></a>` : ""}
    <div class="card-body">
      <h3>${p.title}</h3>
      <p>${p.blurb}</p>
      <div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
      <div class="links">
        ${kind === "demo" ? `<a class="btn small primary" href="demos/${p.slug}/" target="_blank" rel="noopener">Open live demo ↗</a>` : ""}
        ${src ? `<a class="btn small ghost" href="${src}" target="_blank" rel="noopener">Source</a>` : ""}
      </div>
    </div>`;
  return el;
}

document.getElementById("demo-grid").append(...demos.map((d) => card(d, "demo")));
document.getElementById("tool-grid").append(...tools.map((t) => card(t, "tool")));

// Count the two YouTube versions separately; v2 includes an extension and web app.
const earlierCount = document.querySelectorAll(".earlier-project").length;
document.getElementById("count").textContent = demos.length + tools.length + 2 + earlierCount;
document.getElementById("earlier-count").textContent = earlierCount;

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
