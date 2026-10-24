"use strict";

const scanBtn = document.querySelector("#scanBtn");
const bestBtn = document.querySelector("#bestBtn");
const copyBtn = document.querySelector("#copyBtn");
const pageHint = document.querySelector("#pageHint");
const statusEl = document.querySelector("#status");
const listEl = document.querySelector("#list");

let candidates = [];
let bestCandidate = null;

scanBtn.addEventListener("click", scan);
bestBtn.addEventListener("click", () => download(bestCandidate));
copyBtn.addEventListener("click", () => copy(bestCandidate?.url || ""));

document.addEventListener("DOMContentLoaded", scan);

async function scan() {
  setStatus("正在扫描当前页面和最近的媒体请求...");
  setBusy(true);

  try {
    const response = await chrome.runtime.sendMessage({ type: "getCandidates" });

    if (!response?.ok) {
      throw new Error(response?.error || "扫描失败。");
    }

    candidates = response.candidates || [];
    bestCandidate = candidates.find(isDirectVideo) || candidates.find(isDownloadable) || null;
    pageHint.textContent = response.tabTitle || "当前抖音页面";
    render();
  } catch (error) {
    candidates = [];
    bestCandidate = null;
    setStatus(error.message, true);
    render();
  } finally {
    setBusy(false);
  }
}

function render() {
  bestBtn.disabled = !isDownloadable(bestCandidate);
  copyBtn.disabled = !bestCandidate?.url;
  listEl.textContent = "";

  if (!candidates.length) {
    setStatus("还没有发现可下载候选。先播放作品几秒，再点重新扫描。");
    return;
  }

  setStatus(`发现 ${candidates.length} 个候选，优先选择完整视频链接。`);

  for (const candidate of candidates) {
    const item = document.createElement("article");
    item.className = "item";

    const top = document.createElement("div");
    top.className = "itemTop";
    top.append(badge(candidate.kind), score(candidate.score));

    const url = document.createElement("div");
    url.className = "url";
    url.title = candidate.url;
    url.textContent = candidate.url;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = metaText(candidate);

    const actions = document.createElement("div");
    actions.className = "itemActions";

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "miniButton";
    downloadBtn.textContent = "下载";
    downloadBtn.disabled = !isDownloadable(candidate);
    downloadBtn.addEventListener("click", () => download(candidate));

    const copyBtn = document.createElement("button");
    copyBtn.className = "miniButton";
    copyBtn.textContent = "复制";
    copyBtn.disabled = !candidate.url;
    copyBtn.addEventListener("click", () => copy(candidate.url));

    actions.append(downloadBtn, copyBtn);
    item.append(top, url, meta, actions);

    const warning = warningText(candidate);
    if (warning) {
      const warningEl = document.createElement("div");
      warningEl.className = "warning";
      warningEl.textContent = warning;
      item.append(warningEl);
    }

    listEl.append(item);
  }
}

async function download(candidate) {
  if (!isDownloadable(candidate)) {
    setStatus("这个候选不能直接下载，试试先播放视频几秒后重新扫描。", true);
    return;
  }

  setStatus("正在交给 Chrome 下载...");

  const response = await chrome.runtime.sendMessage({
    type: "downloadCandidate",
    candidate
  });

  if (!response?.ok) {
    setStatus(response?.error || "下载失败。", true);
    return;
  }

  setStatus("已创建下载任务。");
}

async function copy(url) {
  if (!url) {
    return;
  }

  await navigator.clipboard.writeText(url);
  setStatus("链接已复制。");
}

function isDownloadable(candidate) {
  return Boolean(candidate?.url && /^https?:\/\//i.test(candidate.url));
}

function isDirectVideo(candidate) {
  return isDownloadable(candidate) && candidate.kind === "video";
}

function warningText(candidate) {
  if (candidate.kind === "blob") {
    return "blob 链接不能离开当前页面下载。继续播放几秒，让扩展捕捉真实媒体请求。";
  }

  if (candidate.kind === "playlist") {
    return "这是 HLS 播放列表，下载后通常不是单个 mp4 文件。";
  }

  if (candidate.kind === "segment") {
    return "这是视频片段，不是完整作品。";
  }

  return "";
}

function metaText(candidate) {
  const parts = [
    candidate.source && `来源：${candidate.source}`,
    candidate.width && candidate.height && `${candidate.width}x${candidate.height}`,
    candidate.duration && `${candidate.duration}s`
  ].filter(Boolean);

  return parts.join(" · ") || "媒体候选";
}

function badge(kind) {
  const el = document.createElement("span");
  el.className = "badge";
  el.textContent = {
    video: "视频",
    playlist: "HLS",
    segment: "片段",
    blob: "blob",
    unknown: "未知"
  }[kind] || "未知";
  return el;
}

function score(value) {
  const el = document.createElement("span");
  el.className = "score";
  el.textContent = `score ${value ?? 0}`;
  return el;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function setBusy(isBusy) {
  scanBtn.disabled = isBusy;
  scanBtn.textContent = isBusy ? "..." : "↻";
}
