const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "../extension/src/content.js"), "utf8");

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

const resolveCurrentConversation = vm.runInNewContext(
  `(${extractFunction("resolveCurrentConversation")})`,
  {
    hasUsableId: vm.runInNewContext(`(${extractFunction("hasUsableId")})`)
  }
);

assert.throws(
  () =>
    resolveCurrentConversation(
      { id: "conversation:old", name: "重复昵称" },
      [{ id: "conversation:new", name: "重复昵称", index: 3 }]
    ),
  /无法定位会话「重复昵称」.*重新扫描/,
  "selected summaries with an id must not fall back to same-name conversations with different ids"
);

assert.throws(
  () =>
    resolveCurrentConversation(
      { id: "conversation:dup", name: "重复昵称" },
      [
        { id: "conversation:dup", name: "重复昵称", index: 1 },
        { id: "conversation:dup", name: "重复昵称", index: 2 }
      ]
    ),
  /无法唯一定位会话「重复昵称」/,
  "multiple current rows with the selected id must remain ambiguous"
);

assert.deepStrictEqual(
  resolveCurrentConversation(
    { name: "重复昵称" },
    [{ id: "conversation:new", name: "重复昵称", index: 3 }]
  ),
  { id: "conversation:new", name: "重复昵称", index: 3 },
  "name matching remains available when the selected summary has no usable id"
);

console.log("content selection resolution tests passed");
