'use client';

import { PreviewData } from '@/lib/types';

interface StatisticsProps {
  statistics: PreviewData['statistics'];
}

export default function Statistics({ statistics }: StatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <div className="text-sm text-gray-400 mb-2">Total Transactions</div>
        <div className="text-3xl font-bold text-white">{statistics.total_transactions}</div>
      </div>
      
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <div className="text-sm text-gray-400 mb-2">Columns</div>
        <div className="text-3xl font-bold text-white">{statistics.columns_count}</div>
      </div>
      
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
        <div className="text-sm text-gray-400 mb-2">Date Range</div>
        <div className="text-3xl font-bold text-white">
          {statistics.has_date_range ? 'Available' : 'N/A'}
        </div>
      </div>
    </div>
  );
}
