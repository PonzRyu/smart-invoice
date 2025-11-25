module.exports = {
  apps: [
    {
      name: 'smart-invoice-backend',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 環境変数ファイルのパス（.envファイルを使用する場合）
      env_file: '.env',
      // ログ設定
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 自動再起動設定
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // クラッシュ時の再起動設定
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],
};
