(function initContentScript() {
  const SOURCE_CONTENT = "douyin-im-exporter-content";
  const SOURCE_PAGE = "douyin-im-exporter-page";
  const core = globalThis.DouyinImExportCore;
  let bridgeInjected = false;
  let bridgeReadyPromise = null;
  let requestSeq = 0;
  const pending = new Map();

  function injectBridge() {
    if (bridgeInjected) return;
    bridgeInjected = true;
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("src/pageBridge.js");
    script.async = false;
    script.onload = () => script.remove();
    (document.documentElement || document.head || document.body).appendChild(script);
  }

  function callBridge(action, payload = {}, timeoutMs = 60000) {
    injectBridge();
    const requestId = `${Date.now()}-${++requestSeq}`;
    const message = { source: SOURCE_CONTENT, requestId, action, payload };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`页面桥接超时: ${action}`));
      }, timeoutMs);

      pending.set(requestId, { resolve, reject, timeout });
      window.postMessage(message, window.location.origin);
    });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.source !== SOURCE_PAGE || !data.requestId) return;
    const entry = pending.get(data.requestId);
    if (!entry) return;

    clearTimeout(entry.timeout);
    pending.delete(data.requestId);

    if (data.ok) entry.resolve(data.result);
    else entry.reject(new Error(data.error || "页面桥接返回未知错误"));
  });

  async function ensureBridgeReady() {
    if (!bridgeReadyPromise) {
      bridgeReadyPromise = callBridge("probe", {}, 15000);
    }
    return bridgeReadyPromise;
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= window.innerHeight &&
      rect.left <= window.innerWidth
    );
  }

  function findPrivateMessageEntry() {
    const exactTextElements = [...document.querySelectorAll("div,p,span")]
      .filter((element) => (element.innerText || element.textContent || "").trim() === "私信")
      .filter(isVisible)
      .map((element) => {
        let clickable = element;
        for (let i = 0; i < 5 && clickable.parentElement; i++) {
          const rect = clickable.getBoundingClientRect();
          if (rect.width >= 32 && rect.height >= 32) break;
          clickable = clickable.parentElement;
        }
        const rect = clickable.getBoundingClientRect();
        return { element: clickable, rect };
      });

    exactTextElements.sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
    return exactTextElements[0] ? exactTextElements[0].element : null;
  }

  async function openPrivateMessagePanel() {
    const entry = findPrivateMessageEntry();
    if (!entry) throw new Error("没有找到页面右上角的私信入口，请确认已登录抖音网页版。");
    entry.click();
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { opened: true };
  }

  function getTextLeaves(root) {
    return [...root.querySelectorAll("div,p,span")]
      .filter((element) => isVisible(element))
      .filter((element) => ![...element.children].some((child) => (child.innerText || "").trim()))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: (element.innerText || element.textContent || "").trim(),
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((item) => item.text);
  }

  function findLikelyPanelRoot() {
    const markers = [...document.querySelectorAll("div,section,aside")]
      .filter((element) => isVisible(element))
      .filter((element) => {
        const text = element.innerText || "";
        return text.includes("私信") && (text.includes("暂时没有更多") || text.includes("在线状态"));
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { element, area: rect.width * rect.height, rect };
      })
      .filter((item) => item.rect.width > 220 && item.rect.height > 180);

    markers.sort((a, b) => a.area - b.area);
    return markers[0] ? markers[0].element : document.body;
  }

  function scrapeVisibleConversationLabels() {
    const panel = findLikelyPanelRoot();
    const leaves = getTextLeaves(panel).filter((leaf) => leaf.text !== "私信" && leaf.text !== "去设置");
    const datePattern = /(?:\d{2}-\d{2}|\d{1,2}:\d{2}|昨天|今天|刚刚|周[一二三四五六日天])/;
    const rows = [];

    for (const leaf of leaves) {
      if (!datePattern.test(leaf.text)) continue;
      const nearby = leaves
        .filter((other) => Math.abs(other.top - leaf.top) < 46 && other.left <= leaf.left)
        .sort((a, b) => a.top - b.top || a.left - b.left);
      const title = nearby.find((item) => !datePattern.test(item.text) && item.text.length <= 80);
      const preview = nearby.reverse().find((item) => item !== title && !datePattern.test(item.text));
      if (title) {
        rows.push({ title: title.text, lastMessage: preview ? preview.text : "", date: leaf.text });
      }
    }

    const deduped = [];
    const seen = new Set();
    for (const row of rows) {
      const key = `${row.title}|${row.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(row);
    }
    return deduped;
  }

  async function listConversations() {
    await ensureBridgeReady();
    const result = await callBridge("listConversations", {}, 30000);
    const visibleLabels = scrapeVisibleConversationLabels();
    const conversations = (result.conversations || []).map((raw, index) => {
      const merged = { ...raw };
      const label = visibleLabels[index];
      if (label) {
        merged.title = label.title || merged.title;
        merged.lastMessageText = label.lastMessage || merged.lastMessageText;
      }
      return core.normalizeConversation(merged, result.currentUserId);
    });
    return {
      currentUserId: result.currentUserId,
      conversations,
      source: result.source,
    };
  }

  function sanitizeFilenamePart(value) {
    return String(value || "douyin-chat")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  async function downloadConversation(payload) {
    await ensureBridgeReady();
    const result = await callBridge("exportConversation", payload, 180000);
    const conversation = core.normalizeConversation(result.conversation || {}, result.currentUserId);
    const messages = (result.messages || [])
      .map((message) => core.normalizeMessage(message, result.currentUserId))
      .filter((message) => message.id || message.text || message.createdAt);

    const html = core.buildChatHtml({
      conversation,
      messages,
      exportedAt: new Date().toISOString(),
    });

    const filename = `${sanitizeFilenamePart(conversation.title)}-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.html`;
    const download = await chrome.runtime.sendMessage({
      action: "douyin-im-exporter:download-html",
      filename,
      html,
    });

    if (!download || !download.ok) {
      throw new Error((download && download.error) || "下载失败");
    }

    return {
      filename,
      downloadId: download.downloadId,
      count: messages.length,
      title: conversation.title,
      reachedLimit: !!result.reachedLimit,
    };
  }

  async function handleMessage(message) {
    if (!message || !message.action || !message.action.startsWith("douyin-im-exporter:")) {
      return null;
    }

    switch (message.action) {
      case "douyin-im-exporter:get-status": {
        const probe = await ensureBridgeReady();
        return { url: location.href, bridge: probe };
      }
      case "douyin-im-exporter:open-panel":
        return openPrivateMessagePanel();
      case "douyin-im-exporter:list-conversations":
        return listConversations();
      case "douyin-im-exporter:download-conversation":
        return downloadConversation(message.payload || {});
      default:
        throw new Error(`未知操作: ${message.action}`);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error && error.message ? error.message : String(error) }));
    return true;
  });
})();
