"use strict";

const HOST_FILTERS = [
  "https://www.douyin.com/*",
  "https://*.douyin.com/*",
  "https://*.douyinvod.com/*",
  "https://*.douyinpic.com/*",
  "https://*.byteimg.com/*",
  "https://*.bytescm.com/*",
  "https://*.amemv.com/*",
  "https://*.snssdk.com/*"
];

const MEDIA_PATH_RE = /\.(mp4|m4v|mov|webm|m3u8|m4s|ts)(?:[?#]|$)/i;
const VIDEO_QUERY_RE = /(?:mime_type=video|video_id=|playwm|play_addr|video\/tos|aweme\/v1\/play)/i;
const MAX_TAB_CANDIDATES = 80;
const tabMedia = new Map();

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0 || !looksLikeMediaUrl(details.url, details.type)) {
      return;
    }

    rememberCandidate(details.tabId, {
      url: details.url,
      title: "",
      source: "network",
      kind: inferKind(details.url, details.type),
      requestType: details.type,
      seenAt: Date.now()
    });
  },
  { urls: HOST_FILTERS, types: ["media", "xmlhttprequest", "fetch", "other"] }
);

chrome.tabs.onRemoved.addListener((tabId) => {
  tabMedia.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((response) => sendResponse({ ok: true, ...response }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function handleMessage(message) {
  if (message?.type === "getCandidates") {
    const tab = await getActiveTab();
    const pageCandidates = await collectFromPage(tab.id).catch(() => []);
    const networkCandidates = tabMedia.get(tab.id) || [];
    const candidates = sortCandidates(mergeCandidates([...pageCandidates, ...networkCandidates], tab.title));

    return {
      tabTitle: tab.title || "",
      tabUrl: tab.url || "",
      candidates
    };
  }

  if (message?.type === "downloadCandidate") {
    const candidate = message.candidate || {};
    const url = candidate.url || "";

    if (!/^https?:\/\//i.test(url)) {
      throw new Error("这个候选不是可直接下载的 http(s) 链接。");
    }

    const id = await downloadUrl(url, candidate.title || "douyin-video");
    return { downloadId: id };
  }

  throw new Error("未知操作。");
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab?.id) {
    throw new Error("找不到当前标签页。");
  }

  if (!/^https:\/\/([^/]+\.)?douyin\.com\//i.test(tab.url || "")) {
    throw new Error("请先打开 douyin.com 上你的作品页。");
  }

  return tab;
}

async function collectFromPage(tabId) {
  try {
    const response = await sendTabMessage(tabId, { type: "collectCandidates" });
    return response?.candidates || [];
  } catch (error) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/content.js"]
    });

    const response = await sendTabMessage(tabId, { type: "collectCandidates" });
    return response?.candidates || [];
  }
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(response);
    });
  });
}

function downloadUrl(url, title) {
  const filename = `douyin-backup/${sanitizeFilename(title)}-${timestamp()}${extensionFor(url)}`;

  return chrome.downloads.download({
    url,
    filename,
    saveAs: true,
    conflictAction: "uniquify"
  });
}

function rememberCandidate(tabId, candidate) {
  const current = tabMedia.get(tabId) || [];
  const key = candidateKey(candidate);
  const deduped = current.filter((item) => candidateKey(item) !== key);

  deduped.unshift(candidate);
  tabMedia.set(tabId, deduped.slice(0, MAX_TAB_CANDIDATES));
}

function mergeCandidates(candidates, fallbackTitle) {
  const byKey = new Map();

  for (const candidate of candidates) {
    if (!candidate?.url) {
      continue;
    }

    const key = candidateKey(candidate);
    const previous = byKey.get(key) || {};

    byKey.set(key, {
      ...previous,
      ...candidate,
      title: candidate.title || previous.title || fallbackTitle || "douyin-video",
      kind: candidate.kind || previous.kind || inferKind(candidate.url, candidate.requestType),
      source: [previous.source, candidate.source].filter(Boolean).join("+") || "page"
    });
  }

  return Array.from(byKey.values());
}

function sortCandidates(candidates) {
  return candidates
    .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate) }))
    .sort((a, b) => b.score - a.score || (b.seenAt || 0) - (a.seenAt || 0))
    .slice(0, MAX_TAB_CANDIDATES);
}

function scoreCandidate(candidate) {
  const url = candidate.url || "";
  let score = 0;

  if (/^https?:\/\//i.test(url)) score += 20;
  if (candidate.kind === "video") score += 70;
  if (candidate.kind === "playlist") score += 35;
  if (candidate.kind === "segment") score += 5;
  if (candidate.source?.includes("network")) score += 15;
  if (candidate.source?.includes("page")) score += 10;
  if (/watermark|playwm/i.test(url)) score -= 5;
  if (/blob:|data:/i.test(url)) score -= 40;

  return score;
}

function looksLikeMediaUrl(url, type) {
  if (!/^https?:\/\//i.test(url)) {
    return false;
  }

  if (MEDIA_PATH_RE.test(url) || VIDEO_QUERY_RE.test(url)) {
    return true;
  }

  try {
    const { hostname, pathname } = new URL(url);
    const hostSuggestsVideo = /douyinvod|video|vod|amemv|snssdk/i.test(hostname);
    const pathSuggestsVideo = /video|play|tos/i.test(pathname);

    return type === "media" && hostSuggestsVideo && pathSuggestsVideo;
  } catch (error) {
    return false;
  }
}

function inferKind(url, requestType) {
  if (/^blob:/i.test(url)) return "blob";
  if (/\.m3u8(?:[?#]|$)/i.test(url)) return "playlist";
  if (/\.(?:m4s|ts)(?:[?#]|$)/i.test(url)) return "segment";
  if (/\.(?:mp4|m4v|mov|webm)(?:[?#]|$)/i.test(url) || requestType === "media") return "video";
  return "unknown";
}

function extensionFor(url) {
  const kind = inferKind(url, "");

  if (kind === "playlist") return ".m3u8";
  if (kind === "segment") return ".m4s";

  try {
    const path = new URL(url).pathname;
    const match = path.match(/\.(mp4|m4v|mov|webm)(?:$|[?#])/i) || path.match(/\.(mp4|m4v|mov|webm)$/i);

    if (match) {
      return `.${match[1].toLowerCase()}`;
    }
  } catch (error) {
    // Keep the safe fallback below.
  }

  return ".mp4";
}

function candidateKey(candidate) {
  const url = candidate.url || "";

  if (/^blob:/i.test(url)) {
    return `${url}:${candidate.source || ""}`;
  }

  return stripVolatileQuery(url);
}

function stripVolatileQuery(url) {
  try {
    const parsed = new URL(url);
    const volatile = ["download", "filename", "x-expires", "x-signature", "sign"];

    for (const key of volatile) {
      parsed.searchParams.delete(key);
    }

    return parsed.toString();
  } catch (error) {
    return url;
  }
}

function sanitizeFilename(value) {
  return String(value || "douyin-video")
    .replace(/\s+/g, " ")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim()
    .slice(0, 80) || "douyin-video";
}

function timestamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}
