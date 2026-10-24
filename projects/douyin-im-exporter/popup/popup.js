const statusEl = document.getElementById("status");
const listEl = document.getElementById("conversationList");
const openPanelButton = document.getElementById("openPanel");
const loadConversationsButton = document.getElementById("loadConversations");

function setStatus(text) {
  statusEl.textContent = text;
}

function escapeText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getActiveDouyinTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) throw new Error("没有找到当前标签页。");
  if (!/^https:\/\/www\.douyin\.com\//.test(tab.url || "")) {
    throw new Error("请先切到 https://www.douyin.com/ 页面。");
  }
  return tab;
}

async function sendToActiveTab(action, payload) {
  const tab = await getActiveDouyinTab();
  const response = await chrome.tabs.sendMessage(tab.id, { action, payload });
  if (!response || !response.ok) {
    throw new Error((response && response.error) || "扩展 content script 没有响应，请刷新抖音页面后重试。");
  }
  return response.result;
}

function renderConversations(conversations) {
  listEl.innerHTML = "";
  if (!conversations.length) {
    listEl.innerHTML = '<div class="empty">没有读取到会话。请先点击“打开私信”，等待面板出现后再读取。</div>';
    return;
  }

  for (const conversation of conversations) {
    const item = document.createElement("article");
    item.className = "conversation";
    item.innerHTML = [
      `<h2>${escapeText(conversation.title || "未命名会话")}</h2>`,
      `<div class="preview">${escapeText(conversation.lastMessage || "无预览")}</div>`,
      `<div class="meta">${escapeText(conversation.id)}</div>`,
      '<button type="button" class="primary">导出 HTML</button>',
    ].join("");

    const button = item.querySelector("button");
    button.addEventListener("click", async () => {
      button.disabled = true;
      setStatus(`正在导出：${conversation.title || conversation.id}`);
      try {
        const result = await sendToActiveTab("douyin-im-exporter:download-conversation", {
          conversationId: conversation.id,
          limit: 50,
          maxPages: 1000,
        });
        const limitHint = result.reachedLimit ? "，已达到分页上限" : "";
        setStatus(`已生成下载：${result.count} 条消息${limitHint}`);
      } catch (error) {
        setStatus(error.message || String(error));
      } finally {
        button.disabled = false;
      }
    });

    listEl.appendChild(item);
  }
}

async function openPanel() {
  setStatus("正在打开私信面板...");
  await sendToActiveTab("douyin-im-exporter:open-panel");
  setStatus("私信面板已触发，稍等片刻后可读取会话。");
}

async function loadConversations() {
  setStatus("正在读取页面 IM SDK 中的会话...");
  const result = await sendToActiveTab("douyin-im-exporter:list-conversations");
  renderConversations(result.conversations || []);
  setStatus(`读取到 ${(result.conversations || []).length} 个会话。`);
}

openPanelButton.addEventListener("click", async () => {
  openPanelButton.disabled = true;
  try {
    await openPanel();
  } catch (error) {
    setStatus(error.message || String(error));
  } finally {
    openPanelButton.disabled = false;
  }
});

loadConversationsButton.addEventListener("click", async () => {
  loadConversationsButton.disabled = true;
  try {
    await loadConversations();
  } catch (error) {
    setStatus(error.message || String(error));
  } finally {
    loadConversationsButton.disabled = false;
  }
});

(async function init() {
  try {
    const status = await sendToActiveTab("douyin-im-exporter:get-status");
    setStatus(`已连接页面 IM SDK，会话缓存 ${status.bridge.conversationCount} 个。`);
  } catch (error) {
    setStatus(error.message || String(error));
  }
})();
