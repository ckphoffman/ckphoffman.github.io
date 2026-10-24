const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildChatHtml,
  normalizeConversation,
  normalizeMessage,
} = require("../src/exportCore");

test("normalizeConversation uses peer display name from participant metadata", () => {
  const raw = {
    id: "0:1:peer:me",
    shortId: "12345",
    type: 1,
    inboxType: 0,
    coreInfo: { name: "" },
    lastMessage: { content: "hello" },
    participants: [
      { userId: "me", nickname: "Me" },
      { userId: "peer", nickname: "Peer Name", secUid: "sec_peer" },
    ],
  };

  assert.deepEqual(normalizeConversation(raw, "me"), {
    id: "0:1:peer:me",
    shortId: "12345",
    type: 1,
    inboxType: 0,
    title: "Peer Name",
    peerUserId: "peer",
    lastMessage: "hello",
  });
});

test("normalizeMessage extracts text, timestamp, sender side, and stable id", () => {
  const raw = {
    server_message_id: "m1",
    sender: "peer",
    message_type: 7,
    content: JSON.stringify({ text: "你好 <script>" }),
    create_time: 1779465544000,
  };

  assert.deepEqual(normalizeMessage(raw, "me"), {
    id: "m1",
    senderId: "peer",
    side: "them",
    type: 7,
    text: "你好 <script>",
    createdAt: "2026-05-22T15:59:04.000Z",
  });
});

test("buildChatHtml escapes content and includes metadata", () => {
  const html = buildChatHtml({
    conversation: { title: "Peer <Name>", id: "conv-1" },
    messages: [
      {
        id: "m1",
        side: "them",
        senderId: "peer",
        type: 7,
        text: "hello <b>world</b>",
        createdAt: "2026-05-22T15:59:04.000Z",
      },
    ],
    exportedAt: "2026-05-22T16:00:00.000Z",
  });

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /Peer &lt;Name&gt;/);
  assert.match(html, /hello &lt;b&gt;world&lt;\/b&gt;/);
  assert.doesNotMatch(html, /hello <b>world<\/b>/);
  assert.match(html, /conv-1/);
});
