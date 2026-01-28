import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse/papaparse.js';
import { TopBar } from '../parts/TopBar';
import { NavigationRail } from '../parts/NavigationRail';
import { BottomBar } from '../parts/BottomBar';
import fileCsvIcon from '../styles/raws/file_csv_raw.svg';
import linkIcon from '../styles/raws/link_raw.svg';
import questionIcon from '../styles/raws/question_raw.svg';
import warningIcon from '../styles/raws/warning_raw.svg';
import '../styles/styles.css';
import { fetchCustomers as fetchCustomerList } from '../services/customerService';
import {
  type UploadInvoiceRequest,
  uploadInvoiceSummaries,
} from '../services/invoiceService';

type ModalMode = 'confirm' | 'processing' | 'error' | 'success';

type ParsedCsvRow = Record<string, string | undefined>;

interface PreparedStoreSummary {
  day: string;
  company: string;
  store: string;
  name?: string;
  totalLabels: number;
  productUpdated: number;
}

interface ParseCsvResult {
  rows: ParsedCsvRow[];
  headers: string[];
}

interface UploadResult {
  invoiceCode: number;
  issuedDate: string;
}

const REQUIRED_HEADERS = [
  'Day',
  'Company',
  'Store',
  'Total Labels',
  'Product Updated',
];

const sanitizeNumber = (value: string): number => {
  const normalized = value.replace(/,/g, '').trim();
  if (normalized === '') {
    return Number.NaN;
  }
  return Number(normalized);
};

