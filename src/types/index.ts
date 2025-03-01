import { Request } from 'express';

// マルチパートリクエストの拡張
export interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// YouTube動画情報の型
export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  duration: number;
  formats: VideoFormat[];
}

// ビデオフォーマットの型
export interface VideoFormat {
  itag: number;
  quality: string;
  mimeType: string;
  container: string;
  hasVideo: boolean;
  hasAudio: boolean;
  codecs: string;
  bitrate: number;
  size?: number;
  url?: string; // YouTube APIから取得したストリーミングURL
}

// タスク共通のベース型
export interface BaseTask {
  id: string;
  progress: number;
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'error';
  error?: string;
  created: Date;
  outputPath?: string;
}

// ダウンロードタスクの型
export interface DownloadTask extends BaseTask {
  url: string;
  format: VideoFormat;
}

// 変換タスクの型
export interface ConversionTask extends BaseTask {
  inputFile: string;
  outputFormat: string;
}

// トリミングタスクの型
export interface TrimTask extends BaseTask {
  inputFile: string;
  startTime: number;
  endTime: number;
  outputFormat: string;
}

// スクリーンショットタスクの型
export interface ScreenshotTask extends BaseTask {
  inputFile: string;
  timestamp: number;
  format: 'jpg' | 'png';
  quality: 'low' | 'medium' | 'high';
}

// APIレスポンスの型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 環境変数の型
export interface EnvConfig {
  PORT: number;
  CORS_ORIGIN: string;
  MAX_FILE_SIZE: number;
  FILE_RETENTION_HOURS: number;
  NODE_ENV: 'development' | 'production' | 'test';
  YOUTUBE_API_KEY: string;
  UNSAFE_DOWNLOAD: boolean;
}

// FrontendEndpointの型（APIドキュメント用）
export interface EndpointInfo {
  path: string;
  method: string;
  description: string;
  params?: string;
  body?: string;
}

// YouTube API からの応答データ型
export interface YouTubeVideoDetails {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      default: { url: string, width: number, height: number };
      medium: { url: string, width: number, height: number };
      high: { url: string, width: number, height: number };
      standard?: { url: string, width: number, height: number };
      maxres?: { url: string, width: number, height: number };
    };
  };
  contentDetails: {
    duration: string; // ISO 8601 形式 (PT#M#S)
    definition: string;
  };
}