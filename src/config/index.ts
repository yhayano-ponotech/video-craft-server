import dotenv from 'dotenv';
import { EnvConfig } from '../types';

// 環境変数を読み込み
dotenv.config();

const config: EnvConfig = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '524288000', 10), // 500MB
  FILE_RETENTION_HOURS: parseInt(process.env.FILE_RETENTION_HOURS || '24', 10),
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  UNSAFE_DOWNLOAD: process.env.UNSAFE_DOWNLOAD === 'true'
};

// YouTube API キーがない場合は警告
if (!config.YOUTUBE_API_KEY) {
  console.warn('警告: YOUTUBE_API_KEY が設定されていません。YouTube 関連の機能が正しく動作しない可能性があります。');
}

export default config;