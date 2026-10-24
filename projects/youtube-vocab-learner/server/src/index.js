// 服务器入口文件
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { initializeDatabase } = require('./db');

// 初始化数据库
initializeDatabase();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors()); // 允许跨域请求
app.use(morgan('dev')); // 请求日志
app.use(express.json({ limit: '10mb' })); // 解析JSON请求体，增加限制以处理大型字幕数据
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../../web/dist')));

// API路由
app.use('/api/subtitles', require('./routes/subtitles'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/words', require('./routes/words'));

// 前端路由处理（SPA应用）
app.get('*', (req, res) => {
  // 如果是API请求，继续处理
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // 否则返回前端应用
  res.sendFile(path.join(__dirname, '../../web/dist/index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});