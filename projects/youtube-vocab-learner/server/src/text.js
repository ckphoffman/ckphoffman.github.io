// 文本处理工具：分词和清洗

// 英文分词和清洗
function tokenizeEnglishText(text) {
  if (!text) return [];
  
  // 转换为小写
  const lowerText = text.toLowerCase();
  
  // 替换HTML实体和特殊字符
  const cleanedText = lowerText
    .replace(/&[a-z]+;/g, ' ') // 替换HTML实体
    .replace(/[\u2018\u2019]/g, "'") // 替换智能引号
    .replace(/[\u201C\u201D]/g, '"') // 替换智能双引号
    .replace(/[\u2013\u2014]/g, '-') // 替换破折号
    .replace(/[\u2026]/g, '...'); // 替换省略号
  
  // 分词（保留字母、数字和撇号，其他字符替换为空格）
  const tokenizedText = cleanedText.replace(/[^a-z0-9'\s]/g, ' ');
  
  // 按空格分割成单词数组
  const words = tokenizedText.split(/\s+/).filter(word => {
    // 过滤空字符串
    if (!word) return false;
    
    // 过滤纯数字
    if (/^\d+$/.test(word)) return false;
    
    // 过滤太短的单词（小于2个字符）
    if (word.length < 2) return false;
    
    return true;
  });
  
  return words;
}

// 处理字幕文本，提取单词并与字幕关联
async function processSubtitleText(db, subtitleId, text) {
  // 分词
  const words = tokenizeEnglishText(text);
  if (!words.length) return;
  
  // 获取字幕所属视频ID
  const subtitle = db.prepare('SELECT video_id FROM subtitles WHERE id = ?').get(subtitleId);
  if (!subtitle) return;
  
  const videoId = subtitle.video_id;
  const now = new Date().toISOString();
  
  // 处理每个单词
  for (const word of words) {
    // 检查单词是否已存在
    let wordRecord = db.prepare('SELECT * FROM words WHERE word = ?').get(word);
    
    if (wordRecord) {
      // 单词已存在，更新计数和最后见到时间
      db.prepare('UPDATE words SET count = count + 1, last_seen_at = ? WHERE id = ?')
        .run(now, wordRecord.id);
    } else {
      // 单词不存在，创建新记录
      const result = db.prepare(
        'INSERT INTO words (word, count, first_seen_at, last_seen_at) VALUES (?, 1, ?, ?)'
      ).run(word, now, now);
      
      wordRecord = { id: result.lastInsertRowid };
    }
    
    // 关联单词和视频（如果关联不存在）
    const wordVideoExists = db.prepare(
      'SELECT 1 FROM word_videos WHERE word_id = ? AND video_id = ?'
    ).get(wordRecord.id, videoId);
    
    if (!wordVideoExists) {
      db.prepare(
        'INSERT INTO word_videos (word_id, video_id) VALUES (?, ?)'
      ).run(wordRecord.id, videoId);
    }
    
    // 关联单词和字幕（如果关联不存在）
    const wordSubtitleExists = db.prepare(
      'SELECT 1 FROM word_subtitles WHERE word_id = ? AND subtitle_id = ?'
    ).get(wordRecord.id, subtitleId);
    
    if (!wordSubtitleExists) {
      db.prepare(
        'INSERT INTO word_subtitles (word_id, subtitle_id) VALUES (?, ?)'
      ).run(wordRecord.id, subtitleId);
    }
  }
}

module.exports = {
  tokenizeEnglishText,
  processSubtitleText
};