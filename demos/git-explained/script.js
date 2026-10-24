const steps = [
  {
    title: "初始状态",
    command: "git init",
    body: "Git 在项目里创建 .git 目录。此时还没有历史，main 分支也还没有真正指向任何提交。",
    rule: "Git 的核心数据都藏在 .git 里，工作目录只是你看得见的那一层。",
    working: [
      { name: "README.md", status: "已跟踪", content: "# Git Notes\nworking tree" },
      { name: "app.js", status: "已跟踪", content: "console.log('v1')" }
    ],
    index: [],
    objects: [],
    remote: [],
    commits: [],
    refs: []
  },
  {
    title: "编辑文件",
    command: "echo 'staging area' >> README.md",
    body: "你改变的是工作区文件。Git 还没有把这次变化纳入下一次提交，仓库里的历史也没有变化。",
    rule: "修改文件不等于修改历史。历史只有在 commit 之后才会前进。",
    working: [
      { name: "README.md", status: "已修改", badge: "modified", content: "# Git Notes\nworking tree\nstaging area" },
      { name: "app.js", status: "已跟踪", content: "console.log('v1')" }
    ],
    index: [],
    objects: [],
    remote: [],
    commits: [],
    refs: []
  },
  {
    title: "暂存变化",
    command: "git add README.md",
    body: "git add 会读取当前文件内容，写入对象数据库，并把这个版本的路径映射记录到暂存区。",
    rule: "暂存区不是临时文件夹，而是一份准备提交的目录树草稿。",
    working: [
      { name: "README.md", status: "已修改", badge: "modified", content: "# Git Notes\nworking tree\nstaging area" },
      { name: "app.js", status: "已跟踪", content: "console.log('v1')" }
    ],
    index: [
      { name: "README.md", status: "已暂存", badge: "staged", content: "blob b91a2\nREADME.md" }
    ],
    objects: [
      { type: "blob", name: "b91a2", text: "README.md 的新内容" }
    ],
    remote: [],
    commits: [],
    refs: []
  },
  {
    title: "创建提交",
    command: "git commit -m \"docs: explain staging\"",
    body: "Git 把暂存区组装成 tree，再创建 commit 对象。当前分支 main 会移动到这个新提交上。",
    rule: "提交保存快照和父子关系，分支名保存当前位置。",
    working: [
      { name: "README.md", status: "干净", content: "# Git Notes\nworking tree\nstaging area" },
      { name: "app.js", status: "干净", content: "console.log('v1')" }
    ],
    index: [
      { name: "README.md", status: "与 HEAD 一致", badge: "staged", content: "blob b91a2\nREADME.md" }
    ],
    objects: [
      { type: "blob", name: "b91a2", text: "README.md 的内容" },
      { type: "tree", name: "41f9c", text: "记录 README.md 和 app.js" },
      { type: "commit", name: "c1", text: "main 指向此提交" }
    ],
    remote: [],
    commits: [{ id: "c1", label: "c1", x: 14, y: 52, kind: "main" }],
    refs: [
      { text: "main", x: 14, y: 24, kind: "branch" },
      { text: "HEAD", x: 14, y: 76, kind: "head" }
    ]
  },
  {
    title: "创建分支",
    command: "git branch feature",
    body: "新分支并不会复制整个项目。Git 只是增加一个叫 feature 的引用，让它也指向 c1。",
    rule: "分支很便宜，因为它本质上是一个可移动的名字。",
    working: [
      { name: "README.md", status: "干净", content: "# Git Notes\nworking tree\nstaging area" },
      { name: "app.js", status: "干净", content: "console.log('v1')" }
    ],
    index: [
      { name: "README.md", status: "与 HEAD 一致", badge: "staged", content: "blob b91a2\nREADME.md" }
    ],
    objects: [
      { type: "blob", name: "b91a2", text: "README.md 的内容" },
      { type: "tree", name: "41f9c", text: "记录 README.md 和 app.js" },
      { type: "commit", name: "c1", text: "main 和 feature 都指向这里" }
    ],
    remote: [],
    commits: [{ id: "c1", label: "c1", x: 14, y: 52, kind: "main" }],
    refs: [
      { text: "main", x: 14, y: 21, kind: "branch" },
      { text: "feature", x: 14, y: 34, kind: "feature" },
      { text: "HEAD→main", x: 14, y: 76, kind: "head" }
    ]
  },
  {
    title: "切换分支",
    command: "git switch feature",
    body: "HEAD 改为指向 feature。工作区和暂存区会被调整成 feature 当前提交的样子。",
    rule: "HEAD 决定你下一次提交会让哪个分支向前移动。",
    working: [
      { name: "README.md", status: "干净", content: "# Git Notes\nworking tree\nstaging area" },
      { name: "app.js", status: "干净", content: "console.log('v1')" }
    ],
    index: [
      { name: "README.md", status: "与 HEAD 一致", badge: "staged", content: "blob b91a2\nREADME.md" }
    ],
    objects: [
      { type: "commit", name: "c1", text: "两个分支仍在同一提交" },
      { type: "ref", name: "HEAD", text: "现在附着在 feature 上" }
    ],
    remote: [],
    commits: [{ id: "c1", label: "c1", x: 14, y: 52, kind: "main" }],
    refs: [
      { text: "main", x: 14, y: 21, kind: "branch" },
      { text: "feature", x: 14, y: 34, kind: "feature" },
      { text: "HEAD→feature", x: 14, y: 76, kind: "head" }
    ]
  },
  {
    title: "在分支上提交",
    command: "git commit -am \"feat: add demo\"",
    body: "因为 HEAD 在 feature 上，新提交 c2 会接在 c1 后面，feature 向前移动，main 留在原地。",
    rule: "提交让当前分支前进，不会自动推动其他分支。",
    working: [
      { name: "README.md", status: "干净", content: "# Git Notes\nworking tree\nstaging area\ndemo" },
      { name: "app.js", status: "干净", content: "console.log('demo')" }
    ],
    index: [
      { name: "README.md", status: "与 HEAD 一致", badge: "staged", content: "blob e72bc\nREADME.md" },
      { name: "app.js", status: "与 HEAD 一致", badge: "staged", content: "blob f2a81\napp.js" }
    ],
    objects: [
      { type: "blob", name: "e72bc", text: "README.md 的 demo 版本" },
      { type: "blob", name: "f2a81", text: "app.js 的 demo 版本" },
      { type: "commit", name: "c2", text: "父提交是 c1，feature 指向它" }
    ],
    remote: [],
    commits: [
      { id: "c1", label: "c1", x: 14, y: 58, kind: "main" },
      { id: "c2", label: "c2", x: 42, y: 36, kind: "feature", parent: "c1" }
    ],
    refs: [
      { text: "main", x: 14, y: 78, kind: "branch" },
      { text: "feature", x: 42, y: 16, kind: "feature" },
      { text: "HEAD", x: 42, y: 60, kind: "head" }
    ]
  },
  {
    title: "合并分支",
    command: "git switch main && git merge feature",
    body: "main 没有自己的新提交，所以这次 merge 可以快进。Git 只需要把 main 指针移动到 c2。",
    rule: "很多 merge 的本质只是移动指针；出现分叉时才需要新的合并提交。",
    working: [
      { name: "README.md", status: "干净", content: "# Git Notes\nworking tree\nstaging area\ndemo" },
      { name: "app.js", status: "干净", content: "console.log('demo')" }
    ],
    index: [
      { name: "README.md", status: "与 HEAD 一致", badge: "staged", content: "blob e72bc\nREADME.md" },
      { name: "app.js", status: "与 HEAD 一致", badge: "staged", content: "blob f2a81\napp.js" }
    ],
    objects: [
      { type: "commit", name: "c1", text: "旧的基础提交" },
      { type: "commit", name: "c2", text: "main 和 feature 现在都指向它" },
      { type: "ref", name: "HEAD", text: "重新附着在 main 上" }
    ],
    remote: [],
    commits: [
      { id: "c1", label: "c1", x: 14, y: 58, kind: "main" },
      { id: "c2", label: "c2", x: 42, y: 36, kind: "feature", parent: "c1" }
    ],
    refs: [
      { text: "main", x: 42, y: 13, kind: "branch" },
      { text: "feature", x: 42, y: 26, kind: "feature" },
      { text: "HEAD", x: 42, y: 60, kind: "head" }
    ]
  },
  {
    title: "推送到远端",
    command: "git push origin main",
    body: "Git 会找出远端缺少的对象，把它们传过去，然后请求远端把 origin/main 更新到 c2。",
    rule: "远程仓库不是神秘中心，只是另一份 Git 仓库。",
    working: [
      { name: "README.md", status: "干净", content: "# Git Notes\nworking tree\nstaging area\ndemo" },
      { name: "app.js", status: "干净", content: "console.log('demo')" }
    ],
    index: [
      { name: "README.md", status: "与 HEAD 一致", badge: "staged", content: "blob e72bc\nREADME.md" },
      { name: "app.js", status: "与 HEAD 一致", badge: "staged", content: "blob f2a81\napp.js" }
    ],
    objects: [
      { type: "commit", name: "c1", text: "已存在于远端或刚上传" },
      { type: "commit", name: "c2", text: "上传后远端 main 指向它" },
      { type: "pack", name: "pack", text: "传输时对象会被打包压缩" }
    ],
    remote: [
      { name: "origin/main", status: "已同步", badge: "remote", content: "c2\n包含 c1、c2 和所需对象" }
    ],
    commits: [
      { id: "c1", label: "c1", x: 14, y: 58, kind: "main" },
      { id: "c2", label: "c2", x: 42, y: 36, kind: "feature", parent: "c1" }
    ],
    refs: [
      { text: "main", x: 42, y: 13, kind: "branch" },
      { text: "feature", x: 42, y: 26, kind: "feature" },
      { text: "origin/main", x: 67, y: 36, kind: "remote" },
      { text: "HEAD", x: 42, y: 60, kind: "head" }
    ]
  }
];

