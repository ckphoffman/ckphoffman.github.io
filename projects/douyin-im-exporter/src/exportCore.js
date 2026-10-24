(function initExportCore(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.DouyinImExportCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function factory() {
  function valueToString(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value === "bigint") return value.toString();
    if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
      return value.toString();
    }
    return "";
  }

  function longToNumber(value) {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number") return value;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string" && value.trim()) return Number(value);
    if (typeof value === "object" && "low" in value && "high" in value) {
      const low = value.low >>> 0;
      const high = value.high >>> 0;
      return high * 0x100000000 + low;
    }
    const parsed = Number(valueToString(value));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function normalizeTimestamp(raw) {
    const numeric = longToNumber(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) return "";
    const millis = numeric < 10000000000 ? numeric * 1000 : numeric;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function escapeHtml(value) {
    return valueToString(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseContent(content) {
    if (content === null || content === undefined) return "";
    if (typeof content !== "string") return extractTextFromContent(content) || valueToString(content);
    const trimmed = content.trim();
    if (!trimmed) return "";
    try {
      const parsed = JSON.parse(trimmed);
      return extractTextFromContent(parsed) || trimmed;
    } catch (_) {
      return trimmed;
    }
  }

  function extractTextFromContent(content) {
    if (content === null || content === undefined) return "";
    if (typeof content === "string") return content;
    if (typeof content !== "object") return valueToString(content);

    const directKeys = [
      "text",
      "content",
      "desc",
      "title",
      "display_text",
      "displayText",
      "tips",
      "template",
    ];

    for (const key of directKeys) {
      const text = extractTextFromContent(content[key]);
      if (text) return text;
    }

    if (Array.isArray(content)) {
      return content.map(extractTextFromContent).filter(Boolean).join(" ");
    }

    return "";
  }

  function normalizeParticipant(raw) {
    if (!raw || typeof raw !== "object") return {};
    const user = raw.user || raw.userInfo || raw.profile || raw.participant || raw;
    const userId = valueToString(
      raw.userId || raw.user_id || raw.id || raw.uid || user.userId || user.user_id || user.id || user.uid
    );
    const nickname = valueToString(
      raw.remarkName ||
        raw.remark_name ||
        raw.nickname ||
        raw.nickName ||
        raw.name ||
        user.remarkName ||
        user.remark_name ||
        user.nickname ||
        user.nickName ||
        user.name
    );
    const secUid = valueToString(raw.secUid || raw.sec_uid || user.secUid || user.sec_uid);
    return { userId, nickname, secUid };
  }

  function normalizeConversation(raw, currentUserId) {
    const participants = (raw.participants || raw.firstPageParticipant || [])
      .map(normalizeParticipant)
      .filter((participant) => participant.userId || participant.nickname);
    const current = valueToString(currentUserId);
    const peer = participants.find((participant) => participant.userId && participant.userId !== current);
    const title =
      valueToString(raw.title) ||
      valueToString(raw.name) ||
      valueToString(raw.coreInfo && raw.coreInfo.name) ||
      (peer && peer.nickname) ||
      valueToString(raw.id || raw.conversationId || "未命名会话");

    return {
      id: valueToString(raw.id || raw.conversationId || raw.conversation_id),
      shortId: valueToString(raw.shortId || raw.conversationShortId || raw.conversation_short_id),
      type: longToNumber(raw.type || raw.conversationType || raw.conversation_type) || 0,
      inboxType: longToNumber(raw.inboxType || (raw.coreInfo && raw.coreInfo.inboxType)) || 0,
      title,
      peerUserId: peer ? peer.userId : "",
      lastMessage: parseContent(
        raw.lastMessageText ||
          raw.lastMessage ||
          raw.last_message ||
          (raw.lastVisibleMessage && raw.lastVisibleMessage.content)
      ),
    };
  }

  function normalizeMessage(raw, currentUserId) {
    const senderId = valueToString(raw.sender || raw.senderId || raw.sender_id || raw.sec_sender);
    const current = valueToString(currentUserId);
    return {
      id: valueToString(raw.server_message_id || raw.serverId || raw.server_id || raw.client_message_id),
      senderId,
      side: senderId && current && senderId === current ? "me" : "them",
      type: longToNumber(raw.message_type || raw.messageType || raw.type) || 0,
      text: parseContent(raw.content || raw.text || raw.body),
      createdAt: normalizeTimestamp(raw.create_time || raw.createTime || raw.createdAt),
    };
  }

  function formatDisplayTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString("zh-CN", { hour12: false });
  }

  function buildChatHtml({ conversation, messages, exportedAt }) {
    const safeConversation = conversation || {};
    const safeMessages = Array.isArray(messages) ? messages : [];
    const title = safeConversation.title || "抖音私信导出";
    const exportTime = exportedAt || new Date().toISOString();
    const rows = safeMessages
      .map((message) => {
        const sideClass = message.side === "me" ? "me" : "them";
        const senderLabel = message.side === "me" ? "我" : message.senderId || "对方";
        return [
          `<article class="message ${sideClass}">`,
          `<div class="meta">${escapeHtml(formatDisplayTime(message.createdAt))} · ${escapeHtml(senderLabel)} · type ${escapeHtml(message.type)}</div>`,
          `<div class="bubble">${escapeHtml(message.text || "[非文本消息或空消息]")}</div>`,
          `</article>`,
        ].join("");
      })
      .join("\n");

    return [
      "<!doctype html>",
      '<html lang="zh-CN">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${escapeHtml(title)} - 抖音私信导出</title>`,
      "<style>",
      ":root{color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f7f9;color:#17181a}",
      "body{margin:0;padding:32px}",
      "main{max-width:900px;margin:0 auto}",
      "header{margin-bottom:24px}",
      "h1{font-size:26px;margin:0 0 8px}",
      ".sub{color:#6b7280;font-size:13px;line-height:1.6}",
      ".message{display:flex;flex-direction:column;margin:14px 0}",
      ".message.me{align-items:flex-end}",
      ".message.them{align-items:flex-start}",
      ".meta{font-size:12px;color:#7a7f89;margin:0 8px 4px}",
      ".bubble{max-width:min(680px,80%);white-space:pre-wrap;word-break:break-word;border-radius:8px;padding:10px 12px;line-height:1.55;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.08)}",
      ".me .bubble{background:#dcfce7}",
      ".empty{padding:24px;background:#fff;border-radius:8px;color:#6b7280}",
      "</style>",
      "</head>",
      "<body>",
      "<main>",
      "<header>",
      `<h1>${escapeHtml(title)}</h1>`,
      `<div class="sub">会话 ID: ${escapeHtml(safeConversation.id || "")}</div>`,
      `<div class="sub">导出时间: ${escapeHtml(formatDisplayTime(exportTime))}</div>`,
      `<div class="sub">消息数: ${safeMessages.length}</div>`,
      "</header>",
      rows || '<div class="empty">没有导出到消息。</div>',
      "</main>",
      "</body>",
      "</html>",
    ].join("\n");
  }

  return {
    buildChatHtml,
    escapeHtml,
    normalizeConversation,
    normalizeMessage,
    valueToString,
  };
});
