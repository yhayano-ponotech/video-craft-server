# Video Craft Server

Video Craftのバックエンドサーバーです。YouTubeからの動画ダウンロード、動画の変換、トリミング、スクリーンショット取得などの機能を提供します。このバージョンはTypeScriptで実装されています。

## 機能

- **YouTube動画のダウンロード**: YouTubeの動画をさまざまな形式でダウンロード
- **動画形式の変換**: MP4, MOV, AVI, MKV, WebM, GIF形式への変換
- **動画のトリミング**: 動画の必要な部分だけを切り取り
- **動画からの画像抽出**: 動画の特定のフレームをスクリーンショットとして保存

## 前提条件

- Node.js 14.x以上
- NPM 6.x以上
- FFmpeg（インストール不要、ffmpeg-staticパッケージによって自動的に提供されます）
## インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourname/video-craft-server.git
cd video-craft-server

# 依存関係をインストール
npm install

# 環境設定ファイルをコピー
cp .env.example .env

# 必要に応じて.envファイルを編集
```

## 起動方法

```bash
# TypeScriptコードをビルド
npm run build

# 開発モード（自動リロードあり）
npm run dev

# 本番モード（ビルド後のJSを実行）
npm start

# デバッグモード（詳細なログ出力あり）
npm run debug
```

サーバーは、デフォルトで http://localhost:4000 で起動します。

## APIエンドポイント

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/health` | GET | API健全性チェック |
| `/api/video/info` | GET | YouTube動画情報を取得 |
| `/api/video/download` | POST | YouTube動画ダウンロードを開始 |
| `/api/video/download/:id` | GET | ダウンロード状態を取得 |
| `/api/video/convert` | POST | 動画変換を開始 |
| `/api/video/convert/:id` | GET | 変換状態を取得 |
| `/api/video/trim` | POST | 動画トリミングを開始 |
| `/api/video/trim/:id` | GET | トリミング状態を取得 |
| `/api/video/screenshot` | POST | スクリーンショット取得を開始 |
| `/api/video/screenshot/:id` | GET | スクリーンショット状態を取得 |
| `/api/download` | GET | 処理されたファイルをダウンロード |

詳細なAPIドキュメントは、サーバー起動後にルートURL（`/`）で確認できます。

## フォルダ構造

```
video-toolbox-server/
├── src/                # ソースコード
│   ├── bin/            # 起動スクリプト
│   ├── config/         # 設定
│   ├── controllers/    # APIコントローラー
│   ├── routes/         # ルーティング
│   │   └── api/        # APIルーター
│   ├── services/       # ビジネスロジック
│   ├── types/          # 型定義
│   └── app.ts          # メインアプリケーション
├── dist/               # コンパイルされたJavaScriptコード
├── public/             # 静的ファイル
│   └── uploads/        # アップロード・出力ファイル
├── views/              # 表示テンプレート
└── tsconfig.json       # TypeScript設定
```

## TypeScriptの利点

- **型安全性**: コンパイル時に型エラーを検出
- **インテリジェンスな補完**: IDEでのコード補完が強化され開発効率が向上
- **ドキュメンテーション**: コードが自己文書化され、理解しやすい
- **リファクタリングのサポート**: 型情報を活用した安全なリファクタリング
- **インターフェースと抽象化**: より堅牢なコード設計が可能

## 設定

`.env`ファイルで次の環境変数を設定できます：

- `PORT`: サーバーのポート番号（デフォルト: 4000）
- `CORS_ORIGIN`: CORSの許可オリジン（デフォルト: すべて許可）
- `MAX_FILE_SIZE`: 最大ファイルサイズ（バイト、デフォルト: 500MB）
- `FILE_RETENTION_HOURS`: ファイル保持期間（時間、デフォルト: 24時間）

## デプロイ

このサーバーはFly.ioにデプロイすることを想定しています。

```bash
# TypeScriptをビルド
npm run build

# Fly.ioのCLIをインストール（初回のみ）
curl -L https://fly.io/install.sh | sh

# Fly.ioにログイン
fly auth login

# 新しいアプリを作成
fly launch

# デプロイ
fly deploy
```

## ライセンス

MIT

## 注意事項

このツールは個人的な学習目的での使用を想定しています。著作権で保護されたコンテンツのダウンロードには、適用される法律と規制に従ってください。