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

// ---- Life gallery ----
// [file in assets/photos/{sm,lg}, category, caption, width, height] — sm dimensions, used to reserve space
const photos = [
  ["img-1954", "Cities", "Royal Albert Hall, London", 675, 900],
  ["img-60d6a33c", "Friends", "Dinner with friends", 675, 900],
  ["img-5840", "Campus", "Presenting my work", 900, 600],
  ["img-8358", "Outdoors", "Mist in the pines", 900, 675],
  ["img-1395", "Table", "Black bean noodles", 675, 900],
  ["img-3265", "Outdoors", "Lulworth Cove", 675, 900],
  ["img-3517", "Cities", "Natural History Museum", 675, 900],
  ["img-2269", "Friends", "Two of us", 900, 675],
  ["img-2855", "Outdoors", "Out on the lake", 900, 675],
  ["img-0401", "Campus", "Library floor", 900, 675],
  ["img-1747", "Table", "Latte art", 675, 900],
  ["img-3325", "Outdoors", "Gallos, Tintagel", 675, 900],
  ["img-1072", "Cities", "Westminster", 675, 900],
  ["idg-20251017-191858-526", "Table", "Candlelit hall dinner", 675, 900],
  ["img-2791", "Outdoors", "Hills in the cloud", 900, 675],
  ["img-0791", "Friends", "City selfie", 675, 900],
  ["img-3209", "Outdoors", "Jurassic Coast", 675, 900],
  ["img-1919", "Cities", "A night of music", 675, 900],
  ["img-3118", "Campus", "Desk with a river view", 675, 900],
  ["img-3237", "Outdoors", "Durdle Door, Dorset", 675, 900],
  ["img-8344", "Outdoors", "Walking into the fog", 900, 675],
  ["img-0336", "Table", "Sharing plates", 900, 675],
  ["img-3324", "Outdoors", "Atlantic cliffs", 675, 900],
  ["img-8815", "Friends", "Cheers", 900, 506],
  ["img-3695", "Cities", "Old Market Square, Nottingham", 900, 675],
  ["img-2828", "Outdoors", "Lakeside village", 900, 675],
  ["img-1739", "Table", "Burger night", 675, 900],
  ["img-5846", "Campus", "On stage", 600, 900],
  ["img-3203", "Outdoors", "Coast path", 675, 900],
  ["idg-20251105-163124-347", "Cities", "Autumn bench company", 900, 675],
  ["img-0078", "Friends", "Flatmate", 675, 900],
  ["img-8348", "Outdoors", "Up the moor", 675, 900],
  ["img-1047", "Cities", "Crowds at Westminster", 675, 900],
  ["img-1204", "Table", "Long lunch", 675, 900],
  ["img-9992", "Outdoors", "Seaside bench", 675, 900],
  ["img-0333", "Campus", "Award ceremony", 675, 900],
  ["img-3653", "Friends", "Campus café", 900, 675],
  ["img-8418", "Outdoors", "Into the white", 900, 675],
  ["img-2342", "Cities", "Church on the corner", 675, 900],
  ["img-1649", "Table", "Cheese course", 675, 900],
  ["fullsizerender", "Outdoors", "Below the dam", 900, 506],
  ["img-0077", "Campus", "Next to a jet engine", 675, 900],
  ["img-0412-2", "Friends", "Late-night study break", 900, 675],
  ["img-1583", "Outdoors", "Geese crossing", 900, 675],
  ["idg-20251017-194332-448", "Table", "Formal dinner", 675, 900],
  ["img-0438", "Cities", "Fresh baguette", 675, 900],
  ["img-1378", "Campus", "Working on the train", 900, 675],
  ["img-8426", "Outdoors", "Summit in white", 675, 900],
  ["img-0344", "Friends", "On the train", 900, 675],
  ["img-3285", "Table", "Berry bowl", 675, 900],
  ["img-3438", "Cities", "Holiday plushies", 900, 675],
  ["img-0421", "Outdoors", "Canal from the window", 900, 675],
  ["img-0287", "Campus", "Workshop", 900, 675],
  ["img-1513", "Friends", "Self-portrait", 414, 900],
  ["img-1758", "Table", "Hotpot spread", 900, 675],
  ["img-3102", "Outdoors", "Goslings on campus", 900, 675],
  ["img-1224", "Campus", "Lecture", 675, 900],
  ["img-0459", "Table", "Plates for two", 675, 900],
  ["img-3974", "Outdoors", "Green water", 675, 900],
  ["img-5850", "Campus", "Q&A", 900, 600],
  ["img-0429", "Campus", "Late-night coding", 900, 675],
  ["img-3030", "Campus", "Noodles and spreadsheets", 506, 900],
];
const PAGE = 18;
const gallery = document.getElementById("gallery");
const moreBtn = document.getElementById("more");
const chipsEl = document.getElementById("chips");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let filter = "All", shown = PAGE, visible = [];

