import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TopBar } from '../parts/TopBar';
import { NavigationRail } from '../parts/NavigationRail';
import { BottomBar } from '../parts/BottomBar';
import arrowBackIcon from '../styles/raws/list_arrow_back_raw.svg';
import arrowNextIcon from '../styles/raws/list_arrow_next_raw.svg';
import arrowDropDownIcon from '../styles/raws/arrow_drop_down_raw.svg';
import downloadIcon from '../styles/raws/download_raw.svg';
import questionIcon from '../styles/raws/question_raw.svg';
import calendarIcon from '../styles/raws/calender_raw.svg';
import { generateInvoiceExcel } from '../utils/excelGenerator';
import templateUrl from '../assets/invoice_template.xlsx?url';
import '../styles/styles.css';

interface Customer {
  id: number;
  company_name: string;
  company_code: string;
  si_partner_name: string;
  currency: string;
  unit_price: number;
}

interface IssuedInvoice {
  id: number;
  company_code: string;
  company_name: string;
  issued_date: string;
  invoice_code: number;
  currency: string;
  ttm: number | null;
}

export const IssueInvoicePage = () => {
  const location = useLocation();
  const preselectedCompanyCode = (
    location.state as { companyCode?: string } | null
  )?.companyCode;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCompanyCode, setSelectedCompanyCode] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [issuedInvoices, setIssuedInvoices] = useState<IssuedInvoice[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [excessBillingMap, setExcessBillingMap] = useState<
    Record<number, boolean>
  >({});
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<
    number | null
  >(null);
  const [isBillingDateDialogOpen, setIsBillingDateDialogOpen] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<IssuedInvoice | null>(
    null
  );
  const [billingDate, setBillingDate] = useState<string>('');
  const [paymentDeadline, setPaymentDeadline] = useState<string>('');

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoadingCustomers(true);
      try {
        const response = await fetch('http://localhost:3001/api/customers');
        if (!response.ok) {
          throw new Error('顧客情報の取得に失敗しました。');
        }
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '顧客情報の取得に失敗しました。'
        );
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  const fetchIssuedInvoices = useCallback(async (companyCode: string) => {
    setIsLoadingInvoices(true);
    setErrorMessage('');
    try {
      const response = await fetch(
        `http://localhost:3001/api/issued-invoices?companyCode=${encodeURIComponent(
          companyCode
        )}`
      );

      if (!response.ok) {
        throw new Error('請求書情報の取得に失敗しました。');
      }

      const data: IssuedInvoice[] = await response.json();
      const normalizedData = data.map((invoice) => ({
        ...invoice,
        ttm:
          invoice.ttm !== null && invoice.ttm !== undefined
            ? Number(invoice.ttm)
            : null,
      }));

      setIssuedInvoices(normalizedData);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '請求書情報の取得に失敗しました。'
      );
      setIssuedInvoices([]);
    } finally {
      setIsLoadingInvoices(false);
    }
  }, []);

  const handleCustomerChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const companyCode = event.target.value;
    setSelectedCompanyCode(companyCode);
    setCurrentPage(1);

    if (companyCode === '') {
      setSelectedCustomer(null);
      setIssuedInvoices([]);
      return;
    }

    const customer = customers.find(
      (item) => item.company_code === companyCode
    );
    setSelectedCustomer(customer ?? null);
    fetchIssuedInvoices(companyCode);
  };
  useEffect(() => {
    if (!preselectedCompanyCode || customers.length === 0) {
      return;
    }
    const companyCode = preselectedCompanyCode;
    setSelectedCompanyCode(companyCode);
    const customer = customers.find(
      (item) => item.company_code === companyCode
    );
    setSelectedCustomer(customer ?? null);
    fetchIssuedInvoices(companyCode);
  }, [customers, fetchIssuedInvoices, preselectedCompanyCode]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = (totalPages: number) => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = Number(event.target.value);
    setRowsPerPage(value);
    setCurrentPage(1);
  };

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return issuedInvoices.slice(startIndex, endIndex);
  }, [currentPage, rowsPerPage, issuedInvoices]);

  const totalPages = useMemo(() => {
    if (issuedInvoices.length === 0) {
      return 1;
    }
    return Math.ceil(issuedInvoices.length / rowsPerPage);
  }, [issuedInvoices.length, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setExcessBillingMap((prev) => {
      const updated: Record<number, boolean> = {};
      issuedInvoices.forEach((invoice) => {
        updated[invoice.id] = prev[invoice.id] ?? false;
      });
      return updated;
    });
  }, [issuedInvoices]);

  const handleToggleExcessBilling = (invoiceId: number) => {
    setExcessBillingMap((prev) => {
      const nextValue = !(prev[invoiceId] ?? false);
      const nextMap = { ...prev, [invoiceId]: nextValue };
      return nextMap;
    });
  };

  const handleDownloadInvoice = (invoice: IssuedInvoice) => {
    if (downloadingInvoiceId !== null) {
      return; // 既にダウンロード処理中
    }

    // 前月の末日をデフォルト値として設定（請求日時）
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0); // 前月の末日
    const year = lastMonth.getFullYear();
    const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
    const day = String(lastMonth.getDate()).padStart(2, '0');
    setBillingDate(`${year}-${month}-${day}`);

    // 翌月の末日をデフォルト値として設定（支払期限）
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0); // 翌月の末日
    const nextYear = nextMonth.getFullYear();
    const nextMonthNum = String(nextMonth.getMonth() + 1).padStart(2, '0');
    const nextDay = String(nextMonth.getDate()).padStart(2, '0');
    setPaymentDeadline(`${nextYear}-${nextMonthNum}-${nextDay}`);

    setPendingInvoice(invoice);
    setIsBillingDateDialogOpen(true);
  };

  const handleBillingDateDialogCancel = () => {
    setIsBillingDateDialogOpen(false);
    setPendingInvoice(null);
    setBillingDate('');
    setPaymentDeadline('');
  };

  const handleBillingDateDialogConfirm = async () => {
    if (!pendingInvoice || !billingDate || !paymentDeadline) {
      return;
    }

    setDownloadingInvoiceId(pendingInvoice.id);
    setIsBillingDateDialogOpen(false);
    setErrorMessage('');

    try {
      // 店舗別明細データを取得
      const storeSummaryResponse = await fetch(
        `http://localhost:3001/api/store-summaries?companyCode=${encodeURIComponent(
          pendingInvoice.company_code
        )}&issuedDate=${encodeURIComponent(pendingInvoice.issued_date)}`
      );

      if (!storeSummaryResponse.ok) {
        throw new Error('店舗別明細データの取得に失敗しました。');
      }

      const storeSummaries = await storeSummaryResponse.json();

      // 選択された日付をDateオブジェクトに変換
      const selectedBillingDate = new Date(billingDate);
      const selectedPaymentDeadline = new Date(paymentDeadline);

      // Excelファイルを生成してダウンロード
      await generateInvoiceExcel(
        templateUrl,
        {
          invoiceCode: pendingInvoice.invoice_code,
          issuedDate: pendingInvoice.issued_date,
          companyName: pendingInvoice.company_name,
          siPartnerName: selectedCustomer?.si_partner_name ?? '',
          ttm: pendingInvoice.ttm,
          billingDate: selectedBillingDate,
          paymentDeadline: selectedPaymentDeadline,
        },
        storeSummaries,
        selectedCustomer?.unit_price!,
        selectedCustomer?.currency!
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '請求書のダウンロードに失敗しました。'
      );
    } finally {
      setDownloadingInvoiceId(null);
      setPendingInvoice(null);
      setBillingDate('');
      setPaymentDeadline('');
    }
  };

  const startIndex =
    issuedInvoices.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex =
    issuedInvoices.length === 0
      ? 0
      : Math.min(currentPage * rowsPerPage, issuedInvoices.length);

  return (
    <div className="page">
      <div className="content">
        <div className="issue-invoice-container">
          <div className="issue-invoice-action-bar">
            <div className="issue-invoice-selector">
              <select
                className={`form-select issue-invoice-select ${
                  selectedCompanyCode === '' ? 'placeholder' : ''
                }`}
                value={selectedCompanyCode}
                onChange={handleCustomerChange}
                disabled={isLoadingCustomers}
              >
                <option value="" disabled>
                  顧客を選択してください
                </option>
                {customers.map((customer) => (
                  <option
                    key={customer.company_code}
                    value={customer.company_code}
                  >
                    {customer.company_name}({customer.company_code})
                  </option>
                ))}
              </select>
            </div>
            {selectedCompanyCode &&
              issuedInvoices.length > 0 &&
              !isLoadingInvoices && (
                <div className="issue-invoice-toolbar">
                  <div className="pagination-controls">
                    <div className="rows-per-page">
                      <span className="pagination-label">Rows per page:</span>
                      <select
                        className="rows-per-page-select"
                        value={rowsPerPage}
                        onChange={handleRowsPerPageChange}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <img
                        src={arrowDropDownIcon}
                        alt=""
                        className="dropdown-icon"
                      />
                    </div>
                    <div className="pagination-info">
                      {startIndex}-{endIndex} of {issuedInvoices.length}
                    </div>
                    <div className="pagination-buttons">
                      <button
                        className="pagination-button"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        <img
                          src={arrowBackIcon}
                          alt="前へ"
                          className="pagination-arrow"
                        />
                      </button>
                      <button
                        className="pagination-button"
                        onClick={() => handleNextPage(totalPages)}
                        disabled={currentPage >= totalPages}
                      >
                        <img
                          src={arrowNextIcon}
                          alt="次へ"
                          className="pagination-arrow"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
          </div>

          {errorMessage && (
            <div className="issue-invoice-error">{errorMessage}</div>
          )}

          {selectedCompanyCode &&
            !isLoadingInvoices &&
            issuedInvoices.length === 0 &&
            !errorMessage && (
              <div className="issue-invoice-empty">
                請求書データがありません。
                <br />
                請求書作成ページから請求書を作成してください。
              </div>
            )}

          {isLoadingInvoices && (
            <div className="loading-container issue-invoice-loading">
              <div className="loading-spinner"></div>
              <div className="loading-text">読み込み中...</div>
            </div>
          )}

          {selectedCompanyCode &&
            issuedInvoices.length > 0 &&
            !isLoadingInvoices && (
              <>
                <div className="issue-invoice-excess-description">
                  <span className="issue-invoice-required-marker">*</span>
                  商品更新数110%超過分を請求します。
                </div>
                <div className="customer-list issue-invoice-list">
                  <div className="customer-list-header issue-invoice-header">
                    <div className="customer-list-cell issue-invoice-cell">
                      利用年月
                    </div>
                    <div className="customer-list-cell issue-invoice-cell">
                      請求書番号
                    </div>
                    <div className="customer-list-cell issue-invoice-cell">
                      通貨単位
                    </div>
                    <div className="customer-list-cell issue-invoice-cell">
                      公表仲値(TTM)
                    </div>
                    <div
                      className="customer-list-cell issue-invoice-cell issue-invoice-cell-toggle"
                      title="商品更新数110%超過分を請求します。"
                    >
                      超過利用分の請求
                      <span className="issue-invoice-required-marker issue-invoice-required-marker--inline">
                        *
                      </span>
                    </div>
                    <div className="customer-list-cell issue-invoice-cell">
                      ダウンロード
                    </div>
                  </div>
                  {paginatedInvoices.map((invoice) => (
                    <div
                      className="customer-list-row issue-invoice-row"
                      key={invoice.id}
                    >
                      <div className="customer-list-cell issue-invoice-cell">
                        {invoice.issued_date}
                      </div>
                      <div className="customer-list-cell issue-invoice-cell">
                        {invoice.invoice_code}
                      </div>
                      <div className="customer-list-cell issue-invoice-cell">
                        {selectedCustomer?.currency ?? invoice.currency}
                      </div>
                      <div className="customer-list-cell issue-invoice-cell">
                        {invoice.ttm !== null ? invoice.ttm.toFixed(2) : '-'}
                      </div>
                      <div
                        className="customer-list-cell issue-invoice-cell issue-invoice-cell-toggle"
                        title="商品更新数110%超過分を請求します。"
                      >
                        <label className="toggle-switch toggle-switch-small">
                          <input
                            type="checkbox"
                            checked={excessBillingMap[invoice.id] ?? false}
                            onChange={() =>
                              handleToggleExcessBilling(invoice.id)
                            }
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="customer-list-cell issue-invoice-cell">
                        <button
                          type="button"
                          className="action-icon-button"
                          title="請求書をダウンロード"
                          onClick={() => handleDownloadInvoice(invoice)}
                          disabled={downloadingInvoiceId === invoice.id}
                        >
                          <img
                            src={downloadIcon}
                            alt="ダウンロード"
                            className="action-icon"
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>
      </div>
      <TopBar headline="請求書発行" />
      <NavigationRail />
      <BottomBar />

      {/* 請求日時選択ダイアログ */}
      {isBillingDateDialogOpen && (
        <div
          className="confirm-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleBillingDateDialogCancel();
            }
          }}
        >
          <div className="confirm-modal">
            <div className="confirm-modal__icon confirm-modal__icon--confirm">
              <img src={questionIcon} alt="確認" />
            </div>
            <div className="confirm-modal__body">
              <p className="confirm-modal__message">日付を選択してください。</p>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label
                  htmlFor="billing-date-input"
                  className="form-label required"
                >
                  請求日時
                </label>
                <div className="date-input-wrapper">
                  <input
                    id="billing-date-input"
                    type="date"
                    className="form-input"
                    value={billingDate}
                    onChange={(e) => setBillingDate(e.target.value)}
                    required
                  />
                  <img
                    src={calendarIcon}
                    alt="カレンダー"
                    className="date-icon"
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label
                  htmlFor="payment-deadline-input"
                  className="form-label required"
                >
                  支払期限
                </label>
                <div className="date-input-wrapper">
                  <input
                    id="payment-deadline-input"
                    type="date"
                    className="form-input"
                    value={paymentDeadline}
                    onChange={(e) => setPaymentDeadline(e.target.value)}
                    required
                  />
                  <img
                    src={calendarIcon}
                    alt="カレンダー"
                    className="date-icon"
                  />
                </div>
              </div>
            </div>
            <div className="confirm-modal__actions">
              <button
                type="button"
                className="btn btn-cancel"
                onClick={handleBillingDateDialogCancel}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="btn btn-submit"
                onClick={handleBillingDateDialogConfirm}
                disabled={!billingDate || !paymentDeadline}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
