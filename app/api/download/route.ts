import { NextRequest, NextResponse } from 'next/server';
import { generateExcelFile } from '@/lib/excelGenerator';
import { applyCategoriesToData } from '@/lib/categoryMapper';
import { TransactionRow, Category } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, categories } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'No transaction data found. Please upload a PDF first.' },
        { status: 400 }
      );
    }

    // Convert data to TransactionRow format
    const transactionData: TransactionRow[] = data.map((row: any) => ({
      TANGGAL: row.TANGGAL || '',
      KETERANGAN: row.KETERANGAN || '',
      'DETAIL TRANSAKSI': row['DETAIL TRANSAKSI'] || '',
      MUTASI: row.MUTASI ?? null,
      SALDO: row.SALDO ?? null,
      CATEGORY: row.CATEGORY,
    }));

    // Apply categories if provided
    if (categories && Array.isArray(categories) && categories.length > 0) {
      applyCategoriesToData(transactionData, categories as Category[]);
    }

    // Generate Excel file
    const excelBuffer = await generateExcelFile(transactionData);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `bank_transaction_${timestamp}.xlsx`;

    // Return as file download
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel file:', error);
    return NextResponse.json(
      { error: `Error generating Excel file: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
