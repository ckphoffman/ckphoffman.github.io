# Douyin Message Exporter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Chrome extension that scans Douyin web private-message conversations, lets the user select conversations, and exports only selected conversations to JSON and CSV.

**Architecture:** Use a Manifest V3 Chrome extension with a tiny action popup that injects/opens an in-page control panel on `douyin.com`. The content script performs all Douyin UI interaction locally: opens the fifth top-right "私信" icon, scans the conversation list, waits for user selection, parses selected conversations, and triggers local JSON/CSV downloads. Pure formatting logic is isolated in a testable UMD-style module.

**Tech Stack:** Plain JavaScript, Chrome Extension Manifest V3, CSS, Node.js built-in `assert` for unit tests. No network packages.

**Repository Note:** `<this folder>` is not a git repository, so commit steps are replaced with verification checkpoints.

---

## File Structure

- Create `extension/manifest.json`: Chrome extension manifest with narrow Douyin host access.
- Create `extension/popup.html`: small extension popup with a single action button and status text.
- Create `extension/popup.css`: popup styling.
- Create `extension/popup.js`: sends a message to the active Douyin tab to show the in-page exporter panel.
- Create `extension/src/exporter-core.js`: testable data normalization, JSON generation, CSV generation, and filename helpers.
- Create `extension/src/douyin-dom.js`: Douyin DOM heuristics for opening private messages, scanning conversation rows, opening selected rows, scrolling chat history, and extracting messages.
- Create `extension/src/panel.js`: in-page panel UI for scan, selection, progress, export, and error display.
- Create `extension/src/content.js`: message listener and orchestration bridge between popup, panel, DOM helpers, and exporter core.
- Create `extension/README.md`: installation, usage, privacy boundaries, and limitations.
- Create `tests/exporter-core.test.js`: Node unit tests for JSON/CSV generation and field filtering.

