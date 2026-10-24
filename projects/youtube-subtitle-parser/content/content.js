// YouTube页面内容脚本
console.log('YouTube Subtitle Parser loaded');

let currentVideoId = null;
let isProcessing = false;

// 监听URL变化（YouTube是SPA应用）
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    onUrlChange();
  }
}).observe(document, { subtree: true, childList: true });

function onUrlChange() {
  const videoId = getVideoId();
  if (videoId && videoId !== currentVideoId) {
    currentVideoId = videoId;
    console.log('Video changed:', videoId);
    // 延迟处理，等待页面加载
    setTimeout(() => {
      addParseButton();
    }, 2000);
  }
}

// 获取当前视频ID
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// 获取视频标题
function getVideoTitle() {
  const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
    document.querySelector('h1.title yt-formatted-string') ||
    document.querySelector('ytd-watch-metadata h1 yt-formatted-string');
  return titleElement ? titleElement.textContent.trim() : 'Unknown Title';
}

// 添加解析按钮
function addParseButton() {
  // 检查按钮是否已存在
  if (document.getElementById('subtitle-parser-btn')) {
    return;
  }

  // 查找字幕按钮的容器
  const menuRenderer = document.querySelector('#top-level-buttons-computed');
  if (!menuRenderer) {
    console.log('Menu renderer not found, retrying...');
    setTimeout(addParseButton, 1000);
    return;
  }

  // 创建解析按钮
  const button = document.createElement('button');
  button.id = 'subtitle-parser-btn';
  button.textContent = '解析字幕';
  button.style.cssText = `
    background: #3ea6ff;
    color: white;
    border: none;
    border-radius: 18px;
    padding: 10px 16px;
    margin-left: 8px;
    cursor: pointer;
    font-family: "Roboto", "Arial", sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 36px;
    height: 36px;
  `;

  button.addEventListener('click', parseSubtitles);
  button.addEventListener('mouseenter', () => {
    button.style.background = '#3194d9';
  });
  button.addEventListener('mouseleave', () => {
    button.style.background = '#3ea6ff';
  });

  menuRenderer.appendChild(button);
  console.log('Parse button added');
}

// 解析字幕
async function parseSubtitles() {
  if (isProcessing) {
    showNotification('正在处理中...', 'info');
    return;
  }

  isProcessing = true;
  const button = document.getElementById('subtitle-parser-btn');
  if (button) {
    button.textContent = '解析中...';
    button.disabled = true;
  }

  try {
    const videoId = getVideoId();
    const videoTitle = getVideoTitle();

    // 方法1: 先尝试从播放器获取
    console.log('Trying to get subtitles from player...');
    let subtitles = await getSubtitlesFromPlayer();

    // 方法2: 如果失败，尝试从API获取
    if (!subtitles || subtitles.length === 0) {
      console.log('Player method failed, trying API method...');
      subtitles = await fetchSubtitles(videoId);
    }

    if (!subtitles || subtitles.length === 0) {
      showNotification('未找到字幕', 'error');
      return;
    }

    // 处理字幕
    let processedCount = 0;
    for (const subtitle of subtitles) {
      const words = extractWords(subtitle.text);
      for (const word of words) {
        const lemma = lemmatizer.lemmatize(word);
        // 只保存有意义的单词（长度大于1，且包含字母）
        if (lemma.length > 1 && /[a-z]/.test(lemma)) {
          await subtitleDB.saveWordOccurrence(
            lemma,
            videoId,
            videoTitle,
            subtitle.text,
            subtitle.start,
            word
          );
          processedCount++;
        }
      }
    }

    showNotification(`成功解析 ${subtitles.length} 条字幕，提取 ${processedCount} 个单词`, 'success');

  } catch (error) {
    console.error('Error parsing subtitles:', error);
    showNotification('解析失败: ' + error.message, 'error');
  } finally {
    isProcessing = false;
    if (button) {
      button.textContent = '解析字幕';
      button.disabled = false;
    }
  }
}

