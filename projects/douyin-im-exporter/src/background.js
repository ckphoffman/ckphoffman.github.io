chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.action !== "douyin-im-exporter:download-html") return false;

  try {
    const html = String(message.html || "");
    const filename = String(message.filename || "douyin-im-export.html");
    const bytes = new TextEncoder().encode(html);
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
    }
    const encoded = btoa(binary);
    const url = `data:text/html;charset=utf-8;base64,${encoded}`;

    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: true,
        conflictAction: "uniquify",
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ ok: true, downloadId });
      }
    );
  } catch (error) {
    sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
  }

  return true;
});
