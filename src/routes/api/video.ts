import express, { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import config from '../../config';

// コントローラーの読み込み
import * as videoController from '../../controllers/videoControler';

const router = express.Router();

// アップロードの設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../../public/uploads/temp'));
  },
  filename: function (req, file, cb) {
    // UUID + 元のファイル拡張子を使用して一意のファイル名を生成
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

// ファイルフィルター（動画ファイルのみを許可）
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 許可する動画ファイルのMIMEタイプ
  const allowedMimeTypes = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('許可されていないファイル形式です。MP4, MOV, AVI, MKV, WebMファイルのみアップロード可能です。'));
  }
};

// 最大ファイルサイズの設定
const maxFileSize = config.MAX_FILE_SIZE;

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxFileSize
  }
});

// バリデーションエラーチェック用のミドルウェア
const checkValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: '入力値が正しくありません。',
      details: errors.array()
    });
  }
  next();
};

/**
 * 動画変換の開始
 * POST /api/video/convert
 */
router.post('/convert',
  upload.single('file'),
  [
    body('outputFormat')
      .isIn(['mp4', 'mov', 'avi', 'mkv', 'webm', 'gif'])
      .withMessage('有効な出力形式を指定してください（mp4, mov, avi, mkv, webm, gif）')
  ],
  checkValidationErrors,
  videoController.startConversion
);

/**
 * 変換状態の取得
 * GET /api/video/convert/:id
 */
router.get('/convert/:id',
  [
    param('id')
      .isUUID(4)
      .withMessage('有効な変換IDを指定してください')
  ],
  checkValidationErrors,
  videoController.getConversionStatus
);

/**
 * 動画トリミングの開始
 * POST /api/video/trim
 */
router.post('/trim',
  upload.single('file'),
  [
    body('startTime')
      .isFloat({ min: 0 })
      .withMessage('開始時間は0以上の数値で指定してください'),
    body('endTime')
      .isFloat({ min: 0 })
      .withMessage('終了時間は0以上の数値で指定してください')
      .custom((value, { req }) => {
        return parseFloat(value) > parseFloat(req.body.startTime);
      })
      .withMessage('終了時間は開始時間より大きい必要があります'),
    body('outputFormat')
      .isIn(['mp4', 'mov', 'avi', 'webm', 'gif'])
      .withMessage('有効な出力形式を指定してください（mp4, mov, avi, webm, gif）')
  ],
  checkValidationErrors,
  videoController.startTrimming
);

/**
 * トリミング状態の取得
 * GET /api/video/trim/:id
 */
router.get('/trim/:id',
  [
    param('id')
      .isUUID(4)
      .withMessage('有効なトリミングIDを指定してください')
  ],
  checkValidationErrors,
  videoController.getTrimmingStatus
);

/**
 * スクリーンショット取得の開始
 * POST /api/video/screenshot
 */
router.post('/screenshot',
  upload.single('file'),
  [
    body('timestamp')
      .isFloat({ min: 0 })
      .withMessage('タイムスタンプは0以上の数値で指定してください'),
    body('format')
      .isIn(['jpg', 'png'])
      .withMessage('有効な画像形式を指定してください（jpg, png）'),
    body('quality')
      .isIn(['low', 'medium', 'high'])
      .withMessage('有効な画質を指定してください（low, medium, high）')
  ],
  checkValidationErrors,
  videoController.takeScreenshot
);

/**
 * スクリーンショット状態の取得
 * GET /api/video/screenshot/:id
 */
router.get('/screenshot/:id',
  [
    param('id')
      .isUUID(4)
      .withMessage('有効なスクリーンショットIDを指定してください')
  ],
  checkValidationErrors,
  videoController.getScreenshotStatus
);

export default router;