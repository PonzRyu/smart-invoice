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
  siPartnerName: string; // 請求元
  ttm: number | null;
  billingDate: Date; // 請求日時
  paymentDeadline: Date; // 支払期限
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
 * 利用年月から日付オブジェクトを生成（月初日）
 */
function getUsageYearMonthDate(issuedDate: string): Date {
  const [year, month] = issuedDate.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/**
 * 利用年月の月の総日数を取得
 */
function getDaysInMonth(issuedDate: string): number {
  const [year, month] = issuedDate.split('-').map(Number);
  // 次の月の0日目を取得することで、現在の月の最終日（日数）を取得
  return new Date(year, month, 0).getDate();
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

  // 請求日時
  const BillingDateStr = formatDateJapanese(invoiceData.billingDate);

  // 請求元
  summarySheet.getCell('B5').value = invoiceData.siPartnerName;

  // 請求書件名: ${issued_invoice.company_name}様向けAIMS SaaS${MM}月度ご利用料金
  const usageDate = getUsageYearMonthDate(invoiceData.issuedDate);
  const monthStr = String(usageDate.getMonth() + 1).padStart(2, '0');
  const invoiceTitle = `${invoiceData.companyName}様向けAIMS SaaS${monthStr}月度ご利用料金`;
  summarySheet.getCell('F10').value = invoiceTitle;
  summarySheet.getCell('F10').alignment = {
    shrinkToFit: true,
  };

  // 支払期限
  const paymentDeadlineStr = formatDateJapaneseWithZero(
    invoiceData.paymentDeadline
  );
  summarySheet.getCell('F11').value = paymentDeadlineStr;

  // 小計
  const subtotalCell = summarySheet.getCell('E15');
  subtotalCell.numFmt = `"${currency}"#,##0.00`;
  subtotalCell.value = {
    formula: `=ROUND(SUM(店舗別明細!H3:H1048576), 2)`,
  };

  // 消費税(ドル)
  const dollerTaxCell = summarySheet.getCell('J15');
  dollerTaxCell.numFmt = `"${currency}"#,##0.00`;
  dollerTaxCell.value = {
    formula: `=ROUND(E15*0.1, 2)`,
  };

  // 消費税(円)
  const yenTaxCell = summarySheet.getCell('N15');
  yenTaxCell.numFmt = `"¥"#,##0`;
  yenTaxCell.value = {
    formula: `=J15*${invoiceData.ttm}`,
  };

  // 合計ご請求金額
  const totalBillCell = summarySheet.getCell('R15');
  totalBillCell.numFmt = `"$"#,##0.00`;
  totalBillCell.value = {
    formula: `=ROUND(SUM(E15, J15), 2)`,
  };
  summarySheet.getCell('R15').alignment = {
    shrinkToFit: true,
  };

  // 請求欄のスタイル
  summarySheet.mergeCells('E15:I15');
  summarySheet.mergeCells('J15:M15');
  summarySheet.mergeCells('N15:Q15');
  summarySheet.mergeCells('R15:V15');
  // 枠線を設定（外枠）
  const borderStyle: Partial<ExcelJS.Border> = {
    style: 'thin',
  };
  subtotalCell.font = {
    size: 12,
    bold: true,
  };
  dollerTaxCell.font = {
    size: 12,
    bold: true,
  };
  yenTaxCell.font = {
    size: 12,
    bold: true,
  };
  totalBillCell.font = {
    size: 12,
    bold: true,
  };
  subtotalCell.border = {
    top: borderStyle,
    left: borderStyle,
    bottom: borderStyle,
    right: borderStyle,
  };
  dollerTaxCell.border = {
    top: borderStyle,
    left: borderStyle,
    bottom: borderStyle,
    right: borderStyle,
  };
  yenTaxCell.border = {
    top: borderStyle,
    left: borderStyle,
    bottom: borderStyle,
    right: borderStyle,
  };
  totalBillCell.border = {
    top: borderStyle,
    left: borderStyle,
    bottom: borderStyle,
    right: borderStyle,
  };
  const billAreaRow = summarySheet.getRow(15);
  billAreaRow.height = 29;
  billAreaRow.alignment = {
    horizontal: 'right',
    vertical: 'middle',
  };

  // 消費税: TTMの値
  if (invoiceData.ttm !== null) {
    const ttmNotiCell = summarySheet.getCell('N16');
    ttmNotiCell.value = `＊消費税の円貨換算レート: 三菱UFJ銀行公表のTTM適用(${invoiceData.ttm.toFixed(2)})`;
    ttmNotiCell.font = {
      size: 10,
      color: { argb: 'FFFF0000' },
    };
  }

  // ヘッダを設定
  // 店舗別明細の年月生成: ${YYYY年MM月dd日}店舗別ご利用明細
  const usageDateStr = formatDateJapaneseWithZero(usageDate, false);
  const headerLeft = `${usageDateStr}店舗別ご利用明細`;
  const headerRight = invoiceNumber;
  const summeryHeaderRight = BillingDateStr;
  summarySheet.headerFooter = {
    oddHeader: `&R${headerRight}\r\n${summeryHeaderRight}`,
    evenHeader: `&L${headerLeft}&R${headerRight}`,
  };

  // 店舗別明細シートのページ設定ヘッダーを設定
  storeSheet.pageSetup.firstPageNumber = 2;
  storeSheet.headerFooter = {
    oddHeader: `&L${headerLeft}&R${headerRight}`,
    evenHeader: `&L${headerLeft}&R${headerRight}`,
  };

  // 店舗別明細データを「店舗別明細」シートに書き込む
  // usage_daysが0、または金額が0円のデータは除外
  const daysInMonth = getDaysInMonth(invoiceData.issuedDate);
  const filteredStoreSummaries = storeSummaries.filter((summary) => {
    // usage_daysが0の場合は除外
    if (summary.usage_days === 0) {
      return false;
    }
    // 金額を計算（Excelの数式と同じ計算）
    const calculatedPrice =
      (summary.avg_label_count * unitPrice * summary.usage_days) / daysInMonth;
    // 小数点2桁までに丸める（ExcelのROUND関数と同様）
    const roundedPrice = Math.round(calculatedPrice * 100) / 100;
    // 金額が0円の場合は除外
    return roundedPrice !== 0;
  });

  // 3行目からスタート
  const startRow = 3;
  filteredStoreSummaries.forEach((summary, index) => {
    const row = startRow + index;

    // B列: store_code
    const storeCodeCell = storeSheet.getCell(`B${row}`);
    storeCodeCell.value = summary.store_code;
    storeCodeCell.alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };

    // C列: store_name
    const storeNameCell = storeSheet.getCell(`C${row}`);
    storeNameCell.value = summary.store_name ?? '';
    storeNameCell.alignment = {
      shrinkToFit: true,
    };
    storeNameCell.alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };

    // D列: usage_days
    const usageDaysCell = storeSheet.getCell(`D${row}`);
    usageDaysCell.numFmt = '#,##0"日"';
    usageDaysCell.value = summary.usage_days;
    usageDaysCell.alignment = {
      horizontal: 'right',
      vertical: 'middle',
    };

    // E列: avg_label_count
    const avgLabelCountCell = storeSheet.getCell(`E${row}`);
    avgLabelCountCell.numFmt = '#,##0"枚"';
    avgLabelCountCell.value = summary.avg_label_count;
    avgLabelCountCell.alignment = {
      shrinkToFit: true,
    };
    avgLabelCountCell.alignment = {
      horizontal: 'right',
      vertical: 'middle',
    };

    // F列: avg_product_update_count
    const avgProductUpdateCountCell = storeSheet.getCell(`F${row}`);
    avgProductUpdateCountCell.numFmt = '#,##0"回"';
    avgProductUpdateCountCell.value = summary.avg_product_update_count;
    avgProductUpdateCountCell.alignment = {
      shrinkToFit: true,
      horizontal: 'right',
      vertical: 'middle',
    };

    // G列: update_rate
    const updateRate = storeSheet.getCell(`G${row}`);
    updateRate.numFmt = '0.00%';
    updateRate.value = {
      formula: `=ROUND(店舗別明細!$F${row}/店舗別明細!$E${row}, 2)`,
    };
    updateRate.alignment = {
      shrinkToFit: true,
      horizontal: 'right',
      vertical: 'middle',
    };

    const priceCell = storeSheet.getCell(`H${row}`);
    priceCell.numFmt = `"${currency}"#,##0.00`;
    priceCell.value = {
      formula: `=ROUND(店舗別明細!$E${row}*${unitPrice}*${usageDaysCell.value}/${getDaysInMonth(invoiceData.issuedDate)}, 2)`,
    };
    priceCell.alignment = {
      shrinkToFit: true,
      horizontal: 'right',
      vertical: 'middle',
    };

    storeCodeCell.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    storeNameCell.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    usageDaysCell.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    avgLabelCountCell.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    avgProductUpdateCountCell.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    updateRate.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };
    priceCell.border = {
      top: borderStyle,
      left: borderStyle,
      bottom: borderStyle,
      right: borderStyle,
    };

    const rowObj = storeSheet.getRow(row);
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
