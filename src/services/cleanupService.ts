/**
 * ファイルクリーンアップサービス
 * 
 * アップロードされたファイルや生成されたファイルを定期的にクリーンアップするサービスです。
 * 一定期間経過したファイルを自動的に削除します。
 */

import fs from 'fs';
import path from 'path';
import config from '../config';

// ディレクトリパス
const TEMP_DIR = path.join(__dirname, '../../public/uploads/temp');
const DOWNLOADS_DIR = path.join(__dirname, '../../public/uploads/downloads');
const OUTPUTS_DIR = path.join(__dirname, '../../public/uploads/outputs');

// ファイル保持期間（ミリ秒）
const FILE_RETENTION_MS = config.FILE_RETENTION_HOURS * 3600000;

// クリーンアップ間隔（ミリ秒）
const CLEANUP_INTERVAL_MS = 3600000; // 1時間

/**
 * ディレクトリ内の古いファイルをクリーンアップする
 * @param {string} directory - クリーンアップするディレクトリパス
 */
const cleanupDirectory = (directory: string): void => {
  try {
    if (!fs.existsSync(directory)) {
      return;
    }

    const now = Date.now();
    const files = fs.readdirSync(directory);

    for (const file of files) {
      const filePath = path.join(directory, file);
      
      // ディレクトリの場合はスキップ
      if (fs.statSync(filePath).isDirectory()) {
        continue;
      }

      // ファイルの最終変更日時を取得
      const stats = fs.statSync(filePath);
      const fileModTime = stats.mtimeMs;

      // 一定期間を超えているファイルを削除
      if (now - fileModTime > FILE_RETENTION_MS) {
        try {
          fs.unlinkSync(filePath);
          console.log(`古いファイルを削除しました: ${filePath}`);
        } catch (err) {
          console.error(`ファイル削除エラー: ${filePath}`, err);
        }
      }
    }
  } catch (error) {
    console.error(`ディレクトリクリーンアップエラー: ${directory}`, error);
  }
};

/**
 * すべてのディレクトリをクリーンアップする
 */
const cleanupAllDirectories = (): void => {
  cleanupDirectory(TEMP_DIR);
  cleanupDirectory(DOWNLOADS_DIR);
  cleanupDirectory(OUTPUTS_DIR);
  console.log('定期クリーンアップを実行しました', new Date().toISOString());
};

/**
 * クリーンアップサービスを開始
 */
export const startCleanupService = (): void => {
  // 起動時に一度実行
  cleanupAllDirectories();
  
  // 定期的にクリーンアップを実行
  setInterval(cleanupAllDirectories, CLEANUP_INTERVAL_MS);
  
  console.log('ファイルクリーンアップサービスを開始しました', new Date().toISOString());
};