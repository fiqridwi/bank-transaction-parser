export interface Category {
  category: string;
  keywords: string[];
}

export interface TransactionRow {
  TANGGAL: string;
  KETERANGAN: string;
  "DETAIL TRANSAKSI": string;
  MUTASI: number | null;
  SALDO: number | null;
  CATEGORY?: string;
  [key: string]: string | number | null | undefined;
}

export interface PreviewData {
  total_rows: number;
  columns: string[];
  preview: TransactionRow[];
  statistics: {
    total_transactions: number;
    columns_count: number;
    has_date_range: boolean;
  };
}

export interface UploadResponse {
  error?: string;
  total_rows?: number;
  columns?: string[];
  preview?: TransactionRow[];
  statistics?: {
    total_transactions: number;
    columns_count: number;
    has_date_range: boolean;
  };
}
