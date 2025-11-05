import { useState } from 'react';

/**
 * メインアプリケーションコンポーネント
 * 請求書生成システムのルートコンポーネント
 */
function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Smart Invoice</h1>
        <p>請求書生成プロセス最適化システム</p>
      </header>
      <main className="app-main">
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            カウント: {count}
          </button>
          <p>プロジェクトのセットアップが完了しました。</p>
        </div>
      </main>
    </div>
  );
}

export default App;
