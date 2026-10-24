const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "../extension/src/douyin-dom.js"), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notStrictEqual(start, -1, `${name} must exist`);

  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`Could not extract ${name}`);
}

const rowMatchesExpected = vm.runInNewContext(`(${extractFunction("rowMatchesExpected")})`, {
  parseConversationRow: (row) => row
});

assert.ok(
  !source.includes("findConfirmedConversationList() || findConversationListChangedFrom"),
  "openPrivateMessages must not fall back to an unconfirmed changed conversation list"
);

assert.ok(
  !source.includes("rowIndex === index || rowMatchesExpected"),
  "open verification must not confirm a conversation by index alone"
);

assert.match(
  source,
  /function conversationRows\(list\)/,
  "conversationRows must be scoped to an explicit confirmed conversation list"
);

assert.match(
  source,
  /findUniqueMatchingConversationRow/,
  "openConversationByIndex must resolve expected summaries within the confirmed PM list before clicking"
);

assert.strictEqual(
  rowMatchesExpected(
    { id: "conversation:b", name: "重复昵称" },
    0,
    { id: "conversation:a", name: "重复昵称" }
  ),
  false,
  "expected summary id must prevent falling back to same-name conversation rows with a different id"
);

assert.strictEqual(
  rowMatchesExpected(
    { id: "conversation:b", name: "重复昵称" },
    0,
    { name: "重复昵称" }
  ),
  true,
  "name matching remains available when the expected summary has no usable id"
);

console.log("douyin-dom safety tests passed");
