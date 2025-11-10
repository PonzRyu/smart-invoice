import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CreateInvoicePage } from './pages/CreateInvoicePage';
import { CustomerManagementPage } from './pages/CustomerManagementPage';
import { IssueInvoicePage } from './pages/IssueInvoicePage';

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
        <Route path="/IssueInvoice" element={<IssueInvoicePage />} />
        <Route path="/Customers" element={<CustomerManagementPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
