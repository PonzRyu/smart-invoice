import { useState, useRef } from 'react';
import { TopBar } from '../parts/TopBar';
import { NavigationRail } from '../parts/NavigationRail';
import { BottomBar } from '../parts/BottomBar';
import fileCsvIcon from '../styles/raws/file_csv_raw.svg';
import linkIcon from '../styles/raws/link_raw.svg';
import '../styles/styles.css';

/**
 * 請求書作成ページコンポーネント
 * 請求書作成に必要な情報を入力するフォーム
 */
export const CreateInvoicePage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // フォームの状態管理
  const [customerName, setCustomerName] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [tts, setTts] = useState('');
  const [ttb, setTtb] = useState('');
  const [excessBilling, setExcessBilling] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // 公表仲値(TTM)の計算
  const calculateTtm = (): string => {
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
    customerName !== '' && year !== '' && month !== '' && uploadedFile !== null;

  // キャンセルボタンのハンドラー
  const handleCancel = () => {
    setCustomerName('');
    setYear('');
    setMonth('');
    setTts('');
    setTtb('');
    setExcessBilling(false);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    if (isFormValid) {
      // ここで実際の登録処理を実装
      console.log('登録データ:', {
        customerName,
        year,
        month,
        tts,
        ttb,
        ttm: calculateTtm(),
        excessBilling,
        uploadedFile: uploadedFile?.name,
      });
      alert('登録が完了しました。');
      // ページ遷移またはデータクリア
      handleCancel();
    }
  };

  return (
    <div className="page">
      <div className="content">
        <div className="create-invoice-form">
          {/* 利用顧客名 */}
          <div className="form-group">
            <label className="form-label required">利用顧客名</label>
            <select
              className={`form-select ${customerName === '' ? 'placeholder' : ''}`}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            >
              <option value="" disabled>
                株式会社○○○○(○○○)
              </option>
              <option value="株式会社ニトリ(○○○)">株式会社ニトリ(○○○)</option>
              <option value="株式会社テスト(○○○)">株式会社テスト(○○○)</option>
              <option value="テスト株式会社(○○○)">テスト株式会社(○○○)</option>
            </select>
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
              <label className="form-label">為替レート</label>
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
          </div>

          {/* 超過金額の請求 */}
          <div className="form-group">
            <label className="form-label">超過金額の請求</label>
            <div className="toggle-container">
              <span className="toggle-label">商品更新数110%超過分の請求</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={excessBilling}
                  onChange={(e) => setExcessBilling(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
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
      </div>
      <TopBar headline="請求書作成" />
      <NavigationRail />
      <BottomBar />
    </div>
  );
};
