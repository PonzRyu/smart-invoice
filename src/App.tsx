import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CreateInvoicePage } from './pages/CreateInvoicePage';
import { CustomerManagementPage } from './pages/CustomerManagementPage';
import { IssueInvoicePage } from './pages/IssueInvoicePage';

/** Electron デスクトップアプリかどうか（file:// では BrowserRouter が動作しないため HashRouter を使用） */
const isElectron =
  typeof window !== 'undefined' &&
  !!(window as unknown as { electronAPI?: { isElectron: boolean } }).electronAPI?.isElectron;
const Router = isElectron ? HashRouter : BrowserRouter;

/**
 * メインアプリケーションコンポーネント
 * 請求書生成システムのルートコンポーネント
 */
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/CreateInvoice" element={<CreateInvoicePage />} />
        <Route path="/IssueInvoice" element={<IssueInvoicePage />} />
        <Route path="/Customers" element={<CustomerManagementPage />} />
      </Routes>
    </Router>
  );
}

export default App;