const els = {
  workingFiles: document.querySelector("#workingFiles"),
  indexFiles: document.querySelector("#indexFiles"),
  repoObjects: document.querySelector("#repoObjects"),
  remoteState: document.querySelector("#remoteState"),
  stepTitle: document.querySelector("#stepTitle"),
  stepCommand: document.querySelector("#stepCommand"),
  stepBody: document.querySelector("#stepBody"),
  stepRule: document.querySelector("#stepRule"),
  commitGraph: document.querySelector("#commitGraph"),
  buttons: [...document.querySelectorAll(".command-button")],
  resetButton: document.querySelector("#resetButton")
};

function renderFileList(target, files, emptyText) {
  target.innerHTML = "";

  if (!files.length) {
    const empty = document.createElement("li");
    empty.className = "file-card";
    empty.innerHTML = `<span class="file-name">${emptyText}</span><span class="mini-code">这里还没有记录</span>`;
    target.append(empty);
    return;
  }

  files.forEach((file) => {
    const item = document.createElement("li");
    item.className = "file-card";
    item.innerHTML = `
      <div class="file-name-row">
        <span class="file-name">${file.name}</span>
        <span class="badge ${file.badge || ""}">${file.status}</span>
      </div>
      <span class="mini-code">${file.content}</span>
    `;
    target.append(item);
  });
}

