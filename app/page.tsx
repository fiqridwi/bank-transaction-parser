'use client';

import { useState, useEffect } from 'react';
import FileUpload from '@/components/FileUpload';
import Statistics from '@/components/Statistics';
import TransactionPreview from '@/components/TransactionPreview';
import CategoryModal from '@/components/CategoryModal';
import WelcomeDialog from '@/components/WelcomeDialog';
import { useCategories } from '@/hooks/useCategories';
import { PreviewData, TransactionRow } from '@/lib/types';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [fullData, setFullData] = useState<TransactionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isWelcomeDialogOpen, setIsWelcomeDialogOpen] = useState(false);
  const { categories } = useCategories();

  useEffect(() => {
    // Show welcome dialog on page load
    setIsWelcomeDialogOpen(true);
  }, []);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setPreviewData(null);
    setFullData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categories', JSON.stringify(categories));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        // Store full data for download
        setFullData(data.full_data || data.preview);
        setPreviewData({
          total_rows: data.total_rows,
          columns: data.columns,
          preview: data.preview,
          statistics: data.statistics,
        });
      }
    } catch (err) {
      setError(`Error processing PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!fullData || fullData.length === 0) {
      alert('❌ No transaction data available. Please upload a PDF first.');
      return;
    }

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: fullData,
          categories: categories,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error downloading file');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank_transaction_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`❌ Error downloading file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            📊 Bank Transaction Converter
          </h1>
          <p className="text-xl text-gray-400">
            Convert bank transaction PDF statements to Excel format
          </p>
        </header>

        {/* Category Management Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors shadow-lg"
          >
            📝 Manage Categories
          </button>
        </div>

        <hr className="border-gray-700 mb-8" />

        {/* Main Content */}
        <div className="space-y-8">
          {/* File Upload Section */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Upload PDF File</h2>
            <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
            
            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                ❌ {error}
              </div>
            )}

            {isProcessing && (
              <div className="mt-4 p-4 bg-blue-900/50 border border-blue-700 rounded-lg text-blue-200">
                Extracting data from PDF... Please wait.
              </div>
            )}

            {previewData && !error && (
              <div className="mt-4 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-200">
                ✅ Successfully extracted {previewData.total_rows} transactions!
              </div>
            )}
          </section>

          {/* Statistics Section */}
          {previewData && (
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Statistics</h2>
              <Statistics statistics={previewData.statistics} />
            </section>
          )}

          {/* Preview Section */}
          {previewData && (
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">📋 Transaction Preview</h2>
              <TransactionPreview
                columns={previewData.columns}
                preview={previewData.preview}
              />
            </section>
          )}

          {/* Export Section */}
          {previewData && (
            <section className="text-center">
              <h2 className="text-2xl font-semibold text-white mb-4">💾 Export to Excel</h2>
              <button
                onClick={handleDownload}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                📥 Download Excel File
              </button>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 border-t border-gray-800 pt-8">
          <p>Bank Transaction Converter</p>
        </footer>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* Welcome Dialog */}
      <WelcomeDialog
        isOpen={isWelcomeDialogOpen}
        onClose={() => setIsWelcomeDialogOpen(false)}
      />
    </main>
  );
}