## Task 1: Extension Skeleton

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/popup.html`
- Create: `extension/popup.css`
- Create: `extension/popup.js`
- Create: `extension/README.md`

- [ ] **Step 1: Create `extension/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Douyin Message Exporter",
  "version": "0.1.0",
  "description": "Export selected visible Douyin web private-message conversations to JSON and CSV.",
  "permissions": ["activeTab", "scripting"],
  "host_permissions": ["https://www.douyin.com/*", "https://douyin.com/*"],
  "action": {
    "default_title": "Douyin Message Exporter",
    "default_popup": "popup.html"
  },
  "content_scripts": [
    {
      "matches": ["https://www.douyin.com/*", "https://douyin.com/*"],
      "js": [
        "src/exporter-core.js",
        "src/douyin-dom.js",
        "src/panel.js",
        "src/content.js"
      ],
      "css": ["popup.css"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 2: Create `extension/popup.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Douyin Message Exporter</title>
    <link rel="stylesheet" href="popup.css">
  </head>
  <body class="dy-exporter-popup">
    <main>
      <h1>抖音私信导出</h1>
      <p id="status">打开抖音网页版后点击开始。</p>
      <button id="openPanel" type="button">打开导出面板</button>
    </main>
    <script src="popup.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `extension/popup.css`**

Use classes prefixed with `dy-exporter-` so injected styles do not collide with Douyin page styles.

```css
.dy-exporter-popup {
  width: 260px;
  margin: 0;
  color: #161823;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #ffffff;
}

.dy-exporter-popup main {
  padding: 14px;
}

.dy-exporter-popup h1 {
  margin: 0 0 10px;
  font-size: 16px;
  line-height: 1.35;
}

.dy-exporter-popup p {
  margin: 0 0 12px;
  color: #555b66;
  font-size: 13px;
  line-height: 1.45;
}

.dy-exporter-popup button,
.dy-exporter-panel button {
  border: 1px solid #d9dce3;
  border-radius: 6px;
  padding: 8px 10px;
  color: #ffffff;
  background: #fe2c55;
  cursor: pointer;
  font-size: 13px;
}

.dy-exporter-popup button:disabled,
.dy-exporter-panel button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.dy-exporter-panel {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2147483647;
  width: 380px;
  max-height: 70vh;
  overflow: hidden;
  border: 1px solid #d9dce3;
  border-radius: 8px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.18);
  color: #161823;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.dy-exporter-panel header,
.dy-exporter-panel footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #eef0f4;
}

.dy-exporter-panel footer {
  border-top: 1px solid #eef0f4;
  border-bottom: 0;
}

.dy-exporter-panel h2 {
  margin: 0;
  font-size: 15px;
}

.dy-exporter-panel .dy-exporter-body {
  max-height: 48vh;
  overflow: auto;
  padding: 12px;
}

.dy-exporter-panel .dy-exporter-status {
  margin: 0 0 10px;
  color: #555b66;
  font-size: 13px;
  line-height: 1.45;
}

.dy-exporter-panel .dy-exporter-list {
  display: grid;
  gap: 8px;
}

.dy-exporter-panel label {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 8px;
  padding: 8px;
  border: 1px solid #eef0f4;
  border-radius: 6px;
}

.dy-exporter-panel strong {
  display: block;
  font-size: 13px;
}

.dy-exporter-panel small {
  display: block;
  color: #6f7785;
  font-size: 12px;
  line-height: 1.35;
}
```

- [ ] **Step 4: Create `extension/popup.js`**

```javascript
(function () {
  const button = document.getElementById("openPanel");
  const status = document.getElementById("status");

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "正在连接当前抖音页面...";

    try {
      const tab = await getActiveTab();
      if (!tab || !/^https:\/\/(www\.)?douyin\.com\//.test(tab.url || "")) {
        status.textContent = "请先打开抖音网页版页面。";
        button.disabled = false;
        return;
      }

      await chrome.tabs.sendMessage(tab.id, { type: "DY_EXPORTER_SHOW_PANEL" });
      status.textContent = "导出面板已打开。";
    } catch (error) {
      status.textContent = "无法连接页面，请刷新抖音后重试。";
      console.error(error);
    } finally {
      button.disabled = false;
    }
  });
})();
```

- [ ] **Step 5: Create `extension/README.md`**

```markdown
# Douyin Message Exporter

本地 Chrome 扩展，用于导出当前账号在抖音网页版可见的、用户手动选择的私信会话。

## 使用方式

1. 打开 Chrome 的 `chrome://extensions/`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择本目录 `extension`。
4. 打开 `https://www.douyin.com/` 并确认已登录。
5. 点击扩展图标，选择“打开导出面板”。
6. 点击“扫描会话列表”。
7. 勾选要导出的联系人。
8. 点击“导出选中会话”。

## 隐私边界

扩展只读取抖音网页上已加载且可见的内容，不读取密码、Cookie、Token 或浏览器配置文件，不向外部服务器发送私信内容。

## 输出文件

- `douyin_messages.json`
- `douyin_messages.csv`

## 限制

如果抖音网页版没有加载更早消息，扩展无法导出那些消息。部分图片、视频或卡片链接可能是临时地址，无法长期访问。
```

- [ ] **Step 6: Verify skeleton files exist**

Run:

```bash
find extension -maxdepth 2 -type f | sort
```

Expected output includes:

```text
extension/README.md
extension/manifest.json
extension/popup.css
extension/popup.html
extension/popup.js
```

## Task 2: Exporter Core With Tests

**Files:**
- Create: `extension/src/exporter-core.js`
- Create: `tests/exporter-core.test.js`

- [ ] **Step 1: Write failing tests in `tests/exporter-core.test.js`**

```javascript
const assert = require("assert");
const exporter = require("../extension/src/exporter-core.js");

