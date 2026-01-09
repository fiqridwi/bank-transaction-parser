"""
Flask Application for PDF to Excel Converter

This is the main application file that provides a web UI for:
- Uploading PDF bank transaction statements
- Previewing extracted transaction data
- Exporting data to Excel format
"""

from flask import Flask, render_template, request, jsonify, send_file, session
import pandas as pd
import io
import json
from datetime import datetime
from pdf_parser import extract_tables_from_pdf, get_expected_columns
from data_cleaner import clean_transaction_data
from category_store import get_starter_categories
from category_mapper import apply_categories_to_dataframe

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-in-production'  # Change this in production


def generate_excel_file(df: pd.DataFrame) -> bytes:
    """
    Generate Excel file from DataFrame.
    
    Args:
        df: Cleaned DataFrame with transaction data
        
    Returns:
        bytes: Excel file as bytes
    """
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Transactions', index=False)
    
    output.seek(0)
    return output.getvalue()


@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')


@app.route('/api/starter-categories', methods=['GET'])
def get_starter_categories_api():
    """Return default starter categories for first-time users."""
    return jsonify(get_starter_categories())


@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle PDF file upload and extraction."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'File must be a PDF'}), 400
        
        # Read PDF file
        pdf_bytes = file.read()
        pdf_file = io.BytesIO(pdf_bytes)
        
        # Extract tables from PDF
        raw_rows = extract_tables_from_pdf(pdf_file)
        
        if not raw_rows:
            return jsonify({'error': 'No transaction tables found in the PDF. Please verify the file format.'}), 400
        
        # Convert to DataFrame
        expected_columns = get_expected_columns()
        
        # Create DataFrame with expected columns
        if len(raw_rows) > 0:
            # Determine number of columns
            max_cols = max(len(row) for row in raw_rows) if raw_rows else len(expected_columns)
            columns = expected_columns[:max_cols] if max_cols <= len(expected_columns) else expected_columns + [f"COL_{i}" for i in range(len(expected_columns), max_cols)]
            
            # Pad rows to have same number of columns
            padded_rows = []
            for row in raw_rows:
                padded_row = list(row) + [None] * (max_cols - len(row))
                padded_rows.append(padded_row[:max_cols])
            
            df_raw = pd.DataFrame(padded_rows, columns=columns[:max_cols])
            
            # Clean the data
            df_cleaned = clean_transaction_data(df_raw, expected_columns)
            
            if df_cleaned.empty:
                return jsonify({'error': 'No valid transaction data found after cleaning. Please verify the PDF format.'}), 400
            
            # Get categories from request if provided (sent from client-side localStorage)
            categories_json = request.form.get('categories')
            if categories_json:
                try:
                    categories = json.loads(categories_json)
                    # Apply category mapping
                    apply_categories_to_dataframe(df_cleaned, categories)
                    
                    # Reorder columns to put CATEGORY after DETAIL TRANSAKSI
                    if 'CATEGORY' in df_cleaned.columns:
                        cols = list(df_cleaned.columns)
                        if 'DETAIL TRANSAKSI' in cols:
                            detail_idx = cols.index('DETAIL TRANSAKSI')
                            cols.remove('CATEGORY')
                            cols.insert(detail_idx + 1, 'CATEGORY')
                            df_cleaned = df_cleaned[cols]
                except (json.JSONDecodeError, Exception) as e:
                    # If category parsing fails, continue without categories
                    print(f"Warning: Could not apply categories: {e}")
            
            # Convert DataFrame to JSON for storage in session
            # Store as JSON string to avoid session size limits
            df_json = df_cleaned.to_json(orient='records', date_format='iso')
            session['transaction_data'] = df_json
            session['transaction_columns'] = list(df_cleaned.columns)
            
            # Return preview data (first 100 rows for display)
            preview_df = df_cleaned.head(100)
            preview_data = {
                'total_rows': len(df_cleaned),
                'columns': list(df_cleaned.columns),
                'preview': preview_df.to_dict(orient='records'),
                'statistics': {
                    'total_transactions': len(df_cleaned),
                    'columns_count': len(df_cleaned.columns),
                    'has_date_range': 'TANGGAL' in df_cleaned.columns
                }
            }
            
            return jsonify(preview_data)
    
    except Exception as e:
        return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500


@app.route('/download', methods=['POST'])
def download_excel():
    """Generate and return Excel file with categorized data."""
    try:
        # Get transaction data from session
        if 'transaction_data' not in session:
            return jsonify({'error': 'No transaction data found. Please upload a PDF first.'}), 400
        
        # Reconstruct DataFrame from session
        df = pd.DataFrame(json.loads(session['transaction_data']))
        
        # Get categories from request (sent from client-side localStorage)
        categories_json = request.json.get('categories', [])
        
        if categories_json:
            # Apply category mapping
            apply_categories_to_dataframe(df, categories_json)
            
            # Reorder columns to put CATEGORY after DETAIL TRANSAKSI
            if 'CATEGORY' in df.columns:
                cols = list(df.columns)
                if 'DETAIL TRANSAKSI' in cols:
                    detail_idx = cols.index('DETAIL TRANSAKSI')
                    cols.remove('CATEGORY')
                    cols.insert(detail_idx + 1, 'CATEGORY')
                    df = df[cols]
        
        # Generate Excel file
        excel_data = generate_excel_file(df)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"bank_transaction_{timestamp}.xlsx"
        
        # Return as file download
        return send_file(
            io.BytesIO(excel_data),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        return jsonify({'error': f'Error generating Excel file: {str(e)}'}), 500


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=8000)