const parseCsvFile = (
  file: File,
  onProgress: (percent: number) => void
): Promise<ParseCsvResult> =>
  new Promise((resolve, reject) => {
    const rows: ParsedCsvRow[] = [];
    let headers: string[] = [];
    Papa.parse<ParsedCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'utf-8',
      chunkSize: 1024 * 1024,
      chunk: (results: Papa.ParseResult<ParsedCsvRow>) => {
        if (headers.length === 0 && Array.isArray(results.meta.fields)) {
          headers = results.meta.fields;
        }
        rows.push(...results.data);
        const cursor = results.meta.cursor;
        if (typeof cursor === 'number' && file.size > 0) {
          const percent = Math.min(70, Math.round((cursor / file.size) * 70));
          onProgress(percent);
        }
      },
      complete: () => {
        onProgress(75);
        resolve({
          rows,
          headers,
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });

const validateAndTransformCsv = (
  headers: string[],
  rows: ParsedCsvRow[],
  selectedCompanyCode: string,
  issuedMonth: string
): { records: PreparedStoreSummary[] } | { errorMessages: string[] } => {
  const normalizedHeaders = headers.map((header) => header.trim());
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !normalizedHeaders.includes(header)
  );

  if (missingHeaders.length > 0) {
    return {
      errorMessages: [
        'お客様利用データが不正です。お客様利用データの中身をご確認ください。',
        `${missingHeaders.join(', ')}データが存在しません。`,
      ],
    };
  }

  const records: PreparedStoreSummary[] = [];
  const companies = new Set<string>();

  for (const row of rows) {
    const dayRaw = (row['Day'] ?? '').trim();
    const companyRaw = (row['Company'] ?? '').trim();
    const storeRaw = (row['Store'] ?? '').trim();
    const nameRaw = (row['Name'] ?? '').trim();
    const totalLabelsRaw = (row['Total Labels'] ?? '').trim();
    const productUpdatedRaw = (row['Product Updated'] ?? '').trim();

    // 空行はスキップ
    if (
      dayRaw === '' &&
      companyRaw === '' &&
      storeRaw === '' &&
      totalLabelsRaw === '' &&
      productUpdatedRaw === ''
    ) {
      continue;
    }

    if (dayRaw === '' || companyRaw === '' || storeRaw === '') {
      return {
        errorMessages: [
          'お客様利用データが不正です。お客様利用データの中身をご確認ください。',
          'Day, Company, Storeのいずれかが欠損している行があります。',
        ],
      };
    }

    const normalizedDay = dayRaw.replace(/\//g, '-');
    if (normalizedDay.length < 10) {
      return {
        errorMessages: [
          'お客様利用データが不正です。お客様利用データの中身をご確認ください。',
          'Dayの形式が不正な行があります。',
        ],
      };
    }

    const dayMonth = normalizedDay.slice(0, 7);
    if (dayMonth !== issuedMonth) {
      return {
        errorMessages: [
          '利用年月が正しくありません。',
          'お客様利用データの中身を確認して正しい利用年月を指定してください。',
        ],
      };
    }

    const totalLabels = sanitizeNumber(totalLabelsRaw);
    const productUpdated = sanitizeNumber(productUpdatedRaw);

    if (Number.isNaN(totalLabels) || Number.isNaN(productUpdated)) {
      return {
        errorMessages: [
          'お客様利用データが不正です。お客様利用データの中身をご確認ください。',
          'Total LabelsまたはProduct Updatedに数値以外の値が含まれています。',
        ],
      };
    }

    const nameValue = nameRaw === '' ? undefined : nameRaw;

    records.push({
      day: normalizedDay,
      company: companyRaw,
      store: storeRaw,
      name: nameValue,
      totalLabels,
      productUpdated,
    });
    companies.add(companyRaw);
  }

  if (records.length === 0) {
    return {
      errorMessages: ['お客様利用データに有効なレコードが存在しません。'],
    };
  }

  if (companies.size !== 1) {
    return {
      errorMessages: [
        'お客様利用データが不正です。お客様利用データの中身をご確認ください。',
        'お客様利用データに複数の顧客(Company)が含まれています。お客様利用データは必ず1つの顧客を指定して出力してください。',
      ],
    };
  }

  const [csvCompany] = Array.from(companies);

  if (csvCompany !== selectedCompanyCode) {
    return {
      errorMessages: [
        '利用顧客名とお客様利用データの顧客名が一致しないです。',
        'お客様利用データの中身をご確認ください。',
        `利用顧客名：${selectedCompanyCode}`,
        `お客様利用データー：${csvCompany}`,
      ],
    };
  }

  return { records };
};

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
  const navigate = useNavigate();
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
  const [modalMode, setModalMode] = useState<ModalMode>('confirm');
  const [modalMessages, setModalMessages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadProgressLabel, setUploadProgressLabel] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

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
        const data = await fetchCustomerList();
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
  }, [fetchCustomerList]);

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
  const closeModal = () => {
    setIsConfirmModalOpen(false);
    setModalMode('confirm');
    setModalMessages([]);
    setUploadProgress(0);
    setUploadProgressLabel('');
    setUploadResult(null);
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setYear('');
    setMonth('');
    setTts('');
    setTtb('');
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    closeModal();
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
    setModalMode('confirm');
    setModalMessages([]);
    setUploadProgress(0);
    setUploadProgressLabel('');
    setUploadResult(null);
    setIsSubmitting(false);
    setIsConfirmModalOpen(true);
  };

  // 確認モーダル: キャンセル
  const handleModalCancel = () => {
    if (modalMode === 'processing') {
      return;
    }
    closeModal();
  };

  const handleSuccessNavigate = () => {
    if (!selectedCustomer) {
      closeModal();
      return;
    }

    const targetCompanyCode = selectedCustomer.company_code;
    resetForm();
    navigate('/IssueInvoice', { state: { companyCode: targetCompanyCode } });
  };

  // 確認モーダル: 続行
  const handleModalConfirm = async () => {
    if (!uploadedFile || !selectedCustomer) {
      return;
    }

    const issuedMonth = `${year}-${month.padStart(2, '0')}`;

    try {
      setModalMode('processing');
      setIsSubmitting(true);
      setModalMessages([]);
      setUploadProgress(5);
      setUploadProgressLabel('CSVを解析しています...');

      const parseResult = await parseCsvFile(uploadedFile, (percent) => {
        setUploadProgress(percent);
        setUploadProgressLabel('CSVを解析しています...');
      });

      const validationResult = validateAndTransformCsv(
        parseResult.headers,
        parseResult.rows,
        selectedCustomer.company_code,
        issuedMonth
      );

      if ('errorMessages' in validationResult) {
        setModalMode('error');
        setModalMessages(validationResult.errorMessages);
        setUploadProgress(0);
        setUploadProgressLabel('');
        return;
      }

      setUploadProgress((prev) => Math.max(prev, 80));
      setUploadProgressLabel('サーバーにデータを送信しています...');

      const ttmString = calculateTtm();
      const ttmValue =
        selectedCustomer.currency === '$' && ttmString !== ''
          ? Number(ttmString)
          : null;

      const payload: UploadInvoiceRequest = {
        companyId: selectedCustomer.id,
        companyCode: selectedCustomer.company_code,
        companyName: selectedCustomer.company_name,
        issuedDate: issuedMonth,
        currency: selectedCustomer.currency,
        ttm: ttmValue,
        summaries: validationResult.records,
      };

      const result = await uploadInvoiceSummaries(payload);

      setUploadProgress(100);
      setUploadProgressLabel('アップロードが完了しました。');
      setUploadResult({
        invoiceCode: result.invoice.invoice_code,
        issuedDate: result.invoice.issued_date,
      });
      setModalMode('success');
    } catch (error) {
      console.error('Error submitting invoice data:', error);
      const fallbackMessages =
        error instanceof Error
          ? ['ファイルの処理中にエラーが発生しました。', error.message]
          : ['ファイルの処理中に予期せぬエラーが発生しました。'];
      setModalMode('error');
      setModalMessages(fallbackMessages);
      setUploadProgress(0);
      setUploadProgressLabel('');
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

          {/* お客様利用データをアップロード */}
          <div className="form-group">
            <label className="form-label required">
              お客様利用データをアップロード
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
            <div className={`confirm-modal confirm-modal--${modalMode}`}>
              <div
                className={`confirm-modal__icon confirm-modal__icon--${modalMode}`}
              >
                <img
                  src={modalMode === 'error' ? warningIcon : questionIcon}
                  alt={modalMode === 'error' ? '警告' : '確認'}
                />
              </div>
              <div className="confirm-modal__body">
                {modalMode === 'confirm' && (
                  <>
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
                        <span className="summary-label">お客様利用データ</span>
                        <span className="summary-value summary-value--file">
                          {uploadedFile?.name || '未選択'}
                        </span>
                      </li>
                    </ul>
                  </>
                )}
                {modalMode === 'processing' && (
                  <div className="confirm-modal__progress">
                    <div className="progress-gauge">
                      <div
                        className="progress-gauge__bar"
                        style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                      ></div>
                    </div>
                    <div className="confirm-modal__progress-label">
                      {uploadProgressLabel || '処理中...'}
                    </div>
                  </div>
                )}
                {modalMode === 'error' && (
                  <div className="confirm-modal__error">
                    {modalMessages.map((message, index) => (
                      <p
                        key={`${message}-${index}`}
                        className="confirm-modal__error-line"
                      >
                        {message}
                      </p>
                    ))}
                  </div>
                )}
                {modalMode === 'success' && (
                  <div className="confirm-modal__success">
                    <p className="confirm-modal__success-message">
                      お客様利用データーのアップロードが成功しました。
                      <br />
                      請求書発行ページに移動しますか？
                    </p>
                    {uploadResult && (
                      <div className="confirm-modal__success-summary">
                        <div className="confirm-modal__success-item">
                          <span className="summary-label">利用年月</span>
                          <span className="summary-value">
                            {uploadResult.issuedDate}
                          </span>
                        </div>
                        <div className="confirm-modal__success-item">
                          <span className="summary-label">請求書番号</span>
                          <span className="summary-value">
                            {uploadResult.invoiceCode}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="confirm-modal__actions">
                {modalMode === 'confirm' && (
                  <>
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
                  </>
                )}
                {modalMode === 'processing' && (
                  <button type="button" className="btn btn-cancel" disabled>
                    処理中...
                  </button>
                )}
                {modalMode === 'error' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-cancel"
                      onClick={handleModalCancel}
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      className="btn btn-submit"
                      onClick={() => {
                        setModalMode('confirm');
                        setModalMessages([]);
                      }}
                    >
                      戻る
                    </button>
                  </>
                )}
                {modalMode === 'success' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-cancel"
                      onClick={handleModalCancel}
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      className="btn btn-submit"
                      onClick={handleSuccessNavigate}
                    >
                      移動
                    </button>
                  </>
                )}
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
