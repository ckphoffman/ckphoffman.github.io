// 内容脚本，在YouTube页面上运行，读取字幕数据

// 检查当前页面是否是YouTube视频页面
function isYouTubeVideoPage() {
  return window.location.hostname.includes('youtube.com') && 
         window.location.pathname.includes('/watch');
}

// 从URL获取视频ID
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// 获取视频标题
function getVideoTitle() {
  const titleElement = document.querySelector('h1.title.style-scope.ytd-video-primary-info-renderer');
  return titleElement ? titleElement.textContent.trim() : '';
}

// 获取视频上传者
function getVideoAuthor() {
  const authorElement = document.querySelector('#text-container.ytd-channel-name a');
  return authorElement ? authorElement.textContent.trim() : '';
}

// 获取视频字幕
async function getVideoSubtitles() {
  // 获取视频ID
  const videoId = getVideoId();
  if (!videoId) return null;
  
  try {
    // 获取字幕轨道列表
    const response = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&type=list`);
    const data = await response.text();
    
    // 解析XML响应
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, 'text/xml');
    
    // 查找英文字幕轨道
    const tracks = xmlDoc.getElementsByTagName('track');
    let englishTrackUrl = null;
    
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const lang = track.getAttribute('lang_code');
      const kind = track.getAttribute('kind');
      
      // 只获取上传的英文字幕，不获取自动生成的字幕
      if (lang === 'en' && kind !== 'asr') {
        const name = track.getAttribute('name');
        const id = track.getAttribute('id');
        englishTrackUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&name=${encodeURIComponent(name)}&id=${id}`;
        break;
      }
    }
    
    // 如果找到英文字幕轨道，获取字幕内容
    if (englishTrackUrl) {
      const subtitleResponse = await fetch(englishTrackUrl);
      const subtitleData = await subtitleResponse.text();
      
      // 解析字幕XML
      const subtitleXml = parser.parseFromString(subtitleData, 'text/xml');
      const textElements = subtitleXml.getElementsByTagName('text');
      
      // 提取字幕文本和时间戳
      const subtitles = [];
      for (let i = 0; i < textElements.length; i++) {
        const element = textElements[i];
        const start = parseFloat(element.getAttribute('start'));
        const dur = parseFloat(element.getAttribute('dur') || '0');
        const text = element.textContent.trim();
        
        subtitles.push({
          start,
          end: start + dur,
          text
        });
      }
      
      return subtitles;
    }
    
    return null; // 没有找到合适的字幕
  } catch (error) {
    console.error('获取字幕失败:', error);
    return null;
  }
}

// 主函数
async function main() {
  // 检查是否是YouTube视频页面
  if (!isYouTubeVideoPage()) return;
  
  // 等待页面加载完成
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // 获取视频信息
  const videoId = getVideoId();
  const videoTitle = getVideoTitle();
  const videoAuthor = getVideoAuthor();
  
  // 获取字幕
  const subtitles = await getVideoSubtitles();
  
  // 如果找到字幕，发送到后台脚本
  if (subtitles && subtitles.length > 0) {
    const videoData = {
      videoId,
      title: videoTitle,
      author: videoAuthor,
      url: window.location.href,
      subtitles,
      timestamp: new Date().toISOString()
    };
    
    // 发送消息到后台脚本
    chrome.runtime.sendMessage(
      { type: 'SAVE_SUBTITLE', data: videoData },
      response => {
        if (response && response.success) {
          console.log('字幕已保存到本地服务器');
        } else {
          console.error('保存字幕失败:', response ? response.error : '未知错误');
        }
      }
    );
  }
}

// 页面加载完成后执行主函数
window.addEventListener('load', main);

// 监听自定义事件（从popup.js触发）
document.addEventListener('SAVE_YOUTUBE_SUBTITLE', async () => {
  await main();
});

// 监听页面URL变化（YouTube是SPA应用）
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    main();
  }
}).observe(document, { subtree: true, childList: true });