const conversations = [
  {
    conversationName: "张三",
    messages: [
      {
        direction: "incoming",
        sender: "张三",
        time: "昨天 18:20",
        text: "你好, \"测试\"",
        mediaType: "",
        mediaUrl: "",
        linkUrl: "",
        attachmentDescription: ""
      },
      {
        direction: "outgoing",
        sender: "我",
        time: "昨天 18:21",
        text: "",
        mediaType: "image",
        mediaUrl: "https://example.com/a.png",
        linkUrl: "",
        attachmentDescription: "图片"
      }
    ]
  }
];

assert.deepStrictEqual(exporter.normalizeMessage({ text: "hi" }), {
  direction: "",
  sender: "",
  time: "",
  text: "hi",
  mediaType: "",
  mediaUrl: "",
  linkUrl: "",
  attachmentDescription: ""
});

const json = exporter.toJson(conversations);
assert.ok(json.includes("\"conversationName\": \"张三\""));
assert.ok(!json.includes("rawText"));
assert.ok(!json.includes("rawHtmlSnippet"));
assert.ok(!json.includes("capturedAt"));

const csv = exporter.toCsv(conversations);
assert.ok(csv.startsWith("conversationName,direction,sender,time,text,mediaType,mediaUrl,linkUrl,attachmentDescription"));
assert.ok(csv.includes("\"你好, \"\"测试\"\"\""));
assert.ok(csv.includes("https://example.com/a.png"));
assert.ok(!csv.includes("rawText"));
assert.ok(!csv.includes("rawHtmlSnippet"));
assert.ok(!csv.includes("capturedAt"));

assert.match(exporter.filename("json"), /^douyin_messages_\d{8}_\d{6}\.json$/);
assert.match(exporter.filename("csv"), /^douyin_messages_\d{8}_\d{6}\.csv$/);

