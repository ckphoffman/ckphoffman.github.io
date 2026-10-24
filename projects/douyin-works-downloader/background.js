importScripts('debug-bridge.js');

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'EXECUTE_DOWNLOAD') {
    chrome.downloads.download({ url: msg.url, filename: msg.filename, saveAs: false }, () => {
      if (chrome.runtime.lastError) {
        console.error('下载失败', msg.filename, chrome.runtime.lastError.message);
      }
    });
    return;
  }
});
