import { TransactionRow } from './types';

const EXPECTED_COLUMNS = ["TANGGAL", "KETERANGAN", "DETAIL TRANSAKSI", "MUTASI", "SALDO"];

/**
 * Check if a number string looks like a currency value.
 * Currency values typically have:
 * - Thousand separators (commas or dots)
 * - Decimal places (.XX)
 * - DB/CR indicators
 * - Are reasonably large (> 100 or have decimal places)
 */
export function isCurrencyValue(value: string): boolean {
  if (!value || value.trim().length === 0) {
    return false;
  }

  const trimmed = value.trim();
  
  // Check for DB/CR indicators - these are strong signals of currency
  if (/\b(DB|CR|DEBIT|CREDIT)\b/i.test(trimmed)) {
    return true;
  }

  // Check for thousand separators (commas or dots in number pattern)
  // Pattern: digits, then comma/dot, then 3 digits (repeated), optionally followed by decimal
  if (/\d{1,3}(?:[,\.]\d{3})+(?:[,\.]\d{2})?/.test(trimmed)) {
    return true;
  }

  // Check for decimal places (at least 2 digits after decimal)
  if (/\.\d{2,}/.test(trimmed)) {
    // Extract numeric value to check if it's substantial
    const numericPart = trimmed.replace(/[^\d.]/g, '');
    const numValue = parseFloat(numericPart);
    if (!isNaN(numValue) && numValue >= 1) {
      return true;
    }
  }

  // Check if it's a large number without decimals (>= 1000)
  const numericPart = trimmed.replace(/[^\d]/g, '');
  const numValue = parseFloat(numericPart);
  if (!isNaN(numValue) && numValue >= 1000) {
    return true;
  }

  return false;
}

/**
 * Extract currency values (MUTASI and SALDO) from a text string.
 * Uses right-to-left parsing to find the last two currency values.
 */
