// 数据库初始化和操作
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 确保数据目录存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 数据库文件路径
const dbPath = path.join(dataDir, 'app.db');

// 创建数据库连接
let db;

// 初始化数据库
function initializeDatabase() {
  // 连接数据库
  db = new Database(dbPath);
  
  // 启用外键约束
  db.pragma('foreign_keys = ON');
  
  // 创建视频表
  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      author TEXT,
      url TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      UNIQUE(video_id)
    )
  `);
  
  // 创建字幕表
  db.exec(`
    CREATE TABLE IF NOT EXISTS subtitles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    )
  `);
  
  // 创建单词表
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      count INTEGER DEFAULT 1,
      is_favorite BOOLEAN DEFAULT 0,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    )
  `);
  
  // 创建单词-视频关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS word_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      UNIQUE(word_id, video_id)
    )
  `);
  
  // 创建单词-字幕关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS word_subtitles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      subtitle_id INTEGER NOT NULL,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      FOREIGN KEY (subtitle_id) REFERENCES subtitles(id) ON DELETE CASCADE,
      UNIQUE(word_id, subtitle_id)
    )
  `);
  
  console.log('数据库初始化完成');
  
  return db;
}

// 获取数据库连接
function getDb() {
  if (!db) {
    initializeDatabase();
  }
  return db;
}

module.exports = {
  initializeDatabase,
  getDb
};