// 从播放器获取字幕（最可靠的方法）
async function getSubtitlesFromPlayer() {
  return new Promise((resolve, reject) => {
    try {
      console.log('Attempting to get subtitles from player...');

      // 1. 开启字幕
      const captionsButton = document.querySelector('.ytp-subtitles-button');

      if (!captionsButton) {
        console.log('Captions button not found');
        reject(new Error('找不到字幕按钮'));
        return;
      }

      // 检查字幕是否已经开启
      const isEnabled = captionsButton.getAttribute('aria-pressed') === 'true';

      if (!isEnabled) {
        console.log('Enabling captions...');
        captionsButton.click();

        // 等待字幕加载
        setTimeout(() => continueGettingSubtitles(resolve, reject, captionsButton, false), 1000);
      } else {
        console.log('Captions already enabled');
        continueGettingSubtitles(resolve, reject, captionsButton, true);
      }

    } catch (error) {
      console.error('Error in getSubtitlesFromPlayer:', error);
      reject(error);
    }
  });
}

function continueGettingSubtitles(resolve, reject, captionsButton, wasEnabled) {
  try {
    // 2. 获取字幕容器
    const captionWindow = document.querySelector('.ytp-caption-window-container');

    if (!captionWindow) {
      console.log('Caption window not found');
      if (!wasEnabled) {
        captionsButton.click(); // 恢复原状态
      }
      reject(new Error('字幕窗口未找到'));
      return;
    }

    // 3. 获取视频元素来追踪时间
    const video = document.querySelector('video');

    if (!video) {
      console.log('Video element not found');
      if (!wasEnabled) {
        captionsButton.click();
      }
      reject(new Error('视频元素未找到'));
      return;
    }

    console.log('Starting subtitle collection...');
    const subtitles = [];
    const seenTexts = new Set();
    let lastTime = 0;

    // 创建观察器来监听字幕变化
    const observer = new MutationObserver((mutations) => {
      const captionSegments = document.querySelectorAll('.ytp-caption-segment');

      if (captionSegments.length > 0) {
        const currentTime = video.currentTime;
        const text = Array.from(captionSegments)
          .map(seg => seg.textContent.trim())
          .join(' ');

        // 只记录新的不重复的字幕
        if (text && !seenTexts.has(text) && Math.abs(currentTime - lastTime) > 0.5) {
          seenTexts.add(text);
          lastTime = currentTime;

          subtitles.push({
            text: text,
            start: currentTime,
            duration: 3,
            end: currentTime + 3
          });

          console.log(`Collected subtitle at ${currentTime.toFixed(2)}s: ${text.substring(0, 50)}...`);
        }
      }
    });

    // 开始观察字幕容器
    observer.observe(captionWindow, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // 快速播放视频来收集所有字幕
    const originalPlaybackRate = video.playbackRate;
    const originalTime = video.currentTime;
    const wasPlaying = !video.paused;

    // 从头开始
    video.currentTime = 0;
    video.playbackRate = 16; // 16倍速
    video.play();

    // 等待视频播放完成或达到一定时间
    const checkInterval = setInterval(() => {
      if (video.ended || video.currentTime >= video.duration - 1 || subtitles.length > 1000) {
        clearInterval(checkInterval);
        observer.disconnect();

        // 恢复原状态
        video.pause();
        video.currentTime = originalTime;
        video.playbackRate = originalPlaybackRate;

        if (wasPlaying) {
          video.play();
        }

        if (!wasEnabled) {
          captionsButton.click(); // 关闭字幕
        }

        console.log(`Collected ${subtitles.length} subtitles from player`);

        if (subtitles.length === 0) {
          reject(new Error('未能收集到字幕'));
        } else {
          resolve(subtitles);
        }
      }
    }, 500);

    // 超时保护（最多60秒）
    setTimeout(() => {
      clearInterval(checkInterval);
      observer.disconnect();
      video.pause();
      video.currentTime = originalTime;
      video.playbackRate = originalPlaybackRate;

      if (!wasEnabled) {
        captionsButton.click();
      }

      if (subtitles.length === 0) {
        reject(new Error('收集字幕超时'));
      } else {
        resolve(subtitles);
      }
    }, 60000);

  } catch (error) {
    console.error('Error in continueGettingSubtitles:', error);
    reject(error);
  }
}

// 获取字幕数据
async function fetchSubtitles(videoId) {
  try {
    console.log('Fetching subtitles for video:', videoId);

    // 方法1：从页面的ytInitialPlayerResponse获取（最可靠）
    let playerResponse = null;

    // 尝试从页面脚本中获取
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent;
      if (content.includes('ytInitialPlayerResponse')) {
        const match = content.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (match) {
          try {
            playerResponse = JSON.parse(match[1]);
            console.log('Found ytInitialPlayerResponse in script');
            break;
          } catch (e) {
            console.log('Failed to parse ytInitialPlayerResponse:', e);
          }
        }
      }
    }

    // 方法2：从页面HTML中提取
    if (!playerResponse) {
      console.log('Trying to fetch from page HTML...');
      const response = await fetch(window.location.href);
      const html = await response.text();

      const playerResponseRegex = /var ytInitialPlayerResponse\s*=\s*({.+?});/;
      const playerMatch = html.match(playerResponseRegex);

      if (playerMatch) {
        try {
          playerResponse = JSON.parse(playerMatch[1]);
          console.log('Found ytInitialPlayerResponse in HTML');
        } catch (e) {
          console.log('Failed to parse from HTML:', e);
        }
      }
    }

    // 方法3：尝试备用正则表达式
    if (!playerResponse) {
      console.log('Trying alternative regex...');
      const response = await fetch(window.location.href);
      const html = await response.text();

      const altRegex = /ytInitialPlayerResponse\s*=\s*({.+?});var/s;
      const altMatch = html.match(altRegex);

      if (altMatch) {
        try {
          playerResponse = JSON.parse(altMatch[1]);
          console.log('Found ytInitialPlayerResponse with alternative regex');
        } catch (e) {
          console.log('Failed to parse with alternative regex:', e);
        }
      }
    }

    if (!playerResponse) {
      throw new Error('无法获取视频播放器数据');
    }

    console.log('Player response:', playerResponse);

    // 获取字幕轨道
    const captions = playerResponse?.captions;
    console.log('Captions data:', captions);

    if (!captions) {
      throw new Error('该视频没有字幕数据');
    }

    const captionTracks = captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log('Caption tracks:', captionTracks);

    if (!captionTracks || captionTracks.length === 0) {
      throw new Error('该视频没有可用字幕');
    }

    // 查找英文字幕（优先非自动生成的）
    console.log('Available languages:', captionTracks.map(t => `${t.languageCode} (${t.name?.simpleText})`));

    const englishCaption = captionTracks.find(track =>
      track.languageCode === 'en' && track.kind !== 'asr'
    ) || captionTracks.find(track =>
      track.languageCode === 'en'
    ) || captionTracks.find(track =>
      track.languageCode && track.languageCode.startsWith('en')
    );

    if (!englishCaption) {
      const availableLangs = captionTracks.map(t => t.languageCode).join(', ');
      throw new Error(`未找到英文字幕。可用语言: ${availableLangs}`);
    }

    console.log('Selected caption:', englishCaption);

    // 获取字幕内容
    return await fetchCaptionContent(englishCaption.baseUrl);

  } catch (error) {
    console.error('Failed to fetch subtitles:', error);
    throw error;
  }
}

