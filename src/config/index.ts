// src/config/index.ts
import dotenv from 'dotenv';
import { EnvConfig } from '../types';

// 環境変数を読み込み
dotenv.config();

// CORSの設定を処理する関数
const parseCorsOrigin = (origin: string | undefined): string | string[] | RegExp => {
  if (!origin || origin === '*') return '*';
  
  // カンマで区切られた複数のオリジンを配列に変換
  if (origin.includes(',')) {
    return origin.split(',').map(o => o.trim());
  }
  
  return origin;
};

const config: EnvConfig = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  CORS_ORIGIN: parseCorsOrigin(process.env.CORS_ORIGIN) as string || '*',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '524288000', 10), // 500MB
  FILE_RETENTION_HOURS: parseInt(process.env.FILE_RETENTION_HOURS || '24', 10),
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
};

console.log('Application config:', {
  PORT: config.PORT,
  CORS_ORIGIN: config.CORS_ORIGIN,
  NODE_ENV: config.NODE_ENV
});

export default config;