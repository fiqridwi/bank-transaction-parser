import { TransactionRow } from './types';

const EXPECTED_COLUMNS = ["TANGGAL", "KETERANGAN", "DETAIL TRANSAKSI", "MUTASI", "SALDO"];

/**
 * Clean currency values by removing currency symbols and thousand separators.
 * Handles Indonesian format: 1.000.000,50 or 98,779,762.35
 * Also handles DB/CR indicators that may be attached to amounts.
 */
export function cleanCurrencyValue(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Convert to string
  let valueStr = String(value).trim();

  if (!valueStr) {
    return null;
  }

  // Remove currency symbols (Rp, $, etc.)
  valueStr = valueStr.replace(/[Rr][Pp]\s*/g, '');
  valueStr = valueStr.replace(/[$€£¥]/g, '');

  // Remove DB/CR indicators (Debit/Credit indicators)
  valueStr = valueStr.replace(/\s*(DB|CR|DEBIT|CREDIT)\s*$/gi, '');
  valueStr = valueStr.replace(/\s*(DB|CR|DEBIT|CREDIT)\s*/gi, ' ');

  // Handle BCA format: numbers like "98,779,762.35" or "23,400.00"
  // Check if it uses comma as thousand separator and dot as decimal
  if (valueStr.includes(',') && valueStr.includes('.')) {
    // Format like "98,779,762.35" - comma is thousand separator, dot is decimal
    // Remove commas, keep dot
    valueStr = valueStr.replace(/,/g, '');
  } else if (valueStr.includes(',')) {
    // Only comma present - could be decimal separator (Indonesian format) or thousand
    // Check if there are multiple commas (thousand separators)
    const commaCount = (valueStr.match(/,/g) || []).length;
    const parts = valueStr.split(',');
    if (commaCount > 1 || (commaCount === 1 && parts[1] && parts[1].length <= 2)) {
      // Likely decimal separator (e.g., "1.000.000,50")
      // First remove dots (thousand separators), then replace comma with dot
      valueStr = valueStr.replace(/\./g, '');
      valueStr = valueStr.replace(',', '.');
    } else {
      // Single comma, might be thousand separator or decimal
      // If digits after comma <= 2, it's likely decimal separator
      if (parts.length === 2 && parts[1].length <= 2) {
        valueStr = parts[0].replace(/\./g, '') + '.' + parts[1];
      } else {
        // Treat as thousand separator
        valueStr = valueStr.replace(/,/g, '');
      }
    }
  } else {
    // Only dots - could be thousand separators (Indonesian format)
    // If there are multiple dots, they're thousand separators
    const dotCount = (valueStr.match(/\./g) || []).length;
    if (dotCount > 1) {
      // Multiple dots = thousand separators, remove them
      valueStr = valueStr.replace(/\./g, '');
    }
    // If single dot, keep it as decimal separator
  }

  // Remove any remaining non-numeric characters except decimal point and minus sign
  valueStr = valueStr.replace(/[^\d.\-]/g, '');

  try {
    return valueStr ? parseFloat(valueStr) : null;
  } catch {
    return null;
  }
}

/**
 * Normalize column names by stripping whitespace and converting to uppercase.
 */
export function normalizeColumns(rows: any[][]): string[] {
  if (!rows || rows.length === 0) {
    return EXPECTED_COLUMNS;
  }

  // Use expected columns if available
  return EXPECTED_COLUMNS;
}

/**
 * Check if a row contains transaction data.
 */
export function isValidTransactionRow(row: any[]): boolean {
  if (!row || row.length < 2) {
    return false;
  }

  // Skip header rows (first cell contains "TANGGAL")
  const firstCell = row[0] ? String(row[0]).trim().toUpperCase() : "";
  if (firstCell.includes("TANGGAL")) {
    return false;
  }

  // Skip completely empty rows
  if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === "")) {
    return false;
  }

  // Check if first column contains a date pattern (DD/MM format)
  const firstCellStr = row[0] ? String(row[0]).trim() : "";
  const datePattern = /\d{1,2}\/\d{1,2}/.test(firstCellStr);

  // Accept rows that either:
  // 1. Have a date in first column (main transaction row)
  // 2. Have content in KETERANGAN or DETAIL TRANSAKSI column (continuation row)
  if (datePattern) {
    return true;
  }

  // Check if it's a continuation row with content
  const secondCellStr = row[1] ? String(row[1]).trim() : "";
  const thirdCellStr = row[2] ? String(row[2]).trim() : "";

  return !!(secondCellStr || thirdCellStr);
}

