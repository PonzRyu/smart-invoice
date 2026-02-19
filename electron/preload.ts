/**
 * Electron プリロードスクリプト
 * セキュリティのため contextIsolation を有効にし、
 * レンダラープロセスに公開する API をここで定義
 */

import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
});
