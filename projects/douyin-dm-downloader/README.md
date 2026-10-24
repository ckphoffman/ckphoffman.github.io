# 抖音私信下载器

Chrome 扩展（Manifest V3），在抖音网页版下载与某个用户的完整聊天记录，导出为 **HTML** 和 **TXT**。
图片 / 视频 / 表情等非文字消息会被替换为占位符（如 `[图片]` `[视频]`），不会下载实际文件。

> ⚠️ 仅本地运行，所有数据都不会上传到任何服务器。请遵守抖音的服务条款。

---

## 安装

1. 打开 Chrome，访问 `chrome://extensions/`。
2. 右上角打开 **开发者模式**。
3. 点击 **加载已解压的扩展程序**，选择本目录（`sixin/`）。
4. 安装后可在工具栏看到粉色 ⬇ 图标。

## 使用

### 方式 A：使用扩展弹窗

1. 打开 [www.douyin.com](https://www.douyin.com/) 并登录。
2. 点击工具栏的扩展图标。
3. 点击 **打开私信页面**（如果你不在私信页，扩展会尝试自动点击右上角的私信入口）。
4. 在下拉列表中 **选择聊天对象**，或点 **🎲 随机选一个**。
5. 点击 **打开此聊天**，等聊天载入后再点 **⬇ 下载所有聊天记录**。
6. 扩展会自动滚动到顶部加载完整历史，完成后浏览器会下载 `douyin_im_<昵称>_<时间戳>.html` 和 `.txt`。

### 方式 B：使用页面右下角的浮动按钮

进入私信页后，页面右下角会出现一个粉色 ⬇ 按钮。点击它会弹出菜单：

- **🎲 随机选一个聊天并下载** —— 随机挑一个会话直接抓取
- **⬇ 下载当前打开的聊天** —— 抓取已经打开的对话

---

## 工作原理

- `content.js` 注入到 `douyin.com` 页面，识别 DOM 中的私信入口、聊天列表、消息气泡。
- 抓取时会自动反复将消息容器滚动到底部，等待懒加载触发，直到连续若干轮都没有新消息为止。
- 然后从最旧消息（底部）逐段滚动到最新（顶部），按出现顺序去重收集。
- 导出由 `background.js` 通过 `chrome.downloads` API 完成。

### 几个关键的抖音特性（实测）

抖音网页版 IM 有几个非常规设计，扩展专门处理了它们：

1. **私信入口是个普通 `<div>` 而不是链接**。`.click()` 触发不到事件，必须派发 `pointerdown / mousedown / pointerup / mouseup / click` 全套鼠标事件链 — 见 [`realClick()`](content.js)。
2. **私信不是独立页面而是右侧浮层**。URL 不变，不能靠路由判断；`/im` 路由返回 404。
3. **聊天列表是反向时间顺序**：`scrollTop = 0` 是 **最新** 消息，`scrollTop = max` 是 **最旧**。懒加载历史是在 **底部** 触发的，不是顶部。
4. **懒加载的唯一可靠触发方式**：`container.scrollTop = scrollHeight` 之后必须再 `container.dispatchEvent(new Event('scroll'))`。`wheel` / `scrollBy` / 已经停在底部时再赋值 `scrollTop` 都不会触发新加载。每次触发追加 ~5000px（≈ 80–100 条消息高度）。
5. **虚拟滚动 + transform 定位**：DOM 里任何时刻只渲染 ~7–12 条消息，离开视口的会被卸载。**walk 时如果只改 `scrollTop` 而不 dispatchEvent('scroll')，DOM 不会换内容** —— 你会发现抓到 10 条左右就停了（始终看到同一批 items）。`goTo()` 必须同时做两件事。
6. **scrollHeight 抖动**：到达历史最早处后，`scrollHeight` 会在两个相近值之间小幅抖动（±30px）。判定"加载完毕"用 `maxSh + tolerance`，不能用 `sh === prevH`，否则永远跳不出循环。
7. **isFromMe 用 className 直接判定**：抖音的消息 box 上带 `messageMessageBoxisFromMe` 类。如果某天该类名变化，自动退化为「头像在 contentBox 右半侧 = 我」的位置启发式。
8. **消息去重用图片 URL 指纹**：很多消息都是「[图片]」占位，光靠文字会大量误合并。代码使用图片/视频的 src URL 作为指纹。

## 抖音 DOM 变更后如何调整

抖音网页是 SPA，类名经常变化。如果某天扩展定位不到元素：

1. 打开 DevTools 检查实际的 DOM。
2. 编辑 `content.js` 顶部的 `SELECTORS` 常量，添加新的选择器（保留旧的作为兼容）。
3. 在扩展页面点击「重新加载」按钮即可生效。

关键选择器列表（实测命中值在 `content.js` 顶部的 `SELECTORS` 常量内）：

| 用途 | 实测匹配 |
| --- | --- |
| 右上角私信入口 | `[data-e2e="im-entry"]` |
| 聊天列表容器 | `[class*="conversationConversationListwrapper"]` |
| 每个聊天列表项 | `[class*="conversationConversationItemwrapper"]` |
| 聊天项标题（昵称） | `[class*="conversationConversationItemtitle"]` |
| 消息列表滚动容器 | `[class*="messageMessageListlist"]` |
| 每条消息气泡 | `[class*="messageMessageBoxmessageBox"]` |
| 消息时间 | `[class*="MessageBoxTimetimeLayout"]` |
| 头像（用于位置兜底） | `[class*="commonIMAvataravatarContainer"]` |
| 「我发的」直接标识 | className 含 `isFromMe`（如 `messageMessageBoxisFromMe`） |
| 分享卡片 | className 含 `MessageBoxRefContainer` / `FilteredFilteredMessage` |

判断"我"vs"对方"的规则在 [`isFromMe()`](content.js)：优先匹配 className 中的 `isFromMe`，找不到再退化为「头像在 contentBox 右半侧 = 我」的位置启发式。

## 文件结构

```
sixin/
├── manifest.json     # MV3 配置
├── popup.html        # 扩展弹窗
├── popup.css
├── popup.js          # 弹窗交互逻辑
├── content.js        # 注入到抖音页面的核心脚本
├── content.css       # 浮动按钮样式
├── background.js     # Service Worker（处理下载）
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 已知限制

- 抓取依赖 DOM 滚动加载，对于消息量极大的会话耗时较长（每滚动一次默认等 0.7s）。
- 时间戳取决于抖音是否在 DOM 中显示，部分消息可能没有时间字段。
- 若一条消息既有文本又有媒体，会同时记录两者（如 `你看这个 [图片]`）。
- 仅在 `www.douyin.com` 主站测试，不保证海外版 / TikTok 可用。
