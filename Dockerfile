# バックエンド用Dockerfile
FROM node:18-slim AS builder

# アプリディレクトリを作成
WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./

# 開発依存関係も含めてインストール（ビルドに必要）
RUN npm ci

# アプリケーションのソースをコピー
COPY . .

# TypeScriptをJavaScriptにビルド
RUN npm run build

# 本番用イメージ
FROM node:18-slim

WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./

# 本番用依存関係のみをインストール
RUN npm ci --only=production

# ビルド済みのアプリケーションをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public

# 必要なディレクトリを作成し、権限を設定
RUN mkdir -p public/uploads/temp public/uploads/downloads public/uploads/outputs \
    && chmod -R 777 public/uploads \
    && ls -la public/uploads  # デバッグ用

# 環境変数の設定
ENV PORT=8080
ENV NODE_ENV=production

# デバッグ用：起動時にディレクトリ内容とポートリスニング状態を表示
CMD echo "Directory listing:" && ls -la && \
    echo "Public directory:" && ls -la public && \
    echo "Uploads directory:" && ls -la public/uploads && \
    echo "Starting application on port $PORT" && \
    node dist/bin/www.js

# 使用するポートを指定
EXPOSE 8080