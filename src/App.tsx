import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CreateInvoicePage } from './pages/CreateInvoicePage';

/**
 * メインアプリケーションコンポーネント
 * 請求書生成システムのルートコンポーネント
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/CreateInvoice" element={<CreateInvoicePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