/**
 * Merge multi-line transactions into single rows.
 */
export function mergeTransactionLines(rows: any[][]): any[][] {
  if (!rows || rows.length === 0) {
    return [];
  }

  const mergedRows: any[][] = [];
  let currentTransaction: any[] | null = null;

  for (const row of rows) {
    if (row.length < 5) {
      continue;
    }

    const tanggal = String(row[0] || '').trim();

    // Check if this row starts with a date (DD/MM format)
    const hasDate = /\d{1,2}\/\d{1,2}/.test(tanggal);

    if (hasDate) {
      // This is a new transaction row
      if (currentTransaction !== null) {
        mergedRows.push(currentTransaction);
      }

      // Start new transaction
      currentTransaction = [...row];
    } else {
      // This is a continuation row - merge into current transaction
      if (currentTransaction !== null) {
        // Merge DETAIL TRANSAKSI column (index 2) - continuation details
        const detailValue = row[2] ? String(row[2]).trim() : "";
        if (detailValue) {
          const currentDetail = currentTransaction[2] ? String(currentTransaction[2]).trim() : "";
          currentTransaction[2] = currentDetail ? `${currentDetail} ${detailValue}` : detailValue;
        }

        // Also merge KETERANGAN if it has content (index 1)
        const keteranganValue = row[1] ? String(row[1]).trim() : "";
        if (keteranganValue) {
          const currentKeterangan = currentTransaction[1] ? String(currentTransaction[1]).trim() : "";
          currentTransaction[1] = currentKeterangan ? `${currentKeterangan} ${keteranganValue}` : keteranganValue;
        }

        // If MUTASI or SALDO appear in continuation, they might be missing from main row
        const mutasiValue = row[3] ? String(row[3]).trim() : "";
        if (mutasiValue && (!currentTransaction[3] || !String(currentTransaction[3]).trim())) {
          currentTransaction[3] = mutasiValue;
        }

        const saldoValue = row[4] ? String(row[4]).trim() : "";
        if (saldoValue && (!currentTransaction[4] || !String(currentTransaction[4]).trim())) {
          currentTransaction[4] = saldoValue;
        }
      }
    }
  }

  // Add the last transaction
  if (currentTransaction !== null) {
    mergedRows.push(currentTransaction);
  }

  return mergedRows;
}

/**
 * Clean transaction data and convert to structured format.
 */
export function cleanTransactionData(rawRows: any[][]): TransactionRow[] {
  if (!rawRows || rawRows.length === 0) {
    return [];
  }

  // Filter out invalid rows
  const validRows = rawRows.filter(isValidTransactionRow);

  // Merge multi-line transactions
  const mergedRows = mergeTransactionLines(validRows);

  // Convert to TransactionRow format
  const cleanedData: TransactionRow[] = mergedRows
    .map((row) => {
      // Ensure row has at least 5 columns
      const paddedRow = [...row];
      while (paddedRow.length < 5) {
        paddedRow.push(null);
      }

      return {
        TANGGAL: paddedRow[0] ? String(paddedRow[0]).trim() : "",
        KETERANGAN: paddedRow[1] ? String(paddedRow[1]).trim() : "",
        "DETAIL TRANSAKSI": paddedRow[2] ? String(paddedRow[2]).trim() : "",
        MUTASI: cleanCurrencyValue(paddedRow[3]),
        SALDO: cleanCurrencyValue(paddedRow[4]),
      };
    })
    .filter((row) => {
      // Remove rows where TANGGAL is empty (invalid transactions)
      return row.TANGGAL && row.TANGGAL.trim() !== "";
    });

  return cleanedData;
}
