// IndexedDB 数据库操作
class SubtitleDB {
  constructor() {
    this.dbName = 'YouTubeSubtitleDB';
    this.version = 1;
    this.db = null;
  }

  // 初始化数据库
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建单词表
        if (!db.objectStoreNames.contains('words')) {
          const wordStore = db.createObjectStore('words', { keyPath: 'lemma' });
          wordStore.createIndex('lemma', 'lemma', { unique: true });
        }

        // 创建单词出现记录表
        if (!db.objectStoreNames.contains('occurrences')) {
          const occurrenceStore = db.createObjectStore('occurrences', {
            keyPath: 'id',
            autoIncrement: true
          });
          occurrenceStore.createIndex('lemma', 'lemma', { unique: false });
          occurrenceStore.createIndex('videoId', 'videoId', { unique: false });
          occurrenceStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // 保存单词和出现记录
  async saveWordOccurrence(lemma, videoId, videoTitle, sentence, timestamp, originalWord) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['words', 'occurrences'], 'readwrite');
      const wordStore = transaction.objectStore('words');
      const occurrenceStore = transaction.objectStore('occurrences');

      // 更新或创建单词记录
      const wordRequest = wordStore.get(lemma);
      wordRequest.onsuccess = () => {
        const wordData = wordRequest.result || {
          lemma: lemma,
          count: 0,
          firstSeen: new Date().toISOString(),
          videos: []
        };

        wordData.count += 1;
        wordData.lastSeen = new Date().toISOString();

        // 更新视频列表（去重）
        if (!wordData.videos.find(v => v.videoId === videoId)) {
          wordData.videos.push({
            videoId: videoId,
            videoTitle: videoTitle,
            addedAt: new Date().toISOString()
          });
        }

        wordStore.put(wordData);
      };

      // 添加出现记录
      const occurrence = {
        lemma: lemma,
        originalWord: originalWord,
        videoId: videoId,
        videoTitle: videoTitle,
        sentence: sentence,
        timestamp: timestamp,
        addedAt: new Date().toISOString()
      };

      occurrenceStore.add(occurrence);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // 获取所有单词
  async getAllWords() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['words'], 'readonly');
      const store = transaction.objectStore('words');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 获取单词的所有出现记录
  async getWordOccurrences(lemma) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['occurrences'], 'readonly');
      const store = transaction.objectStore('occurrences');
      const index = store.index('lemma');
      const request = index.getAll(lemma);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 搜索单词（支持前缀匹配）
  async searchWords(prefix) {
    if (!this.db) await this.init();

    const allWords = await this.getAllWords();
    return allWords.filter(word =>
      word.lemma.toLowerCase().startsWith(prefix.toLowerCase())
    ).sort((a, b) => b.count - a.count);
  }

  // 获取视频的所有单词
  async getVideoWords(videoId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['occurrences'], 'readonly');
      const store = transaction.objectStore('occurrences');
      const index = store.index('videoId');
      const request = index.getAll(videoId);

      request.onsuccess = () => {
        const occurrences = request.result;
        // 按单词分组
        const wordMap = new Map();
        occurrences.forEach(occ => {
          if (!wordMap.has(occ.lemma)) {
            wordMap.set(occ.lemma, []);
          }
          wordMap.get(occ.lemma).push(occ);
        });
        resolve(Array.from(wordMap.entries()));
      };
      request.onerror = () => reject(request.error);
    });
  }

  // 删除单词及其所有出现记录
  async deleteWord(lemma) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['words', 'occurrences'], 'readwrite');
      const wordStore = transaction.objectStore('words');
      const occurrenceStore = transaction.objectStore('occurrences');

      // 删除单词
      wordStore.delete(lemma);

      // 删除所有出现记录
      const index = occurrenceStore.index('lemma');
      const request = index.openCursor(IDBKeyRange.only(lemma));

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // 清空数据库
  async clearAll() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['words', 'occurrences'], 'readwrite');
      transaction.objectStore('words').clear();
      transaction.objectStore('occurrences').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // 获取统计信息
  async getStats() {
    if (!this.db) await this.init();

    const words = await this.getAllWords();
    const totalWords = words.length;
    const totalOccurrences = words.reduce((sum, word) => sum + word.count, 0);
    const uniqueVideos = new Set();

    words.forEach(word => {
      word.videos.forEach(video => uniqueVideos.add(video.videoId));
    });

    return {
      totalWords,
      totalOccurrences,
      totalVideos: uniqueVideos.size
    };
  }
}

// 创建全局实例
const subtitleDB = new SubtitleDB();
