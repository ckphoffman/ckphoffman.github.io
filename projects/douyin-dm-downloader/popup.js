// popup.js — 控制扩展弹窗 UI，向 content script 发送命令

const $ = (sel) => document.querySelector(sel);

const els = {
  statusDot: $("#status-dot"),
  hintNotDouyin: $("#hint-not-douyin"),
  main: $("#main"),
  btnOpenIm: $("#btn-open-im"),
  btnRefresh: $("#btn-refresh"),
  btnRandom: $("#btn-random"),
  btnOpenChat: $("#btn-open-chat"),
  btnDownload: $("#btn-download"),
  chatSelect: $("#chat-select"),
  fmtHtml: $("#fmt-html"),
  fmtTxt: $("#fmt-txt"),
  progress: $("#progress"),
  progressLabel: $("#progress-label"),
  log: $("#log"),
};

let activeTab = null;
let chats = []; // [{id, name, preview, index}]

function log(msg, level = "info") {
  const ts = new Date().toLocaleTimeString();
  const prefix = level === "err" ? "✗" : level === "warn" ? "!" : "·";
  els.log.textContent += `[${ts}] ${prefix} ${msg}\n`;
  els.log.scrollTop = els.log.scrollHeight;
}

function setStatus(state, title) {
  els.statusDot.className = "status-dot " + state;
  els.statusDot.title = title || "";
}

function isDouyin(url) {
  return typeof url === "string" && /^https:\/\/([^/]+\.)?douyin\.com\//.test(url);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function sendToContent(action, payload = {}) {
  if (!activeTab) throw new Error("no active tab");
  return await chrome.tabs.sendMessage(activeTab.id, { action, payload });
}

async function ensureContentReady() {
  try {
    const res = await sendToContent("ping");
    return res && res.ok;
  } catch (e) {
    return false;
  }
}

async function refreshChats() {
  els.chatSelect.innerHTML = `<option value="">— 加载中… —</option>`;
  try {
    const res = await sendToContent("listChats");
    if (!res || !res.ok) throw new Error(res && res.error || "未能获取聊天列表");
    chats = res.chats || [];
    if (chats.length === 0) {
      els.chatSelect.innerHTML = `<option value="">— 当前页面未找到聊天列表 —</option>`;
      log("未在当前页面找到聊天列表，请先点击「打开私信页面」", "warn");
      return;
    }
    els.chatSelect.innerHTML = chats
      .map((c, i) => {
        const name = (c.name || "(未命名)").replace(/</g, "&lt;");
        const preview = (c.preview || "").replace(/</g, "&lt;").slice(0, 30);
        return `<option value="${i}">${name}${preview ? "  ·  " + preview : ""}</option>`;
      })
      .join("");
    log(`已加载 ${chats.length} 个聊天`);
  } catch (e) {
    els.chatSelect.innerHTML = `<option value="">— 加载失败 —</option>`;
    log("加载聊天列表失败: " + e.message, "err");
  }
}

async function init() {
  activeTab = await getActiveTab();
  if (!activeTab || !isDouyin(activeTab.url)) {
    setStatus("warn", "未在抖音页面");
    els.hintNotDouyin.hidden = false;
    els.main.hidden = true;
    return;
  }

  els.hintNotDouyin.hidden = true;
  els.main.hidden = false;

  const ready = await ensureContentReady();
  if (!ready) {
    setStatus("warn", "内容脚本未就绪");
    log("内容脚本未注入或页面尚未加载完成，请刷新抖音页面后再试。", "warn");
    return;
  }
  setStatus("ok", "已连接");
  await refreshChats();
}

els.btnOpenIm.addEventListener("click", async () => {
  try {
    const res = await sendToContent("openIm");
    if (res && res.ok) {
      log("已进入私信页面");
      setTimeout(refreshChats, 1500);
    } else {
      log("未找到私信入口，可能页面结构变化。请手动点击右上角「私信」图标后再回到此扩展。", "warn");
    }
  } catch (e) {
    log("打开私信失败: " + e.message, "err");
  }
});

els.btnRefresh.addEventListener("click", refreshChats);

els.btnRandom.addEventListener("click", () => {
  if (chats.length === 0) {
    log("聊天列表为空，无法随机选择", "warn");
    return;
  }
  const i = Math.floor(Math.random() * chats.length);
  els.chatSelect.value = String(i);
  log(`随机选择: ${chats[i].name}`);
});

els.btnOpenChat.addEventListener("click", async () => {
  const idx = parseInt(els.chatSelect.value, 10);
  if (isNaN(idx)) {
    log("请先选择一个聊天对象", "warn");
    return;
  }
  try {
    const res = await sendToContent("openChat", { index: idx, name: chats[idx].name });
    if (res && res.ok) log(`已打开聊天: ${chats[idx].name}`);
    else log("打开聊天失败: " + (res && res.error || "未知"), "err");
  } catch (e) {
    log("打开聊天失败: " + e.message, "err");
  }
});

els.btnDownload.addEventListener("click", async () => {
  const formats = [];
  if (els.fmtHtml.checked) formats.push("html");
  if (els.fmtTxt.checked) formats.push("txt");
  if (formats.length === 0) {
    log("请至少选择一种导出格式", "warn");
    return;
  }
  const idx = parseInt(els.chatSelect.value, 10);
  if (isNaN(idx)) {
    log("请先选择要下载的聊天对象（或先点「打开此聊天」）", "warn");
    return;
  }

  els.btnDownload.disabled = true;
  els.progress.hidden = false;
  els.progress.value = 0;
  els.progressLabel.textContent = "准备中…";
  log(`开始抓取: ${chats[idx].name}`);

  try {
    // 确保聊天被打开
    await sendToContent("openChat", { index: idx, name: chats[idx].name });
    await new Promise((r) => setTimeout(r, 1000));

    const res = await sendToContent("scrape", { formats, name: chats[idx].name });
    if (!res || !res.ok) throw new Error((res && res.error) || "抓取失败");
    log(`抓取完成：共 ${res.count} 条消息，已开始下载。`);
    els.progressLabel.textContent = `完成 · 共 ${res.count} 条`;
    els.progress.value = 100;
  } catch (e) {
    log("下载失败: " + e.message, "err");
    els.progressLabel.textContent = "失败";
  } finally {
    els.btnDownload.disabled = false;
  }
});

// 接收 content script 主动推送的进度
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.action !== "progress") return;
  const { phase, current, total, info } = msg.payload || {};
  if (typeof current === "number" && typeof total === "number" && total > 0) {
    els.progress.value = Math.round((current / total) * 100);
  }
  if (phase) {
    els.progressLabel.textContent = info
      ? `${phase} · ${info}`
      : `${phase}${current != null ? ` (${current}${total ? "/" + total : ""})` : ""}`;
  } else if (info) {
    log(info);
  }
});

init();
