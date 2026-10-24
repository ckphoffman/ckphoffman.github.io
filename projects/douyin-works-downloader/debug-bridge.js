// ═══════════════════════════════════════════════════════════════
// debug-bridge.js  — 通用调试日志桥
// ═══════════════════════════════════════════════════════════════
// 作用：把 Popup / Service Worker / Content Script 里所有的
//   console.log / error / warn  和  未捕获异常
// 全部转发到"当前网页的 Console"，这样 AI 通过浏览器 MCP 就能
// 一次性读到所有调试信息，你不用手动到处复制粘贴。
//
// 使用方法（3 步）：
//   1. 把本文件放进插件目录
//   2. popup.html 里最前面加：  <script src="debug-bridge.js"></script>
//   3. background.js / content.js 最顶上加：  importScripts('debug-bridge.js')  // SW
//                                         或  // 直接在 manifest 的 content_scripts.js 数组里加
//   4. manifest.json 里如果用了 service_worker，用下面方式引入：
//        "background": { "service_worker": "background.js", "type": "module" }
//      然后 background.js 顶部：  import './debug-bridge.js';
//
// 效果：在目标网页按 F12，Console 里会看到：
//   [EXT-POPUP 14:23:01] 获取评论失败  Error: ...
//   [EXT-SW    14:23:02] 下载已触发
// ═══════════════════════════════════════════════════════════════

(function () {
  // 判断当前运行环境
  const env =
    typeof window !== 'undefined' && location.protocol === 'chrome-extension:'
      ? 'POPUP'
      : typeof window === 'undefined'
      ? 'SW'
      : 'CONTENT';

  const now = () => new Date().toTimeString().slice(0, 8);

  const stringify = (a) => {
    if (a instanceof Error) return `${a.message}\n${a.stack || ''}`;
    if (typeof a === 'object') {
      try { return JSON.stringify(a); } catch { return String(a); }
    }
    return String(a);
  };

  // 1) 劫持 console.*，原地输出 + 转发
  ['log', 'info', 'warn', 'error', 'debug'].forEach((m) => {
    const orig = console[m].bind(console);
    console[m] = (...args) => {
      orig(...args);
      if (env === 'CONTENT') return; // 本身就在网页 console 里，不用转发
      try {
        chrome.runtime.sendMessage({
          __debug_bridge: true,
          method: m,
          env,
          time: now(),
          args: args.map(stringify),
        });
      } catch {}
    };
  });

  // 2) 抓未捕获异常
  const capture = (msg) => {
    try {
      chrome.runtime.sendMessage({
        __debug_bridge: true,
        method: 'error',
        env,
        time: now(),
        args: ['[UNCAUGHT] ' + msg],
      });
    } catch {}
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) =>
      capture(`${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`)
    );
    window.addEventListener('unhandledrejection', (e) =>
      capture(`Promise rejected: ${stringify(e.reason)}`)
    );
  } else if (typeof self !== 'undefined') {
    self.addEventListener('error', (e) => capture(e.message));
    self.addEventListener('unhandledrejection', (e) =>
      capture(`Promise rejected: ${stringify(e.reason)}`)
    );
  }

  // 3) 在 Content Script 环境里接收转发消息，回显到网页 Console
  if (env === 'CONTENT') {
    chrome.runtime.onMessage.addListener((msg) => {
      if (!msg?.__debug_bridge) return;
      const tag = `%c[EXT-${msg.env} ${msg.time}]`;
      const style =
        msg.method === 'error'
          ? 'color:#fff;background:#e53935;padding:2px 4px;border-radius:2px'
          : msg.method === 'warn'
          ? 'color:#000;background:#ffb300;padding:2px 4px;border-radius:2px'
          : 'color:#fff;background:#546e7a;padding:2px 4px;border-radius:2px';
      console[msg.method](tag, style, ...msg.args);
    });
  }
})();
