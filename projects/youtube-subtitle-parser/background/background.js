// Background service worker
console.log('Background script loaded');

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchSubtitles') {
    // 使用background script来获取字幕，可以避免CORS限制
    fetchSubtitlesInBackground(request.url)
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    // 返回true表示会异步调用sendResponse
    return true;
  }
});

// 在background中获取字幕
async function fetchSubtitlesInBackground(url) {
  try {
    console.log('Fetching subtitles in background:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    console.log('Fetched subtitle data length:', text.length);

    return text;
  } catch (error) {
    console.error('Failed to fetch in background:', error);
    throw error;
  }
}
