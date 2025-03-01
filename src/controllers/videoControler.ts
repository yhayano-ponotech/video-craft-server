import { Request, Response } from 'express';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import sanitize from 'sanitize-filename';
import { 
  MulterRequest, 
  VideoInfo, 
  VideoFormat, 
  DownloadTask, 
  ConversionTask, 
  TrimTask, 
  ScreenshotTask
} from '../types';
import { setTask, getTask, updateTask } from '../services/taskManager';
import { 
  getVideoInfo as fetchYoutubeInfo,
  downloadYoutubeVideo,
  extractVideoId
} from '../services/youtubeService';

// FFmpegのパスを設定
ffmpeg.setFfmpegPath(ffmpegPath as string);

// ディレクトリパスの設定
const TEMP_DIR = path.join(__dirname, '../../public/uploads/temp');
const DOWNLOADS_DIR = path.join(__dirname, '../../public/uploads/downloads');
const OUTPUTS_DIR = path.join(__dirname, '../../public/uploads/outputs');

// ダウンロードURLの生成
const getDownloadUrl = (filePath: string): string => {
  const relativePath = path.relative(path.join(__dirname, '../../public/uploads'), filePath);
  return relativePath.replace(/\\/g, '/'); // Windows対応
};

/**
 * YouTube動画情報を取得
 */
export const getVideoInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query as { url: string };
    
    // YouTube Data APIを使用して動画情報を取得
    const videoInfo = await fetchYoutubeInfo(url);
    
    if (!videoInfo) {
      res.status(404).json({
        success: false,
        error: '動画情報の取得に失敗しました。URLが正しいか確認してください。'
      });
      return;
    }
    
    res.json({
      success: true,
      data: videoInfo
    });
  } catch (error) {
    console.error('動画情報取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '動画情報の取得に失敗しました。URLが正しいか確認してください。'
    });
  }
};

/**
 * YouTube動画ダウンロードを開始
 */
export const startDownload = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, itag } = req.body as { url: string; itag: number };
    
    // 動画IDを検証
    const videoId = extractVideoId(url);
    if (!videoId) {
      res.status(400).json({
        success: false,
        error: '有効なYouTube URLではありません。'
      });
      return;
    }
    
    // タスクIDを生成
    const taskId = uuidv4();
    
    // 動画情報を取得
    const videoInfo = await fetchYoutubeInfo(url);
    
    if (!videoInfo) {
      res.status(404).json({
        success: false,
        error: '動画情報の取得に失敗しました。'
      });
      return;
    }
    
    // 指定されたitagのフォーマットを取得
    const format = videoInfo.formats.find(f => f.itag === parseInt(itag.toString()));
    if (!format) {
      res.status(400).json({
        success: false,
        error: '指定されたフォーマットが見つかりません。'
      });
      return;
    }
    
    // ファイル名を作成（サニタイズして安全な名前にする）
    let fileName = sanitize(videoInfo.title);
    fileName = `${fileName}-${taskId}.${format.container || 'mp4'}`;
    const outputPath = path.join(DOWNLOADS_DIR, fileName);
    
    // 初期タスク情報を設定
    const task: DownloadTask = {
      id: taskId,
      url,
      format: {
        itag: format.itag,
        quality: format.quality,
        mimeType: format.mimeType,
        container: format.container,
        hasVideo: format.hasVideo,
        hasAudio: format.hasAudio,
        codecs: format.codecs,
        bitrate: format.bitrate,
        size: format.size
      },
      progress: 0,
      status: 'pending',
      created: new Date(),
      outputPath: getDownloadUrl(outputPath)
    };
    
    // タスク管理サービスにタスクを追加
    setTask<DownloadTask>(`download:${taskId}`, task);
    
    // タスク情報をクライアントに返す
    res.json({
      success: true,
      data: task
    });
    
    // バックグラウンドでダウンロードを実行
    downloadVideo(url, itag, outputPath, taskId);
  } catch (error) {
    console.error('ダウンロード開始エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ダウンロードの開始に失敗しました。'
    });
  }
};

