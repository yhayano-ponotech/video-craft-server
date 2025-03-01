import express from 'express';
import path from 'path';
import { EndpointInfo } from '../types';

const router = express.Router();
// package.jsonからバージョン情報を取得
// ファイルの読み込みをTypeScriptに対応させる
const packageJson = require('../../package.json');

/* GET home page - API情報ページ */
router.get('/', function(req, res, next) {
  const endpoints: EndpointInfo[] = [
    {
      path: '/api/health',
      method: 'GET',
      description: 'APIの健全性を確認します'
    },
    {
      path: '/api/video/info',
      method: 'GET',
      description: 'YouTube動画の情報を取得します',
      params: 'url=YouTubeのURL'
    },
    {
      path: '/api/video/download',
      method: 'POST',
      description: 'YouTube動画のダウンロードを開始します',
      body: '{ url: YouTubeのURL, itag: フォーマットID }'
    },
    {
      path: '/api/video/download/:id',
      method: 'GET',
      description: 'ダウンロードの状態を取得します'
    },
    {
      path: '/api/video/convert',
      method: 'POST',
      description: '動画を別の形式に変換します',
      body: 'FormData形式（file, outputFormat）'
    },
    {
      path: '/api/video/convert/:id',
      method: 'GET',
      description: '変換の状態を取得します'
    },
    {
      path: '/api/video/trim',
      method: 'POST',
      description: '動画をトリミングします',
      body: 'FormData形式（file, startTime, endTime, outputFormat）'
    },
    {
      path: '/api/video/trim/:id',
      method: 'GET',
      description: 'トリミングの状態を取得します'
    },
    {
      path: '/api/video/screenshot',
      method: 'POST',
      description: '動画からスクリーンショットを取得します',
      body: 'FormData形式（file, timestamp, format, quality）'
    },
    {
      path: '/api/video/screenshot/:id',
      method: 'GET',
      description: 'スクリーンショット取得の状態を取得します'
    },
    {
      path: '/api/download',
      method: 'GET',
      description: '処理されたファイルをダウンロードします',
      params: 'path=ファイルのパス'
    }
  ];

  res.render('index', { 
    title: 'Video Toolbox API',
    version: packageJson.version,
    endpoints
  });
});

export default router;