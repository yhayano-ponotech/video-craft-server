// src/routes/api/download.ts
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { query, validationResult } from 'express-validator';
import sanitize from 'sanitize-filename';
import mime from 'mime-types';

const router = express.Router();

/**
 * ファイルダウンロード
 * GET /api/download
 */
router.get('/', [
  query('path')
    .notEmpty()
    .withMessage('ファイルパスは必須です')
    .custom(value => {
      // ファイルパスが安全かどうか確認
      const normalizedPath = path.normalize(value);
      return !normalizedPath.includes('..');
    })
    .withMessage('無効なファイルパスです')
], (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: '入力値が正しくありません。',
      details: errors.array()
    });
  }

  try {
    // リクエストされたファイルパスを取得
    const filePath = path.normalize(req.query.path as string);
    
    // デバッグ情報
    console.log('Requested file path:', filePath);
    
    // 許可されたディレクトリを確認（セキュリティ対策）
    const uploadsDir = path.join(__dirname, '../../../public/uploads');
    const absolutePath = path.join(uploadsDir, filePath);
    
    // デバッグ情報
    console.log('Absolute path:', absolutePath);
    console.log('File exists:', fs.existsSync(absolutePath));
    
    // パスがuploadsディレクトリ内にあるか確認
    if (!absolutePath.startsWith(uploadsDir)) {
      return res.status(403).json({
        success: false,
        error: 'アクセスが拒否されました。'
      });
    }
    
    // ファイルの存在を確認
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        error: 'ファイルが見つかりません。'
      });
    }
    
    // ファイルの統計情報を取得
    const stat = fs.statSync(absolutePath);
    
    // ディレクトリでないことを確認
    if (!stat.isFile()) {
      return res.status(400).json({
        success: false,
        error: '指定されたパスはファイルではありません。'
      });
    }
    
    // ファイル名の取得
    const fileName = path.basename(absolutePath);
    const sanitizedFileName = sanitize(fileName);
    
    // MIMEタイプの取得
    const mimeType = mime.lookup(absolutePath) || 'application/octet-stream';
    
    // ファイルをダウンロードとして送信
    res.setHeader('Content-Type', mimeType as string);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);
    res.setHeader('Content-Length', stat.size);
    
    // CORSヘッダーを追加（画像表示用）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // ファイルをストリームとして送信
    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('ダウンロードエラー:', error);
    res.status(500).json({
      success: false,
      error: 'ファイルのダウンロード中にエラーが発生しました。'
    });
  }
});

export default router;