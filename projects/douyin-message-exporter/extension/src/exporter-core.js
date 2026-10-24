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
    const normalized = clean(value);
    const text = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
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
