(function initPageBridge() {
  const SOURCE_CONTENT = "douyin-im-exporter-content";
  const SOURCE_PAGE = "douyin-im-exporter-page";
  if (window.__douyinImExporterBridgeInstalled) return;
  window.__douyinImExporterBridgeInstalled = true;

  function postResponse(requestId, ok, result, error) {
    window.postMessage(
      {
        source: SOURCE_PAGE,
        requestId,
        ok,
        result,
        error,
      },
      window.location.origin
    );
  }

  function getWebpackRequire() {
    let webpackRequire;
    const chunk = window.webpackChunkdouyin_web;
    if (!chunk || typeof chunk.push !== "function") {
      throw new Error("没有找到抖音 webpack runtime。请先打开抖音网页版。");
    }
    chunk.push([[`douyin-im-exporter-${Date.now()}`], {}, (require) => {
      webpackRequire = require;
    }]);
    if (!webpackRequire) throw new Error("无法取得抖音 webpack require。");
    return webpackRequire;
  }

  function requireKnownModule(require, ids, predicate) {
    for (const id of ids) {
      try {
        const module = require(id);
        if (!predicate || predicate(module)) return module;
      } catch (_) {
        continue;
      }
    }

    const moduleMap = require.m || {};
    for (const id of Object.keys(moduleMap)) {
      try {
        const module = require(id);
        if (!predicate || predicate(module)) return module;
      } catch (_) {
        continue;
      }
    }

    throw new Error("无法定位抖音 IM SDK 模块。");
  }

  function getImRuntime() {
    const require = getWebpackRequire();
    const coreModule = requireKnownModule(require, ["812769"], (module) => {
      return module && typeof module.i === "function" && module.i() && module.i().getMessagesByConversation;
    });
    const tokenModule = requireKnownModule(require, ["835649"], (module) => {
      return module && module.Uk && module.Uk.ConversationManager && module.Uk.CoreApi;
    });
    const core = coreModule.i();
    const tokens = tokenModule.Uk;
    const conversationManager = core.ctx.resolve(tokens.ConversationManager);
    const coreApi = core.ctx.resolve(tokens.CoreApi);
    const participantManager = core.ctx.resolve(tokens.ParticipantManager);
    if (!conversationManager || !coreApi) throw new Error("抖音 IM SDK 尚未初始化，请打开私信面板后重试。");
    return { core, tokens, conversationManager, coreApi, participantManager };
  }

  function toStringValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value === "bigint") return value.toString();
    if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
      return value.toString();
    }
    return "";
  }

  function serializeLong(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "number" || typeof value === "string") return value;
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "object" && "low" in value && "high" in value) {
      return toStringValue(value);
    }
    return toStringValue(value);
  }

  function serializeParticipant(participant) {
    if (!participant || typeof participant !== "object") return {};
    const user = participant.user || participant.userInfo || participant.profile || participant;
    return {
      userId: toStringValue(participant.userId || participant.user_id || user.userId || user.user_id || user.id || user.uid),
      nickname: toStringValue(
        participant.remarkName ||
          participant.remark_name ||
          participant.nickname ||
          participant.nickName ||
          participant.name ||
          user.remarkName ||
          user.remark_name ||
          user.nickname ||
          user.nickName ||
          user.name
      ),
      secUid: toStringValue(participant.secUid || participant.sec_uid || user.secUid || user.sec_uid),
    };
  }

  function serializeMessage(message) {
    if (!message || typeof message !== "object") return {};
    return {
      ext: message.ext || {},
      property_list: message.property_list || message.propertyList || [],
      conversation_id: toStringValue(message.conversation_id || message.conversationId),
      conversation_type: message.conversation_type || message.conversationType,
      conversation_short_id: serializeLong(message.conversation_short_id || message.conversationShortId),
      server_message_id: serializeLong(message.server_message_id || message.serverId || message.server_id),
      client_message_id: toStringValue(message.client_message_id || message.clientId),
      message_type: message.message_type || message.messageType || message.type,
      sender: toStringValue(message.sender || message.senderId || message.sender_id),
      sec_sender: toStringValue(message.sec_sender || message.secSender),
      content: message.content || "",
      create_time: serializeLong(message.create_time || message.createTime),
      index_in_conversation: serializeLong(message.index_in_conversation || message.indexInConversation),
      order_in_conversation: serializeLong(message.order_in_conversation || message.orderInConversation),
    };
  }

  function getCurrentUserId(core, conversations) {
    const optionUserId = toStringValue(core && core.ctx && core.ctx.option && core.ctx.option.userId);
    if (optionUserId) return optionUserId;
    const ids = conversations.map((conversation) => toStringValue(conversation.id)).filter(Boolean);
    for (const id of ids) {
      const parts = id.split(":");
      if (parts.length >= 4 && parts[1] === "1") return parts[3];
    }
    return "";
  }

  function getParticipants(runtime, conversation) {
    const collected = [];
    if (Array.isArray(conversation.firstPageParticipant)) collected.push(...conversation.firstPageParticipant);
    if (typeof conversation.getParticipantList === "function") {
      try {
        collected.push(...conversation.getParticipantList());
      } catch (_) {}
    }
    try {
      const fromManager = runtime.participantManager && runtime.participantManager.getParticipants(conversation.id);
      if (Array.isArray(fromManager)) collected.push(...fromManager);
    } catch (_) {}
    return collected.map(serializeParticipant).filter((participant) => participant.userId || participant.nickname);
  }

  function serializeConversation(runtime, conversation) {
    const lastMessage = conversation.lastMessage || conversation.lastVisibleMessage || {};
    return {
      id: toStringValue(conversation.id || conversation.conversationId),
      shortId: serializeLong(conversation.shortId || conversation.conversationShortId),
      type: conversation.type || conversation.conversationType,
      inboxType: conversation.inboxType || (conversation.coreInfo && conversation.coreInfo.inboxType) || 0,
      title: toStringValue(conversation.name || (conversation.coreInfo && conversation.coreInfo.name)),
      coreInfo: {
        name: toStringValue(conversation.coreInfo && conversation.coreInfo.name),
        owner: toStringValue(conversation.coreInfo && conversation.coreInfo.owner),
      },
      lastMessage: serializeMessage(lastMessage),
      participants: getParticipants(runtime, conversation),
    };
  }

  function getConversationArray(runtime) {
    if (typeof runtime.conversationManager.getConversationArray === "function") {
      return runtime.conversationManager.getConversationArray();
    }
    const conversations = runtime.conversationManager.conversations;
    if (conversations instanceof Map) return [...conversations.values()];
    if (conversations && typeof conversations === "object") return Object.values(conversations);
    return [];
  }

  function findConversation(runtime, conversationId) {
    const conversations = getConversationArray(runtime);
    return conversations.find((conversation) => toStringValue(conversation.id) === toStringValue(conversationId));
  }

  async function listConversations() {
    const runtime = getImRuntime();
    const conversations = getConversationArray(runtime);
    return {
      source: "page-im-sdk",
      currentUserId: getCurrentUserId(runtime.core, conversations),
      conversations: conversations.map((conversation) => serializeConversation(runtime, conversation)),
    };
  }

  function getInitialAnchor(conversation) {
    return (
      conversation.lastMessageIndexV2 ||
      conversation.lastMessageIndex ||
      (conversation.lastMessage && (conversation.lastMessage.index_in_conversation || conversation.lastMessage.indexInConversation)) ||
      (conversation.lastVisibleMessage && (conversation.lastVisibleMessage.index_in_conversation || conversation.lastVisibleMessage.indexInConversation))
    );
  }

  async function exportConversation(payload) {
    const runtime = getImRuntime();
    const conversation = findConversation(runtime, payload.conversationId);
    if (!conversation) throw new Error("没有在页面 IM SDK 中找到这个会话，请刷新会话列表后重试。");

    const limit = Math.min(Math.max(Number(payload.limit || 50), 1), 100);
    const maxPages = Math.min(Math.max(Number(payload.maxPages || 1000), 1), 5000);
    const baseArgs = {
      conversationId: conversation.id,
      conversationShortId: conversation.shortId,
      conversationType: conversation.type,
      inboxType: conversation.inboxType || (conversation.coreInfo && conversation.coreInfo.inboxType) || 0,
      limit,
      direction: 1,
    };

    let anchorIndex = payload.anchorIndex || getInitialAnchor(conversation);
    const pages = [];
    const seenIds = new Set();
    let reachedLimit = false;

    for (let page = 0; page < maxPages; page++) {
      const response = await runtime.coreApi.GetMessagesByConversation({
        ...baseArgs,
        anchorIndex,
      });
      const body = response && response.body ? response.body : {};
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const serialized = [];

      for (const message of messages) {
        const item = serializeMessage(message);
        const id = item.server_message_id || item.client_message_id || `${item.sender}-${item.create_time}-${item.content}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        serialized.push(item);
      }

      pages.push(serialized);
      if (!body.has_more || !body.next_cursor || messages.length === 0) break;
      anchorIndex = body.next_cursor;
      if (page === maxPages - 1) reachedLimit = true;
    }

    return {
      source: "page-im-sdk",
      currentUserId: getCurrentUserId(runtime.core, getConversationArray(runtime)),
      conversation: serializeConversation(runtime, conversation),
      messages: pages.reverse().flat(),
      reachedLimit,
    };
  }

  async function handle(action, payload) {
    if (action === "probe") {
      const runtime = getImRuntime();
      return {
        source: "page-im-sdk",
        hasCore: !!runtime.core,
        conversationCount: getConversationArray(runtime).length,
      };
    }
    if (action === "listConversations") return listConversations();
    if (action === "exportConversation") return exportConversation(payload || {});
    throw new Error(`未知页面桥接操作: ${action}`);
  }

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.source !== SOURCE_CONTENT || !data.requestId) return;

    try {
      const result = await handle(data.action, data.payload);
      postResponse(data.requestId, true, result, "");
    } catch (error) {
      postResponse(data.requestId, false, null, error && error.message ? error.message : String(error));
    }
  });
})();
