(function () {
  const button = document.getElementById("openPanel");
  const status = document.getElementById("status");

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "正在连接当前抖音页面...";

    try {
      const tab = await getActiveTab();
      if (!tab || !/^https:\/\/(www\.)?douyin\.com\//.test(tab.url || "")) {
        status.textContent = "请先打开抖音网页版页面。";
        button.disabled = false;
        return;
      }

      await chrome.tabs.sendMessage(tab.id, { type: "DY_EXPORTER_SHOW_PANEL" });
      status.textContent = "导出面板已打开。";
    } catch (error) {
      status.textContent = "无法连接页面，请刷新抖音后重试。";
      console.error(error);
    } finally {
      button.disabled = false;
    }
  });
})();
