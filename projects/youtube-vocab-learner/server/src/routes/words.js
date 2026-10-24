// 单词API路由
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// 获取所有单词列表（支持排序和筛选）
router.get('/', (req, res) => {
  try {
    const { sort = 'count', order = 'desc', favorite } = req.query;
    const db = getDb();
    
    // 验证排序参数
    const validSortFields = ['count', 'word', 'first_seen_at'];
    const validOrders = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sort) ? sort : 'count';
    const sortOrder = validOrders.includes(order) ? order : 'desc';
    
    // 构建查询
    let query = 'SELECT * FROM words';
    const params = [];
    
    // 添加收藏筛选
    if (favorite === 'true') {
      query += ' WHERE is_favorite = 1';
    } else if (favorite === 'false') {
      query += ' WHERE is_favorite = 0';
    }
    
    // 添加排序
    query += ` ORDER BY ${sortField} ${sortOrder}`;
    
    // 执行查询
    const words = db.prepare(query).all(...params);
    
    res.json({
      success: true,
      words
    });
  } catch (error) {
    console.error('获取单词列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取单词列表失败'
    });
  }
});

// 获取单个单词详情（包括出现的视频和字幕）
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    // 查询单词信息
    const word = db.prepare('SELECT * FROM words WHERE id = ?').get(id);
    
    if (!word) {
      return res.status(404).json({
        success: false,
        error: '未找到单词'
      });
    }
    
    // 查询包含该单词的视频
    const videos = db.prepare(`
      SELECT v.*
      FROM videos v
      JOIN word_videos wv ON v.id = wv.video_id
      WHERE wv.word_id = ?
      ORDER BY v.timestamp DESC
    `).all(word.id);
    
    // 查询包含该单词的字幕
    const subtitles = db.prepare(`
      SELECT s.id, s.start_time as start, s.end_time as end, s.text, v.id as video_id, v.video_id as youtube_video_id, v.title as video_title
      FROM subtitles s
      JOIN word_subtitles ws ON s.id = ws.subtitle_id
      JOIN videos v ON s.video_id = v.id
      WHERE ws.word_id = ?
      ORDER BY v.timestamp DESC, s.start_time ASC
    `).all(word.id);
    
    res.json({
      success: true,
      word,
      videos,
      subtitles
    });
  } catch (error) {
    console.error('获取单词详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取单词详情失败'
    });
  }
});

// 更新单词收藏状态
router.patch('/:id/favorite', (req, res) => {
  try {
    const { id } = req.params;
    const { is_favorite } = req.body;
    
    if (typeof is_favorite !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: '收藏状态必须是布尔值'
      });
    }
    
    const db = getDb();
    
    // 更新收藏状态
    const result = db.prepare(
      'UPDATE words SET is_favorite = ? WHERE id = ?'
    ).run(is_favorite ? 1 : 0, id);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '未找到单词'
      });
    }
    
    res.json({
      success: true,
      message: `单词${is_favorite ? '已收藏' : '已取消收藏'}`
    });
  } catch (error) {
    console.error('更新单词收藏状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '更新单词收藏状态失败'
    });
  }
});

module.exports = router;