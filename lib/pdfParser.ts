import pdfParse from 'pdf-parse';
import { cleanTransactionData, mergeTransactionLines, isValidTransactionRow } from './dataCleaner';

const EXPECTED_COLUMNS = ["TANGGAL", "KETERANGAN", "DETAIL TRANSAKSI", "MUTASI", "SALDO"];

/**
 * Extract table data from PDF text using fixed-width column parsing.
 * BCA statements use fixed-width columns that we can parse using character positions.
 */
function parseTableFromText(text: string): any[][] {
  const lines = text.split('\n');
  const rows: any[][] = [];
  let inTable = false;
  let headerFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for table header
    if (!headerFound && line.toUpperCase().includes('TANGGAL') && line.toUpperCase().includes('KETERANGAN')) {
      headerFound = true;
      inTable = true;
      continue;
    }

    // Skip until we find the header
    if (!inTable) {
      continue;
    }

    // Stop if we hit a page break or summary section
    if (line.toUpperCase().includes('SALDO AWAL') || 
        line.toUpperCase().includes('SALDO AKHIR') ||
        line.toUpperCase().includes('TOTAL') ||
        (line.length > 0 && !/\d/.test(line) && !line.includes('/'))) {
      // Check if this might still be a transaction line
      if (!isValidTransactionRow(parseFixedWidthLine(line))) {
        continue;
      }
    }

    // Parse the line using fixed-width column positions
    // BCA format approximate positions (may need adjustment):
    // TANGGAL: 0-12 chars
    // KETERANGAN: 12-30 chars
    // DETAIL TRANSAKSI: 30-70 chars
    // MUTASI: 70-90 chars
    // SALDO: 90+ chars
    const parsedRow = parseFixedWidthLine(line);
    
    if (parsedRow && parsedRow.length > 0) {
      rows.push(parsedRow);
    }
  }

  return rows;
}

/**
 * Parse a line using fixed-width column positions.
 * This is an approximation - actual positions may vary by PDF.
 */
function parseFixedWidthLine(line: string): any[] {
  if (!line || line.trim().length === 0) {
    return [];
  }

  // Try to split by whitespace first, then fall back to fixed positions
  // Look for date pattern at the start (DD/MM or DD-MM)
  const dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2})/);
  
  if (!dateMatch) {
    // Might be a continuation line - check if it has content
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      // Return as continuation row (empty date, content in other columns)
      return ['', trimmed, '', '', ''];
    }
    return [];
  }

  const date = dateMatch[1];
  const restOfLine = line.substring(dateMatch[0].length).trim();

  // Try to extract columns by looking for patterns
  // MUTASI and SALDO are usually at the end and contain numbers
  const numberPattern = /([\d.,\-]+(?:\s*(?:DB|CR))?)/g;
  const numbers: string[] = [];
  let match;
  
  while ((match = numberPattern.exec(restOfLine)) !== null) {
    numbers.push(match[1].trim());
  }

  // Last two numbers are usually MUTASI and SALDO
  let mutasi = '';
  let saldo = '';
  
  if (numbers.length >= 2) {
    saldo = numbers[numbers.length - 1];
    mutasi = numbers[numbers.length - 2];
  } else if (numbers.length === 1) {
    saldo = numbers[0];
  }

  // Remove MUTASI and SALDO from the rest of the line to get description
  let description = restOfLine;
  if (mutasi) {
    description = description.replace(mutasi, '').trim();
  }
  if (saldo) {
    description = description.replace(saldo, '').trim();
  }

  // Split description into KETERANGAN and DETAIL TRANSAKSI
  // This is approximate - we'll use the first part as KETERANGAN
  // and the rest as DETAIL TRANSAKSI
  const descParts = description.split(/\s{2,}/); // Split on multiple spaces
  const keterangan = descParts[0] || '';
  const detailTransaksi = descParts.slice(1).join(' ') || description.substring(keterangan.length).trim();

  return [
    date,
    keterangan,
    detailTransaksi || description,
    mutasi,
    saldo
  ];
}

/**
 * Alternative parsing method: Use regex to extract structured data
 */
function parseTableWithRegex(text: string): any[][] {
  const rows: any[][] = [];
  const lines = text.split('\n');
  
  let inTable = false;
  let headerFound = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Find table header
    if (!headerFound && trimmed.toUpperCase().includes('TANGGAL')) {
      headerFound = true;
      inTable = true;
      continue;
    }

    if (!inTable) {
      continue;
    }

    // Pattern for transaction line: date followed by description and amounts
    // Format: DD/MM description... amount amount
    const transactionPattern = /^(\d{1,2}[\/\-]\d{1,2}(?:\s+\d{1,2}[\/\-]\d{1,2})?)\s+(.+?)\s+([\d.,\-]+(?:\s*(?:DB|CR))?)\s+([\d.,\-]+(?:\s*(?:DB|CR))?)$/;
    
    const match = trimmed.match(transactionPattern);
    
    if (match) {
      const [, date, description, mutasi, saldo] = match;
      
      // Split description into KETERANGAN and DETAIL TRANSAKSI (approximate)
      const descParts = description.split(/\s{2,}/);
      const keterangan = descParts[0] || '';
      const detailTransaksi = descParts.slice(1).join(' ') || description.substring(keterangan.length).trim();
      
      rows.push([date.trim(), keterangan, detailTransaksi, mutasi.trim(), saldo.trim()]);
    } else {
      // Try simpler pattern for continuation lines or lines without full data
      const simpleDatePattern = /^(\d{1,2}[\/\-]\d{1,2})/;
      if (simpleDatePattern.test(trimmed)) {
        const parsed = parseFixedWidthLine(trimmed);
        if (parsed && parsed.length >= 3) {
          rows.push(parsed);
        }
      } else if (trimmed.length > 10 && !/^\d+$/.test(trimmed)) {
        // Might be a continuation line
        rows.push(['', '', trimmed, '', '']);
      }
    }
  }

  return rows;
}

/**
 * Extract all transaction tables from a PDF file.
 */
export async function extractTablesFromPdf(pdfBuffer: Buffer): Promise<any[][]> {
  try {
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      throw new Error("PDF contains no extractable text");
    }

    // Try regex-based parsing first
    let rows = parseTableWithRegex(text);
    
    // If that doesn't work well, try fixed-width parsing
    if (rows.length === 0) {
      rows = parseTableFromText(text);
    }

    // Filter out invalid rows
    const validRows = rows.filter(isValidTransactionRow);

    // Merge multi-line transactions
    const mergedRows = mergeTransactionLines(validRows);

    return mergedRows;
  } catch (error) {
    throw new Error(`Error reading PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get the expected column names for bank transaction tables.
 */
export function getExpectedColumns(): string[] {
  return [...EXPECTED_COLUMNS];
}
