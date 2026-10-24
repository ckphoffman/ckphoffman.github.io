// background.js — Service Worker
// 主要职责：接收来自 content / popup 的 "download" 消息，使用 chrome.downloads 保存文件。
// 在 MV3 Service Worker 中，无法直接使用 URL.createObjectURL，所以用 data URL 编码。

function textToDataUrl(mime, text) {
  // 用 UTF-8 安全的 base64
  const utf8 = unescape(encodeURIComponent(text));
  let b64 = "";
  try {
    b64 = btoa(utf8);
  } catch (e) {
    // 兜底
    b64 = btoa(text);
  }
  return `data:${mime};charset=utf-8;base64,${b64}`;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== "download") return;

  const { filename, mime, text } = msg.payload || {};
  if (!filename || !text) {
    sendResponse({ ok: false, error: "缺少 filename 或 text" });
    return;
  }

  try {
    const url = textToDataUrl(mime || "text/plain", text);
    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: false,
        conflictAction: "uniquify",
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            ok: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          sendResponse({ ok: true, id: downloadId });
        }
      }
    );
  } catch (e) {
    sendResponse({ ok: false, error: e.message || String(e) });
  }

  // 异步响应
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[抖音私信下载器] 已安装");
});