export function extractCurrencyValues(line: string): { mutasi: string; saldo: string; remainingLine: string } {
  let mutasi = '';
  let saldo = '';
  let remainingLine = line;

  if (!line || line.trim().length === 0) {
    return { mutasi, saldo, remainingLine };
  }

  // Pattern to match currency values:
  // - Numbers with thousand separators: 23,000.00 or 111,686,562.71
  // - Numbers with DB/CR: 23,000.00 DB or 23,000.00DB
  // - Numbers with decimals: 23.50 or 111686562.71
  // - Large numbers: 1000 or more
  const currencyPattern = /(\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?(?:\s*(?:DB|CR))?|\d+\.\d{2,}(?:\s*(?:DB|CR))?|\d{4,}(?:\s*(?:DB|CR))?)/g;
  
  const matches: Array<{ value: string; index: number; length: number }> = [];
  let match;
  
  // Find all potential currency matches
  while ((match = currencyPattern.exec(line)) !== null) {
    const value = match[1].trim();
    // Filter to only include values that look like currency
    if (isCurrencyValue(value)) {
      matches.push({ value, index: match.index, length: match[0].length });
    }
  }

  // Helper: value has DB/CR suffix (transaction amount indicator)
  const hasDbCr = (v: string) => /(DB|CR)/i.test(v);
  // Helper: value looks like running balance (large, no DB/CR - typically 7+ digits)
  const looksLikeBalance = (v: string) => {
    const num = parseFloat(String(v).replace(/[^\d.]/g, ''));
    return !isNaN(num) && num >= 1_000_000 && !hasDbCr(v);
  };
  const toNum = (v: string) => parseFloat(String(v).replace(/[^\d.]/g, '')) || 0;
  const sameAmount = (a: string, b: string) => Math.abs(toNum(a) - toNum(b)) < 0.01;

  // Extract the last two currency values (MUTASI and SALDO)
  if (matches.length >= 2) {
    const lastMatch = matches[matches.length - 1];
    const secondLastMatch = matches[matches.length - 2];
    // Dynamic assignment: DB/CR = MUTASI (transaction amount), large + no DB/CR = SALDO (balance)
    if (hasDbCr(lastMatch.value) && !hasDbCr(secondLastMatch.value)) {
      mutasi = lastMatch.value;
      // Same amount in description (e.g. "3350000.00 kost" + "3,350,000.00DB") → only MUTASI
      saldo = sameAmount(lastMatch.value, secondLastMatch.value) ? '' : (looksLikeBalance(secondLastMatch.value) ? secondLastMatch.value : '');
    } else if (hasDbCr(secondLastMatch.value) && !hasDbCr(lastMatch.value)) {
      mutasi = secondLastMatch.value;
      saldo = lastMatch.value;
    } else if (looksLikeBalance(lastMatch.value) && !looksLikeBalance(secondLastMatch.value)) {
      saldo = lastMatch.value;
      mutasi = secondLastMatch.value;
    } else {
      // Default: second-to-last = MUTASI, last = SALDO
      mutasi = secondLastMatch.value;
      saldo = lastMatch.value;
    }

    // Remove both from the line using their exact indices
    // Sort by index (ascending) to process left to right
    const sortedMatches = [secondLastMatch, lastMatch].sort((a, b) => a.index - b.index);
    
    const parts: string[] = [];
    let lastIndex = 0;
    
    for (const m of sortedMatches) {
      if (m.index > lastIndex) {
        parts.push(line.substring(lastIndex, m.index));
      }
      lastIndex = Math.max(lastIndex, m.index + m.length);
    }
    
    // Add remaining part after the last match
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }
    
    remainingLine = parts.join('').replace(/\s{2,}/g, ' ').trim();
  } else if (matches.length === 1) {
    // Only one currency value - use heuristics: DB/CR = MUTASI, large balance = SALDO
    const singleMatch = matches[0];
    if (hasDbCr(singleMatch.value)) {
      mutasi = singleMatch.value;
    } else if (looksLikeBalance(singleMatch.value)) {
      saldo = singleMatch.value;
    } else {
      // Ambiguous: default to SALDO for backward compat (e.g. SALDO AWAL)
      saldo = singleMatch.value;
    }
    remainingLine = (
      line.substring(0, singleMatch.index) + 
      line.substring(singleMatch.index + singleMatch.length)
    ).replace(/\s{2,}/g, ' ').trim();
  }

  return { mutasi, saldo, remainingLine };
}

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
  const mutasiCell = row[3] ? String(row[3]).trim() : "";
  const saldoCell = row[4] ? String(row[4]).trim() : "";

  // Accept amounts-only continuation lines (MUTASI/SALDO on separate line in BCA PDFs)
  if (mutasiCell || saldoCell) {
    return true;
  }
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
  let bufferedAmountsRow: any[] | null = null;

  for (const row of rows) {
    // Defensive padding: ensure row has 5 columns before accessing indices
    const padded = [...row];
    while (padded.length < 5) {
      padded.push('');
    }

    const tanggal = String(padded[0] || '').trim();

    // Check if this row starts with a date (DD/MM format)
    const hasDate = /\d{1,2}\/\d{1,2}/.test(tanggal);

    if (hasDate) {
      // This is a new transaction row
      if (currentTransaction !== null) {
        mergedRows.push(currentTransaction);
      }

      // Start new transaction
      currentTransaction = [...padded];

      // Apply buffered amounts-only row (e.g. after page break) if this row is missing them
      if (bufferedAmountsRow && (!currentTransaction[3] || !String(currentTransaction[3]).trim() || !currentTransaction[4] || !String(currentTransaction[4]).trim())) {
        if (bufferedAmountsRow[3] && String(bufferedAmountsRow[3]).trim()) {
          currentTransaction[3] = bufferedAmountsRow[3];
        }
        if (bufferedAmountsRow[4] && String(bufferedAmountsRow[4]).trim()) {
          currentTransaction[4] = bufferedAmountsRow[4];
        }
        bufferedAmountsRow = null;
      }
    } else {
      // This is a continuation row - merge into current transaction
      if (currentTransaction !== null) {
        // Merge DETAIL TRANSAKSI column (index 2) - continuation details
        const detailValue = padded[2] ? String(padded[2]).trim() : "";
        if (detailValue) {
          const currentDetail = currentTransaction[2] ? String(currentTransaction[2]).trim() : "";
          currentTransaction[2] = currentDetail ? `${currentDetail} ${detailValue}` : detailValue;
        }

        // Also merge KETERANGAN if it has content (index 1)
        const keteranganValue = padded[1] ? String(padded[1]).trim() : "";
        if (keteranganValue) {
          const currentKeterangan = currentTransaction[1] ? String(currentTransaction[1]).trim() : "";
          currentTransaction[1] = currentKeterangan ? `${currentKeterangan} ${keteranganValue}` : keteranganValue;
        }

        // If MUTASI or SALDO appear in continuation, they might be missing from main row
        const mutasiValue = padded[3] ? String(padded[3]).trim() : "";
        if (mutasiValue && (!currentTransaction[3] || !String(currentTransaction[3]).trim())) {
          currentTransaction[3] = mutasiValue;
        }

        const saldoValue = padded[4] ? String(padded[4]).trim() : "";
        if (saldoValue && (!currentTransaction[4] || !String(currentTransaction[4]).trim())) {
          currentTransaction[4] = saldoValue;
        }
      } else {
        // Orphaned amounts-only row (e.g. after page break) - buffer for next transaction
        const hasAmounts = (padded[3] && String(padded[3]).trim()) || (padded[4] && String(padded[4]).trim());
        const isAmountsOnly = hasAmounts && !padded[1] && !padded[2];
        if (isAmountsOnly) {
          bufferedAmountsRow = padded;
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

  // Post-processing: extract MUTASI/SALDO from DETAIL TRANSAKSI if still missing.
  // This catches cases where currency values ended up in the description after merging
  // continuation lines (common with pdf-parse text extraction).
  for (const row of cleanedData) {
    if (row.MUTASI === null || row.SALDO === null) {
      const detail = row["DETAIL TRANSAKSI"];
      if (detail) {
        const { mutasi, saldo, remainingLine } = extractCurrencyValues(detail);
        
        if (mutasi && row.MUTASI === null) {
          row.MUTASI = cleanCurrencyValue(mutasi);
        }
        if (saldo && row.SALDO === null) {
          row.SALDO = cleanCurrencyValue(saldo);
        }
        // Update the detail text to remove extracted currency values
        if (mutasi || saldo) {
          row["DETAIL TRANSAKSI"] = remainingLine;
        }
      }
    }
  }

  return cleanedData;
}
