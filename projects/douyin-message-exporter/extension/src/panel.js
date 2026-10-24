(function () {
  const PANEL_ID = "dy-exporter-panel";

  function removeExistingPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.remove();
    }
  }

  function setStatus(panel, text) {
    panel.querySelector(".dy-exporter-status").textContent = text;
  }

  function selectedIndexes(panel) {
    return Array.from(panel.querySelectorAll("input[type='checkbox']:checked"))
      .map((input) => Number(input.value))
      .filter((value) => Number.isInteger(value));
  }

  function renderConversationList(panel, conversations) {
    const list = panel.querySelector(".dy-exporter-list");
    list.replaceChildren();

    conversations.forEach((conversation) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      const content = document.createElement("span");
      const name = document.createElement("strong");
      const meta = document.createElement("small");

      input.type = "checkbox";
      input.value = String(conversation.index);
      name.textContent = conversation.name;
      meta.textContent = [conversation.timeHint, conversation.preview].filter(Boolean).join(" · ");

      content.append(name, meta);
      label.append(input, content);
      list.append(label);
    });

    setStatus(panel, `找到 ${conversations.length} 个会话。请选择要导出的联系人。`);
  }

  function createPanel(handlers) {
    removeExistingPanel();

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.className = "dy-exporter-panel";
    panel.innerHTML = [
      "<header>",
      "<h2>抖音私信导出</h2>",
      "<button type=\"button\" data-role=\"close\">关闭</button>",
      "</header>",
      "<div class=\"dy-exporter-body\">",
      "<p class=\"dy-exporter-status\">先扫描会话列表，只会导出你勾选的会话。</p>",
      "<div class=\"dy-exporter-list\"></div>",
      "</div>",
      "<footer>",
      "<button type=\"button\" data-role=\"scan\">扫描会话列表</button>",
      "<button type=\"button\" data-role=\"export\" disabled>导出选中会话</button>",
      "</footer>"
    ].join("");

    const closeButton = panel.querySelector("[data-role='close']");
    const scanButton = panel.querySelector("[data-role='scan']");
    const exportButton = panel.querySelector("[data-role='export']");

    closeButton.addEventListener("click", () => panel.remove());
    scanButton.addEventListener("click", async () => {
      scanButton.disabled = true;
      exportButton.disabled = true;
      panel.__dyConversations = [];
      panel.querySelector(".dy-exporter-list").replaceChildren();
      setStatus(panel, "正在打开私信并扫描会话列表...");
      try {
        const conversations = await handlers.scan();
        panel.__dyConversations = conversations;
        renderConversationList(panel, conversations);
        exportButton.disabled = conversations.length === 0;
      } catch (error) {
        setStatus(panel, error.message || "扫描失败。");
      } finally {
        scanButton.disabled = false;
      }
    });

    exportButton.addEventListener("click", async () => {
      const indexes = selectedIndexes(panel);
      if (indexes.length === 0) {
        setStatus(panel, "请先勾选至少一个会话。");
        return;
      }
      scanButton.disabled = true;
      exportButton.disabled = true;
      setStatus(panel, `正在导出 ${indexes.length} 个会话...`);
      try {
        const conversations = panel.__dyConversations || [];
        await handlers.exportSelected(indexes, conversations, (message) => setStatus(panel, message));
        setStatus(panel, "导出完成，已生成 JSON 和 CSV。");
      } catch (error) {
        setStatus(panel, error.message || "导出失败。");
      } finally {
        scanButton.disabled = false;
        exportButton.disabled = false;
      }
    });

    document.body.appendChild(panel);
    return panel;
  }

  window.DouyinExporterPanel = {
    createPanel,
    setStatus
  };
})();
