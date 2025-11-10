import { useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from '../parts/TopBar';
import { NavigationRail } from '../parts/NavigationRail';
import { BottomBar } from '../parts/BottomBar';
import fileCsvIcon from '../styles/raws/file_csv_raw.svg';
import linkIcon from '../styles/raws/link_raw.svg';
import questionIcon from '../styles/raws/question_raw.svg';
import '../styles/styles.css';

/**
 * 顧客情報の型
 */
interface Customer {
  id: number;
  company_name: string;
  company_code: string;
  currency: string;
}

/**
 * 請求書作成ページコンポーネント
 * 請求書作成に必要な情報を入力するフォーム
 */
export const CreateInvoicePage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 顧客情報
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customerFetchError, setCustomerFetchError] = useState<string | null>(
    null
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // フォームの状態管理
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [tts, setTts] = useState('');
  const [ttb, setTtb] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 選択中の顧客情報
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return undefined;
    const parsedId = Number(selectedCustomerId);
    return customers.find((customer) => customer.id === parsedId);
  }, [customers, selectedCustomerId]);

  const selectedCustomerDisplayName = useMemo(() => {
    if (!selectedCustomer) return '';
    return `${selectedCustomer.company_name}(${selectedCustomer.company_code})`;
  }, [selectedCustomer]);

  const isExchangeRateDisabled =
    selectedCustomer !== undefined && selectedCustomer.currency !== '$';
  const isExchangeRateRequired =
    selectedCustomer !== undefined && selectedCustomer.currency === '$';

  // 顧客情報の取得
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoadingCustomers(true);
      setCustomerFetchError(null);
      try {
        const response = await fetch('http://localhost:3001/api/customers');
        if (!response.ok) {
          throw new Error('顧客情報の取得に失敗しました。');
        }
        const data: Customer[] = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setCustomerFetchError(
          error instanceof Error
            ? error.message
            : '顧客情報の取得中に予期せぬエラーが発生しました。'
        );
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  // 為替入力不可の場合は値をリセット
  useEffect(() => {
    if (isExchangeRateDisabled) {
      setTts('');
      setTtb('');
    }
  }, [isExchangeRateDisabled]);

  // 公表仲値(TTM)の計算
  const calculateTtm = (): string => {
    if (isExchangeRateDisabled) {
      return '';
    }

    const ttsValue = parseFloat(tts);
    const ttbValue = parseFloat(ttb);
    if (!isNaN(ttsValue) && !isNaN(ttbValue)) {
      const ttmValue = (ttsValue + ttbValue) / 2;
      return ttmValue.toFixed(2);
    }
    return '';
  };

  // 必須項目がすべて入力されているかチェック
  const isFormValid =
    selectedCustomerId !== '' &&
    year !== '' &&
    month !== '' &&
    uploadedFile !== null &&
    (isExchangeRateDisabled
      ? true
      : tts.trim() !== '' &&
        ttb.trim() !== '' &&
        !isNaN(parseFloat(tts)) &&
        !isNaN(parseFloat(ttb)));

  // フォームのリセット
  const resetForm = () => {
    setSelectedCustomerId('');
    setYear('');
    setMonth('');
    setTts('');
    setTtb('');
    setTtb('');
    setUploadedFile(null);
    setIsConfirmModalOpen(false);
    setIsSubmitting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // キャンセルボタンのハンドラー
  const handleCancel = () => {
    resetForm();
  };

  // ファイル選択ハンドラー
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        setUploadedFile(file);
      } else {
        alert('.csvファイルのみアップロード可能です。');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
    // ファイルが選択されていない場合（キャンセル）は何もしない
  };

  // ドラッグ&ドロップハンドラー
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        setUploadedFile(file);
      } else {
        alert('.csvファイルのみアップロード可能です。');
      }
    }
    // ファイルがドロップされていない場合は何もしない
  };

  // 登録ボタンのハンドラー
  const handleSubmit = () => {
    if (!isFormValid) {
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // 確認モーダル: キャンセル
  const handleModalCancel = () => {
    setIsConfirmModalOpen(false);
  };

  // 確認モーダル: 続行
  const handleModalConfirm = async () => {
    if (!uploadedFile || !selectedCustomer) {
      return;
    }

    try {
      setIsSubmitting(true);
      // TODO: 次ステップの仕様に基づき実際の登録処理を実装する
      console.log('登録データ:', {
        customer: {
          id: selectedCustomer.id,
          name: selectedCustomerDisplayName,
          currency: selectedCustomer.currency,
        },
        year,
        month,
        exchangeRate:
          selectedCustomer.currency === '$'
            ? { tts, ttb, ttm: calculateTtm() }
            : null,
        uploadedFileName: uploadedFile.name,
      });
      alert('登録が完了しました。');
      resetForm();
    } catch (error) {
      console.error('Error submitting invoice data:', error);
      alert('登録処理に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerChange = (value: string) => {
    setSelectedCustomerId(value);
  };

  return (
    <div className="page">
      <div className="content">
        <div className="create-invoice-form">
          {isLoadingCustomers && (
            <div className="form-status-message info">
              顧客情報を読み込んでいます...
            </div>
          )}
          {customerFetchError && (
            <div className="form-status-message error">
              {customerFetchError}
            </div>
          )}

          {/* 利用顧客名 */}
          <div className="form-group">
            <label className="form-label required">利用顧客名</label>
            <select
              className={`form-select ${selectedCustomerId === '' ? 'placeholder' : ''}`}
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              required
              disabled={isLoadingCustomers || !!customerFetchError}
            >
              <option value="" disabled>
                利用顧客を選択してください
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id.toString()}>
                  {customer.company_name}({customer.company_code})
                </option>
              ))}
            </select>
            {selectedCustomer && (
              <div className="form-hint">通貨：{selectedCustomer.currency}</div>
            )}
          </div>

          {/* 利用年月 */}
          <div className="form-group">
            <label className="form-label required">利用年月</label>
            <div className="date-input-group">
              <select
                className={`form-select date-select ${year === '' ? 'placeholder' : ''}`}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
              >
                <option value="" disabled>
                  選択する
                </option>
                {Array.from({ length: 6 }, (_, i) => 2025 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="date-separator">年</span>
              <select
                className={`form-select date-select ${month === '' ? 'placeholder' : ''}`}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
              >
                <option value="" disabled>
                  選択する
                </option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="date-separator">月</span>
            </div>
          </div>

          {/* 為替レート */}
          <div className="form-group">
            <div className="form-label-with-link">
              <label
                className={`form-label ${
                  isExchangeRateRequired ? 'required' : ''
                }`}
              >
                為替レート
              </label>
              <a
                href="https://www.murc-kawasesouba.jp/fx/past_3month.php"
                target="_blank"
                rel="noopener noreferrer"
                className="exchange-rate-link"
              >
                <img src={linkIcon} alt="リンク" className="link-icon" />
                三菱UFJ公表値
              </a>
            </div>
            <div className="exchange-rate-group">
              <div className="exchange-rate-item">
                <label className="exchange-rate-label">電信売相場(TTS)</label>
                <input
                  type="number"
                  className="form-input"
                  value={tts}
                  onChange={(e) => setTts(e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  required={isExchangeRateRequired}
                  disabled={isExchangeRateDisabled}
                />
              </div>
              <div className="exchange-rate-item">
                <label className="exchange-rate-label">電信買相場(TTB)</label>
                <input
                  type="number"
                  className="form-input"
                  value={ttb}
                  onChange={(e) => setTtb(e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  required={isExchangeRateRequired}
                  disabled={isExchangeRateDisabled}
                />
              </div>
              <div className="exchange-rate-item">
                <label className="exchange-rate-label">公表仲値(TTM)</label>
                <input
                  type="text"
                  className="form-input form-input-readonly"
                  value={calculateTtm()}
                  readOnly
                  placeholder="自動計算"
                />
              </div>
            </div>
            {isExchangeRateDisabled && selectedCustomer && (
              <div className="exchange-rate-disabled-hint">
                選択した利用顧客の通貨単位が「$」ではないため、為替レートは入力できません。
              </div>
            )}
          </div>

          {/* 元データをアップロード */}
          <div className="form-group">
            <label className="form-label required">
              元データをアップロード
            </label>
            <div
              className={`file-upload-area ${isDragOver ? 'drag-over' : ''} ${
                uploadedFile ? 'has-file' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="file-input"
                style={{ display: 'none' }}
              />
              <div className="file-upload-content">
                {uploadedFile ? (
                  <>
                    <div className="file-icon">
                      <img src={fileCsvIcon} alt="CSVファイル" />
                    </div>
                    <div className="file-name">{uploadedFile.name}</div>
                  </>
                ) : (
                  <>
                    <div className="file-icon">
                      <img src={fileCsvIcon} alt="CSVファイル" />
                    </div>
                    <div className="file-upload-text">
                      ファイルを選択または、ドラッグアンドドロップしてください。
                    </div>
                    <div className="file-upload-hint">.csvファイルのみ</div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="form-required-note">
            <span className="required-asterisk">*</span>{' '}
            が付いている項目は必須項目です。
          </div>

          {/* ボタン */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-cancel"
              onClick={handleCancel}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="btn btn-submit"
              onClick={handleSubmit}
              disabled={!isFormValid}
            >
              登録
            </button>
          </div>
        </div>

        {isConfirmModalOpen && (
          <div
            className="confirm-modal-overlay"
            role="dialog"
            aria-modal="true"
          >
            <div className="confirm-modal">
              <div className="confirm-modal__icon">
                <img src={questionIcon} alt="確認" />
              </div>
              <div className="confirm-modal__body">
                <p className="confirm-modal__message">
                  以下の内容で登録します。よろしいですか？
                  <br />
                  重複データは上書きされます。
                </p>
                <ul className="confirm-modal__summary">
                  <li className="confirm-modal__summary-item">
                    <span className="summary-label">利用顧客名</span>
                    <span className="summary-value">
                      {selectedCustomerDisplayName || '未選択'}
                    </span>
                  </li>
                  <li className="confirm-modal__summary-item">
                    <span className="summary-label">利用年月</span>
                    <span className="summary-value">
                      {year && month ? `${year}年${month}月` : '-'}
                    </span>
                  </li>
                  {selectedCustomer?.currency === '$' && (
                    <li className="confirm-modal__summary-item">
                      <span className="summary-label">為替レート(TTM)</span>
                      <span className="summary-value summary-value--single">
                        {calculateTtm() || '-'}
                      </span>
                    </li>
                  )}
                  <li className="confirm-modal__summary-item">
                    <span className="summary-label">元データ</span>
                    <span className="summary-value summary-value--file">
                      {uploadedFile?.name || '未選択'}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="confirm-modal__actions">
                <button
                  type="button"
                  className="btn btn-cancel"
                  onClick={handleModalCancel}
                  disabled={isSubmitting}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="btn btn-submit"
                  onClick={handleModalConfirm}
                  disabled={isSubmitting}
                >
                  続行
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <TopBar headline="請求書作成" />
      <NavigationRail />
      <BottomBar />
    </div>
  );
};
