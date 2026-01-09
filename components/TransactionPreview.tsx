'use client';

import { TransactionRow } from '@/lib/types';

interface TransactionPreviewProps {
  columns: string[];
  preview: TransactionRow[];
}

export default function TransactionPreview({ columns, preview }: TransactionPreviewProps) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900/50 backdrop-blur-sm">
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full border-collapse">
          <thead className="bg-gray-800 sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-200 border-b border-gray-700"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
              >
                {columns.map((column) => {
                  const value = row[column];
                  const displayValue = value !== null && value !== undefined ? String(value) : '';
                  
                  return (
                    <td
                      key={column}
                      className="px-4 py-3 text-sm text-gray-300"
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