console.log("exporter-core tests passed");
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node tests/exporter-core.test.js
```

Expected: fails because `../extension/src/exporter-core.js` does not exist.

- [ ] **Step 3: Implement `extension/src/exporter-core.js`**

```javascript
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.DouyinExporterCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const MESSAGE_FIELDS = [
    "direction",
    "sender",
    "time",
    "text",
    "mediaType",
    "mediaUrl",
    "linkUrl",
    "attachmentDescription"
  ];

  const CSV_FIELDS = ["conversationName"].concat(MESSAGE_FIELDS);

  function clean(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value).replace(/\s+/g, " ").trim();
  }

  function normalizeMessage(message) {
    const normalized = {};
    for (const field of MESSAGE_FIELDS) {
      normalized[field] = clean(message[field]);
    }
    return normalized;
  }

  function normalizeConversation(conversation) {
    return {
      conversationName: clean(conversation.conversationName),
      messages: Array.isArray(conversation.messages)
        ? conversation.messages.map(normalizeMessage)
        : []
    };
  }

  function toJson(conversations) {
    const normalized = (Array.isArray(conversations) ? conversations : []).map(normalizeConversation);
    return JSON.stringify(normalized, null, 2);
  }

  function csvEscape(value) {
    const text = clean(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function toCsv(conversations) {
    const rows = [CSV_FIELDS.join(",")];
    const normalized = (Array.isArray(conversations) ? conversations : []).map(normalizeConversation);

    for (const conversation of normalized) {
      for (const message of conversation.messages) {
        const row = CSV_FIELDS.map((field) => {
          if (field === "conversationName") {
            return csvEscape(conversation.conversationName);
          }
          return csvEscape(message[field]);
        });
        rows.push(row.join(","));
      }
    }

    return rows.join("\n");
  }

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function timestamp(date) {
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join("") + "_" + [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join("");
  }

  function filename(extension, date) {
    const safeExtension = extension === "csv" ? "csv" : "json";
    return `douyin_messages_${timestamp(date || new Date())}.${safeExtension}`;
  }

  function downloadText(text, name, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadConversations(conversations) {
    downloadText(toJson(conversations), filename("json"), "application/json;charset=utf-8");
    downloadText(toCsv(conversations), filename("csv"), "text/csv;charset=utf-8");
  }

  return {
    MESSAGE_FIELDS,
    CSV_FIELDS,
    normalizeMessage,
    normalizeConversation,
    toJson,
    toCsv,
    filename,
    downloadConversations
  };
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node tests/exporter-core.test.js
```

Expected output:

```text
exporter-core tests passed
```

## Task 3: Douyin DOM Helpers

**Files:**
- Create: `extension/src/douyin-dom.js`

- [ ] **Step 1: Create `extension/src/douyin-dom.js` with resilient helpers**

```javascript
(function () {
  const WAIT_STEP_MS = 200;
  const DEFAULT_TIMEOUT_MS = 8000;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function textOf(element) {
    return (element && element.innerText ? element.innerText : "").replace(/\s+/g, " ").trim();
  }

  function visible(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  async function waitFor(predicate, timeoutMs) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < (timeoutMs || DEFAULT_TIMEOUT_MS)) {
      const value = predicate();
      if (value) {
        return value;
      }
      await sleep(WAIT_STEP_MS);
    }
    return null;
  }

  function clickableTopRightItems() {
    const candidates = Array.from(document.querySelectorAll("button, a, div[role='button'], span[role='button']"))
      .filter(visible)
      .map((element) => ({ element, rect: element.getBoundingClientRect(), text: textOf(element), label: element.getAttribute("aria-label") || element.title || "" }))
      .filter((item) => item.rect.top < 120 && item.rect.left > window.innerWidth * 0.45)
      .sort((a, b) => a.rect.left - b.rect.left);
    return candidates;
  }

  function findPrivateMessageButton() {
    const items = clickableTopRightItems();
    const byText = items.find((item) => /私信|消息/.test(`${item.text} ${item.label}`));
    if (byText) {
      return byText.element;
    }
    return items[4] ? items[4].element : null;
  }

  async function openPrivateMessages() {
    const button = findPrivateMessageButton();
    if (!button) {
      throw new Error("找不到右上角第 5 个私信按钮，请先手动打开私信列表。");
    }
    button.click();
    await sleep(600);
    const list = await waitFor(findConversationList, DEFAULT_TIMEOUT_MS);
    if (!list) {
      throw new Error("私信列表没有出现，请确认页面已登录并重试。");
    }
    return list;
  }

  function scoreConversationContainer(element) {
    const text = textOf(element);
    if (text.length < 2 || text.length > 500) {
      return 0;
    }
    const rect = element.getBoundingClientRect();
    let score = 0;
    if (rect.height >= 36 && rect.height <= 120) score += 2;
    if (rect.width >= 160) score += 2;
    if (/昨天|今天|星期|周|分钟前|小时前|\d{1,2}:\d{2}|\d{4}/.test(text)) score += 1;
    if (element.querySelector("img")) score += 1;
    if (element.matches("[role='listitem'], li")) score += 2;
    return score;
  }

  function findConversationList() {
    const containers = Array.from(document.querySelectorAll("[role='list'], ul, aside, div"))
      .filter(visible)
      .map((element) => {
        const rows = Array.from(element.children || []).filter((child) => scoreConversationContainer(child) >= 3);
        return { element, rows };
      })
      .filter((item) => item.rows.length >= 2)
      .sort((a, b) => b.rows.length - a.rows.length);
    return containers[0] ? containers[0].element : null;
  }

  function parseConversationRow(row, index) {
    const text = textOf(row);
    const lines = text.split(/\n|\r| {2,}/).map((line) => line.trim()).filter(Boolean);
    const name = lines[0] || `会话 ${index + 1}`;
    const timeHint = lines.find((line) => /昨天|今天|星期|周|分钟前|小时前|\d{1,2}:\d{2}|\d{4}/.test(line)) || "";
    const preview = lines.filter((line) => line !== name && line !== timeHint).join(" ");
    return {
      id: `conversation-${index}-${name}`,
      index,
      name,
      preview,
      timeHint
    };
  }

  async function scrollElementToEnd(element, direction) {
    const seen = new Set();
    let stableRounds = 0;

    while (stableRounds < 4) {
      const key = `${element.scrollTop}:${element.scrollHeight}:${textOf(element).length}`;
      if (seen.has(key)) {
        stableRounds += 1;
      } else {
        stableRounds = 0;
        seen.add(key);
      }

      element.scrollTop = direction === "up" ? 0 : element.scrollHeight;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
      await sleep(700);
    }
  }

  async function scanConversations() {
    const list = findConversationList() || await openPrivateMessages();
    await scrollElementToEnd(list, "down");
    const rows = Array.from(list.children || []).filter((child) => scoreConversationContainer(child) >= 3);
    return rows.map(parseConversationRow);
  }

  function conversationRows() {
    const list = findConversationList();
    if (!list) {
      return [];
    }
    return Array.from(list.children || []).filter((child) => scoreConversationContainer(child) >= 3);
  }

  async function openConversationByIndex(index) {
    const rows = conversationRows();
    const row = rows[index];
    if (!row) {
      throw new Error(`找不到第 ${index + 1} 个会话。`);
    }
    row.scrollIntoView({ block: "center" });
    row.click();
    await sleep(800);
  }

  function findChatScroller() {
    const candidates = Array.from(document.querySelectorAll("main div, section div, [role='log'], [role='main']"))
      .filter(visible)
      .filter((element) => element.scrollHeight > element.clientHeight + 80)
      .sort((a, b) => b.scrollHeight - a.scrollHeight);
    return candidates[0] || document.scrollingElement || document.documentElement;
  }

  function classifyMedia(node) {
    if (node.querySelector("video")) return "video";
    if (node.querySelector("img")) return "image";
    if (node.querySelector("svg")) return "emoji";
    if (node.querySelector("a")) return "link";
    return "";
  }

  function firstMediaUrl(node) {
    const media = node.querySelector("video[src], img[src], source[src]");
    return media ? media.getAttribute("src") || "" : "";
  }

  function firstLinkUrl(node) {
    const link = node.querySelector("a[href]");
    return link ? link.href : "";
  }

  function directionFor(node) {
    const rect = node.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    return center > window.innerWidth / 2 ? "outgoing" : "incoming";
  }

  function messageCandidates() {
    return Array.from(document.querySelectorAll("[class*='message'], [class*='chat'], [role='article'], li, div"))
      .filter(visible)
      .filter((node) => {
        const text = textOf(node);
        const hasMedia = Boolean(node.querySelector("img, video, a[href], svg"));
        const rect = node.getBoundingClientRect();
        return rect.height >= 20 && rect.height <= 480 && (hasMedia || (text.length >= 1 && text.length <= 1000));
      });
  }

  function parseMessageNode(node, conversationName) {
    const text = textOf(node);
    const mediaType = classifyMedia(node);
    const linkUrl = firstLinkUrl(node);
    const attachmentDescription = mediaType && !text ? mediaType : "";
    return {
      direction: directionFor(node),
      sender: directionFor(node) === "outgoing" ? "我" : conversationName,
      time: "",
      text: mediaType ? text.replace(/图片|视频|表情/g, "").trim() : text,
      mediaType,
      mediaUrl: firstMediaUrl(node),
      linkUrl,
      attachmentDescription
    };
  }

  function dedupeMessages(messages) {
    const seen = new Set();
    return messages.filter((message) => {
      const key = [
        message.direction,
        message.sender,
        message.time,
        message.text,
        message.mediaType,
        message.mediaUrl,
        message.linkUrl,
        message.attachmentDescription
      ].join("|");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async function extractCurrentConversation(conversationName) {
    const scroller = findChatScroller();
    await scrollElementToEnd(scroller, "up");
    await scrollElementToEnd(scroller, "down");
    const messages = messageCandidates().map((node) => parseMessageNode(node, conversationName));
    return {
      conversationName,
      messages: dedupeMessages(messages)
    };
  }

  window.DouyinDom = {
    openPrivateMessages,
    scanConversations,
    openConversationByIndex,
    extractCurrentConversation
  };
})();
```

- [ ] **Step 2: Verify no forbidden fields are introduced**

Run:

```bash
rg -n "rawText|rawHtmlSnippet|capturedAt" extension/src/douyin-dom.js
```

Expected: no matches.

## Task 4: In-Page Panel

**Files:**
- Create: `extension/src/panel.js`

- [ ] **Step 1: Create `extension/src/panel.js`**

```javascript
(function () {
  const PANEL_ID = "dy-exporter-panel";

  function removeExistingPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.remove();
    }
  }

  function createButton(text, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
  }

  function setStatus(panel, text) {
    panel.querySelector(".dy-exporter-status").textContent = text;
  }

  function selectedIndexes(panel) {
    return Array.from(panel.querySelectorAll("input[type='checkbox']:checked"))
      .map((input) => Number(input.value))
      .filter((value) => Number.isInteger(value));
  }

  function renderConversationList(panel, conversations) {
    const list = panel.querySelector(".dy-exporter-list");
    list.replaceChildren();

    conversations.forEach((conversation) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      const content = document.createElement("span");
      const name = document.createElement("strong");
      const meta = document.createElement("small");

      input.type = "checkbox";
      input.value = String(conversation.index);
      name.textContent = conversation.name;
      meta.textContent = [conversation.timeHint, conversation.preview].filter(Boolean).join(" · ");

      content.append(name, meta);
      label.append(input, content);
      list.append(label);
    });

    setStatus(panel, `找到 ${conversations.length} 个会话。请选择要导出的联系人。`);
  }

  function createPanel(handlers) {
    removeExistingPanel();

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "dy-exporter-panel";
    panel.innerHTML = [
      "<header>",
      "<h2>抖音私信导出</h2>",
      "<button type=\"button\" data-role=\"close\">关闭</button>",
      "</header>",
      "<div class=\"dy-exporter-body\">",
      "<p class=\"dy-exporter-status\">先扫描会话列表，只会导出你勾选的会话。</p>",
      "<div class=\"dy-exporter-list\"></div>",
      "</div>",
      "<footer>",
      "<button type=\"button\" data-role=\"scan\">扫描会话列表</button>",
      "<button type=\"button\" data-role=\"export\" disabled>导出选中会话</button>",
      "</footer>"
    ].join("");

    const closeButton = panel.querySelector("[data-role='close']");
    const scanButton = panel.querySelector("[data-role='scan']");
    const exportButton = panel.querySelector("[data-role='export']");

    closeButton.addEventListener("click", () => panel.remove());
    scanButton.addEventListener("click", async () => {
      scanButton.disabled = true;
      setStatus(panel, "正在打开私信并扫描会话列表...");
      try {
        const conversations = await handlers.scan();
        panel.__dyConversations = conversations;
        renderConversationList(panel, conversations);
        exportButton.disabled = conversations.length === 0;
      } catch (error) {
        setStatus(panel, error.message || "扫描失败。");
      } finally {
        scanButton.disabled = false;
      }
    });

    exportButton.addEventListener("click", async () => {
      const indexes = selectedIndexes(panel);
      if (indexes.length === 0) {
        setStatus(panel, "请先勾选至少一个会话。");
        return;
      }
      scanButton.disabled = true;
      exportButton.disabled = true;
      setStatus(panel, `正在导出 ${indexes.length} 个会话...`);
      try {
        const conversations = panel.__dyConversations || [];
        await handlers.exportSelected(indexes, conversations, (message) => setStatus(panel, message));
        setStatus(panel, "导出完成，已生成 JSON 和 CSV。");
      } catch (error) {
        setStatus(panel, error.message || "导出失败。");
      } finally {
        scanButton.disabled = false;
        exportButton.disabled = false;
      }
    });

    document.body.appendChild(panel);
    return panel;
  }

  window.DouyinExporterPanel = {
    createPanel,
    setStatus
  };
})();
```

- [ ] **Step 2: Verify panel code has no external network calls**

Run:

```bash
rg -n "fetch\\(|XMLHttpRequest|sendBeacon|WebSocket" extension/src/panel.js
```

Expected: no matches.

## Task 5: Content Orchestration

**Files:**
- Create: `extension/src/content.js`

- [ ] **Step 1: Create `extension/src/content.js`**

```javascript
(function () {
  async function scan() {
    return window.DouyinDom.scanConversations();
  }

  async function exportSelected(indexes, scannedConversations, report) {
    const results = [];

    for (let i = 0; i < indexes.length; i += 1) {
      const index = indexes[i];
      const summary = scannedConversations.find((item) => item.index === index);
      const name = summary ? summary.name : `会话 ${index + 1}`;
      report(`正在打开 ${name} (${i + 1}/${indexes.length})...`);
      await window.DouyinDom.openConversationByIndex(index);
      report(`正在解析 ${name} 的可见聊天记录...`);
      const conversation = await window.DouyinDom.extractCurrentConversation(name);
      results.push(conversation);
    }

    window.DouyinExporterCore.downloadConversations(results);
    return results;
  }

  function showPanel() {
    window.DouyinExporterPanel.createPanel({
      scan,
      exportSelected
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== "DY_EXPORTER_SHOW_PANEL") {
      return false;
    }
    showPanel();
    sendResponse({ ok: true });
    return false;
  });

  window.DouyinMessageExporter = {
    showPanel,
    scan,
    exportSelected
  };
})();
```

- [ ] **Step 2: Verify orchestration uses selected indexes**

Run:

```bash
rg -n "indexes|scanConversations|downloadConversations" extension/src/content.js
```

Expected output includes all three identifiers.

## Task 6: Full Workspace Verification

**Files:**
- Read: all extension files

- [ ] **Step 1: Run unit tests**

Run:

```bash
node tests/exporter-core.test.js
```

Expected output:

```text
exporter-core tests passed
```

- [ ] **Step 2: Search for forbidden extra output fields**

Run:

```bash
rg -n "rawText|rawHtmlSnippet|capturedAt" extension tests docs/superpowers/specs/2026-05-21-douyin-message-exporter-design.md
```

Expected: matches only in the design document's non-goal/testing text, never in extension source or tests.

- [ ] **Step 3: Search for forbidden credential or network behavior**

Run:

```bash
rg -n "cookie|localStorage|sessionStorage|fetch\\(|XMLHttpRequest|sendBeacon|WebSocket|chrome\\.cookies" extension
```

Expected: no matches except README privacy text containing `Cookie`.

- [ ] **Step 4: Validate manifest JSON**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('extension/manifest.json', 'utf8')); console.log('manifest json valid')"
```

Expected output:

```text
manifest json valid
```

- [ ] **Step 5: Manual Chrome verification**

Manual actions:

1. Open `chrome://extensions/`.
2. Enable Developer Mode.
3. Load `<this folder>`.
4. Open `https://www.douyin.com/` while logged in.
5. Click the extension icon.
6. Click "打开导出面板".
7. Click "扫描会话列表".
8. Verify the panel lists conversations with name, preview, and time hint.
9. Select one conversation.
10. Click "导出选中会话".
11. Confirm `douyin_messages_*.json` and `douyin_messages_*.csv` download.
12. Open the files and confirm they include only the selected conversation.

Expected result: extension exports selected conversations only and no output field named `rawText`, `rawHtmlSnippet`, or `capturedAt` exists.

## Self-Review

- Spec coverage: The plan implements the approved two-stage flow, top-right fifth "私信" entry point, selected-conversation-only export, JSON/CSV outputs, and the restricted output fields.
- Placeholder scan: The plan contains concrete file paths, file contents, commands, and expected outputs.
- Type consistency: Conversation summaries use `{ id, index, name, preview, timeHint }`; exported conversations use `{ conversationName, messages }`; exported messages use the exact CSV/JSON fields from the spec.
