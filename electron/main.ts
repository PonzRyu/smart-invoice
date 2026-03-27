/**
 * Electron メインプロセス
 * - 開発時: Next dev server (http://localhost:3000) をロード
 * - 本番時: Next server (http://localhost:3000) をロード
 */

import { app, BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  const options: BrowserWindowConstructorOptions = {
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    title: 'AIMS SaaS INVOICE - 請求書自動生成システム',
    icon: path.join(__dirname, '../public/favicon.png'),
  };

  const win = new BrowserWindow(options);

  // NOTE:
  // Next.js はファイルロードよりHTTPサーバー提供が基本なので、
  // 本番でも `next start` (または同等) によりURLをロードします。
  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    win.loadURL('http://localhost:3000');
  }

  win.once('ready-to-show', () => {
    win.show();
  });
}

// 自己署名証明書などの証明書エラーを無視
app.commandLine.appendSwitch('ignore-certificate-errors');

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