/**
 * 動画ダウンロード処理（バックグラウンド実行）
 */
const downloadVideo = async (url: string, itag: number, outputPath: string, taskId: string): Promise<void> => {
  try {
    // タスク情報を更新
    updateTask<DownloadTask>(`download:${taskId}`, {
      status: 'downloading',
      progress: 0
    });
    
    // YouTubeサービスを使用して動画をダウンロード
    await downloadYoutubeVideo(
      url,
      itag,
      outputPath,
      // 進行状況コールバック
      (progress: number) => {
        updateTask<DownloadTask>(`download:${taskId}`, {
          progress
        });
      },
      // エラーコールバック
      (error: Error) => {
        console.error('ダウンロードエラー:', error);
        updateTask<DownloadTask>(`download:${taskId}`, {
          status: 'error',
          error: 'ダウンロード中にエラーが発生しました。'
        });
      },
      // 完了コールバック
      () => {
        updateTask<DownloadTask>(`download:${taskId}`, {
          status: 'completed',
          progress: 100
        });
      }
    );
  } catch (error) {
    console.error('ダウンロード処理エラー:', error);
    updateTask<DownloadTask>(`download:${taskId}`, {
      status: 'error',
      error: 'ダウンロード処理中にエラーが発生しました。'
    });
  }
};

/**
 * ダウンロード状態を取得
 */
export const getDownloadStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // タスク管理サービスからタスク情報を取得
    const task = getTask<DownloadTask>(`download:${id}`);
    
    if (!task) {
      res.status(404).json({
        success: false,
        error: '指定されたダウンロードタスクが見つかりません。'
      });
      return;
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('ダウンロード状態取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ダウンロード状態の取得に失敗しました。'
    });
  }
};

/**
 * 動画変換を開始
 */
export const startConversion = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    // ファイルがアップロードされていることを確認
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'ファイルがアップロードされていません。'
      });
      return;
    }
    
    const { outputFormat } = req.body as { outputFormat: string };
    const inputFile = req.file.path;
    
    // タスクIDを生成
    const taskId = uuidv4();
    
    // 出力ファイル名を作成
    const outputFileName = `${path.basename(inputFile, path.extname(inputFile))}.${outputFormat}`;
    const outputPath = path.join(OUTPUTS_DIR, outputFileName);
    
    // 初期タスク情報を設定
    const task: ConversionTask = {
      id: taskId,
      inputFile,
      outputFormat,
      progress: 0,
      status: 'pending',
      created: new Date(),
      outputPath: getDownloadUrl(outputPath)
    };
    
    // タスク管理サービスにタスクを追加
    setTask<ConversionTask>(`convert:${taskId}`, task);
    
    // タスク情報をクライアントに返す
    res.json({
      success: true,
      data: task
    });
    
    // バックグラウンドで変換を実行
    convertVideo(inputFile, outputPath, outputFormat, taskId);
  } catch (error) {
    console.error('変換開始エラー:', error);
    res.status(500).json({
      success: false,
      error: '変換の開始に失敗しました。'
    });
  }
};

/**
 * 動画変換処理（バックグラウンド実行）
 */
