import { Request } from 'express';

// マルチパートリクエストの拡張
export interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// ベースタスクの型
export interface BaseTask {
  id: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  created: Date;
  outputPath?: string;
}

// 変換タスクの型定義
export interface ConversionTask extends BaseTask {
  inputFile: string;
  outputFormat: string;
}

// トリミングタスクの型定義
export interface TrimTask extends BaseTask {
  inputFile: string;
  startTime: number;
  endTime: number;
  outputFormat: string;
}

// スクリーンショットタスクの型定義
export interface ScreenshotTask extends BaseTask {
  inputFile: string;
  timestamp: number;
  format: 'jpg' | 'png';
  quality: 'low' | 'medium' | 'high';
}

// 圧縮タスクの型定義
export interface CompressTask extends BaseTask {
  inputFile: string;
  compressionLevel: 'light' | 'medium' | 'high';
  resolution: 'original' | '1080p' | '720p' | '480p';
  outputSize?: number; // 圧縮後のファイルサイズ（バイト）
}

// APIレスポンスの型定義
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// FrontendEndpointの型（APIドキュメント用）
export interface EndpointInfo {
  path: string;
  method: string;
  description: string;
  params?: string;
  body?: string;
}

// 環境変数の型
export interface EnvConfig {
  PORT: number;
  CORS_ORIGIN: string;
  MAX_FILE_SIZE: number;
  FILE_RETENTION_HOURS: number;
  NODE_ENV: 'development' | 'production' | 'test';
}