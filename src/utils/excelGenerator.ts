import ExcelJS from 'exceljs';

interface StoreSummary {
  store_code: string;
  store_name: string | null;
  start_date_of_use: string;
  usage_days: number;
  avg_label_count: number;
  avg_product_update_count: number;
}

interface InvoiceData {
  invoiceCode: number;
  issuedDate: string; // YYYY-MM形式
  companyName: string;
  ttm: number | null;
  downloadDate: Date; // ダウンロードボタンを押下した日付
}

/**
 * 請求書番号を3桁の文字列に変換
 */
function formatInvoiceCode(code: number): string {
  return String(code).padStart(3, '0');
}

/**
 * 利用年月をYYYYMM形式に変換
 */
function formatUsageYearMonth(issuedDate: string): string {
  return issuedDate.replace(/-/g, '');
}

/**
 * 日付をYYYY年M月d日形式に変換
 */
function formatDateJapanese(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 日付をYYYY年MM月dd日形式に変換
 */
function formatDateJapaneseWithZero(
  date: Date,
  isIncludeDay: boolean = true
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  if (!isIncludeDay) {
    return `${year}年${month}月`;
  }
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

/**
 * 請求月の翌月末日を取得
 */
function getNextMonthEndDate(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  // 請求月の翌月 = month + 1
  // 翌月の0日目 = 前月の最終日
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  return new Date(nextYear, nextMonth - 1, lastDay);
}

/**
 * 利用年月から日付オブジェクトを生成（月初日）
 */
function getUsageYearMonthDate(issuedDate: string): Date {
  const [year, month] = issuedDate.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/**
 * Excelファイルを生成してダウンロード
 */
export async function generateInvoiceExcel(
  templateUrl: string,
  invoiceData: InvoiceData,
  storeSummaries: StoreSummary[],
  unitPrice: number,
  currency: string
): Promise<void> {
  // テンプレートファイルを読み込み
  const response = await fetch(templateUrl);
  const arrayBuffer = await response.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  // 「合計請求明細書鑑」シートを取得
  const summarySheet = workbook.getWorksheet('合計請求明細書鑑');
  if (!summarySheet) {
    throw new Error('「合計請求明細書鑑」シートが見つかりません');
  }

  // 「店舗別明細」シートを取得
  const storeSheet = workbook.getWorksheet('店舗別明細');
  if (!storeSheet) {
    throw new Error('「店舗別明細」シートが見つかりません');
  }

  const invoiceCodeStr = formatInvoiceCode(invoiceData.invoiceCode);
  const usageYearMonth = formatUsageYearMonth(invoiceData.issuedDate);

  // 発行番号生成: No.INV-${利用年月}-${請求書番号}-${ページ番号}
  const invoiceNumber = `No.INV-${usageYearMonth}-${invoiceCodeStr}-&P`;

  // 請求年月日: ダウンロードボタンを押下した日付
  const requestDateStr = formatDateJapanese(invoiceData.downloadDate);
  console.log(invoiceData.downloadDate);
  // 請求書件名: ${issued_invoice.company_name}様向けAIMS SaaS${MM}月度ご利用料金
  const usageDate = getUsageYearMonthDate(invoiceData.issuedDate);
  const monthStr = String(usageDate.getMonth() + 1).padStart(2, '0');
  const invoiceTitle = `${invoiceData.companyName}様向けAIMS SaaS${monthStr}月度ご利用料金`;
  summarySheet.getCell('F10').value = invoiceTitle;

  // 支払い期限: 請求月の翌月末日
  const paymentDeadline = getNextMonthEndDate(invoiceData.downloadDate);
  const paymentDeadlineStr = formatDateJapaneseWithZero(paymentDeadline);
  summarySheet.getCell('F11').value = paymentDeadlineStr;

  // 消費税: TTMの値
  if (invoiceData.ttm !== null) {
    summarySheet.getCell('N15').value = invoiceData.ttm;
  }

  // 小計
  summarySheet.getCell('E15').numFmt = `"${currency}"#,##0.000`;
  summarySheet.getCell('E15').value = {
    formula: `=SUM(店舗別明細!H3:H1048576)`,
  };

  // 消費税(ドル)
  summarySheet.getCell('J15').numFmt = `"${currency}"#,##0.000`;
  summarySheet.getCell('J15').value = {
    formula: `=E15*0.1`,
  };

  // 合計ご請求金額
  summarySheet.getCell('R15').numFmt = `"¥"#,##0.000`;
  summarySheet.getCell('R15').value = {
    formula: `=SUM(E15, J15)*N15`,
  };

  // ヘッダを設定
  // 店舗別明細の年月生成: ${YYYY年MM月dd日}店舗別ご利用明細
  const usageDateStr = formatDateJapaneseWithZero(usageDate, false);
  const headerLeft = `${usageDateStr}店舗別ご利用明細`;
  const headerRight = invoiceNumber;
  const summeryHeaderRight = requestDateStr;
  summarySheet.headerFooter = {
    oddHeader: `&R${headerRight}\r\n${summeryHeaderRight}`,
    evenHeader: `&L${headerLeft}&R${headerRight}`,
    // 必要に応じてoddFooterやevenFooterも設定可能
  };

  // 店舗別明細シートのページ設定ヘッダーを設定
  storeSheet.pageSetup.firstPageNumber = 2;
  storeSheet.headerFooter = {
    oddHeader: `&L${headerLeft}&R${headerRight}`,
    evenHeader: `&L${headerLeft}&R${headerRight}`,
    // 必要に応じてoddFooterやevenFooterも設定可能
  };

  // 店舗別明細データを「店舗別明細」シートに書き込む
  // 3行目からスタート
  const startRow = 3;
  storeSummaries.forEach((summary, index) => {
    const row = startRow + index;

    // B列: store_code
    const cellB = storeSheet.getCell(`B${row}`);
    cellB.value = summary.store_code;

    // C列: store_name
    const cellC = storeSheet.getCell(`C${row}`);
    cellC.value = summary.store_name ?? '';

    // D列: usage_days
    const cellD = storeSheet.getCell(`D${row}`);
    cellD.numFmt = '#,##0"日"';
    cellD.value = summary.usage_days;

    // E列: avg_label_count
    const cellE = storeSheet.getCell(`E${row}`);
    cellE.numFmt = '#,##0"枚"';
    cellE.value = summary.avg_label_count;

    // F列: avg_product_update_count
    const cellF = storeSheet.getCell(`F${row}`);
    cellF.numFmt = '#,##0"回"';
    cellF.value = summary.avg_product_update_count;

    const cellG = storeSheet.getCell(`G${row}`);
    cellG.numFmt = '0.00%';
    cellG.value = {
      formula: `=IFERROR(店舗別明細!$F${row}/店舗別明細!$E${row},"")`,
    };

    const cellH = storeSheet.getCell(`H${row}`);
    cellH.numFmt = `"${currency}"#,##0.000`;
    cellH.value = {
      formula: `=IF(店舗別明細!$D${row}=0,"",ROUND(店舗別明細!$E${row}*${unitPrice},3))`,
    };

    // 枠線を設定（外枠）
    const borderStyle: Partial<ExcelJS.Border> = {
      style: 'thin',
    };

    cellB.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    cellC.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    cellD.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    cellE.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    cellF.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    cellG.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    cellH.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };

    const rowObj = storeSheet.getRow(row);
    rowObj.alignment = {
      horizontal: 'right',
      vertical: 'middle',
    };
    rowObj.font = { name: '游ゴシック', size: 10 };
  });

  storeSheet.pageSetup.printArea = `A1:I${storeSummaries.length + 3}`;

  // ExcelファイルをBlobに変換してダウンロード
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // ファイル名: ${issued_invoice.company_name}様_INV-${利用年月}-${請求書番号}
  const fileName = `${invoiceData.companyName}様_INV-${usageYearMonth}-${invoiceCodeStr}.xlsx`;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