const convertVideo = async (inputPath: string, outputPath: string, outputFormat: string, taskId: string): Promise<void> => {
  try {
    // タスク情報を更新
    updateTask<ConversionTask>(`convert:${taskId}`, {
      status: 'processing',
      progress: 0
    });
    
    // 変換オプションを設定
    let conversionOptions: {
      format: string;
      videoCodec?: string;
      audioCodec?: string;
    } = {
      format: outputFormat
    };
    
    // 出力形式に応じた設定
    switch (outputFormat) {
      case 'mp4':
        conversionOptions = {
          format: 'mp4',
          videoCodec: 'libx264',
          audioCodec: 'aac'
        };
        break;
      case 'mov':
        conversionOptions = {
          format: 'mov',
          videoCodec: 'libx264',
          audioCodec: 'aac'
        };
        break;
      case 'avi':
        conversionOptions = {
          format: 'avi',
          videoCodec: 'libxvid',
          audioCodec: 'libmp3lame'
        };
        break;
      case 'webm':
        conversionOptions = {
          format: 'webm',
          videoCodec: 'libvpx',
          audioCodec: 'libvorbis'
        };
        break;
      case 'mkv':
        conversionOptions = {
          format: 'matroska',
          videoCodec: 'libx264',
          audioCodec: 'aac'
        };
        break;
      case 'gif':
        conversionOptions = {
          format: 'gif'
        };
        break;
      default:
        conversionOptions = {
          format: 'mp4',
          videoCodec: 'libx264',
          audioCodec: 'aac'
        };
    }
    
    // FFmpegを使用して変換
    let command = ffmpeg(inputPath)
      .format(conversionOptions.format);
    
    if (conversionOptions.videoCodec) {
      command = command.videoCodec(conversionOptions.videoCodec);
    }
    
    if (conversionOptions.audioCodec) {
      command = command.audioCodec(conversionOptions.audioCodec);
    }
    
    command.on('progress', (progress: { percent?: number }) => {
      // 進捗情報を更新
      if (progress.percent !== undefined) {
        const percent = Math.min(100, Math.floor(progress.percent));
        updateTask<ConversionTask>(`convert:${taskId}`, {
          progress: percent
        });
      }
    })
    .on('end', () => {
      // 変換完了
      updateTask<ConversionTask>(`convert:${taskId}`, {
        status: 'completed',
        progress: 100
      });
      
      // 一時ファイルを削除
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
    })
    .on('error', (err: Error) => {
      console.error('変換エラー:', err);
      updateTask<ConversionTask>(`convert:${taskId}`, {
        status: 'error',
        error: '変換中にエラーが発生しました。'
      });
      
      // エラー時も一時ファイルを削除
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
    })
    .save(outputPath);
  } catch (error) {
    console.error('変換処理エラー:', error);
    updateTask<ConversionTask>(`convert:${taskId}`, {
      status: 'error',
      error: '変換処理中にエラーが発生しました。'
    });
    
    // エラー時も一時ファイルを削除
    if (fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (e) {
        console.error('一時ファイル削除エラー:', e);
      }
    }
  }
};

/**
 * 変換状態を取得
 */
export const getConversionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // タスク管理サービスからタスク情報を取得
    const task = getTask<ConversionTask>(`convert:${id}`);
    
    if (!task) {
      res.status(404).json({
        success: false,
        error: '指定された変換タスクが見つかりません。'
      });
      return;
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('変換状態取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '変換状態の取得に失敗しました。'
    });
  }
};

/**
 * 動画トリミングを開始
 */
export const startTrimming = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    // ファイルがアップロードされていることを確認
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'ファイルがアップロードされていません。'
      });
      return;
    }
    
    const { startTime, endTime, outputFormat } = req.body as { startTime: string; endTime: string; outputFormat: string };
    const inputFile = req.file.path;
    
    // タスクIDを生成
    const taskId = uuidv4();
    
    // 出力ファイル名を作成
    const outputFileName = `trimmed-${path.basename(inputFile, path.extname(inputFile))}.${outputFormat}`;
    const outputPath = path.join(OUTPUTS_DIR, outputFileName);
    
    // 初期タスク情報を設定
    const task: TrimTask = {
      id: taskId,
      inputFile,
      startTime: parseFloat(startTime),
      endTime: parseFloat(endTime),
      outputFormat,
      progress: 0,
      status: 'pending',
      created: new Date(),
      outputPath: getDownloadUrl(outputPath)
    };
    
    // タスク管理サービスにタスクを追加
    setTask<TrimTask>(`trim:${taskId}`, task);
    
    // タスク情報をクライアントに返す
    res.json({
      success: true,
      data: task
    });
    
    // バックグラウンドでトリミングを実行
    trimVideo(inputFile, outputPath, parseFloat(startTime), parseFloat(endTime), outputFormat, taskId);
  } catch (error) {
    console.error('トリミング開始エラー:', error);
    res.status(500).json({
      success: false,
      error: 'トリミングの開始に失敗しました。'
    });
  }
};

