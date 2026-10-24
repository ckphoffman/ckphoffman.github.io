(function () {
  "use strict";

  console.log(
    "%c[抖音消息工具] content.js v0.5.0 已加载 (MAIN world)",
    "color:#fe2c55;font-weight:bold"
  );

  // ============================================================
  // 共享：React props 提取
  // ============================================================

  function getPropsBundle(el) {
    if (!el) return null;
    const pKey = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
    if (pKey && el[pKey]) return el[pKey];
    const fKey = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
    if (fKey && el[fKey]?.memoizedProps) return el[fKey].memoizedProps;
    return null;
  }

  function findNoticeInfo(val, depth = 0, seen = new WeakSet()) {
    if (val == null || depth > 7 || typeof val !== "object" || seen.has(val)) return null;
    seen.add(val);
    if (Array.isArray(val)) {
      for (const v of val) {
        const hit = findNoticeInfo(v, depth + 1, seen);
        if (hit) return hit;
      }
      return null;
    }
    if (val.noticeInfo && typeof val.noticeInfo === "object") return val.noticeInfo;
    if (val.notice_info && typeof val.notice_info === "object") return val.notice_info;
    for (const k of Object.keys(val)) {
      const hit = findNoticeInfo(val[k], depth + 1, seen);
      if (hit) return hit;
    }
    return null;
  }

  function findNoticeType(val, depth = 0, seen = new WeakSet()) {
    if (val == null || depth > 8 || typeof val !== "object" || seen.has(val)) return null;
    seen.add(val);
    if (Array.isArray(val)) {
      for (const v of val) {
        const hit = findNoticeType(v, depth + 1, seen);
        if (hit != null) return hit;
      }
      return null;
    }
    if (typeof val.noticeType === "number") return val.noticeType;
    for (const k of Object.keys(val)) {
      const hit = findNoticeType(val[k], depth + 1, seen);
      if (hit != null) return hit;
    }
    return null;
  }

  function findAwemeIdIn(val, depth = 0, seen = new WeakSet()) {
    if (val == null || depth > 6 || typeof val !== "object" || seen.has(val)) return null;
    seen.add(val);
    if (Array.isArray(val)) {
      for (const v of val) {
        const hit = findAwemeIdIn(v, depth + 1, seen);
        if (hit) return hit;
      }
      return null;
    }
    for (const k of ["awemeId", "aweme_id", "itemId", "item_id"]) {
      if (val[k] != null && /^\d{15,25}$/.test(String(val[k]))) return String(val[k]);
    }
    for (const k of Object.keys(val)) {
      const hit = findAwemeIdIn(val[k], depth + 1, seen);
      if (hit) return hit;
    }
    return null;
  }

  // ============================================================
  // 消息分类（noticeType + 子字段）
  // ============================================================

  const KINDS = [
    { id: "digg_comment", label: "赞了你的评论", match: (n, t) => t === 41 && n.digg_type === 2 },
    { id: "reply_comment", label: "回复了你的评论", match: (n, t) => t === 31 && n.comment_type === 2 },
    { id: "comment_aweme", label: "评论了你的作品", match: (n, t) => t === 31 && n.comment_type === 1 },
    { id: "digg_aweme", label: "赞了你的作品", match: (n, t) => t === 41 && n.digg_type === 1 },
    { id: "follow", label: "关注了你", match: (n, t) => t === 33 }
  ];

  function classify(noticeInfo, noticeType) {
    for (const k of KINDS) {
      if (k.match(noticeInfo || {}, noticeType)) return k;
    }
    return null;
  }

  // ============================================================
  // 1. Hover 悬浮框（保持 v0.4 功能）
  // ============================================================

  const HOVER_HIDE_DELAY = 250;
  let hoverCurrentItem = null;
  let hoverHideTimer = null;
  let hoverTooltipEl = null;

  function isMessageItem(el) {
    let cur = el;
    let depth = 0;
    while (cur && cur !== document.body && depth++ < 15) {
      const bundle = getPropsBundle(cur);
      if (bundle && findNoticeInfo(bundle)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function extractFromItem(itemEl) {
    const bundle = getPropsBundle(itemEl);
    if (!bundle) return null;
    const notice = findNoticeInfo(bundle);
    if (!notice) return null;
    const noticeType = findNoticeType(bundle);
    const id = findAwemeIdIn(notice);
    const kind = classify(notice, noticeType);
    return {
      url: id ? `https://www.douyin.com/video/${id}` : null,
      aweme_id: id,
      noticeType,
      kind,
      noticeInfo: notice
    };
  }

  document.addEventListener(
    "mouseover",
    (e) => {
      // Don't trigger when hovering our own UI
      if (filterPanelEl && filterPanelEl.contains(e.target)) return;
      if (filterButtonEl && filterButtonEl.contains(e.target)) return;
      if (hoverTooltipEl && hoverTooltipEl.contains(e.target)) {
        cancelHoverHide();
        return;
      }
      const item = isMessageItem(e.target);
      if (!item) {
        scheduleHoverHide();
        return;
      }
      cancelHoverHide();
      if (item === hoverCurrentItem) return;
      hoverCurrentItem = item;
      const result = extractFromItem(item);
      if (!result) return;
      showHoverTooltip(item, result);
    },
    false
  );

  document.addEventListener(
    "mouseout",
    (e) => {
      const next = e.relatedTarget;
      if (!next) {
        scheduleHoverHide();
        return;
      }
      if (hoverTooltipEl && hoverTooltipEl.contains(next)) return;
      if (filterPanelEl && filterPanelEl.contains(next)) return;
      if (isMessageItem(next)) return;
      scheduleHoverHide();
    },
    false
  );

  function cancelHoverHide() {
    if (hoverHideTimer) {
      clearTimeout(hoverHideTimer);
      hoverHideTimer = null;
    }
  }

  function scheduleHoverHide() {
    cancelHoverHide();
    hoverHideTimer = setTimeout(() => {
      if (hoverTooltipEl) hoverTooltipEl.style.display = "none";
      hoverCurrentItem = null;
    }, HOVER_HIDE_DELAY);
  }

  function ensureHoverTooltip() {
    if (hoverTooltipEl && document.body.contains(hoverTooltipEl)) return hoverTooltipEl;
    hoverTooltipEl = document.createElement("div");
    hoverTooltipEl.className = "dy-msg-tooltip";
    hoverTooltipEl.innerHTML = `
      <div class="dy-msg-tooltip__header">
        <span class="dy-msg-tooltip__title">视频链接</span>
      </div>
      <div class="dy-msg-tooltip__url"></div>
      <div class="dy-msg-tooltip__hint"></div>
      <div class="dy-msg-tooltip__actions">
        <button class="dy-msg-tooltip__btn dy-msg-tooltip__copy">复制链接</button>
        <button class="dy-msg-tooltip__btn dy-msg-tooltip__open">在新标签页打开</button>
      </div>
    `;
    document.body.appendChild(hoverTooltipEl);
    hoverTooltipEl.addEventListener("mouseenter", cancelHoverHide);
    hoverTooltipEl.addEventListener("mouseleave", scheduleHoverHide);
    hoverTooltipEl.querySelector(".dy-msg-tooltip__copy").addEventListener("click", () => {
      const url = hoverTooltipEl.dataset.url;
      if (url) navigator.clipboard.writeText(url);
    });
    hoverTooltipEl.querySelector(".dy-msg-tooltip__open").addEventListener("click", () => {
      const url = hoverTooltipEl.dataset.url;
      if (url) window.open(url, "_blank", "noopener");
    });
    return hoverTooltipEl;
  }

  function showHoverTooltip(itemEl, result) {
    const t = ensureHoverTooltip();
    const hasUrl = !!result?.url;
    t.dataset.url = hasUrl ? result.url : "";
    t.querySelector(".dy-msg-tooltip__title").textContent = hasUrl ? "视频链接" : "未找到视频链接";
    t.querySelector(".dy-msg-tooltip__url").textContent = hasUrl ? result.url : "";
    t.querySelector(".dy-msg-tooltip__url").style.display = hasUrl ? "block" : "none";
    const kindLabel = result.kind ? result.kind.label : "";
    t.querySelector(".dy-msg-tooltip__hint").textContent = hasUrl
      ? kindLabel ? `类型：${kindLabel}` : ""
      : "这条消息没有关联的视频（可能是关注/系统通知）";
    t.querySelector(".dy-msg-tooltip__actions").style.display = hasUrl ? "flex" : "none";

    t.style.visibility = "hidden";
    t.style.display = "block";
    const tRect = t.getBoundingClientRect();
    const iRect = itemEl.getBoundingClientRect();
    let left = iRect.left - tRect.width - 8;
    if (left < 8) left = iRect.right + 8;
    if (left + tRect.width + 8 > window.innerWidth) left = window.innerWidth - tRect.width - 8;
    let top = iRect.top + (iRect.height - tRect.height) / 2;
    top = Math.max(8, Math.min(top, window.innerHeight - tRect.height - 8));
    t.style.left = `${left + window.scrollX}px`;
    t.style.top = `${top + window.scrollY}px`;
    t.style.visibility = "visible";
  }

  // ============================================================
  // 2. 筛选面板
  // ============================================================

  let filterButtonEl = null;
  let filterPanelEl = null;
  let scanState = {
    running: false,
    scanned: 0,
    results: [],
    seenIds: new Set()
  };

  function ensureFilterButton() {
    if (filterButtonEl && document.body.contains(filterButtonEl)) return filterButtonEl;
    filterButtonEl = document.createElement("button");
    filterButtonEl.className = "dy-filter-btn";
    filterButtonEl.textContent = "📋 筛选消息";
    filterButtonEl.title = "打开抖音消息筛选器";
    document.body.appendChild(filterButtonEl);
    filterButtonEl.addEventListener("click", () => {
      const panel = ensureFilterPanel();
      panel.style.display = panel.style.display === "none" ? "flex" : "none";
    });
    return filterButtonEl;
  }

  function ensureFilterPanel() {
    if (filterPanelEl && document.body.contains(filterPanelEl)) return filterPanelEl;
    filterPanelEl = document.createElement("div");
    filterPanelEl.className = "dy-filter-panel";
    filterPanelEl.style.display = "none";

    const defaultIds = new Set(["digg_comment", "reply_comment"]);
    const checkboxesHtml = KINDS.map((k) => `
      <label class="dy-filter-panel__option">
        <input type="checkbox" data-kind="${k.id}" ${defaultIds.has(k.id) ? "checked" : ""} />
        <span>${k.label}</span>
      </label>
    `).join("");

    filterPanelEl.innerHTML = `
      <div class="dy-filter-panel__header">
        <span class="dy-filter-panel__title">抖音消息筛选器</span>
        <button class="dy-filter-panel__close" title="关闭">×</button>
      </div>
      <div class="dy-filter-panel__section">
        <div class="dy-filter-panel__section-title">筛选这些类型：</div>
        ${checkboxesHtml}
      </div>
      <div class="dy-filter-panel__controls">
        <button class="dy-filter-panel__start">开始扫描</button>
        <button class="dy-filter-panel__stop" disabled>停止扫描</button>
        <button class="dy-filter-panel__clear">清空结果</button>
      </div>
      <div class="dy-filter-panel__status">请确保已打开「通知」面板</div>
      <div class="dy-filter-panel__results"></div>
    `;
    document.body.appendChild(filterPanelEl);

    filterPanelEl.querySelector(".dy-filter-panel__close").addEventListener("click", () => {
      filterPanelEl.style.display = "none";
    });
    filterPanelEl.querySelector(".dy-filter-panel__start").addEventListener("click", () => {
      const selected = new Set(
        [...filterPanelEl.querySelectorAll('input[type="checkbox"]:checked')].map((i) => i.dataset.kind)
      );
      startScan(selected);
    });
    filterPanelEl.querySelector(".dy-filter-panel__stop").addEventListener("click", () => {
      scanState.running = false;
    });
    filterPanelEl.querySelector(".dy-filter-panel__clear").addEventListener("click", () => {
      scanState.results = [];
      scanState.seenIds = new Set();
      scanState.scanned = 0;
      renderResults();
      setStatus("已清空");
    });

    return filterPanelEl;
  }

  function setStatus(text) {
    if (!filterPanelEl) return;
    filterPanelEl.querySelector(".dy-filter-panel__status").textContent = text;
  }

  function renderResults() {
    if (!filterPanelEl) return;
    const wrap = filterPanelEl.querySelector(".dy-filter-panel__results");
    if (scanState.results.length === 0) {
      wrap.innerHTML = `<div class="dy-filter-panel__empty">没有匹配的结果</div>`;
      return;
    }
    wrap.innerHTML = scanState.results
      .map((r, i) => `
        <div class="dy-filter-result" data-idx="${i}">
          <div class="dy-filter-result__head">
            <span class="dy-filter-result__kind">${escapeHtml(r.kindLabel)}</span>
            <span class="dy-filter-result__time">${escapeHtml(r.timeText || "")}</span>
          </div>
          <div class="dy-filter-result__from">${escapeHtml(r.fromUser || "")}</div>
          <div class="dy-filter-result__content">${escapeHtml(r.contentText || "")}</div>
          ${r.url
            ? `<div class="dy-filter-result__actions">
                <button class="dy-filter-result__copy" data-url="${escapeHtml(r.url)}">复制链接</button>
                <button class="dy-filter-result__open" data-url="${escapeHtml(r.url)}">打开</button>
              </div>`
            : ""}
        </div>
      `)
      .join("");
    wrap.querySelectorAll(".dy-filter-result__copy").forEach((btn) => {
      btn.addEventListener("click", () => navigator.clipboard.writeText(btn.dataset.url));
    });
    wrap.querySelectorAll(".dy-filter-result__open").forEach((btn) => {
      btn.addEventListener("click", () => window.open(btn.dataset.url, "_blank", "noopener"));
    });
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ============================================================
  // 扫描逻辑
  // ============================================================

  async function startScan(selectedKindIds) {
    if (scanState.running) return;
    if (selectedKindIds.size === 0) {
      setStatus("请至少勾选一种类型");
      return;
    }
    const container = document.querySelector(".SrFKhBVP");
    if (!container) {
      setStatus("找不到通知面板。请先点抖音右上角的「通知」打开面板。");
      return;
    }

    scanState.running = true;
    filterPanelEl.querySelector(".dy-filter-panel__start").disabled = true;
    filterPanelEl.querySelector(".dy-filter-panel__stop").disabled = false;

    let stableNoChangeCount = 0;
    const MAX_STABLE = 5; // 连续 5 次滚动后没新内容也停

    try {
      while (scanState.running) {
        // 处理当前已渲染的消息
        const items = container.querySelectorAll(".I_GURp8z");
        let newOnes = 0;
        for (const item of items) {
          const r = extractFromItem(item);
          if (!r) continue;
          // 用 aweme_id + noticeInfo.create_time + from_user uid 等去重
          const idKey = makeMessageKey(r.noticeInfo, r.aweme_id);
          if (scanState.seenIds.has(idKey)) continue;
          scanState.seenIds.add(idKey);
          scanState.scanned++;
          newOnes++;
          if (r.kind && selectedKindIds.has(r.kind.id)) {
            scanState.results.push(buildResultEntry(r));
          }
        }
        renderResults();
        setStatus(`扫描中… 已扫描 ${scanState.scanned} 条，匹配 ${scanState.results.length} 条`);

        // 检查是否到底
        const sentinel = container.querySelector(".a6bMweSX");
        if (sentinel && /没有更多|暂时没有/.test(sentinel.textContent || "")) {
          setStatus(`扫描完成。共扫描 ${scanState.scanned} 条，匹配 ${scanState.results.length} 条`);
          break;
        }

        // 滚到底加载更多
        const beforeItems = container.querySelectorAll(".I_GURp8z").length;
        if (sentinel) {
          sentinel.scrollIntoView({ behavior: "instant", block: "end" });
        } else {
          container.scrollTop = container.scrollHeight;
        }

        // 等新消息出现，最多 3 秒
        const start = Date.now();
        while (scanState.running && Date.now() - start < 3000) {
          await sleep(200);
          if (container.querySelectorAll(".I_GURp8z").length > beforeItems) break;
        }

        if (container.querySelectorAll(".I_GURp8z").length === beforeItems) {
          stableNoChangeCount++;
          if (stableNoChangeCount >= MAX_STABLE) {
            setStatus(`扫描结束（多次滚动无新内容）。共扫描 ${scanState.scanned} 条，匹配 ${scanState.results.length} 条`);
            break;
          }
        } else {
          stableNoChangeCount = 0;
        }
      }
    } catch (e) {
      console.error("[抖音消息工具] 扫描异常:", e);
      setStatus("扫描出错：" + e.message);
    } finally {
      if (scanState.running) {
        // 正常结束
      } else {
        setStatus((filterPanelEl.querySelector(".dy-filter-panel__status").textContent || "") + "（已停止）");
      }
      scanState.running = false;
      filterPanelEl.querySelector(".dy-filter-panel__start").disabled = false;
      filterPanelEl.querySelector(".dy-filter-panel__stop").disabled = true;
    }
  }

  function makeMessageKey(noticeInfo, awemeId) {
    const fromUid = noticeInfo?.from_user?.uid || noticeInfo?.comment?.user?.uid || "";
    const createTime = noticeInfo?.create_time || noticeInfo?.comment?.create_time || "";
    const commentId = noticeInfo?.comment?.cid || noticeInfo?.comment?.id || "";
    return [awemeId || "", fromUid, createTime, commentId].join("|");
  }

  function buildResultEntry(r) {
    const n = r.noticeInfo || {};
    const fromUser =
      n.from_user?.nickname ||
      n.comment?.user?.nickname ||
      n.aweme?.author?.nickname ||
      "未知用户";
    const contentText =
      n.content ||
      n.comment?.text ||
      "";
    const createTime = n.create_time || n.comment?.create_time;
    const timeText = createTime ? formatTime(createTime) : "";
    return {
      kindLabel: r.kind?.label || "未知类型",
      url: r.url,
      fromUser,
      contentText,
      timeText
    };
  }

  function formatTime(ts) {
    try {
      const d = new Date((Number(ts) > 1e12 ? ts : ts * 1000));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${day} ${hh}:${mm}`;
    } catch {
      return String(ts);
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // 启动：等到 body 存在后插入按钮
  function init() {
    if (!document.body) {
      setTimeout(init, 200);
      return;
    }
    ensureFilterButton();
  }
  init();
})();
