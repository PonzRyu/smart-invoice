/// <reference types="vite/client" />

/** Electron デスクトップアプリ実行時の API（プリロードから公開） */
interface ElectronAPI {
  isElectron: true;
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

