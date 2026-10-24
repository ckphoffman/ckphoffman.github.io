# Douyin IM HTML Exporter

一个可解包加载的 Chrome 扩展，用于在抖音网页版私信面板中选择某个会话，并导出为本地 HTML 文件。

## 安装

1. 打开 `chrome://extensions/`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本目录：`<this folder>`。

## 使用

1. 打开并登录 `https://www.douyin.com/`。
2. 点击扩展图标。
3. 点击“打开私信”。
4. 点击“读取会话”。
5. 在会话列表中选择“导出 HTML”。

## 实现说明

这个扩展不滚动聊天窗口。它通过 content script 注入 `src/pageBridge.js` 到页面主世界，复用抖音页面已经初始化的 IM SDK：

- `ConversationManager.getConversationArray()` 读取当前会话列表。
- `CoreApi.GetMessagesByConversation()` 按 `next_cursor` 分页读取指定会话消息。
- `chrome.downloads.download()` 保存生成的 HTML。

如果抖音后续更换 webpack 模块或 IM SDK 名称，需要更新 `src/pageBridge.js` 中的模块定位逻辑。
