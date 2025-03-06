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

# アプリケーションの起動
CMD [ "node", "dist/bin/www.js" ]

# 使用するポートを指定
EXPOSE 8080