// 获取字幕内容
async function fetchCaptionContent(baseUrl) {
  try {
    console.log('Fetching caption content from:', baseUrl);

    // 方法1: 使用background script获取（可以避免CORS）
    console.log('Trying background script method...');
    try {
      const bgResponse = await chrome.runtime.sendMessage({
        action: 'fetchSubtitles',
        url: baseUrl
      });

      console.log('Background response:', bgResponse);

      if (bgResponse && bgResponse.success && bgResponse.data && bgResponse.data.length > 0) {
        console.log('Got subtitle data from background:', bgResponse.data.length);
        return await parseSubtitleData(bgResponse.data);
      } else {
        console.log('Background method returned empty or failed');
      }
    } catch (bgError) {
      console.log('Background method failed:', bgError);
    }

    // 方法2: 添加 &fmt=srv3 参数并使用XMLHttpRequest
    let url = baseUrl;
    if (!url.includes('fmt=')) {
      url += '&fmt=srv3';
    }

    console.log('Modified URL:', url);
    console.log('Trying XHR method...');

    const response = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'text';
      xhr.onload = function() {
        console.log('XHR status:', xhr.status);
        console.log('XHR response length:', xhr.responseText ? xhr.responseText.length : 0);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else {
          reject(new Error(`HTTP error! status: ${xhr.status}`));
        }
      };
      xhr.onerror = function() {
        console.error('XHR error');
        reject(new Error('Network error'));
      };
      xhr.send();
    });

    console.log('Caption response length:', response ? response.length : 0);

    // 如果返回空内容，尝试备用方法
    if (!response || response.length === 0) {
      console.log('Response is empty, trying alternative method...');
      return await fetchCaptionFromTranscript();
    }

    return await parseSubtitleData(response);
  } catch (error) {
    console.error('Failed to fetch caption content:', error);
    console.log('Trying alternative method...');
    return await fetchCaptionFromTranscript();
  }
}

