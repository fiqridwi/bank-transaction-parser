"""
PDF Parser Module for Bank Transaction Statements

This module handles extraction of tabular data from PDF files using pdfplumber.
It specifically targets bank transaction tables with columns:
TANGGAL, KETERANGAN, DETAIL TRANSAKSI, MUTASI, SALDO
"""

import pdfplumber
from typing import List, Optional, Any, Dict
import io
import re
from collections import defaultdict


def is_valid_transaction_row(row: List[Any]) -> bool:
    """
    Validate if a row contains transaction data.
    
    Args:
        row: List of cell values from a table row
        
    Returns:
        bool: True if row appears to be a transaction row
    """
    if not row or len(row) < 2:
        return False
    
    # Skip header rows (first cell contains "TANGGAL")
    first_cell = str(row[0]).strip().upper() if row[0] else ""
    if "TANGGAL" in first_cell:
        return False
    
    # Skip completely empty rows
    if all(cell is None or str(cell).strip() == "" for cell in row):
        return False
    
    # Check if first column contains a date pattern (DD/MM format)
    first_cell_str = str(row[0]).strip() if row[0] else ""
    date_pattern = re.search(r'\d{1,2}/\d{1,2}', first_cell_str)
    
    # Accept rows that either:
    # 1. Have a date in first column (main transaction row)
    # 2. Have content in KETERANGAN or DETAIL TRANSAKSI column (continuation row)
    if date_pattern:
        return True
    
    # Check if it's a continuation row with content
    second_cell_str = str(row[1]).strip() if len(row) > 1 and row[1] else ""
    third_cell_str = str(row[2]).strip() if len(row) > 2 and row[2] else ""
    
    if second_cell_str or third_cell_str:
        return True
    
    return False


def group_words_into_rows(words: List[Dict], y_tolerance: float = 3.0) -> List[List[Dict]]:
    """
    Group words into rows based on their Y coordinate.
    
    Args:
        words: List of word dictionaries with 'top', 'x0', 'text' keys
        y_tolerance: Tolerance for grouping words on the same line
        
    Returns:
        List of rows, where each row is a list of word dictionaries
    """
    if not words:
        return []
    
    # Group words by Y coordinate (rounded to tolerance)
    lines = defaultdict(list)
    for word in words:
        y_key = round(word['top'] / y_tolerance) * y_tolerance
        lines[y_key].append(word)
    
    # Sort by Y coordinate (top to bottom)
    # In pdfplumber: Y=0 is at top, Y increases going down
    # So we sort in ascending order (smallest Y first = top rows first)
    sorted_y_keys = sorted(lines.keys(), reverse=False)
    
    # Convert to list of rows
    rows = []
    for y_key in sorted_y_keys:
        # Sort words in row by X coordinate (left to right)
        row_words = sorted(lines[y_key], key=lambda w: w['x0'])
        rows.append(row_words)
    
    return rows


def assign_words_to_columns(row_words: List[Dict]) -> List[str]:
    """
    Assign words in a row to columns based on X position.
    
    Column boundaries (based on BCA PDF structure):
    - TANGGAL: 0-80
    - KETERANGAN: 80-190
    - DETAIL TRANSAKSI: 190-380
    - MUTASI: 380-460
    - SALDO: 460+
    
    Args:
        row_words: List of word dictionaries in a single row
        
    Returns:
        List of 5 column values (strings)
    """
    columns = ['', '', '', '', '']  # TANGGAL, KETERANGAN, DETAIL TRANSAKSI, MUTASI, SALDO
    
    for word in row_words:
        x0 = word['x0']
        text = word['text'].strip()
        
        if not text:
            continue
        
        # Assign to appropriate column based on X position
        if x0 < 80:
            # TANGGAL column
            if columns[0]:
                columns[0] += ' ' + text
            else:
                columns[0] = text
        elif x0 < 190:
            # KETERANGAN column
            if columns[1]:
                columns[1] += ' ' + text
            else:
                columns[1] = text
        elif x0 < 380:
            # DETAIL TRANSAKSI column
            if columns[2]:
                columns[2] += ' ' + text
            else:
                columns[2] = text
        elif x0 < 460:
            # MUTASI column
            if columns[3]:
                columns[3] += ' ' + text
            else:
                columns[3] = text
        else:
            # SALDO column
            if columns[4]:
                columns[4] += ' ' + text
            else:
                columns[4] = text
    
    return columns


