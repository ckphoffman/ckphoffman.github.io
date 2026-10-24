(function () {
  async function scan() {
    return window.DouyinDom.scanConversations();
  }

  function errorText(error) {
    return error && error.message ? error.message : String(error);
  }

  function hasUsableId(item) {
    return Boolean(item && typeof item.id === "string" && item.id.trim());
  }

  function resolveCurrentConversation(target, currentConversations) {
    if (!target) {
      throw new Error("找不到已选择的会话，请重新扫描后再导出。");
    }

    if (hasUsableId(target)) {
      const idMatches = currentConversations.filter((item) => item.id === target.id);
      if (idMatches.length === 1) {
        return idMatches[0];
      }
      if (idMatches.length > 1) {
        throw new Error(`无法唯一定位会话「${target.name}」，请重新扫描后再导出。`);
      }
      throw new Error(`无法定位会话「${target.name}」，所选会话的标识已变化或不在当前列表中，请重新扫描后再导出。`);
    }

    const nameMatches = currentConversations.filter((item) => item.name === target.name);
    if (nameMatches.length === 1) {
      return nameMatches[0];
    }

    throw new Error(`无法唯一定位会话「${target.name}」，请重新扫描后再导出。`);
  }

  async function exportSelected(indexes, scannedConversations, report) {
    const results = [];

    for (let i = 0; i < indexes.length; i += 1) {
      const index = indexes[i];
      const summary = scannedConversations.find((item) => item.index === index);
      const currentConversations = await scan();
      const current = resolveCurrentConversation(summary, currentConversations);
      const name = current.name;
      report(`正在打开 ${name} (${i + 1}/${indexes.length})...`);
      await window.DouyinDom.openConversationByIndex(current.index, current);
      report(`正在解析 ${name} 的可见聊天记录...`);
      const conversation = await window.DouyinDom.extractCurrentConversation(name);
      results.push(conversation);
    }

    window.DouyinExporterCore.downloadConversations(results);
    return results;
  }

  function showPanel() {
    window.DouyinExporterPanel.createPanel({
      scan,
      exportSelected
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== "DY_EXPORTER_SHOW_PANEL") {
      return false;
    }
    try {
      showPanel();
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: errorText(error) });
    }
    return false;
  });

  window.DouyinMessageExporter = {
    showPanel,
    scan,
    exportSelected
  };
})();
