// 视频API路由
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// 获取所有视频列表
router.get('/', (req, res) => {
  try {
    const db = getDb();
    
    // 查询所有视频，按时间戳降序排列（最新的在前面）
    const videos = db.prepare(
      'SELECT * FROM videos ORDER BY timestamp DESC'
    ).all();
    
    res.json({
      success: true,
      videos
    });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取视频列表失败'
    });
  }
});

// 获取单个视频详情
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    // 查询视频信息
    const video = db.prepare(
      'SELECT * FROM videos WHERE id = ? OR video_id = ?'
    ).get(id, id);
    
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
    
    // 查询视频中的单词统计
    const wordStats = db.prepare(`
      SELECT w.id, w.word, w.count, w.is_favorite
      FROM words w
      JOIN word_videos wv ON w.id = wv.word_id
      WHERE wv.video_id = ?
      ORDER BY w.count DESC
    `).all(video.id);
    
    res.json({
      success: true,
      video,
      subtitles,
      wordStats
    });
  } catch (error) {
    console.error('获取视频详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取视频详情失败'
    });
  }
});

// 删除视频
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    // 开始事务
    db.prepare('BEGIN').run();
    
    try {
      // 查询视频信息
      const video = db.prepare(
        'SELECT * FROM videos WHERE id = ? OR video_id = ?'
      ).get(id, id);
      
      if (!video) {
        db.prepare('ROLLBACK').run();
        return res.status(404).json({
          success: false,
          error: '未找到视频'
        });
      }
      
      // 删除视频（级联删除会自动删除相关的字幕和单词关联）
      db.prepare('DELETE FROM videos WHERE id = ?').run(video.id);
      
      // 提交事务
      db.prepare('COMMIT').run();
      
      res.json({
        success: true,
        message: '视频删除成功'
      });
    } catch (error) {
      // 回滚事务
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('删除视频失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '删除视频失败'
    });
  }
});

module.exports = router;