// 解析字幕数据（支持JSON和XML格式）
async function parseSubtitleData(data) {
  // 尝试解析JSON格式 (srv3格式)
  if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
    try {
      console.log('Parsing as JSON...');
      const jsonData = JSON.parse(data);
      const subtitles = [];

      if (jsonData.events) {
        jsonData.events.forEach(event => {
          if (event.segs) {
            const text = event.segs.map(seg => seg.utf8 || '').join('');
            if (text.trim() && event.tStartMs !== undefined) {
              subtitles.push({
                text: text.trim(),
                start: event.tStartMs / 1000,
                duration: (event.dDurationMs || 3000) / 1000,
                end: (event.tStartMs + (event.dDurationMs || 3000)) / 1000
              });
            }
          }
        });
      }

      if (subtitles.length > 0) {
        console.log('Parsed JSON subtitles:', subtitles.length);
        return subtitles;
      }
    } catch (e) {
      console.log('Not JSON format, trying XML...', e);
    }
  }

  // 解析XML字幕
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data, 'text/xml');

  // 检查是否有解析错误
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    console.error('XML parse error:', parseError.textContent);
    throw new Error('字幕解析失败');
  }

  const textElements = xmlDoc.getElementsByTagName('text');
  console.log('Found text elements:', textElements.length);

  if (textElements.length === 0) {
    throw new Error('未找到字幕文本');
  }

  const subtitles = [];
  for (let i = 0; i < textElements.length; i++) {
    const element = textElements[i];
    const text = decodeHTMLEntities(element.textContent);
    const start = parseFloat(element.getAttribute('start'));
    const duration = parseFloat(element.getAttribute('dur') || '0');

    if (text && text.trim()) {
      subtitles.push({
        text: text,
        start: start,
        duration: duration,
        end: start + duration
      });
    }
  }

  console.log('Parsed XML subtitles:', subtitles.length);
  return subtitles;
}