def merge_transaction_lines(rows: List[List[str]]) -> List[List[str]]:
    """
    Merge multi-line transactions into single rows.
    
    Identifies rows starting with date pattern (DD/MM) and merges
    continuation rows (without dates) into the previous transaction.
    
    Args:
        rows: List of rows, each row is a list of 5 column values
        
    Returns:
        List of merged rows
    """
    if not rows:
        return []
    
    merged_rows = []
    current_transaction = None
    
    for row in rows:
        if len(row) < 5:
            continue
        
        tanggal = str(row[0]).strip()
        
        # Check if this row starts with a date (DD/MM format)
        has_date = bool(re.search(r'\d{1,2}/\d{1,2}', tanggal))
        
        if has_date:
            # This is a new transaction row
            if current_transaction is not None:
                merged_rows.append(current_transaction)
            
            # Start new transaction
            current_transaction = row.copy()
        else:
            # This is a continuation row - merge into current transaction
            if current_transaction is not None:
                # Merge DETAIL TRANSAKSI column (index 2) - continuation details
                # Handle None, empty string, and whitespace-only values
                detail_value = str(row[2]).strip() if row[2] is not None else ""
                if detail_value:
                    current_detail = str(current_transaction[2]).strip() if current_transaction[2] is not None else ""
                    if current_detail:
                        current_transaction[2] = current_detail + ' ' + detail_value
                    else:
                        current_transaction[2] = detail_value
                
                # Also merge KETERANGAN if it has content (index 1)
                keterangan_value = str(row[1]).strip() if row[1] is not None else ""
                if keterangan_value:
                    current_keterangan = str(current_transaction[1]).strip() if current_transaction[1] is not None else ""
                    if current_keterangan:
                        current_transaction[1] = current_keterangan + ' ' + keterangan_value
                    else:
                        current_transaction[1] = keterangan_value
                
                # If MUTASI or SALDO appear in continuation, they might be missing from main row
                mutasi_value = str(row[3]).strip() if row[3] is not None else ""
                if mutasi_value and (not current_transaction[3] or not str(current_transaction[3]).strip()):
                    current_transaction[3] = mutasi_value
                
                saldo_value = str(row[4]).strip() if row[4] is not None else ""
                if saldo_value and (not current_transaction[4] or not str(current_transaction[4]).strip()):
                    current_transaction[4] = saldo_value
    
    # Add the last transaction
    if current_transaction is not None:
        merged_rows.append(current_transaction)
    
    return merged_rows


def extract_table_from_page(page: Any) -> List[List[Any]]:
    """
    Extract table data from a single PDF page using position-based extraction.
    
    This function extracts words with their coordinates and groups them into
    columns based on X position, which works better for PDFs without explicit
    table borders.
    
    Args:
        page: pdfplumber Page object
        
    Returns:
        List of rows, where each row is a list of 5 column values
    """
    # Extract all words with their coordinates
    words = page.extract_words()
    
    if not words:
        return []
    
    # Find the actual Y position of the "TANGGAL" header row by searching for words
    # containing "TANGGAL" in the extracted words and using their actual coordinates
    table_start_y = None
    
    # Search for words containing "TANGGAL" to find the header row's Y position
    for word in words:
        word_text = word.get('text', '').strip().upper()
        if 'TANGGAL' in word_text:
            # Found the header word, use its Y coordinate
            # Add a small buffer (10 pixels) below the header to capture all transactions
            table_start_y = word['top'] + 10
            break
    
    # If we couldn't find header in words, try fallback method using text extraction
    if table_start_y is None:
        text = page.extract_text()
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if 'TANGGAL' in line.upper() and 'KETERANGAN' in line.upper():
                # Found header in text, but we need to find its Y position
                # Search for any word near the expected header position
                # Use a conservative default that should work for most PDFs
                table_start_y = 350
                break
    
    # If we still couldn't find header, use a default threshold
    if table_start_y is None:
        table_start_y = 300
    
    # Filter words that are in the transaction area (below header)
    transaction_words = [w for w in words if w['top'] > table_start_y]
    
    if not transaction_words:
        return []
    
    # Group words into rows based on Y coordinate
    # Increased tolerance to 5.0 to handle slight variations in text positioning
    word_rows = group_words_into_rows(transaction_words, y_tolerance=5.0)
    
    # Convert word rows to column-based rows
    column_rows = []
    for word_row in word_rows:
        columns = assign_words_to_columns(word_row)
        column_rows.append(columns)
    
    # Filter out invalid rows (header, empty rows, etc.)
    valid_rows = []
    for row in column_rows:
        if is_valid_transaction_row(row):
            valid_rows.append(row)
    
    # Merge multi-line transactions
    merged_rows = merge_transaction_lines(valid_rows)
    
    return merged_rows


def extract_tables_from_pdf(pdf_file: io.BytesIO) -> List[List[Any]]:
    """
    Extract all transaction tables from a multi-page PDF file.
    
    Args:
        pdf_file: BytesIO object containing the PDF file
        
    Returns:
        List of all transaction rows across all pages
        
    Raises:
        Exception: If PDF cannot be read or parsed
    """
    try:
        all_rows = []
        
        with pdfplumber.open(pdf_file) as pdf:
            # Iterate through all pages
            for page_num, page in enumerate(pdf.pages, start=1):
                page_rows = extract_table_from_page(page)
                all_rows.extend(page_rows)
        
        return all_rows
    
    except Exception as e:
        raise Exception(f"Error reading PDF: {str(e)}")


def get_expected_columns() -> List[str]:
    """
    Return the expected column names for bank transaction tables.
    
    Returns:
        List of column names in expected order
    """
    return ["TANGGAL", "KETERANGAN", "DETAIL TRANSAKSI", "MUTASI", "SALDO"]

