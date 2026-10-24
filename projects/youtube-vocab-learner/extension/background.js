// 后台脚本，处理与服务器的通信

// 服务器地址
const SERVER_URL = 'http://localhost:3000';

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_SUBTITLE') {
    // 将字幕数据发送到本地服务器
    fetch(`${SERVER_URL}/api/subtitles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message.data),
    })
      .then(response => response.json())
      .then(data => {
        console.log('字幕保存成功:', data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('字幕保存失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // 保持消息通道开放，以便异步响应
  }
});

// 安装扩展时初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube英语学习助手已安装');
});