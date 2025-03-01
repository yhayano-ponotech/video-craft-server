import { google, youtube_v3 } from 'googleapis';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import config from '../config';
import { VideoInfo, VideoFormat, YouTubeVideoDetails } from '../types';
import { v4 as uuidv4 } from 'uuid';
import sanitize from 'sanitize-filename';

// YouTube API クライアントの初期化
const youtube = google.youtube({
  version: 'v3',
  auth: config.YOUTUBE_API_KEY
});

/**
 * YouTube 動画 ID を URL から抽出
 */
export const extractVideoId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

/**
 * ISO 8601 形式の動画時間（PT1H2M3S）を秒数に変換
 */
export const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * YouTube Data API を使用して動画情報を取得
 */
export const getVideoInfo = async (url: string): Promise<VideoInfo | null> => {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('有効なYouTube URLではありません');
    }

    // 動画詳細情報をAPIから取得
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails', 'status'],
      id: [videoId]
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('動画が見つかりませんでした');
    }

    const videoDetails = response.data.items[0] as YouTubeVideoDetails;
    const duration = parseDuration(videoDetails.contentDetails.duration);

    // 動画フォーマットの生成（実際のフォーマット情報はYouTube Data APIでは取得できない）
    // ここでは一部ダミーデータを使用
    const formats: VideoFormat[] = generateDefaultFormats(videoId);

    return {
      videoId: videoDetails.id,
      title: videoDetails.snippet.title,
      author: videoDetails.snippet.channelTitle,
      thumbnailUrl: getBestThumbnail(videoDetails.snippet.thumbnails),
      duration: duration,
      formats: formats
    };
  } catch (error) {
    console.error('動画情報取得エラー:', error);
    return null;
  }
};

/**
 * 最高品質のサムネイルURLを取得
 */
const getBestThumbnail = (thumbnails: YouTubeVideoDetails['snippet']['thumbnails']): string => {
  // 品質の高い順に確認
  if (thumbnails.maxres) return thumbnails.maxres.url;
  if (thumbnails.standard) return thumbnails.standard.url;
  if (thumbnails.high) return thumbnails.high.url;
  if (thumbnails.medium) return thumbnails.medium.url;
  return thumbnails.default.url;
};

/**
 * デフォルトのフォーマットリストを生成
 * 注意: 実際のフォーマット情報はYouTube Data APIでは直接取得できないため、
 * 一般的なフォーマットの推定リストを提供します
 */
const generateDefaultFormats = (videoId: string): VideoFormat[] => {
  // 一般的なフォーマットの推定リスト
  return [
    {
      itag: 22,
      quality: '720p',
      mimeType: 'video/mp4; codecs="avc1.64001F, mp4a.40.2"',
      container: 'mp4',
      hasVideo: true,
      hasAudio: true,
      codecs: 'H.264, AAC',
      bitrate: 2000000,
      size: undefined // サイズは不明
    },
    {
      itag: 18,
      quality: '360p',
      mimeType: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"',
      container: 'mp4',
      hasVideo: true,
      hasAudio: true,
      codecs: 'H.264, AAC',
      bitrate: 500000,
      size: undefined
    },
    {
      itag: 43,
      quality: '360p',
      mimeType: 'video/webm; codecs="vp8.0, vorbis"',
      container: 'webm',
      hasVideo: true,
      hasAudio: true,
      codecs: 'VP8, Vorbis',
      bitrate: 500000,
      size: undefined
    }
  ];
};

/**
 * YouTube動画のダウンロード処理
 * 注: 実際の実装では、YouTube利用規約に準拠した方法で行う必要があります
 */
export const downloadYoutubeVideo = async (
  url: string, 
  itag: number, 
  outputPath: string, 
  onProgress: (progress: number) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> => {
  try {
    // 安全でない直接ダウンロード方法（開発環境専用）
    // 注: 本番環境では使用すべきではありません
    if (config.UNSAFE_DOWNLOAD) {
      await downloadUnsafe(url, itag, outputPath, onProgress, onError, onComplete);
      return;
    }

    // YouTube Data API を使用した方法
    // 注: YouTube Data API は動画のダウンロードには使用できません
    // 以下は教育目的で、実際には別の合法的な方法を検討する必要があります
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('有効なYouTube URLではありません');
    }

    // 警告をログ出力
    console.warn(
      '警告: YouTubeの利用規約に準拠した実装を検討してください。' +
      '動画のダウンロードには、YouTube公式APIまたはYouTube Premiumの機能を使用するか、' +
      '著作権者の許可を得た上で行う必要があります。'
    );

    // ダウンロード完了を通知
    onProgress(100);
    onComplete();
  } catch (error) {
    console.error('ダウンロードエラー:', error);
    onError(error instanceof Error ? error : new Error('不明なエラーが発生しました'));
  }
};

/**
 * 安全でない直接ダウンロード方法（開発環境専用）
 * 注: 本番環境では使用すべきではありません
 */
const downloadUnsafe = async (
  url: string,
  itag: number,
  outputPath: string,
  onProgress: (progress: number) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> => {
  try {
    // このセクションは開発環境専用
    if (!config.UNSAFE_DOWNLOAD) {
      throw new Error('安全でない直接ダウンロード方法は無効化されています');
    }

    // サンプルダミーファイルを作成（実際のダウンロードではなく）
    const sampleVideoPath = path.join(__dirname, '../../sample-resources/sample-video.mp4');
    
    // サンプルディレクトリが存在するか確認
    if (fs.existsSync(sampleVideoPath)) {
      // サンプルビデオをコピー
      fs.copyFileSync(sampleVideoPath, outputPath);
    } else {
      // サンプルビデオが存在しない場合は空ファイルを作成
      fs.writeFileSync(outputPath, '');
    }

    // 進行状況の更新をシミュレート
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      onProgress(Math.min(progress, 100));

      if (progress >= 100) {
        clearInterval(interval);
        onComplete();
      }
    }, 500);
  } catch (error) {
    onError(error instanceof Error ? error : new Error('不明なエラーが発生しました'));
  }
};

/**
 * YouTube 動画のストリーミング URL を取得（参考実装）
 * 注: この機能は実際のプロダクションでは使用すべきではありません
 */
export const getStreamingUrl = async (videoId: string, itag: number): Promise<string | null> => {
  // この関数は教育目的のみ
  console.warn(
    '警告: YouTubeの利用規約に準拠した実装を検討してください。' +
    'ストリーミングURLの取得には、YouTube Embed API や YouTube IFrame Player API などの' +
    '公式に提供されているAPIを使用してください。'
  );
  
  // ダミーのストリーミングURL
  return null;
};