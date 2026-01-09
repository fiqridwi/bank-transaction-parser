import ExcelJS from 'exceljs';
import { TransactionRow } from './types';

/**
 * Generate Excel file from transaction data.
 * 
 * @param data - Array of transaction rows
 * @returns Promise that resolves to Excel file buffer
 */
export async function generateExcelFile(data: TransactionRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transactions');

  if (!data || data.length === 0) {
    // Create empty worksheet with headers
    const headers = ['TANGGAL', 'KETERANGAN', 'DETAIL TRANSAKSI', 'MUTASI', 'SALDO', 'CATEGORY'];
    worksheet.addRow(headers);
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF34495E' }
    };
    headerRow.font = { ...headerRow.font, color: { argb: 'FFFFFFFF' }, bold: true };
    
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // Get all unique column names from data
  const allColumns = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => allColumns.add(key));
  });

  // Determine column order: TANGGAL, KETERANGAN, DETAIL TRANSAKSI, CATEGORY (if exists), MUTASI, SALDO, then others
  const preferredOrder = ['TANGGAL', 'KETERANGAN', 'DETAIL TRANSAKSI'];
  const categoryIndex = preferredOrder.length;
  if (allColumns.has('CATEGORY')) {
    preferredOrder.push('CATEGORY');
  }
  preferredOrder.push('MUTASI', 'SALDO');
  
  const remainingColumns = Array.from(allColumns).filter(
    col => !preferredOrder.includes(col)
  );
  const columnOrder = [...preferredOrder, ...remainingColumns];

  // Add header row
  worksheet.addRow(columnOrder);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF34495E' }
  };
  headerRow.font = { ...headerRow.font, color: { argb: 'FFFFFFFF' }, bold: true };

  // Add data rows
  data.forEach((row) => {
    const rowData = columnOrder.map(col => row[col] ?? '');
    worksheet.addRow(rowData);
  });

  // Format columns
  worksheet.columns.forEach((column, index) => {
    if (!column) return;
    
    const columnName = columnOrder[index];
    
    // Set column width
    if (columnName === 'TANGGAL') {
      column.width = 12;
    } else if (columnName === 'KETERANGAN') {
      column.width = 20;
    } else if (columnName === 'DETAIL TRANSAKSI') {
      column.width = 50;
    } else if (columnName === 'CATEGORY') {
      column.width = 15;
    } else if (columnName === 'MUTASI' || columnName === 'SALDO') {
      column.width = 18;
      // Format as number with 2 decimal places
      column.numFmt = '#,##0.00';
    } else {
      column.width = 15;
    }

    // Format numeric columns
    if ((columnName === 'MUTASI' || columnName === 'SALDO') && column && column.eachCell) {
      column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > 1 && cell.value !== null && cell.value !== '') {
          const numValue = typeof cell.value === 'number' 
            ? cell.value 
            : parseFloat(String(cell.value));
          if (!isNaN(numValue)) {
            cell.value = numValue;
            cell.numFmt = '#,##0.00';
          }
        }
      });
    }
  });

  // Freeze header row
  worksheet.views = [
    {
      state: 'frozen',
      ySplit: 1
    }
  ];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
