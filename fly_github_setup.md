# Fly.io と GitHub の連携方法

このドキュメントでは、Fly.io にバックエンドアプリケーションをデプロイするための GitHub Actions のセットアップ方法を説明します。

## 1. Fly.io アカウントを作成する

まだ Fly.io のアカウントをお持ちでない場合は、[Fly.io のサインアップページ](https://fly.io/app/sign-up)でアカウントを作成してください。

## 2. Fly CLI をインストールする

ローカル開発環境に Fly CLI をインストールします：

**MacOS または Linux**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows（PowerShell）**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

## 3. Fly.io にログインする

```bash
fly auth login
```

## 4. 初期設定（初回のみ）

プロジェクトディレクトリで以下のコマンドを実行して、Fly.io アプリケーションを初期化します：

```bash
cd video-craft-server
fly launch
```

対話式のセットアップが開始されるので、以下の手順に従ってください：
- アプリ名を入力（例：video-craft-server）
- リージョンを選択（例：Tokyo (nrt)）
- 必要に応じてPostgreSQLやRedisなどのデータベースをセットアップ
- デプロイはまだ行わない（Nを選択）

## 5. APIトークンを取得する

GitHub Actionsからデプロイするために必要なAPIトークンを取得します：

```bash
fly auth token
```

表示されたトークンをコピーしてください。

## 6. GitHub Secretsの設定

リポジトリのSettings > Secrets and variables > Actionsで、以下のシークレットを追加します：

- `FLY_API_TOKEN`: 先ほどコピーしたFly.ioのAPIトークン

## 7. アプリケーションの初期デプロイ（オプション）

ワークフローをテストする前に、初回のデプロイを手動で行うこともできます：

```bash
fly deploy
```

これで、GitHub Actionsを使用してFly.ioにバックエンドを自動デプロイするための設定が完了しました。