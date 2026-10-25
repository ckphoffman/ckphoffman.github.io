// ---- Site config: edit these two lines ----
const EMAIL = "anne.puyuxiao@outlook.com";  // leave empty to hide email buttons
const REPO_URL = "https://github.com/ckphoffman/ckphoffman.github.io";  // enables "Source" links

const demos = [
  {
    slug: "camera-angles",
    title: "Camera Angle Studio",
    zhTitle: "机位角度工作室",
    blurb: "A 3D room with a full-body subject. Tilt, pan, roll and move the camera and see the bystander view and the resulting photo side by side.",
    zh: "一个带全身人物的 3D 房间。俯仰、平移、旋转相机，同时看到旁观视角和最终成片。",
    tags: ["Three.js", "WebGL"],
  },
  {
    slug: "dof",
    title: "Depth of Field Lab",
    zhTitle: "景深实验室",
    blurb: "Calculator for depth of field, pixel density and circle of confusion, with a parameter sweep chart and a test suite for the maths.",
    zh: "景深、像素密度与弥散圆计算器，带参数扫描图表，以及验证公式的测试集。",
    tags: ["JavaScript", "Tested"],
  },
  {
    slug: "entrance-pupil",
    title: "Entrance Pupil Explorer",
    zhTitle: "入瞳探索器",
    blurb: "Drag focal length and f-number and watch the entrance pupil (D = f / N) redraw at true physical scale.",
    zh: "拖动焦距和光圈值，入瞳（D = f / N）按真实物理尺寸实时重绘。",
    tags: ["SVG", "Interactive"],
  },
  {
    slug: "git-explained",
    title: "How Git Works",
    zhTitle: "Git 是怎么工作的",
    blurb: "Click through add, commit, branch, merge and push and watch files move between working tree, staging area, local repo and remote.",
    zh: "依次点击 add、commit、branch、merge、push，看文件如何在工作区、暂存区、本地仓库和远程之间流动。",
    tags: ["Education", "State machine"],
  },
  {
    slug: "latex-journey",
    title: "The LaTeX Compile Journey",
    zhTitle: "LaTeX 编译之旅",
    blurb: "An animated walk from .tex source to PDF: tokenising, macro expansion, box building, line and page breaking.",
    zh: "从 .tex 源文件到 PDF 的动画旅程：分词、宏展开、盒子构建、断行与分页。",
    tags: ["Education", "Animation"],
  },
];

const tools = [
  {
    title: "Stock Data & Volatility Toolkit",
    zhTitle: "股票数据与波动率工具",
    blurb: "Collects daily and minute-level market data, calculates ATR and intraday volatility, and ranks stocks by large daily moves, with CSV exports.",
    zh: "采集日线与分钟级行情，计算 ATR 与日内波动率，按单日大幅变动排名，并导出 CSV。",
    tags: ["Python", "pandas", "Market data"],
  },
  {
    slug: "douyin-message-exporter",
    title: "Message Exporter (JSON/CSV)",
    zhTitle: "消息导出器（JSON/CSV）",
    blurb: "Built spec-first: a written design doc and implementation plan, then tests for data safety and selection logic.",
    zh: "先写设计文档和实施计划，再为数据安全与选择逻辑编写测试。",
    tags: ["Spec → plan → tests", "CSV"],
  },
  {
    slug: "douyin-im-exporter",
    title: "Chat HTML Exporter",
    zhTitle: "聊天记录 HTML 导出",
    blurb: "Exports chat history to a self-contained HTML archive using cursor-based pagination, with unit tests for formatting.",
    zh: "基于游标分页把聊天记录导出为独立 HTML 存档，并用单元测试保证格式可靠。",
    tags: ["Pagination", "Unit tests"],
  },
  {
    slug: "douyin-dm-downloader",
    title: "DM History Downloader",
    zhTitle: "私信记录下载",
    blurb: "Downloads the full history with one contact as HTML and TXT, replacing media with readable placeholders.",
    zh: "将与某位联系人的完整记录下载为 HTML 和 TXT，媒体用可读占位符替代。",
    tags: ["Content script"],
  },
  {
    slug: "douyin-works-downloader",
    title: "My Works Downloader",
    zhTitle: "我的作品下载",
    blurb: "Lists and downloads the videos I've published, including private ones, from my own profile.",
    zh: "列出并下载我自己发布的视频（包括私密作品）。",
    tags: ["Downloads API"],
  },
  {
    slug: "douyin-self-archive",
    title: "Self Archive",
    zhTitle: "个人存档",
    blurb: "A local-first utility to organise and back up my own published posts inside an authenticated session.",
    zh: "本地优先的工具，在已登录会话中整理并备份我自己发布的内容。",
    tags: ["Local-first"],
  },
  {
    slug: "douyin-notification-links",
    title: "Notification Link Finder",
    zhTitle: "通知链接查找",
    blurb: "Reveals the linked video behind a notification and filters the feed to replies or likes in one click.",
    zh: "显示通知背后的视频链接，一键筛选“回复”或“点赞”。",
    tags: ["UX"],
  },
];

const srcUrl = (path) => (REPO_URL ? `${REPO_URL}/tree/main/${path}` : null);
const bi = (en, zh) => `<span class="en">${en}</span><span class="zh">${zh}</span>`;

function demoCard(p, i) {
  const el = document.createElement("article");
  el.className = "demo reveal";
  const href = `demos/${p.slug}/`;
  const src = srcUrl(`demos/${p.slug}`);
  el.innerHTML = `
    <a class="thumb" href="${href}" target="_blank" rel="noopener" aria-label="Open ${p.title}"><img src="assets/shots/${p.slug}.jpg" alt="Screenshot of ${p.title}" loading="lazy"></a>
    <div class="demo-body">
      <p class="demo-num">${String(i + 1).padStart(2, "0")}</p>
      <h3><a href="${href}" target="_blank" rel="noopener">${bi(p.title, p.zhTitle)}</a></h3>
      <p>${bi(p.blurb, p.zh)}</p>
      <div class="links">
        <a class="btn small primary" href="${href}" target="_blank" rel="noopener">${bi("Open live", "在线打开")} <span aria-hidden="true">↗</span></a>
        ${src ? `<a class="arrow-link" href="${src}" target="_blank" rel="noopener">${bi("Source", "源码")} ↗</a>` : ""}
      </div>
    </div>`;
  return el;
}

function toolRow(p) {
  const el = document.createElement("article");
  el.className = "tool reveal";
  const src = p.slug ? srcUrl(`projects/${p.slug}`) : null;
  el.innerHTML = `
    <h4>${bi(p.title, p.zhTitle)}</h4>
    <p>${bi(p.blurb, p.zh)}</p>
    <div class="tool-foot">
      <div class="tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
      ${src ? `<a class="arrow-link" href="${src}" target="_blank" rel="noopener">${bi("Source", "源码")} ↗</a>` : ""}
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

// Language toggle: English / Chinese, remembered per visitor.
document.getElementById("lang-toggle").addEventListener("click", () => {
  const next = document.documentElement.lang === "zh-CN" ? "en" : "zh-CN";
  document.documentElement.lang = next;
  try { localStorage.setItem("lang", next); } catch (e) {}
});

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
