import { NextRequest, NextResponse } from 'next/server';
import { extractTablesFromPdf, getExpectedColumns } from '@/lib/pdfParser';
import { cleanTransactionData } from '@/lib/dataCleaner';
import { applyCategoriesToData } from '@/lib/categoryMapper';
import { Category, TransactionRow, PreviewData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const categoriesJson = formData.get('categories') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Read PDF file
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Extract tables from PDF
    const rawRows = await extractTablesFromPdf(pdfBuffer);

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        { error: 'No transaction tables found in the PDF. Please verify the file format.' },
        { status: 400 }
      );
    }

    // Clean the data
    const cleanedData = cleanTransactionData(rawRows);

    if (cleanedData.length === 0) {
      return NextResponse.json(
        { error: 'No valid transaction data found after cleaning. Please verify the PDF format.' },
        { status: 400 }
      );
    }

    // Apply categories if provided
    let categories: Category[] = [];
    if (categoriesJson) {
      try {
        categories = JSON.parse(categoriesJson);
        applyCategoriesToData(cleanedData, categories);
      } catch (e) {
        console.warn('Could not apply categories:', e);
      }
    }

    // Reorder columns to put CATEGORY after DETAIL TRANSAKSI if it exists
    const columns = getExpectedColumns();
    if (cleanedData.length > 0 && 'CATEGORY' in cleanedData[0]) {
      const categoryIndex = columns.indexOf('DETAIL TRANSAKSI');
      if (categoryIndex >= 0) {
        columns.splice(categoryIndex + 1, 0, 'CATEGORY');
      } else {
        columns.push('CATEGORY');
      }
    }

    // Return preview data (first 100 rows for display)
    const previewRows = cleanedData.slice(0, 100);
    const previewData: PreviewData = {
      total_rows: cleanedData.length,
      columns: columns,
      preview: previewRows,
      statistics: {
        total_transactions: cleanedData.length,
        columns_count: columns.length,
        has_date_range: cleanedData.some(row => row.TANGGAL && row.TANGGAL.trim() !== ''),
      },
    };

    // Store full data in response (we'll need it for download)
    // In a real app, you might want to store this in a session or cache
    // For now, we'll return it and the client will send it back for download
    return NextResponse.json({
      ...previewData,
      full_data: cleanedData, // Include full data for download
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: `Error processing PDF: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
