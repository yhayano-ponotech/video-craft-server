import express from 'express';
import videoRouter from './api/video';
import downloadRouter from './api/download';

const router = express.Router();

// APIのベーシックな健全性チェック用エンドポイント
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Video Toolbox API is running',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// 各ルーターをマウント
router.use('/video', videoRouter);
router.use('/download', downloadRouter);

export default router;