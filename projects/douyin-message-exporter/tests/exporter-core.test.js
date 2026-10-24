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

const formulaConversations = [
  {
    conversationName: "公式测试",
    messages: [
      {
        text: "=HYPERLINK(\"https://evil.example\")"
      },
      {
        text: "   +SUM(1,2)"
      },
      {
        text: "\n-10"
      },
      {
        text: "\t@cmd"
      }
    ]
  }
];

const formulaJson = exporter.toJson(formulaConversations);
assert.ok(formulaJson.includes("\"text\": \"=HYPERLINK(\\\"https://evil.example\\\")\""));
assert.ok(formulaJson.includes("\"text\": \"+SUM(1,2)\""));
assert.ok(formulaJson.includes("\"text\": \"-10\""));
assert.ok(formulaJson.includes("\"text\": \"@cmd\""));

const formulaCsv = exporter.toCsv(formulaConversations);
assert.ok(formulaCsv.includes("\"'=HYPERLINK(\"\"https://evil.example\"\")\""));
assert.ok(formulaCsv.includes("\"'+SUM(1,2)\""));
assert.ok(formulaCsv.includes("'-10"));
assert.ok(formulaCsv.includes("'@cmd"));

assert.match(exporter.filename("json"), /^douyin_messages_\d{8}_\d{6}\.json$/);
assert.match(exporter.filename("csv"), /^douyin_messages_\d{8}_\d{6}\.csv$/);

console.log("exporter-core tests passed");
