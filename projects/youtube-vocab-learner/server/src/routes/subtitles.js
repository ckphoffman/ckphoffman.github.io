// 字幕API路由
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { processSubtitleText } = require('../text');

// 保存视频字幕
router.post('/', async (req, res) => {
  try {
    const { videoId, title, author, url, subtitles, timestamp } = req.body;
    
    if (!videoId || !title || !subtitles || !subtitles.length) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的字幕数据'
      });
    }
    
    const db = getDb();
    
    // 开始事务
    db.prepare('BEGIN').run();
    
    try {
      // 检查视频是否已存在
      let video = db.prepare('SELECT * FROM videos WHERE video_id = ?').get(videoId);
      let videoDbId;
      
      if (video) {
        // 视频已存在，更新信息
        videoDbId = video.id;
        db.prepare(
          'UPDATE videos SET title = ?, author = ?, url = ?, timestamp = ? WHERE id = ?'
        ).run(title, author, url, timestamp, videoDbId);
        
        // 删除现有字幕（将重新插入）
        db.prepare('DELETE FROM subtitles WHERE video_id = ?').run(videoDbId);
      } else {
        // 视频不存在，创建新记录
        const result = db.prepare(
          'INSERT INTO videos (video_id, title, author, url, timestamp) VALUES (?, ?, ?, ?, ?)'
        ).run(videoId, title, author, url, timestamp);
        
        videoDbId = result.lastInsertRowid;
      }
      
      // 插入字幕
      const insertSubtitle = db.prepare(
        'INSERT INTO subtitles (video_id, start_time, end_time, text) VALUES (?, ?, ?, ?)'
      );
      
      for (const subtitle of subtitles) {
        const result = insertSubtitle.run(
          videoDbId,
          subtitle.start,
          subtitle.end,
          subtitle.text
        );
        
        // 处理字幕文本，提取单词
        await processSubtitleText(db, result.lastInsertRowid, subtitle.text);
      }
      
      // 提交事务
      db.prepare('COMMIT').run();
      
      res.json({
        success: true,
        message: '字幕保存成功',
        videoId: videoDbId
      });
    } catch (error) {
      // 回滚事务
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('保存字幕失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '保存字幕失败'
    });
  }
});

// 获取视频的字幕
router.get('/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    const db = getDb();
    
    // 查询视频信息
    const video = db.prepare(
      'SELECT * FROM videos WHERE video_id = ?'
    ).get(videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: '未找到视频'
      });
    }
    
    // 查询视频的字幕
    const subtitles = db.prepare(
      'SELECT id, start_time as start, end_time as end, text FROM subtitles WHERE video_id = ? ORDER BY start_time'
    ).all(video.id);
    
    res.json({
      success: true,
      video,
      subtitles
    });
  } catch (error) {
    console.error('获取字幕失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取字幕失败'
    });
  }
});

module.exports = router;