/**
 * 動画トリミング処理（バックグラウンド実行）
 */
const trimVideo = async (inputPath: string, outputPath: string, startTime: number, endTime: number, outputFormat: string, taskId: string): Promise<void> => {
  try {
    // タスク情報を更新
    updateTask<TrimTask>(`trim:${taskId}`, {
      status: 'processing',
      progress: 0
    });
    
    // 出力形式に応じた設定
    let outputOptions: string[] = [];
    
    switch (outputFormat) {
      case 'mp4':
        outputOptions = ['-c:v', 'libx264', '-c:a', 'aac'];
        break;
      case 'mov':
        outputOptions = ['-c:v', 'libx264', '-c:a', 'aac'];
        break;
      case 'avi':
        outputOptions = ['-c:v', 'libxvid', '-c:a', 'libmp3lame'];
        break;
      case 'webm':
        outputOptions = ['-c:v', 'libvpx', '-c:a', 'libvorbis'];
        break;
      case 'gif':
        outputOptions = ['-vf', 'fps=10,scale=320:-1:flags=lanczos'];
        break;
      default:
        outputOptions = ['-c:v', 'libx264', '-c:a', 'aac'];
    }
    
    // FFmpegを使用してトリミング
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .outputOptions(outputOptions)
      .on('progress', (progress: { percent?: number }) => {
        // 進捗情報を更新
        if (progress.percent !== undefined) {
          const percent = Math.min(100, Math.floor(progress.percent));
          updateTask<TrimTask>(`trim:${taskId}`, {
            progress: percent
          });
        }
      })
      .on('end', () => {
        // トリミング完了
        updateTask<TrimTask>(`trim:${taskId}`, {
          status: 'completed',
          progress: 100
        });
        
        // 一時ファイルを削除
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
      })
      .on('error', (err: Error) => {
        console.error('トリミングエラー:', err);
        updateTask<TrimTask>(`trim:${taskId}`, {
          status: 'error',
          error: 'トリミング中にエラーが発生しました。'
        });
        
        // エラー時も一時ファイルを削除
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
      })
      .save(outputPath);
  } catch (error) {
    console.error('トリミング処理エラー:', error);
    updateTask<TrimTask>(`trim:${taskId}`, {
      status: 'error',
      error: 'トリミング処理中にエラーが発生しました。'
    });
    
    // エラー時も一時ファイルを削除
    if (fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (e) {
        console.error('一時ファイル削除エラー:', e);
      }
    }
  }
};

/**
 * トリミング状態を取得
 */
export const getTrimmingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // タスク管理サービスからタスク情報を取得
    const task = getTask<TrimTask>(`trim:${id}`);
    
    if (!task) {
      res.status(404).json({
        success: false,
        error: '指定されたトリミングタスクが見つかりません。'
      });
      return;
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('トリミング状態取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'トリミング状態の取得に失敗しました。'
    });
  }
};

/**
 * スクリーンショット取得を開始
 */
