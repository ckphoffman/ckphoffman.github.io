// Popup界面逻辑
let allWords = [];
let currentSort = 'frequency';

// DOM元素
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const sortSelect = document.getElementById('sort-select');
const refreshBtn = document.getElementById('refresh-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const wordList = document.getElementById('word-list');
const modal = document.getElementById('word-modal');
const modalWord = document.getElementById('modal-word');
const modalCount = document.getElementById('modal-count');
const modalVideoCount = document.getElementById('modal-video-count');
const occurrencesList = document.getElementById('occurrences-list');
const closeModalBtn = document.getElementById('close-modal');

// 初始化
async function init() {
  await subtitleDB.init();
  await loadWords();
  await updateStats();
  setupEventListeners();
}

// 设置事件监听
function setupEventListeners() {
  searchInput.addEventListener('input', handleSearch);
  clearSearchBtn.addEventListener('click', clearSearch);
  sortSelect.addEventListener('change', handleSort);
  refreshBtn.addEventListener('click', () => {
    loadWords();
    updateStats();
  });
  clearAllBtn.addEventListener('click', handleClearAll);
  closeModalBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// 加载单词
async function loadWords() {
  try {
    wordList.innerHTML = '<div class="loading">加载中...</div>';
    allWords = await subtitleDB.getAllWords();
    sortWords();
    renderWords(allWords);
  } catch (error) {
    console.error('Failed to load words:', error);
    wordList.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
  }
}

// 更新统计信息
async function updateStats() {
  try {
    const stats = await subtitleDB.getStats();
    document.getElementById('total-words').textContent = stats.totalWords;
    document.getElementById('total-occurrences').textContent = stats.totalOccurrences;
    document.getElementById('total-videos').textContent = stats.totalVideos;
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
}

// 排序单词
function sortWords() {
  switch (currentSort) {
    case 'frequency':
      allWords.sort((a, b) => b.count - a.count);
      break;
    case 'alphabetical':
      allWords.sort((a, b) => a.lemma.localeCompare(b.lemma));
      break;
    case 'recent':
      allWords.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
      break;
  }
}

// 渲染单词列表
function renderWords(words) {
  if (words.length === 0) {
    wordList.innerHTML = `
      <div class="empty-state">
        <p>暂无数据</p>
        <p style="font-size: 12px;">在YouTube视频页面点击"解析字幕"按钮开始收集单词</p>
      </div>
    `;
    return;
  }

  wordList.innerHTML = words.map(word => `
    <div class="word-item" data-lemma="${word.lemma}">
      <div class="word-item-header">
        <span class="word-name">${word.lemma}</span>
        <span class="word-count">${word.count}次</span>
      </div>
      <div class="word-videos">
        ${word.videos.length} 个视频
      </div>
    </div>
  `).join('');

  // 添加点击事件
  document.querySelectorAll('.word-item').forEach(item => {
    item.addEventListener('click', () => {
      const lemma = item.dataset.lemma;
      showWordDetail(lemma);
    });
  });
}

// 搜索处理
async function handleSearch(e) {
  const query = e.target.value.trim();

  if (query === '') {
    renderWords(allWords);
    return;
  }

  const filtered = allWords.filter(word =>
    word.lemma.toLowerCase().includes(query.toLowerCase())
  );

  renderWords(filtered);
}

// 清除搜索
function clearSearch() {
  searchInput.value = '';
  renderWords(allWords);
}

// 排序处理
function handleSort(e) {
  currentSort = e.target.value;
  sortWords();
  renderWords(allWords);
}

// 清空所有数据
async function handleClearAll() {
  if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    return;
  }

  try {
    await subtitleDB.clearAll();
    allWords = [];
    renderWords(allWords);
    await updateStats();
    alert('数据已清空');
  } catch (error) {
    console.error('Failed to clear data:', error);
    alert('清空失败');
  }
}

// 显示单词详情
async function showWordDetail(lemma) {
  try {
    // 获取单词信息
    const word = allWords.find(w => w.lemma === lemma);
    if (!word) return;

    // 获取出现记录
    const occurrences = await subtitleDB.getWordOccurrences(lemma);

    // 填充模态框
    modalWord.textContent = lemma;
    modalCount.textContent = word.count;
    modalVideoCount.textContent = word.videos.length;

    // 按视频分组
    const groupedByVideo = occurrences.reduce((acc, occ) => {
      if (!acc[occ.videoId]) {
        acc[occ.videoId] = [];
      }
      acc[occ.videoId].push(occ);
      return acc;
    }, {});

    // 渲染出现记录
    occurrencesList.innerHTML = Object.entries(groupedByVideo).map(([videoId, occs]) => {
      return occs.map(occ => `
        <div class="occurrence-item" data-video-id="${occ.videoId}" data-timestamp="${occ.timestamp}">
          <div class="occurrence-header">
            <div class="occurrence-video" title="${occ.videoTitle}">
              ${occ.videoTitle}
            </div>
            <div class="occurrence-time">${formatTime(occ.timestamp)}</div>
          </div>
          <div class="occurrence-sentence">${highlightWord(occ.sentence, occ.originalWord)}</div>
          <div class="occurrence-original">原词: ${occ.originalWord}</div>
        </div>
      `).join('');
    }).join('');

    // 添加点击事件
    document.querySelectorAll('.occurrence-item').forEach(item => {
      item.addEventListener('click', () => {
        const videoId = item.dataset.videoId;
        const timestamp = parseFloat(item.dataset.timestamp);
        jumpToVideo(videoId, timestamp);
      });
    });

    // 显示模态框
    modal.classList.add('active');
  } catch (error) {
    console.error('Failed to show word detail:', error);
    alert('加载详情失败');
  }
}

// 关闭模态框
function closeModal() {
  modal.classList.remove('active');
}

// 格式化时间
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// 高亮显示单词
function highlightWord(sentence, word) {
  const regex = new RegExp(`\\b${word}\\b`, 'gi');
  return sentence.replace(regex, match => `<strong style="color: #667eea;">${match}</strong>`);
}

// 跳转到视频
function jumpToVideo(videoId, timestamp) {
  const url = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(timestamp)}s`;
  chrome.tabs.create({ url: url });
}

// 启动
init();
