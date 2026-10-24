// 弹出窗口脚本

document.addEventListener('DOMContentLoaded', function() {
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');
  
  // 检查当前标签页是否是YouTube视频页面
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    const url = currentTab.url;
    
    // 如果不是YouTube视频页面，禁用保存按钮
    if (!url.includes('youtube.com/watch')) {
      saveButton.disabled = true;
      showStatus('请在YouTube视频页面使用此功能', 'error');
    }
  });
  
  // 保存按钮点击事件
  saveButton.addEventListener('click', function() {
    saveButton.disabled = true;
    saveButton.textContent = '正在保存...';
    
    // 向当前标签页的content script发送消息，请求保存字幕
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      
      // 执行content script中的函数
      chrome.scripting.executeScript({
        target: {tabId: currentTab.id},
        function: triggerSubtitleSave
      }, (results) => {
        // 检查执行结果
        if (chrome.runtime.lastError) {
          showStatus('无法获取字幕: ' + chrome.runtime.lastError.message, 'error');
          resetButton();
          return;
        }
        
        const result = results[0].result;
        if (result.success) {
          showStatus('字幕已成功保存！', 'success');
        } else {
          showStatus(result.message || '保存字幕失败', 'error');
        }
        
        resetButton();
      });
    });
  });
  
  // 显示状态信息
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
  }
  
  // 重置按钮状态
  function resetButton() {
    saveButton.disabled = false;
    saveButton.textContent = '保存当前视频字幕';
  }
});

// 在content script环境中执行的函数
function triggerSubtitleSave() {
  // 检查是否是YouTube视频页面
  if (!window.location.href.includes('youtube.com/watch')) {
    return { success: false, message: '不是YouTube视频页面' };
  }
  
  // 获取视频ID
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  
  if (!videoId) {
    return { success: false, message: '无法获取视频ID' };
  }
  
  // 手动触发字幕获取和保存
  try {
    // 这里调用content.js中已经定义的main函数
    // 由于作用域隔离，我们需要在页面上注入一个事件
    const event = new CustomEvent('SAVE_YOUTUBE_SUBTITLE');
    document.dispatchEvent(event);
    
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}