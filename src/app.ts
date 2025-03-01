import createError from 'http-errors';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import config from './config';

// ルーターのインポート
import indexRouter from './routes/index';
import apiRouter from './routes/api';

const app = express();

// アップロードディレクトリの作成
const uploadsDir = path.join(__dirname, '../public/uploads');
const tempDir = path.join(__dirname, '../public/uploads/temp');
const downloadsDir = path.join(__dirname, '../public/uploads/downloads');
const outputsDir = path.join(__dirname, '../public/uploads/outputs');

// 必要なディレクトリの作成を確認
[uploadsDir, tempDir, downloadsDir, outputsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// view engineのセットアップ（デバッグ用に残す）
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'jade');

// ミドルウェアの設定
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// セキュリティミドルウェア
app.use(helmet({
  contentSecurityPolicy: false, // 必要に応じて調整
}));

// CORS設定
app.use(cors({
  origin: config.CORS_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ルートの設定
app.use('/', indexRouter);
app.use('/api', apiRouter);

// 404ハンドラ
app.use(function(req: Request, res: Response, next: NextFunction) {
  next(createError(404));
});

// エラーハンドラ
interface HttpError extends Error {
  status?: number;
}

app.use(function(err: HttpError, req: Request, res: Response, next: NextFunction) {
  // 開発環境のみエラーを表示
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // エラーレスポンスを返す
  res.status(err.status || 500);
  
  // APIリクエストの場合はJSONを返す
  if (req.path.startsWith('/api')) {
    return res.json({
      success: false,
      error: err.message || 'サーバーエラーが発生しました。'
    });
  }
  
  // それ以外はエラーページをレンダリング
  res.render('error');
});

export default app;