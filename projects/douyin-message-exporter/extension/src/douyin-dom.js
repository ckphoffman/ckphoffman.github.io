(function () {
  const WAIT_STEP_MS = 200;
  const DEFAULT_TIMEOUT_MS = 8000;
  const MAX_SCROLL_ITERATIONS = 60;
  const LIKELY_MESSAGE_SELECTOR = "[role='article'], [data-e2e*='message'], [class*='message'], [class*='bubble'], [class*='chat'], li";

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function textOf(element) {
    return (element && element.innerText ? element.innerText : "").replace(/\s+/g, " ").trim();
  }

  function textLinesOf(element) {
    if (!element) {
      return [];
    }

    const fromInnerText = (element.innerText || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (fromInnerText.length > 1) {
      return fromInnerText;
    }

    const leafTexts = Array.from(element.querySelectorAll("*"))
      .filter(visible)
      .filter((node) => !Array.from(node.children || []).some(visible))
      .map(textOf)
      .filter(Boolean);
    const deduped = leafTexts.filter((line, index) => line !== leafTexts[index - 1]);
    return deduped.length > 1 ? deduped : fromInnerText;
  }

  function visible(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  async function waitFor(predicate, timeoutMs) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < (timeoutMs || DEFAULT_TIMEOUT_MS)) {
      const value = predicate();
      if (value) {
        return value;
      }
      await sleep(WAIT_STEP_MS);
    }
    return null;
  }

  function clickableTopRightItems() {
    const candidates = Array.from(document.querySelectorAll("button, a, div[role='button'], span[role='button']"))
      .filter(visible)
      .map((element) => ({ element, rect: element.getBoundingClientRect(), text: textOf(element), label: element.getAttribute("aria-label") || element.title || "" }))
      .filter((item) => item.rect.top < 120 && item.rect.left > window.innerWidth * 0.45)
      .sort((a, b) => a.rect.left - b.rect.left);
    return candidates;
  }

  function compactTopRightIconItem(item) {
    const knownLabel = /私信|消息|搜索|投稿|发布|通知|创作|登录|头像|菜单|设置/.test(`${item.text} ${item.label}`);
    const compactBox = item.rect.width > 0 && item.rect.width <= 96 && item.rect.height > 0 && item.rect.height <= 64;
    const shortText = item.text.length <= 8;
    const hasIcon = Boolean(item.element.querySelector("svg, img, [class*='icon']"));
    return knownLabel || (compactBox && (shortText || hasIcon));
  }

  function fifthTopRightIconFromCluster(items) {
    if (items.length < 5) {
      return null;
    }

    const cluster = items.slice(0, 5);
    const tops = cluster.map((item) => item.rect.top);
    const heights = cluster.map((item) => item.rect.height);
    const topSpread = Math.max(...tops) - Math.min(...tops);
    const heightSpread = Math.max(...heights) - Math.min(...heights);
    const plausibleCluster = topSpread <= 24 && heightSpread <= 24 && cluster.every(compactTopRightIconItem);
    return plausibleCluster ? cluster[4].element : null;
  }

  function elementLooksSelected(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }

    const attrValues = [
      element.getAttribute("aria-selected"),
      element.getAttribute("aria-current"),
      element.getAttribute("data-selected"),
      element.getAttribute("data-active"),
      element.getAttribute("data-current")
    ].filter(Boolean).join(" ");
    if (/\b(true|page|step|location)\b/i.test(attrValues)) {
      return true;
    }

    return /\b(active|selected|current|checked|focus|chosen)\b/i.test(element.className || "");
  }

  function findPrivateMessageButton() {
    const items = clickableTopRightItems();
    const byText = items.find((item) => /私信|消息/.test(`${item.text} ${item.label}`));
    if (byText) {
      return byText.element;
    }
    return fifthTopRightIconFromCluster(items);
  }

  function conversationListCandidates() {
    return Array.from(document.querySelectorAll("[role='list'], ul, aside, div"))
      .filter(visible)
      .map((element) => {
        const rows = Array.from(element.children || []).filter((child) => scoreConversationContainer(child) >= 3);
        return { element, rows };
      })
      .filter((item) => item.rows.length >= 2)
      .sort((a, b) => b.rows.length - a.rows.length);
  }

  function conversationListSignature(list) {
    if (!list) {
      return "";
    }
    const rect = list.getBoundingClientRect();
    const rows = Array.from(list.children || [])
      .filter((child) => scoreConversationContainer(child) >= 3)
      .slice(0, 5)
      .map(textOf)
      .join("|");
    return [
      Math.round(rect.top),
      Math.round(rect.left),
      Math.round(rect.width),
      Math.round(rect.height),
      rows
    ].join("|");
  }

  function hasNearbyPrivateMessageLabel(list) {
    const listRect = list.getBoundingClientRect();
    return Array.from(document.querySelectorAll("header, [role='heading'], h1, h2, h3, [class*='header'], [class*='title'], button, [aria-label], [title]"))
      .filter(visible)
      .some((element) => {
        const label = `${textOf(element)} ${element.getAttribute("aria-label") || ""} ${element.title || ""}`;
        if (!/私信|会话|聊天|消息/.test(label)) {
          return false;
        }
        const rect = element.getBoundingClientRect();
        const nearTop = rect.bottom >= listRect.top - 96 && rect.top <= listRect.top + 96;
        const nearHorizontally = rect.right >= listRect.left - 96 && rect.left <= listRect.right + 160;
        return nearTop && nearHorizontally;
      });
  }

  function isConfirmedPrivateMessageList(list) {
    if (!list || !visible(list)) {
      return false;
    }
    if (hasNearbyPrivateMessageLabel(list)) {
      return true;
    }

    const url = String(window.location && window.location.href ? window.location.href : "");
    if (/message|chat|conversation|im/i.test(url)) {
      return true;
    }

    const button = findPrivateMessageButton();
    return elementLooksSelected(button);
  }

  function findConfirmedConversationList() {
    const match = conversationListCandidates().find((item) => isConfirmedPrivateMessageList(item.element));
    return match ? match.element : null;
  }

  async function openPrivateMessages() {
    const existingList = findConfirmedConversationList();
    if (existingList) {
      return existingList;
    }

    const button = findPrivateMessageButton();
    if (!button) {
      throw new Error("找不到右上角第 5 个私信按钮，请先手动打开私信列表。");
    }
    button.click();
    await sleep(600);
    const list = await waitFor(() => findConfirmedConversationList(), DEFAULT_TIMEOUT_MS);
    if (!list) {
      throw new Error("无法确认已打开私信列表，请手动打开私信列表后重试。");
    }
    return list;
  }

  function scoreConversationContainer(element) {
    const text = textOf(element);
    if (text.length < 2 || text.length > 500) {
      return 0;
    }
    const rect = element.getBoundingClientRect();
    let score = 0;
    if (rect.height >= 36 && rect.height <= 120) score += 2;
    if (rect.width >= 160) score += 2;
    if (/昨天|今天|星期|周|分钟前|小时前|\d{1,2}:\d{2}|\d{4}/.test(text)) score += 1;
    if (element.querySelector("img")) score += 1;
    if (element.matches("[role='listitem'], li")) score += 2;
    return score;
  }

  function findConversationList() {
    const containers = conversationListCandidates();
    return containers[0] ? containers[0].element : null;
  }

  function stableConversationId(row, name) {
    const stableDomId = [
      row.getAttribute("data-id"),
      row.getAttribute("data-key"),
      row.getAttribute("data-conversation-id"),
      row.getAttribute("data-item-id"),
      row.getAttribute("data-e2e")
    ].filter(Boolean).join("|");
    const source = stableDomId || name;
    let hash = 0;
    for (let index = 0; index < source.length; index += 1) {
      hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
    }
    return `conversation-${Math.abs(hash).toString(36)}`;
  }

  function parseConversationRow(row, index) {
    const lines = textLinesOf(row);
    const name = lines[0] || `会话 ${index + 1}`;
    const timeHint = lines.find((line) => /昨天|今天|星期|周|分钟前|小时前|\d{1,2}:\d{2}|\d{4}/.test(line)) || "";
    const preview = lines.filter((line) => line !== name && line !== timeHint).join(" ");
    return {
      id: stableConversationId(row, name),
      index,
      name,
      preview,
      timeHint
    };
  }

  async function scrollElementToEnd(element, direction) {
    const seen = new Set();
    let stableRounds = 0;
    let iterations = 0;

    while (stableRounds < 4 && iterations < MAX_SCROLL_ITERATIONS) {
      iterations += 1;
      const key = `${element.scrollTop}:${element.scrollHeight}:${textOf(element).length}`;
      if (seen.has(key)) {
        stableRounds += 1;
      } else {
        stableRounds = 0;
        seen.add(key);
      }

      element.scrollTop = direction === "up" ? 0 : element.scrollHeight;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
      await sleep(700);
    }
  }

  function likelyMessageNodes(root) {
    return Array.from(root.querySelectorAll(LIKELY_MESSAGE_SELECTOR)).filter(visible);
  }

  function containsConversationList(element) {
    const list = findConversationList();
    return Boolean(list && element !== list && element.contains(list));
  }

  function containsNestedMessageCandidate(node) {
    const text = textOf(node);
    const nested = likelyMessageNodes(node).filter((child) => child !== node);
    return nested.some((child) => {
      const childText = textOf(child);
      const sameOrMostText = childText && (childText === text || childText.length >= text.length * 0.8);
      const sameMedia = Boolean(child.querySelector("img, video, a[href], svg"));
      return sameOrMostText || (sameMedia && !child.querySelector(LIKELY_MESSAGE_SELECTOR));
    });
  }

  function captureKeyForMessage(node, scroller) {
    const rect = node.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const scrollerTop = scroller.scrollTop || 0;
    const positionTop = Math.round(rect.top - scrollerRect.top + scrollerTop);
    const positionLeft = Math.round(rect.left - scrollerRect.left);
    return [
      positionTop,
      positionLeft,
      Math.round(rect.width),
      Math.round(rect.height),
      textOf(node),
      classifyMedia(node),
      firstMediaUrl(node),
      firstLinkUrl(node)
    ].join("|");
  }

  async function collectMessagesWhileScrolling(element, direction, conversationName, entries) {
    const seen = new Set();
    let stableRounds = 0;
    let iterations = 0;

    while (stableRounds < 4 && iterations < MAX_SCROLL_ITERATIONS) {
      iterations += 1;
      messageCandidates(element)
        .forEach((node) => entries.push({
          key: captureKeyForMessage(node, element),
          message: parseMessageNode(node, conversationName)
        }));

      const key = `${element.scrollTop}:${element.scrollHeight}:${textOf(element).length}`;
      if (seen.has(key)) {
        stableRounds += 1;
      } else {
        stableRounds = 0;
        seen.add(key);
      }

      const viewportHeight = element.clientHeight || window.innerHeight || 600;
      const step = Math.max(240, Math.floor(viewportHeight * 0.75));
      const maxScrollTop = Math.max(0, element.scrollHeight - viewportHeight);
      element.scrollTop = direction === "up"
        ? Math.max(0, element.scrollTop - step)
        : Math.min(maxScrollTop, element.scrollTop + step);
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
      await sleep(700);
    }
  }

  async function scanConversations() {
    const list = await openPrivateMessages();
    await scrollElementToEnd(list, "down");
    const rows = conversationRows(list);
    return rows.map(parseConversationRow);
  }

  function conversationRows(list) {
    if (!list) {
      return [];
    }
    return Array.from(list.children || []).filter((child) => scoreConversationContainer(child) >= 3);
  }

  function expectedConversationLabel(expectedSummary, index) {
    if (expectedSummary && expectedSummary.name) {
      return expectedSummary.name;
    }
    return `第 ${index + 1} 个会话`;
  }

  function rowMatchesExpected(row, index, expectedSummary) {
    if (!expectedSummary) {
      return true;
    }
    const parsed = parseConversationRow(row, index);
    if (expectedSummary.id) {
      return parsed.id === expectedSummary.id;
    }
    return Boolean(expectedSummary.name && parsed.name === expectedSummary.name);
  }

  function matchingConversationRows(rows, expectedSummary) {
    if (!expectedSummary) {
      return [];
    }
    return rows
      .map((row, index) => ({ row, index }))
      .filter((item) => rowMatchesExpected(item.row, item.index, expectedSummary));
  }

  function findUniqueMatchingConversationRow(rows, expectedSummary) {
    const matches = matchingConversationRows(rows, expectedSummary);
    if (matches.length === 1) {
      return matches[0];
    }
    if (matches.length > 1) {
      throw new Error(`无法唯一定位会话「${expectedConversationLabel(expectedSummary, 0)}」，已停止导出以避免导出错误会话。`);
    }
    return null;
  }

  function resolveConversationRow(rows, index, expectedSummary) {
    const indexedRow = rows[index];
    if (!indexedRow) {
      throw new Error(`找不到第 ${index + 1} 个会话。`);
    }
    if (!expectedSummary || rowMatchesExpected(indexedRow, index, expectedSummary)) {
      return { row: indexedRow, index };
    }

    const matchingRow = findUniqueMatchingConversationRow(rows, expectedSummary);
    if (matchingRow) {
      return matchingRow;
    }

    throw new Error(`找不到会话「${expectedConversationLabel(expectedSummary, index)}」，已停止导出以避免导出错误会话。`);
  }

  function rowIsVisuallySelected(row, list) {
    if (!row) {
      return false;
    }

    let node = row;
    while (node && node instanceof Element && node !== list) {
      if (elementLooksSelected(node)) {
        return true;
      }
      node = node.parentElement;
    }

    return row.matches(":focus-within");
  }

  function activeConversationRowMatches(list, expectedSummary) {
    const rows = conversationRows(list);
    return rows.some((row, rowIndex) => (
      rowIsVisuallySelected(row, list)
      && rowMatchesExpected(row, rowIndex, expectedSummary)
    ));
  }

  function chatHeaderContainsExpectedName(list, expectedSummary) {
    if (!expectedSummary || !expectedSummary.name) {
      return false;
    }

    const listRect = list ? list.getBoundingClientRect() : null;
    const name = expectedSummary.name.replace(/\s+/g, " ").trim();
    const candidates = Array.from(document.querySelectorAll("header, [role='heading'], h1, h2, h3, [class*='header'], [class*='title'], [class*='name']"))
      .filter(visible)
      .filter((element) => !list || !list.contains(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const rightOfList = !listRect || rect.left >= listRect.right - 24;
        return rightOfList && rect.top < Math.max(260, window.innerHeight * 0.45);
      });

    return candidates.some((element) => textOf(element).includes(name));
  }

  async function waitForConversationOpened(list, expectedSummary) {
    return waitFor(() => (
      activeConversationRowMatches(list, expectedSummary)
      || chatHeaderContainsExpectedName(list, expectedSummary)
    ), DEFAULT_TIMEOUT_MS);
  }

  async function openConversationByIndex(index, expectedSummary) {
    const list = await openPrivateMessages();
    const rows = conversationRows(list);
    const target = resolveConversationRow(rows, index, expectedSummary);
    const row = target.row;
    row.scrollIntoView({ block: "center" });
    row.click();
    const confirmed = await waitForConversationOpened(list, expectedSummary);
    if (!confirmed) {
      throw new Error(`无法确认已打开会话「${expectedConversationLabel(expectedSummary, index)}」，已停止导出以避免导出错误会话。`);
    }
  }

  function findChatScroller() {
    const candidates = Array.from(document.querySelectorAll("main div, section div, [role='log'], [role='main']"))
      .filter(visible)
      .filter((element) => element.scrollHeight > element.clientHeight + 80)
      .map((element) => {
        const messages = likelyMessageNodes(element).filter((node) => !containsNestedMessageCandidate(node));
        const hasConversationList = containsConversationList(element);
        let score = 0;
        if (messages.length > 0) score += messages.length * 4;
        if (element.matches("[role='log'], [role='main']")) score += 4;
        if (!hasConversationList) score += 8;
        if (hasConversationList) score -= 20;
        score += Math.min(10, Math.floor(element.scrollHeight / 500));
        return { element, score, messages };
      })
      .sort((a, b) => b.score - a.score || b.messages.length - a.messages.length || b.element.scrollHeight - a.element.scrollHeight);
    const best = candidates.find((item) => item.messages.length > 0 && !containsConversationList(item.element)) || candidates[0];
    return best ? best.element : document.scrollingElement || document.documentElement;
  }

  function classifyMedia(node) {
    if (node.querySelector("video")) return "video";
    if (node.querySelector("img")) return "image";
    if (node.querySelector("svg")) return "emoji";
    if (node.querySelector("a")) return "link";
    return "";
  }

  function firstMediaUrl(node) {
    const media = node.querySelector("video[src], img[src], source[src]");
    return media ? media.getAttribute("src") || "" : "";
  }

  function firstLinkUrl(node) {
    const link = node.querySelector("a[href]");
    return link ? link.href : "";
  }

  function directionFor(node) {
    const rect = node.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    return center > window.innerWidth / 2 ? "outgoing" : "incoming";
  }

  function messageCandidates(root) {
    const conversationList = findConversationList();
    return likelyMessageNodes(root)
      .filter(visible)
      .filter((node) => !node.closest("#dy-exporter-panel"))
      .filter((node) => !node.closest("header, nav, aside, [role='navigation'], [role='banner'], [role='complementary']"))
      .filter((node) => !conversationList || !conversationList.contains(node))
      .filter((node) => !containsNestedMessageCandidate(node))
      .filter((node) => {
        const text = textOf(node);
        const hasMedia = Boolean(node.querySelector("img, video, a[href], svg"));
        const rect = node.getBoundingClientRect();
        return rect.height >= 20 && rect.height <= 480 && (hasMedia || (text.length >= 1 && text.length <= 1000));
      });
  }

  function parseMessageNode(node, conversationName) {
    const text = textOf(node);
    const mediaType = classifyMedia(node);
    const linkUrl = firstLinkUrl(node);
    const attachmentDescription = mediaType && !text ? mediaType : "";
    return {
      direction: directionFor(node),
      sender: directionFor(node) === "outgoing" ? "我" : conversationName,
      time: "",
      text: mediaType ? text.replace(/图片|视频|表情/g, "").trim() : text,
      mediaType,
      mediaUrl: firstMediaUrl(node),
      linkUrl,
      attachmentDescription
    };
  }

  function dedupeMessageEntries(entries) {
    const seen = new Set();
    return entries.filter((entry) => {
      if (seen.has(entry.key)) {
        return false;
      }
      seen.add(entry.key);
      return true;
    }).map((entry) => entry.message);
  }

  async function extractCurrentConversation(conversationName) {
    const scroller = findChatScroller();
    const entries = [];
    await collectMessagesWhileScrolling(scroller, "up", conversationName, entries);
    await collectMessagesWhileScrolling(scroller, "down", conversationName, entries);
    messageCandidates(scroller)
      .forEach((node) => entries.push({
        key: captureKeyForMessage(node, scroller),
        message: parseMessageNode(node, conversationName)
      }));
    return {
      conversationName,
      messages: dedupeMessageEntries(entries)
    };
  }

  window.DouyinDom = {
    openPrivateMessages,
    scanConversations,
    openConversationByIndex,
    extractCurrentConversation
  };
})();
