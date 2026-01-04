# PDF to Excel Converter for Bank Transactions

A Streamlit-based web application that extracts bank transaction data from PDF statements and converts them to Excel format.

## Features

- 📄 **Multi-page PDF Support**: Extracts transaction tables from all pages
- 🔍 **Smart Table Detection**: Automatically identifies transaction tables with columns: TANGGAL, KETERANGAN, DETAIL TRANSAKSI, MUTASI, SALDO
- 🧹 **Data Cleaning**: Normalizes currency values, handles multi-line descriptions, and removes formatting artifacts
- 📊 **Interactive Preview**: View extracted data in a scrollable table before export
- 💾 **Excel Export**: Download cleaned data as `.xlsx` files with proper formatting

## Requirements

- Python 3.10 or higher
- pip (Python package manager)

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd pdf-to-excel
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. **Start the Streamlit application:**
   ```bash
   streamlit run app.py
   ```

2. **Open your browser:**
   - The app will automatically open in your default browser
   - If not, navigate to `http://localhost:8501`

3. **Upload a PDF file:**
   - Click "Browse files" or drag and drop a PDF file
   - The application will automatically extract transaction data

4. **Preview the data:**
   - Review the extracted transactions in the preview table
   - Check the statistics (total transactions, columns, date range)

5. **Export to Excel:**
   - Click the "Download Excel File" button
   - The file will be saved as `bank_transaction_<timestamp>.xlsx`

## Project Structure

```
pdf-to-excel/
├── app.py              # Main Streamlit application
├── pdf_parser.py       # PDF extraction logic using pdfplumber
├── data_cleaner.py     # Data cleaning and normalization utilities
├── requirements.txt    # Python dependencies
├── README.md           # This file
└── docs/               # Sample PDF files
```

## How It Works

1. **PDF Upload**: User uploads a PDF file through the web interface
2. **Table Extraction**: The parser iterates through all pages and extracts tabular data
3. **Data Cleaning**: 
   - Normalizes column names
   - Removes currency symbols and thousand separators
   - Converts numeric values (MUTASI, SALDO) to float
   - Merges multi-line descriptions in KETERANGAN field
4. **Preview**: Displays cleaned data in an interactive table
5. **Export**: Generates Excel file with proper formatting

## Edge Cases Handled

- ✅ Multi-line transaction descriptions
- ✅ Empty rows between transactions
- ✅ Repeated header rows on each page
- ✅ Indonesian currency formatting (Rp, dots as thousand separators)
- ✅ Unreadable or corrupted PDF files
- ✅ PDFs with no transaction tables

## Dependencies

- **streamlit**: Web framework for the UI
- **pdfplumber**: PDF parsing and table extraction
- **pandas**: Data manipulation and Excel export
- **openpyxl**: Excel file generation

## Troubleshooting

### No tables found
- Verify that your PDF contains tabular data with the expected columns
- Check that the PDF is not password-protected or corrupted

### Extraction errors
- Ensure the PDF format matches the expected structure (TANGGAL, KETERANGAN, DETAIL TRANSAKSI, MUTASI, SALDO columns)
- Try opening the PDF in a PDF viewer to verify it's readable

### Installation issues
- Make sure you're using Python 3.10 or higher: `python --version`
- Try upgrading pip: `pip install --upgrade pip`
- Install dependencies in a virtual environment for isolation

## License

This project is provided as-is for converting bank transaction PDFs to Excel format.

