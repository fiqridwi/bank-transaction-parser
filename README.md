# PDF to Excel Converter for Bank Transactions

A modern Next.js web application that extracts bank transaction data from PDF statements and converts them to Excel format.

## Features

- 📄 **Multi-page PDF Support**: Extracts transaction tables from all pages
- 🔍 **Smart Table Detection**: Automatically identifies transaction tables with columns: TANGGAL, KETERANGAN, DETAIL TRANSAKSI, MUTASI, SALDO
- 🧹 **Data Cleaning**: Normalizes currency values, handles multi-line descriptions, and removes formatting artifacts
- 🏷️ **Category Management**: Categorize transactions automatically based on customizable keywords (stored in browser localStorage)
- 📊 **Interactive Preview**: View extracted data in a scrollable table before export
- 💾 **Excel Export**: Download cleaned data as `.xlsx` files with proper formatting
- 🎨 **Modern UI**: Beautiful dark-themed interface with smooth animations and responsive design

## Requirements

- Node.js 18+ or higher
- npm or yarn package manager

## Installation

1. **Navigate to the project directory:**
   ```bash
   cd pdf-to-excel
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

## Usage

1. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Open your browser:**
   - Navigate to `http://localhost:3000`

3. **Manage Categories (Optional):**
   - Click "Manage Categories" to set up transaction categories
   - Add, edit, or delete categories and their associated keywords
   - Categories are stored in your browser's localStorage and persist across sessions
   - Transactions are automatically categorized based on keywords in the DETAIL TRANSAKSI field

4. **Upload a PDF file:**
   - Click the upload area or drag and drop a PDF file
   - The application will automatically extract transaction data

5. **Preview the data:**
   - Review the extracted transactions in the preview table
   - Check the statistics (total transactions, columns, date range)
   - Categories are automatically applied to transactions based on your configured keywords

6. **Export to Excel:**
   - Click the "Download Excel File" button
   - The file will be saved as `bank_transaction_<timestamp>.xlsx`

## Production Build

1. **Build the application:**
   ```bash
   npm run build
   # or
   yarn build
   ```

2. **Start the production server:**
   ```bash
   npm start
   # or
   yarn start
   ```

## Project Structure

```
pdf-to-excel/
├── app/
│   ├── api/              # Next.js API routes
│   │   ├── upload/       # PDF upload and processing
│   │   ├── download/     # Excel file generation
│   │   └── categories/  # Starter categories endpoint
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main page component
│   └── globals.css       # Global styles
├── components/           # React components
│   ├── FileUpload.tsx
│   ├── TransactionPreview.tsx
│   ├── Statistics.tsx
│   └── CategoryModal.tsx
├── lib/                  # Utility functions
│   ├── pdfParser.ts      # PDF extraction logic using pdf-parse
│   ├── dataCleaner.ts    # Data cleaning and normalization
│   ├── categoryMapper.ts # Transaction categorization
│   ├── categoryStore.ts  # Default categories
│   ├── excelGenerator.ts # Excel file generation using exceljs
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
├── hooks/                # React hooks
│   └── useCategories.ts  # Category management hook
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript configuration
└── tailwind.config.ts    # Tailwind CSS configuration
```

## How It Works

1. **PDF Upload**: User uploads a PDF file through the web interface
2. **Table Extraction**: The parser extracts text from PDF and parses transaction tables using regex patterns
3. **Data Cleaning**: 
   - Normalizes column names
   - Removes currency symbols and thousand separators
   - Converts numeric values (MUTASI, SALDO) to numbers
   - Merges multi-line descriptions in KETERANGAN field
4. **Categorization**: Applies categories based on keyword matching in transaction details
5. **Preview**: Displays cleaned data in an interactive table
6. **Export**: Generates Excel file with proper formatting using exceljs

## Edge Cases Handled

- ✅ Multi-line transaction descriptions
- ✅ Empty rows between transactions
- ✅ Repeated header rows on each page
- ✅ Indonesian currency formatting (Rp, dots as thousand separators)
- ✅ Unreadable or corrupted PDF files
- ✅ PDFs with no transaction tables

## Category Management

Category data is stored in your browser's localStorage, which means:
- ✅ Categories persist across sessions and browser restarts
- ✅ No server-side storage required - all data stays in your browser
- ✅ Each browser maintains its own set of categories
- ⚠️ Clearing browser data will reset categories to defaults
- ⚠️ Categories are browser-specific (not shared across different browsers)

### Default Categories

The application comes with pre-configured categories:
- Grocery (Indomaret, Alfamart, etc.)
- Makan (Restaurants, cafes, food vendors)
- Shopping (Shopee, Tokopedia)
- Gopay (Gopay top-ups and transactions)
- ATM (ATM withdrawals and transfers)
- Income (Salary, transfers)
- Gift (Charitable donations)
- Kostan (Rent/boarding)

## Dependencies

- **next**: React framework for production
- **react**: UI library
- **typescript**: Type safety
- **tailwindcss**: Utility-first CSS framework
- **pdf-parse**: PDF text extraction
- **exceljs**: Excel file generation
- **clsx** & **tailwind-merge**: Utility for conditional class names

## Migration from Flask/Python

This project has been migrated from a Flask/Python application. Key changes:
- **Backend**: Flask → Next.js API routes
- **PDF Parsing**: pdfplumber → pdf-parse (text-based extraction)
- **Data Processing**: pandas → Native TypeScript
- **Excel Generation**: openpyxl → exceljs
- **Frontend**: Vanilla JS → React with TypeScript
- **Styling**: Plain CSS → Tailwind CSS

## Troubleshooting

### No tables found
- Verify that your PDF contains tabular data with the expected columns
- Check that the PDF is not password-protected or corrupted
- The PDF parser uses text extraction, so the PDF must have selectable text

### Extraction errors
- Ensure the PDF format matches the expected structure (TANGGAL, KETERANGAN, DETAIL TRANSAKSI, MUTASI, SALDO columns)
- Try opening the PDF in a PDF viewer to verify it's readable
- The parsing logic may need adjustment for different bank statement formats

### Installation issues
- Make sure you're using Node.js 18 or higher: `node --version`
- Try clearing node_modules and reinstalling: `rm -rf node_modules && npm install`
- Check that all dependencies are compatible with your Node version

## License

This project is provided as-is for converting bank transaction PDFs to Excel format.
