import express from 'express';
import videoRouter from './api/video';
import downloadRouter from './api/download';
import os from 'os';

const router = express.Router();

// APIのベーシックな健全性チェック用エンドポイント
// Fly.ioのヘルスチェックで使用されます
router.get('/health', (req, res) => {
  // バージョン情報
  const packageJson = require('../../package.json');
  
  // システム情報
  const systemInfo = {
    uptime: process.uptime(),
    memory: {
      free: os.freemem(),
      total: os.totalmem()
    },
    cpu: os.cpus().length,
    hostname: os.hostname()
  };

  res.json({
    success: true,
    message: 'Video Toolbox API is running',
    version: packageJson.version || '0.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    system: systemInfo
  });
});

// 各ルーターをマウント
router.use('/video', videoRouter);
router.use('/download', downloadRouter);

export default router;