const io = "IntersectionObserver" in window && !reduceMotion
  ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px" })
  : null;
const observe = (el) => (io ? io.observe(el) : el.classList.add("in"));

const cats = ["All", ...new Set(photos.map((p) => p[1]))];
chipsEl.append(...cats.map((c) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.setAttribute("role", "tab");
  b.setAttribute("aria-selected", c === filter);
  b.innerHTML = `${c}<sup>${c === "All" ? photos.length : photos.filter((p) => p[1] === c).length}</sup>`;
  b.onclick = () => {
    filter = c; shown = PAGE;
    chipsEl.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-selected", x === b));
    renderGallery();
  };
  return b;
}));

function renderGallery() {
  visible = photos.filter((p) => filter === "All" || p[1] === filter);
  gallery.replaceChildren(...visible.slice(0, shown).map(([file, , caption, w, h], i) => {
    const fig = document.createElement("figure");
    fig.className = "shot"; fig.tabIndex = 0; fig.setAttribute("role", "button");
    fig.setAttribute("aria-label", `View photo: ${caption}`);
    fig.innerHTML = `<img src="assets/photos/sm/${file}.webp" alt="${caption}" width="${w}" height="${h}" loading="lazy" decoding="async"><figcaption>${caption}</figcaption>`;
    fig.onclick = () => openLightbox(i);
    fig.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(i); } };
    observe(fig);
    return fig;
  }));
  moreBtn.parentElement.hidden = shown >= visible.length;
  moreBtn.textContent = `Show more · ${visible.length - shown}`;
}
moreBtn.onclick = () => { shown += PAGE; renderGallery(); };
renderGallery();

// lightbox
const lb = document.getElementById("lightbox");
const lbImg = lb.querySelector("img");
const lbCap = lb.querySelector("figcaption");
let lbIndex = 0;
function showPhoto(i) {
  lbIndex = (i + visible.length) % visible.length;
  const [file, cat, caption] = visible[lbIndex];
  lbImg.src = `assets/photos/lg/${file}.webp`;
  lbImg.alt = caption;
  lbCap.textContent = `${caption} — ${cat} · ${lbIndex + 1} / ${visible.length}`;
  // warm the next image
  const next = visible[(lbIndex + 1) % visible.length];
  new Image().src = `assets/photos/lg/${next[0]}.webp`;
}
function openLightbox(i) { showPhoto(i); lb.showModal(); }
lb.querySelector(".prev").onclick = () => showPhoto(lbIndex - 1);
lb.querySelector(".next").onclick = () => showPhoto(lbIndex + 1);
lb.querySelector(".lb-close").onclick = () => lb.close();
lb.addEventListener("click", (e) => { if (e.target === lb || e.target.tagName === "FIGURE") lb.close(); });
lb.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") showPhoto(lbIndex - 1);
  if (e.key === "ArrowRight") showPhoto(lbIndex + 1);
});
let touchX = null;
lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) showPhoto(lbIndex + (dx < 0 ? 1 : -1));
});

// ---- Graduation film: loops muted; pause control, and respect reduced motion ----
const film = document.getElementById("film-video");
const filmToggle = document.getElementById("film-toggle");
const syncToggle = () => {
  filmToggle.classList.toggle("paused", film.paused);
  filmToggle.setAttribute("aria-label", film.paused ? "Play video" : "Pause video");
};
if (reduceMotion) film.removeAttribute("autoplay"), film.pause();
filmToggle.onclick = () => (film.paused ? film.play() : film.pause());
film.addEventListener("play", syncToggle);
film.addEventListener("pause", syncToggle);
syncToggle();

document.querySelectorAll(".reveal").forEach(observe);