export const takeScreenshot = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    // ファイルがアップロードされていることを確認
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'ファイルがアップロードされていません。'
      });
      return;
    }
    
    const { timestamp, format, quality } = req.body as { timestamp: string; format: 'jpg' | 'png'; quality: 'low' | 'medium' | 'high' };
    const inputFile = req.file.path;
    
    // タスクIDを生成
    const taskId = uuidv4();
    
    // 出力ファイル名を作成
    const outputFileName = `screenshot-${path.basename(inputFile, path.extname(inputFile))}-${timestamp}.${format}`;
    const outputPath = path.join(OUTPUTS_DIR, outputFileName);
    
    // 初期タスク情報を設定
    const task: ScreenshotTask = {
      id: taskId,
      inputFile,
      timestamp: parseFloat(timestamp),
      format,
      quality,
      progress: 0,
      status: 'pending',
      created: new Date(),
      outputPath: getDownloadUrl(outputPath)
    };
    
    // タスク管理サービスにタスクを追加
    setTask<ScreenshotTask>(`screenshot:${taskId}`, task);
    
    // タスク情報をクライアントに返す
    res.json({
      success: true,
      data: task
    });
    
    // バックグラウンドでスクリーンショット取得を実行
    takeVideoScreenshot(inputFile, outputPath, parseFloat(timestamp), format, quality, taskId);
  } catch (error) {
    console.error('スクリーンショット開始エラー:', error);
    res.status(500).json({
      success: false,
      error: 'スクリーンショットの取得開始に失敗しました。'
    });
  }
};

/**
 * 動画スクリーンショット取得処理（バックグラウンド実行）
 */
const takeVideoScreenshot = async (inputPath: string, outputPath: string, timestamp: number, format: 'jpg' | 'png', quality: 'low' | 'medium' | 'high', taskId: string): Promise<void> => {
  try {
    // タスク情報を更新
    updateTask<ScreenshotTask>(`screenshot:${taskId}`, {
      status: 'processing',
      progress: 10
    });
    
    // 画質設定
    let qualityOptions: string[] = [];
    
    switch (quality) {
      case 'low':
        qualityOptions = format === 'jpg' ? ['-q:v', '10'] : ['-q:v', '2'];
        break;
      case 'medium':
        qualityOptions = format === 'jpg' ? ['-q:v', '5'] : ['-q:v', '5'];
        break;
      case 'high':
        qualityOptions = format === 'jpg' ? ['-q:v', '2'] : ['-q:v', '9'];
        break;
      default:
        qualityOptions = format === 'jpg' ? ['-q:v', '5'] : ['-q:v', '5'];
    }
    
    // FFmpegを使用してスクリーンショットを取得
    ffmpeg(inputPath)
      .seekInput(timestamp)
      .frames(1)
      .outputOptions(qualityOptions)
      .on('start', () => {
        updateTask<ScreenshotTask>(`screenshot:${taskId}`, {
          progress: 50
        });
      })
      .on('end', () => {
        // スクリーンショット取得完了
        updateTask<ScreenshotTask>(`screenshot:${taskId}`, {
          status: 'completed',
          progress: 100
        });
        
        // 一時ファイルを削除
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
      })
      .on('error', (err: Error) => {
        console.error('スクリーンショット取得エラー:', err);
        updateTask<ScreenshotTask>(`screenshot:${taskId}`, {
          status: 'error',
          error: 'スクリーンショットの取得中にエラーが発生しました。'
        });
        
        // エラー時も一時ファイルを削除
        if (fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
      })
      .save(outputPath);
  } catch (error) {
    console.error('スクリーンショット処理エラー:', error);
    updateTask<ScreenshotTask>(`screenshot:${taskId}`, {
      status: 'error',
      error: 'スクリーンショット処理中にエラーが発生しました。'
    });
    
    // エラー時も一時ファイルを削除
    if (fs.existsSync(inputPath)) {
      try {
        fs.unlinkSync(inputPath);
      } catch (e) {
        console.error('一時ファイル削除エラー:', e);
      }
    }
  }
};

/**
 * スクリーンショット状態を取得
 */
export const getScreenshotStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // タスク管理サービスからタスク情報を取得
    const task = getTask<ScreenshotTask>(`screenshot:${id}`);
    
    if (!task) {
      res.status(404).json({
        success: false,
        error: '指定されたスクリーンショットタスクが見つかりません。'
      });
      return;
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('スクリーンショット状態取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'スクリーンショット状態の取得に失敗しました。'
    });
  }
};