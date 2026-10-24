"use strict";

if (!window.__douyinSelfArchiveContentScript) {
  window.__douyinSelfArchiveContentScript = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "collectCandidates") {
      return false;
    }

    sendResponse({
      candidates: collectCandidates()
    });

    return true;
  });
}

function collectCandidates() {
  const title = pageTitle();
  const candidates = [
    ...collectVideoElements(title),
    ...collectPerformanceEntries(title),
    ...collectJsonScriptUrls(title)
  ];

  return dedupe(candidates);
}

function collectVideoElements(title) {
  return Array.from(document.querySelectorAll("video")).flatMap((video, index) => {
    const urls = new Set([
      video.currentSrc,
      video.src,
      video.getAttribute("src"),
      ...Array.from(video.querySelectorAll("source")).map((source) => source.src || source.getAttribute("src"))
    ].filter(Boolean));

    return Array.from(urls).map((url) => ({
      url: absolutize(url),
      title,
      source: "page-video",
      kind: inferKind(url),
      duration: finiteNumber(video.duration),
      width: video.videoWidth || null,
      height: video.videoHeight || null,
      poster: video.poster || "",
      visible: isVisible(video),
      label: `video-${index + 1}`,
      seenAt: Date.now()
    }));
  });
}

function collectPerformanceEntries(title) {
  if (!performance?.getEntriesByType) {
    return [];
  }

  return performance.getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter(looksLikeMediaUrl)
    .map((url) => ({
      url,
      title,
      source: "page-performance",
      kind: inferKind(url),
      seenAt: Date.now()
    }));
}

function collectJsonScriptUrls(title) {
  const urls = [];
  const mediaUrlRe = /https?:\\?\/\\?\/[^"'\s<>]+?(?:\.mp4|\.m3u8|mime_type=video|playwm|play_addr)[^"'\s<>]*/gi;

  for (const script of document.querySelectorAll("script")) {
    const text = script.textContent || "";

    if (!/aweme|video|play_addr|douyin/i.test(text)) {
      continue;
    }

    for (const match of text.matchAll(mediaUrlRe)) {
      urls.push(cleanEscapedUrl(match[0]));
    }
  }

  return urls.filter(looksLikeMediaUrl).map((url) => ({
    url,
    title,
    source: "page-json",
    kind: inferKind(url),
    seenAt: Date.now()
  }));
}

function pageTitle() {
  const metaTitle = document.querySelector('meta[property="og:title"], meta[name="title"]')?.content;
  const raw = metaTitle || document.title || "douyin-video";

  return raw
    .replace(/\s*[-_]\s*抖音\s*$/u, "")
    .replace(/\s*-\s*Douyin\s*$/i, "")
    .trim() || "douyin-video";
}

function isVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);

  return rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== "hidden" &&
    style.display !== "none";
}

function finiteNumber(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function dedupe(candidates) {
  const byUrl = new Map();

  for (const candidate of candidates) {
    if (!candidate.url) {
      continue;
    }

    const key = candidate.url;
    const previous = byUrl.get(key) || {};
    byUrl.set(key, { ...previous, ...candidate });
  }

  return Array.from(byUrl.values());
}

function absolutize(url) {
  if (!url) {
    return "";
  }

  if (/^(?:https?:|blob:|data:)/i.test(url)) {
    return url;
  }

  try {
    return new URL(url, location.href).toString();
  } catch (error) {
    return url;
  }
}

function cleanEscapedUrl(url) {
  return url
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&");
}

function looksLikeMediaUrl(url) {
  return /^https?:\/\//i.test(url) && (
    /\.(?:mp4|m4v|mov|webm|m3u8|m4s|ts)(?:[?#]|$)/i.test(url) ||
    /(?:mime_type=video|video_id=|playwm|play_addr|video\/tos|aweme\/v1\/play)/i.test(url)
  );
}

function inferKind(url) {
  if (/^blob:/i.test(url)) return "blob";
  if (/\.m3u8(?:[?#]|$)/i.test(url)) return "playlist";
  if (/\.(?:m4s|ts)(?:[?#]|$)/i.test(url)) return "segment";
  if (/\.(?:mp4|m4v|mov|webm)(?:[?#]|$)/i.test(url)) return "video";
  if (/mime_type=video|playwm|play_addr|aweme\/v1\/play/i.test(url)) return "video";
  return "unknown";
}
