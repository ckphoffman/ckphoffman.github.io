// content.js — 注入到 douyin.com 页面，负责定位 DOM、抓取聊天记录
// 由于抖音是 SPA 且 DOM 经常变动，这里采用多策略 + 启发式查找，
// 关键 selector 集中在 SELECTORS 常量中，便于后续调整。

(() => {
  if (window.__DOUYIN_SIXIN_INJECTED__) return;
  window.__DOUYIN_SIXIN_INJECTED__ = true;

  // ---------- 配置 ----------

  // 实测命中（2026-05，douyin.com 网页版）。请保留旧的作为兼容 fallback。
  const SELECTORS = {
    // 右上角的"私信"入口
    imEntry: [
      '[data-e2e="im-entry"]',
      '[data-e2e*="im-entry"]',
      'a[href*="/im"]',
      '[aria-label*="私信"]',
      '[aria-label*="消息"]',
    ],
    // 聊天列表容器（右侧浮层）
    chatListContainer: [
      '[class*="conversationConversationListwrapper"]',
      '[class*="conversation-list" i]',
      '[class*="sessionList" i]',
    ],
    // 每个聊天列表项
    chatItem: [
      '[class*="conversationConversationItemwrapper"]',
      '[class*="conversation-item" i]',
      '[class*="sessionItem" i]',
    ],
    // 聊天项标题（昵称）
    chatItemTitle: [
      '[class*="conversationConversationItemtitle"]:not([class*="Wrapper"])',
      '[class*="conversation-item-title"]',
    ],
    // 消息滚动容器（实际可滚动元素，正常方向：scrollTop=0 为顶部）
    messageContainer: [
      '[class*="messageMessageListlist"]',
      '[class*="message-list" i]',
      '[class*="msg-list" i]',
    ],
    // 每条消息气泡
    messageItem: [
      '[class*="messageMessageBoxmessageBox"]',
      '[class*="message-item" i]',
      '[class*="msg-item" i]',
    ],
    // 时间戳
    messageTime: [
      '[class*="MessageBoxTimetimeLayout"]',
      '[class*="message-time" i]',
      'time',
    ],
    // 头像容器（用于 isFromMe 判定）
    messageAvatar: [
      '[class*="commonIMAvataravatarContainer"]',
      '[class*="avatar" i]:not([class*="semi-avatar"])',
    ],
    // 消息内容盒子（包含头像 + 文本，用于位置参照）
    messageContentBox: [
      '[class*="messageMessageBoxcontentBox"]',
      '[class*="message-content-box"]',
    ],
  };

  // 滚动加载相关
  const MAX_TOP_LOAD_ROUNDS = 400; // 反复加载历史的安全上限
  const MAX_WALK_ROUNDS = 800; // walk 阶段安全上限
  const SCROLL_PAUSE_MS = 900;
  const TOP_NO_GROWTH_LIMIT = 6; // 连续 N 轮 scrollHeight + 消息数都不增长 → 视为加载完毕

  // ---------- 工具函数 ----------

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function qsAll(selectors, root = document) {
    const set = new Set();
    for (const s of selectors) {
      try {
        root.querySelectorAll(s).forEach((el) => set.add(el));
      } catch (_) {}
    }
    return [...set];
  }

  function qsFirst(selectors, root = document) {
    for (const s of selectors) {
      try {
        const el = root.querySelector(s);
        if (el) return el;
      } catch (_) {}
    }
    return null;
  }

  // 抖音的懒加载多半绑定在 wheel / touch 事件上，
  // 单纯设置 scrollTop 不会触发"加载更多历史"。这里既派发 wheel，
  // 又同步调整 scrollTop，两手抓。
  function dispatchWheel(el, deltaY) {
    if (!el) return;
    try {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      el.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY,
          deltaMode: 0,
          clientX: x,
          clientY: y,
        })
      );
    } catch (_) {}
  }

  // 抖音的"私信"按钮、聊天项等都是普通 div + 事件代理，
  // 用 .click() 触发不到 React 合成事件，必须派发完整鼠标事件链。
  function realClick(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
    };
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      try {
        const Cls =
          type.startsWith("pointer") && typeof PointerEvent === "function"
            ? PointerEvent
            : MouseEvent;
        el.dispatchEvent(new Cls(type, opts));
      } catch (_) {
        try {
          el.dispatchEvent(new MouseEvent(type, opts));
        } catch (_) {}
      }
    }
    return true;
  }

  // 通过文本内容查找元素（不区分大小写）
  function findByText(texts, tag = "*") {
    const list = document.querySelectorAll(tag);
    for (const el of list) {
      const t = (el.textContent || "").trim();
      if (!t || t.length > 20) continue;
      for (const target of texts) {
        if (t === target || t.includes(target)) return el;
      }
    }
    return null;
  }

  // 查找最可能是「滚动容器」的元素：可滚动且包含若干兄弟相似元素
  function findScrollableWithChildren(items) {
    if (items.length === 0) return null;
    let node = items[0].parentElement;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      const overflow = style.overflowY;
      const scrollable =
        (overflow === "auto" || overflow === "scroll") &&
        node.scrollHeight > node.clientHeight + 5;
      if (scrollable) return node;
      node = node.parentElement;
    }
    return items[0].parentElement;
  }

  function postProgress(payload) {
    try {
      chrome.runtime.sendMessage({ action: "progress", payload });
    } catch (_) {}
  }

  // ---------- 定位 ----------

  function findImEntry() {
    let el = qsFirst(SELECTORS.imEntry);
    if (el) return el;
    // 文本兜底
    el = findByText(["私信", "消息"], "a, button, span, div, [role=button]");
    return el;
  }

  function findChatItems() {
    let items = qsAll(SELECTORS.chatItem);
    if (items.length > 0) return items;

    // 启发式：找一个容器，里面有 3+ 个相似的子元素，每个都包含头像样的 img 和文本
    const containers = qsAll(SELECTORS.chatListContainer);
    for (const c of containers) {
      const children = [...c.children];
      const candidates = children.filter((ch) => ch.querySelector("img"));
      if (candidates.length >= 3) return candidates;
    }

    // 兜底：扫描 body 找规模最大的"看起来像列表"的容器
    const all = document.querySelectorAll("ul, div");
    let best = null;
    let bestScore = 0;
    for (const node of all) {
      if (node.children.length < 3) continue;
      const sample = node.children[0];
      if (!sample.querySelector("img")) continue;
      const sig = sample.className + "::" + sample.tagName;
      const matched = [...node.children].filter(
        (c) => c.className + "::" + c.tagName === sig
      );
      if (matched.length >= 3 && matched.length > bestScore) {
        bestScore = matched.length;
        best = matched;
      }
    }
    return best || [];
  }

  function findMessageContainer() {
    // 优先用语义化 selector（实测命中）
    const direct = qsFirst(SELECTORS.messageContainer);
    if (direct) {
      const items = qsAll(SELECTORS.messageItem, direct);
      return { container: direct, items };
    }
    // fallback：根据消息项反推可滚动容器
    const items = qsAll(SELECTORS.messageItem);
    if (items.length > 0) {
      const c = findScrollableWithChildren(items);
      if (c) return { container: c, items };
    }
    return { container: null, items: [] };
  }

  // ---------- 数据提取 ----------

  function getChatName(itemEl) {
    // 优先匹配抖音的 conversationConversationItemtitle
    const titled = qsFirst(SELECTORS.chatItemTitle, itemEl);
    if (titled) {
      const t = (titled.textContent || "").trim();
      if (t) return t;
    }
    // 兜底：从子元素中找一个合适的标题文本
    const candidates = itemEl.querySelectorAll(
      "span, p, div, a, [class*='name' i], [class*='title' i]"
    );
    for (const c of candidates) {
      const t = (c.textContent || "").trim();
      if (t && t.length <= 30 && !/^\d+$/.test(t)) {
        return t;
      }
    }
    return (itemEl.textContent || "").trim().slice(0, 30) || "(未命名)";
  }

  function getChatPreview(itemEl) {
    // 取除标题外较长的文本
    const all = (itemEl.textContent || "").trim().replace(/\s+/g, " ");
    return all.slice(0, 50);
  }

  function listChats() {
    const items = findChatItems();
    return items.map((el, i) => {
      el.setAttribute("data-sixin-idx", String(i));
      return {
        id: String(i),
        index: i,
        name: getChatName(el),
        preview: getChatPreview(el),
      };
    });
  }

  // ---------- 消息抓取 ----------

  // 判断一条消息是不是我发出的。
  // 抖音的 messageBox 本身就带 `messageMessageBoxisFromMe` 类，是最可靠的标识；
  // 内部子元素的 className 也包含 `isFromMe`。位置启发式只在 className 不可用时兜底。
  function isFromMe(el) {
    // 1. 整条消息的 className 上直接有 isFromMe 标记
    const cls = (el.className || "").toString();
    if (/isFromMe/i.test(cls)) return true;
    // 2. 内部任意元素的 className 含 isFromMe
    if (el.querySelector('[class*="isFromMe"]')) return true;
    // 3. 通用 fallback：自定义类名
    if (/\b(self|own|out|sent|mine)\b/i.test(cls)) return true;
    if (/\b(other|received|opposite|peer)\b/i.test(cls)) return false;
    // 4. 位置兜底：头像在 contentBox 的右半侧
    const contentBox = qsFirst(SELECTORS.messageContentBox, el);
    const avatar = qsFirst(SELECTORS.messageAvatar, el);
    if (contentBox && avatar) {
      const ar = avatar.getBoundingClientRect();
      const cr = contentBox.getBoundingClientRect();
      if (ar.width > 0 && cr.width > 0) {
        return ar.left + ar.width / 2 > cr.left + cr.width / 2;
      }
    }
    return false;
  }

  // 系统消息（撤回/提示）：没有头像，文本是固定形式
  function isSystemMessage(el) {
    const avatar = qsFirst(SELECTORS.messageAvatar, el);
    if (avatar) return false;
    const t = (el.innerText || "").trim();
    return /撤回了一条消息|对方回复或关注|《抖音自律公约》/.test(t);
  }

  // 提取一条消息的内容
  function extractMessage(el) {
    // 抖音的时间戳是单独子元素，从主文本中剔除以避免污染
    const timeEl = qsFirst(SELECTORS.messageTime, el);
    const time = timeEl ? (timeEl.textContent || "").trim().split(/\n/)[0] : "";

    let text = (el.innerText || el.textContent || "").trim();
    if (time) text = text.replace(time, "").trim();
    // 抖音的"已读"标记是消息底部的小字，剔除掉以免污染正文。
    // 注意：JS 的 \b 不识别中文边界，所以用 (?=\s|$) 兼容。
    text = text.replace(/(^|\n)已读(?=\s|$)/g, "").trim();

    // 检测媒体（排除头像 img）
    const mediaImgs = [...el.querySelectorAll("img")].filter((img) => {
      const cls = (img.className || "").toString();
      const src = img.src || "";
      return !/avatar|semi-avatar/i.test(cls) && !/avt-/i.test(src);
    });
    const hasImg = mediaImgs.length > 0;
    const hasVideo = !!el.querySelector("video");
    const hasAudio = !!el.querySelector("audio");
    const innerHTML = el.innerHTML || "";
    const isEmoji =
      /Emoji|emotion|sticker/.test(innerHTML) && text.length < 8;
    // 抖音分享卡片 / 被过滤消息的 className 关键字：
    //   MessageBoxRefContainer / MessageItemTextsplitRefer 普通分享
    //   FilteredFilteredMessage 被屏蔽/删除的分享
    //   VideoMessage / aweme-card / ShareCard 兜底
    const isCard =
      /MessageBoxRefContainer|MessageItem.*Refer|FilteredFilteredMessage|VideoMessage|aweme-card|ShareCard/i.test(
        innerHTML
      ) && (mediaImgs.length > 0 || /Filtered/.test(innerHTML));
    const isVoice = /voice|audio|record/i.test(innerHTML) && !text;

    const placeholders = [];
    if (isCard) placeholders.push("[分享卡片]");
    else if (hasVideo) placeholders.push("[视频]");
    else if (hasImg) placeholders.push("[图片]");
    if (hasAudio || isVoice) placeholders.push("[语音]");
    if (isEmoji && !text) placeholders.push("[表情]");

    let content = text;
    if (!content && placeholders.length > 0) {
      content = placeholders.join(" ");
    } else if (placeholders.length > 0) {
      content = content + " " + placeholders.join(" ");
    }

    let from = "other";
    if (isSystemMessage(el)) from = "system";
    else if (isFromMe(el)) from = "me";

    // 指纹：用图片 / 视频 URL 做精确去重
    // （内容和占位符相同的消息——例如多张图片分享——仅凭文字会误合并）
    const mediaFingerprints = mediaImgs
      .map((img) => (img.src || "").split("?")[0].split("/").pop())
      .filter(Boolean);
    const videoEl = el.querySelector("video");
    if (videoEl && videoEl.src) {
      mediaFingerprints.push(
        (videoEl.src || "").split("?")[0].split("/").pop()
      );
    }
    const fingerprint = mediaFingerprints.join("|");

    return {
      from,
      content: content || "(空消息)",
      time,
      fingerprint,
    };
  }

  // 抓取当前打开聊天的所有消息。
  //
  // 实测（2026-05，111111Tng 实测从 10 条修正到 653 条）抖音 IM 行为：
  //   - 容器：[class*="messageMessageListlist"]
  //   - scrollTop = 0 → 显示最新消息  |  scrollTop = max → 显示最旧消息
  //   - DOM 内最多 7-12 条 messageItem（虚拟滚动 + transform 定位）
  //
  //   ⚡ **两个关键非常规行为**：
  //   1) 懒加载历史的唯一触发方式：
  //        container.scrollTop = container.scrollHeight;
  //        container.dispatchEvent(new Event('scroll'));
  //      wheel/scrollBy/重复设置 scrollTop 全部无效；纯 scrollTop 赋值只在
  //      第一次有效（数值真的变化时浏览器才会自动 fire scroll 事件）。
  //   2) walk 时虚拟滚动器同样需要 scroll 事件触发重新渲染；只改 scrollTop
  //      不 dispatchEvent 的话，DOM 里永远停留在上一批 items（只采 ~10 条）。
  //
  //   - 每次懒加载追加 ~5000px（≈ 80-100 条消息高度）。
  //   - 到达历史最早处后 scrollHeight 会在两个相近值间小幅抖动（±30px），
  //     必须用 maxSh + tolerance 判定，而不是 sh === prevH。
  //
  // 策略：
  //   阶段1：反复 triggerLoadMore，直到 scrollHeight 稳定（maxSh 不再涨）。
  //   阶段2：从底向顶以 clientHeight*0.8 的步长 goTo 滚动，每步采集。
  //   排序：pos 降序输出 → 旧到新（实测在抖音的反向布局里 pos 大就是更旧）。
  async function scrapeCurrentChat({ onProgress }) {
    const t0 = Date.now();
    console.log("[SX] scrape v2 start", {
      ts: new Date().toLocaleTimeString(),
    });
    const { container } = findMessageContainer();
    if (!container) throw new Error("未找到消息列表容器，请先打开一个聊天");
    console.log("[SX] container", {
      sh: container.scrollHeight,
      ch: container.clientHeight,
      st: container.scrollTop,
      items: qsAll(SELECTORS.messageItem, container).length,
      cls: (container.className || "").toString().slice(0, 80),
    });

    // ---- collected：fp/text → { msg, firstSeenPos }
    //   firstSeenPos 是该消息首次被采集时容器的 scrollTop，
    //   用于最后排序（越小越靠近视觉顶部）。
    const collected = new Map();
    const keyOf = (m) =>
      m.fingerprint
        ? `f::${m.from}::${m.fingerprint}`
        : `t::${m.from}::${m.time}::${m.content}`;

    const collectVisible = () => {
      const boxes = qsAll(SELECTORS.messageItem, container);
      for (let i = 0; i < boxes.length; i++) {
        try {
          const box = boxes[i];
          const m = extractMessage(box);
          const k = keyOf(m);
          if (!collected.has(k)) {
            const r = box.getBoundingClientRect();
            const containerTop = container.getBoundingClientRect().top;
            // 用容器内绝对位置作为排序键
            const absPos = container.scrollTop + (r.top - containerTop);
            collected.set(k, { msg: m, pos: absPos });
          }
        } catch (_) {}
      }
      return boxes.length;
    };

    // 实测（2026-05）：抖音 IM 的懒加载唯一可靠触发方式是
    //   container.scrollTop = container.scrollHeight + dispatchEvent('scroll')
    // wheel / scrollBy / 单纯改 scrollTop（已在底部时）一律不触发。
    const triggerLoadMore = () => {
      container.scrollTop = container.scrollHeight;
      container.dispatchEvent(new Event("scroll", { bubbles: true }));
    };

    // 先采集打开时已可见的（最新一批）消息
    collectVisible();

    // ---------- 阶段 1：反复触发懒加载直到 scrollHeight 不再增长 ----------
    // 抖音 scrollTop=max 是"最旧端"，每次触发加载 ~5000px 的更早历史。
    //
    // ⚠️ 实测：到达历史末尾后 scrollHeight 会在两个值之间小幅抖动（差 ~30px），
    // 是虚拟滚动渲染窗口的颤动。所以用 maxSh + tolerance 判定，
    // 而不是 sh === prevH，否则会被抖动绕过永远跳不出。
    const STABLE_TOLERANCE = 80; // px，超过这个增量才算"还在加载新历史"
    let maxSh = -1;
    let noGrowth = 0;
    for (let i = 0; i < MAX_TOP_LOAD_ROUNDS; i++) {
      triggerLoadMore();
      await sleep(SCROLL_PAUSE_MS);
      collectVisible(); // 边加载边采集，避免虚拟滚动卸载
      const sh = container.scrollHeight;
      if (sh > maxSh + STABLE_TOLERANCE) {
        noGrowth = 0;
        maxSh = sh;
      } else {
        noGrowth++;
        if (sh > maxSh) maxSh = sh;
      }
      onProgress &&
        onProgress({
          phase: "加载历史",
          current: i + 1,
          total: MAX_TOP_LOAD_ROUNDS,
          info: `scrollHeight=${sh} (max=${maxSh}) · 已采 ${collected.size}`,
        });
      if (noGrowth >= TOP_NO_GROWTH_LIMIT) break;
    }
    console.log("[SX] phase1 done", {
      maxSh,
      collected: collected.size,
      elapsed: Date.now() - t0,
    });

    // ---------- 阶段 2：从底（最旧）向顶（最新）密集遍历 ----------
    // ⚠️ 抖音用虚拟滚动 + transform 定位 items。只改 scrollTop 不会触发
    // 重新渲染，必须再派发一次 scroll 事件，DOM 才会换内容。
    // （没有这个 dispatchEvent，walk 看到的永远是同一批 items，只能采到 10 条左右）
    const goTo = (st) => {
      container.scrollTop = Math.max(0, Math.min(st, container.scrollHeight));
      container.dispatchEvent(new Event("scroll", { bubbles: true }));
    };

    goTo(container.scrollHeight);
    await sleep(SCROLL_PAUSE_MS);
    collectVisible();
    console.log("[SX] phase2 start", {
      st: container.scrollTop,
      sh: container.scrollHeight,
      collected: collected.size,
    });

    // 消息高度差异大（文字 ~50px，分享卡片/视频 ~600px）。
    // 用 clientHeight * 0.8 作为步长：保证大约一个视口的覆盖 + 适度重叠。
    const step = Math.max(120, Math.floor(container.clientHeight * 0.8));
    let walkRound = 0;
    let lastWalkSize = -1;
    let walkStuck = 0;
    while (walkRound < MAX_WALK_ROUNDS) {
      if (container.scrollTop <= 2) break;
      goTo(container.scrollTop - step);
      await sleep(SCROLL_PAUSE_MS);
      collectVisible();
      walkRound++;
      if (collected.size === lastWalkSize) {
        walkStuck++;
      } else {
        walkStuck = 0;
        lastWalkSize = collected.size;
      }
      onProgress &&
        onProgress({
          phase: "抓取消息",
          current: collected.size,
          info: `位置 ${Math.round(container.scrollTop)}/${container.scrollHeight - container.clientHeight} · 已抓 ${collected.size}`,
        });
      // 连续 30 轮没新消息 → 视为已遍历完
      if (walkStuck >= 30) break;
    }
    console.log("[SX] phase2 done", {
      walkRounds: walkRound,
      walkStuck,
      finalSt: container.scrollTop,
      collected: collected.size,
      elapsed: Date.now() - t0,
    });
    goTo(0);
    await sleep(SCROLL_PAUSE_MS);
    collectVisible();

    // ---------- 排序输出：按 pos 降序 → 旧到新（时间顺序） ----------
    // 抖音 IM 实测：scrollTop=0 显示最新消息（DOM 视觉顶部 = 最新），
    // scrollTop=max 显示最旧消息（DOM 视觉底部 = 最旧）。
    // pos = 容器内绝对 Y 坐标，pos 越大越靠近底部 = 越旧。
    // 所以按 pos 降序输出 → 旧到新，符合阅读习惯。
    const arr = [...collected.values()].sort((a, b) => b.pos - a.pos);
    return arr.map(({ msg }) => {
      const { fingerprint, ...rest } = msg;
      return rest;
    });
  }

  // ---------- 导出 ----------

  function escHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[c])
    );
  }

  function buildHtml({ chatName, messages, exportedAt }) {
    const myAvatarColor = "#fe2c55";
    const otherAvatarColor = "#666";
    const rows = messages
      .map((m, i) => {
        const isMe = m.from === "me";
        const side = isMe ? "right" : "left";
        const time = m.time ? escHtml(m.time) : "";
        return `
      <div class="row ${side}">
        <div class="bubble">
          <div class="meta">
            <span class="who">${isMe ? "我" : escHtml(chatName)}</span>
            ${time ? `<span class="time">${time}</span>` : ""}
          </div>
          <div class="body">${escHtml(m.content).replace(/\n/g, "<br>")}</div>
        </div>
      </div>`;
      })
      .join("\n");

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>抖音私信 · ${escHtml(chatName)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px;
    background: #f4f5f7;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC",
      "Microsoft YaHei", sans-serif;
    color: #1f1f1f;
  }
  header { max-width: 720px; margin: 0 auto 16px; }
  header h1 { margin: 0 0 4px; font-size: 18px; }
  header .sub { color: #888; font-size: 12px; }
  .chat {
    max-width: 720px; margin: 0 auto;
    background: #fff; border-radius: 12px; padding: 16px 18px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .row { display: flex; margin: 10px 0; }
  .row.left { justify-content: flex-start; }
  .row.right { justify-content: flex-end; }
  .bubble {
    max-width: 70%; padding: 8px 12px;
    border-radius: 10px;
    background: #f1f1f3;
    line-height: 1.55;
    word-break: break-word;
  }
  .row.right .bubble { background: ${myAvatarColor}; color: #fff; }
  .row.right .bubble .who, .row.right .bubble .time { color: #ffd5e0; }
  .meta { font-size: 11px; color: #888; margin-bottom: 3px; display: flex; gap: 8px; }
  .who { font-weight: 500; color: ${otherAvatarColor}; }
  .body { white-space: pre-wrap; font-size: 14px; }
  footer { text-align: center; color: #aaa; font-size: 12px; margin-top: 18px; }
</style>
</head>
<body>
  <header>
    <h1>${escHtml(chatName)}</h1>
    <div class="sub">共 ${messages.length} 条 · 导出于 ${escHtml(exportedAt)}</div>
  </header>
  <main class="chat">
    ${rows || "<div style='text-align:center;color:#888'>没有消息</div>"}
  </main>
  <footer>由「抖音私信下载器」生成</footer>
</body>
</html>`;
  }

  function buildTxt({ chatName, messages, exportedAt }) {
    const lines = [
      `抖音私信 - 与 ${chatName} 的聊天记录`,
      `导出时间: ${exportedAt}`,
      `消息数量: ${messages.length}`,
      "=".repeat(50),
      "",
    ];
    for (const m of messages) {
      const who = m.from === "me" ? "我" : chatName;
      const time = m.time ? `[${m.time}] ` : "";
      lines.push(`${time}${who}:`);
      lines.push(m.content);
      lines.push("");
    }
    return lines.join("\n");
  }

  function safeName(s) {
    return String(s)
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "chat";
  }

  function downloadText(filename, mime, text) {
    // 通过 background 走 chrome.downloads，避免页面端 a.download 在某些站点被阻止
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "download",
          payload: { filename, mime, text },
        },
        (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (res && res.ok) resolve(res.id);
          else reject(new Error((res && res.error) || "下载失败"));
        }
      );
    });
  }

  // ---------- 消息分发 ----------

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      try {
        const { action, payload } = msg || {};

        if (action === "ping") {
          sendResponse({ ok: true, url: location.href });
          return;
        }

        if (action === "openIm") {
          const el = findImEntry();
          if (!el) {
            sendResponse({ ok: false, error: "未找到私信入口" });
            return;
          }
          realClick(el);
          sendResponse({ ok: true });
          return;
        }

        if (action === "listChats") {
          const chats = listChats();
          sendResponse({ ok: true, chats });
          return;
        }

        if (action === "openChat") {
          const idx = payload && payload.index;
          const wantName = payload && payload.name;
          const items = findChatItems();
          if (items.length === 0) {
            sendResponse({ ok: false, error: "聊天列表为空，请先点开「私信」浮层" });
            return;
          }
          let target = null;
          if (wantName) {
            for (const it of items) {
              const n = getChatName(it);
              if (n === wantName) { target = it; break; }
            }
          }
          if (!target && idx != null && idx >= 0 && idx < items.length) {
            target = items[idx];
          }
          if (!target) {
            sendResponse({ ok: false, error: "未找到指定聊天" });
            return;
          }
          realClick(target);
          sendResponse({ ok: true });
          return;
        }

        if (action === "scrape") {
          const { formats, name } = payload || {};
          const chatName = name || "私信对话";
          const messages = await scrapeCurrentChat({
            onProgress: (p) => postProgress(p),
          });
          const exportedAt = new Date().toLocaleString();
          const base = `douyin_im_${safeName(chatName)}_${Date.now()}`;
          const tasks = [];
          if (!formats || formats.includes("html")) {
            const html = buildHtml({ chatName, messages, exportedAt });
            tasks.push(downloadText(`${base}.html`, "text/html", html));
          }
          if (!formats || formats.includes("txt")) {
            const txt = buildTxt({ chatName, messages, exportedAt });
            tasks.push(downloadText(`${base}.txt`, "text/plain", txt));
          }
          await Promise.all(tasks);
          sendResponse({ ok: true, count: messages.length });
          return;
        }

        sendResponse({ ok: false, error: "未知操作: " + action });
      } catch (e) {
        console.error("[抖音私信下载器]", e);
        sendResponse({ ok: false, error: e.message || String(e) });
      }
    })();
    return true; // 异步响应
  });

  // ---------- 页面浮动按钮 ----------

  function injectFloatingButton() {
    if (document.getElementById("douyin-sixin-fab")) return;
    const fab = document.createElement("div");
    fab.id = "douyin-sixin-fab";
    fab.innerHTML = `
      <button id="sixin-fab-main" title="抖音私信下载器">⬇</button>
      <div id="sixin-fab-menu" hidden>
        <button data-act="random">🎲 随机选一个聊天并下载</button>
        <button data-act="current">⬇ 下载当前打开的聊天</button>
        <button data-act="close">✕ 关闭菜单</button>
      </div>
    `;
    document.body.appendChild(fab);

    const main = fab.querySelector("#sixin-fab-main");
    const menu = fab.querySelector("#sixin-fab-menu");
    main.addEventListener("click", () => {
      menu.hidden = !menu.hidden;
    });
    menu.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      menu.hidden = true;
      if (act === "close") return;
      try {
        if (act === "random") {
          // 先确保私信浮层已打开
          const panel = qsFirst(SELECTORS.chatListContainer);
          if (!panel) {
            const im = findImEntry();
            if (im) {
              realClick(im);
              await sleep(800);
            }
          }
          const chats = listChats();
          if (chats.length === 0) {
            alert("未找到聊天列表，请先点击右上角「私信」打开浮层。");
            return;
          }
          const idx = Math.floor(Math.random() * chats.length);
          const items = findChatItems();
          realClick(items[idx]);
          await sleep(1000);
          await runScrapeAndDownload(chats[idx].name);
        } else if (act === "current") {
          await runScrapeAndDownload();
        }
      } catch (err) {
        alert("下载失败: " + err.message);
      }
    });
  }

  async function runScrapeAndDownload(name) {
    const messages = await scrapeCurrentChat({
      onProgress: (p) => postProgress(p),
    });
    const chatName = name || guessCurrentChatName() || "私信对话";
    const exportedAt = new Date().toLocaleString();
    const base = `douyin_im_${safeName(chatName)}_${Date.now()}`;
    await downloadText(
      `${base}.html`,
      "text/html",
      buildHtml({ chatName, messages, exportedAt })
    );
    await downloadText(
      `${base}.txt`,
      "text/plain",
      buildTxt({ chatName, messages, exportedAt })
    );
    alert(`已抓取 ${messages.length} 条消息，文件已开始下载。`);
  }

  function guessCurrentChatName() {
    // 抖音浮层右侧顶部是对方昵称。优先找当前选中（高亮）的列表项的标题，
    // 因为聊天面板的标题区域往往没有明显的 class 关键字。
    const items = qsAll(SELECTORS.chatItem);
    for (const it of items) {
      const cls = (it.className || "").toString();
      if (/active|selected|current|on/i.test(cls)) {
        const t = (qsFirst(SELECTORS.chatItemTitle, it) || it).textContent || "";
        if (t.trim()) return t.trim();
      }
    }
    // 兜底
    const candidates = document.querySelectorAll(
      "[class*='conversation-name' i], [class*='chat-header' i], [class*='session-title' i]"
    );
    for (const c of candidates) {
      const t = (c.textContent || "").trim();
      if (t && t.length <= 30) return t;
    }
    return "";
  }

  // 在 douyin.com 全站注入浮动按钮（私信是浮层而非独立路由）
  const observer = new MutationObserver(() => {
    if (qsFirst(SELECTORS.imEntry)) injectFloatingButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  injectFloatingButton();

  console.log("[抖音私信下载器] 已注入 (v2-scroll-event-fix)");
})();