function renderObjects(objects) {
  els.repoObjects.innerHTML = "";

  if (!objects.length) {
    els.repoObjects.innerHTML = `
      <div class="object-card">
        <span class="object-type">obj</span>
        <div>
          <h4>对象库为空</h4>
          <p>还没有 blob、tree 或 commit。</p>
        </div>
      </div>
    `;
    return;
  }

  objects.forEach((object) => {
    const card = document.createElement("div");
    card.className = "object-card";
    card.innerHTML = `
      <span class="object-type">${object.type}</span>
      <div>
        <h4>${object.name}</h4>
        <p>${object.text}</p>
      </div>
    `;
    els.repoObjects.append(card);
  });
}

function renderRemote(remote) {
  els.remoteState.innerHTML = "";

  if (!remote.length) {
    els.remoteState.innerHTML = `
      <div class="remote-card">
        <h4>origin 尚未更新</h4>
        <p>本地对象还没有推送到远端。</p>
      </div>
    `;
    return;
  }

  remote.forEach((file) => {
    const card = document.createElement("div");
    card.className = "remote-card";
    card.innerHTML = `
      <div class="file-name-row">
        <h4>${file.name}</h4>
        <span class="badge ${file.badge || ""}">${file.status}</span>
      </div>
      <span class="mini-code">${file.content}</span>
    `;
    els.remoteState.append(card);
  });
}

function drawLine(parent, from, to) {
  const x1 = from.x;
  const y1 = from.y;
  const x2 = to.x;
  const y2 = to.y;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const line = document.createElement("span");
  line.className = "graph-line";
  line.style.left = `calc(${x1}% + 31px)`;
  line.style.top = `calc(${y1}% + 31px)`;
  line.style.width = `calc(${length}% - 20px)`;
  line.style.transform = `rotate(${angle}deg)`;
  parent.append(line);
}

function renderGraph(step) {
  els.commitGraph.innerHTML = "";

  if (!step.commits.length) {
    const label = document.createElement("div");
    label.className = "ref-label head";
    label.style.left = "calc(50% - 70px)";
    label.style.top = "calc(50% - 18px)";
    label.textContent = "还没有提交";
    els.commitGraph.append(label);
    return;
  }

  const commitsById = new Map(step.commits.map((commit) => [commit.id, commit]));
  step.commits.forEach((commit) => {
    if (commit.parent && commitsById.has(commit.parent)) {
      drawLine(els.commitGraph, commitsById.get(commit.parent), commit);
    }
  });

  step.commits.forEach((commit) => {
    const node = document.createElement("span");
    node.className = `commit-node ${commit.kind || ""}`;
    node.style.left = `${commit.x}%`;
    node.style.top = `${commit.y}%`;
    node.textContent = commit.label;
    els.commitGraph.append(node);
  });

  step.refs.forEach((ref) => {
    const label = document.createElement("span");
    label.className = `ref-label ${ref.kind || ""}`;
    label.style.left = `${ref.x}%`;
    label.style.top = `${ref.y}%`;
    label.textContent = ref.text;
    els.commitGraph.append(label);
  });
}

function setStep(index) {
  const step = steps[index];

  els.buttons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.step) === index);
  });

  els.stepTitle.textContent = step.title;
  els.stepCommand.textContent = step.command;
  els.stepBody.textContent = step.body;
  els.stepRule.textContent = step.rule;

  renderFileList(els.workingFiles, step.working, "工作区为空");
  renderFileList(els.indexFiles, step.index, "暂存区为空");
  renderObjects(step.objects);
  renderRemote(step.remote);
  renderGraph(step);
}

els.buttons.forEach((button) => {
  button.addEventListener("click", () => setStep(Number(button.dataset.step)));
});

els.resetButton.addEventListener("click", () => setStep(0));

setStep(0);