// 备用方案：从YouTube的transcript功能获取字幕
async function fetchCaptionFromTranscript() {
  console.log('Attempting to fetch from transcript panel...');

  return new Promise((resolve, reject) => {
    // 方法1: 查找"更多操作"按钮 (三个点的菜单)
    let moreActionsButton = document.querySelector('#button-shape > button[aria-label]');

    // 方法2: 备用选择器
    if (!moreActionsButton) {
      moreActionsButton = document.querySelector('ytd-menu-renderer button[aria-label]');
    }

    // 方法3: 通过多个可能的选择器查找
    if (!moreActionsButton) {
      const buttons = document.querySelectorAll('button');
      moreActionsButton = Array.from(buttons).find(btn => {
        const label = btn.getAttribute('aria-label') || '';
        return label.includes('更多') || label.includes('More') || label.includes('菜单') || label.includes('menu');
      });
    }

    console.log('More actions button:', moreActionsButton);

    if (!moreActionsButton) {
      reject(new Error('无法找到更多操作按钮。尝试手动方法...'));
      return;
    }

    // 点击更多操作
    moreActionsButton.click();

    // 等待菜单出现
    setTimeout(() => {
      // 查找文字记录按钮
      let transcriptButton = null;

      // 方法1: 查找所有菜单项
      const allMenuItems = document.querySelectorAll('[role="menuitem"], ytd-menu-service-item-renderer, tp-yt-paper-item, ytd-menu-navigation-item-renderer, yt-formatted-string');

      console.log('Found menu items:', allMenuItems.length);

      // 打印所有菜单项的文本以便调试
      allMenuItems.forEach((item, index) => {
        console.log(`Menu item ${index}:`, item.textContent?.trim());
      });

      transcriptButton = Array.from(allMenuItems).find(item => {
        const text = (item.textContent || '').toLowerCase();
        return text.includes('文字记录') ||
               text.includes('transcript') ||
               text.includes('字幕') ||
               text.includes('显示') ||
               text.includes('show');
      });

      console.log('Transcript button found:', transcriptButton);

      if (!transcriptButton) {
        // 关闭菜单
        document.body.click();
        reject(new Error('无法找到文字记录按钮。此视频可能没有字幕。请手动打开"显示文字记录"后重试。'));
        return;
      }

      // 点击打开transcript
      transcriptButton.click();

      // 等待transcript面板加载
      setTimeout(() => {
        const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');

        console.log('Transcript segments found:', transcriptSegments.length);

        if (transcriptSegments.length === 0) {
          reject(new Error('无法加载文字记录。'));
          return;
        }

        const subtitles = [];
        transcriptSegments.forEach(segment => {
          const timestamp = segment.querySelector('.segment-timestamp');
          const text = segment.querySelector('.segment-text');

          if (timestamp && text) {
            const timeStr = timestamp.textContent.trim();
            const timeSeconds = parseTimestamp(timeStr);

            subtitles.push({
              text: text.textContent.trim(),
              start: timeSeconds,
              duration: 3, // 默认持续时间
              end: timeSeconds + 3
            });
          }
        });

        console.log('Extracted subtitles from transcript:', subtitles.length);

        // 关闭transcript面板
        const closeButton = document.querySelector('button[aria-label*="关闭"], button[aria-label*="Close"]');
        if (closeButton) {
          closeButton.click();
        }

        if (subtitles.length === 0) {
          reject(new Error('未能提取到字幕内容'));
        } else {
          resolve(subtitles);
        }
      }, 2000);
    }, 500);
  });
}

// 解析时间戳 (例如: "1:23" -> 83秒)
function parseTimestamp(timeStr) {
  const parts = timeStr.split(':').reverse();
  let seconds = 0;
  for (let i = 0; i < parts.length; i++) {
    seconds += parseInt(parts[i]) * Math.pow(60, i);
  }
  return seconds;
}

// 解码HTML实体
function decodeHTMLEntities(text) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

// 提取单词
function extractWords(text) {
  // 移除标点符号，分割单词
  const words = text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ') // 保留连字符和撇号
    .split(/\s+/)
    .filter(word => word.length > 0);

  return words;
}

// 显示通知
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    padding: 16px 24px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    z-index: 9999;
    font-family: "Roboto", "Arial", sans-serif;
    font-size: 14px;
    max-width: 400px;
  `;

  document.body.appendChild(notification);

  // 3秒后移除
  setTimeout(() => {
    notification.style.transition = 'opacity 0.3s';
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// 初始化
onUrlChange();
