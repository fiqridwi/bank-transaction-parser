"""
Data Cleaning Module for Bank Transaction Data

This module handles normalization and cleaning of extracted transaction data,
including currency formatting, column normalization, and handling multi-line descriptions.
"""

import pandas as pd
import re
from typing import Optional, Any


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardize column names by stripping whitespace and converting to uppercase.
    
    Args:
        df: DataFrame with potentially inconsistent column names
        
    Returns:
        DataFrame with normalized column names
    """
    df = df.copy()
    
    # Normalize column names
    df.columns = [str(col).strip().upper() if col else f"COL_{i}" 
                  for i, col in enumerate(df.columns)]
    
    return df


def clean_currency_value(value: Any) -> Optional[float]:
    """
    Clean currency values by removing currency symbols and thousand separators.
    Handles Indonesian format: 1.000.000,00 or 98,779,762.35
    Also handles DB/CR indicators that may be attached to amounts.
    
    Args:
        value: Currency value as string or number
        
    Returns:
        float: Numeric value, or None if conversion fails
    """
    if pd.isna(value) or value is None:
        return None
    
    # Convert to string
    value_str = str(value).strip()
    
    if not value_str or value_str == "":
        return None
    
    # Remove currency symbols (Rp, $, etc.)
    value_str = re.sub(r'[Rr][Pp]\s*', '', value_str)
    value_str = re.sub(r'[$€£¥]', '', value_str)
    
    # Remove DB/CR indicators (Debit/Credit indicators)
    value_str = re.sub(r'\s*(DB|CR|DEBIT|CREDIT)\s*$', '', value_str, flags=re.IGNORECASE)
    value_str = re.sub(r'\s*(DB|CR|DEBIT|CREDIT)\s*', ' ', value_str, flags=re.IGNORECASE)
    
    # Handle BCA format: numbers like "98,779,762.35" or "23,400.00"
    # Check if it uses comma as thousand separator and dot as decimal
    if ',' in value_str and '.' in value_str:
        # Format like "98,779,762.35" - comma is thousand separator, dot is decimal
        # Remove commas, keep dot
        value_str = value_str.replace(',', '')
    elif ',' in value_str:
        # Only comma present - could be decimal separator (Indonesian format) or thousand
        # Check if there are multiple commas (thousand separators)
        comma_count = value_str.count(',')
        if comma_count > 1 or (comma_count == 1 and len(value_str.split(',')[1]) <= 2):
            # Likely decimal separator (e.g., "1.000.000,50")
            # First remove dots (thousand separators), then replace comma with dot
            value_str = value_str.replace('.', '')
            value_str = value_str.replace(',', '.')
        else:
            # Single comma, might be thousand separator or decimal
            # If digits after comma <= 2, it's likely decimal separator
            parts = value_str.split(',')
            if len(parts) == 2 and len(parts[1]) <= 2:
                value_str = parts[0].replace('.', '') + '.' + parts[1]
            else:
                # Treat as thousand separator
                value_str = value_str.replace(',', '')
    else:
        # Only dots - could be thousand separators (Indonesian format)
        # If there are multiple dots, they're thousand separators
        dot_count = value_str.count('.')
        if dot_count > 1:
            # Multiple dots = thousand separators, remove them
            value_str = value_str.replace('.', '')
        # If single dot, keep it as decimal separator
    
    # Remove any remaining non-numeric characters except decimal point and minus sign
    value_str = re.sub(r'[^\d.\-]', '', value_str)
    
    try:
        return float(value_str) if value_str else None
    except (ValueError, TypeError):
        return None


def merge_multiline_descriptions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Handle KETERANGAN and DETAIL TRANSAKSI fields that may span multiple lines.
    This is a safety net function - primary merging should happen in pdf_parser.py.
    Rows without a date in TANGGAL are assumed to be continuations of the previous row.
    
    Args:
        df: DataFrame with transaction data (should already be merged by pdf_parser)
        
    Returns:
        DataFrame with merged multi-line descriptions (or unchanged if already merged)
    """
    if df.empty:
        return df
    
    df = df.copy()
    
    # Quick check: if all rows have dates, merging is already done by pdf_parser
    if 'TANGGAL' in df.columns:
        tanggal_col = df['TANGGAL']
        all_have_dates = tanggal_col.apply(
            lambda x: bool(re.search(r'\d{1,2}/\d{1,2}', str(x).strip())) if pd.notna(x) else False
        ).all()
        
        # If all rows have dates, no merging needed (already done in pdf_parser)
        if all_have_dates:
            return df
    
    # Fallback: perform merging if there are rows without dates
    # This should rarely execute if pdf_parser merging works correctly
    merged_rows = []
    current_row = None
    
    for idx, row in df.iterrows():
        tanggal = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
        has_date = bool(re.search(r'\d{1,2}/\d{1,2}', tanggal)) if tanggal else False
        
        if has_date:
            if current_row is not None:
                merged_rows.append(current_row)
            current_row = row.copy()
        else:
            # Continuation row - merge with previous
            if current_row is not None:
                # Merge KETERANGAN (index 1)
                if len(current_row) > 1 and len(row) > 1:
                    prev_keterangan = str(current_row.iloc[1]).strip() if pd.notna(current_row.iloc[1]) else ""
                    curr_keterangan = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else ""
                    if curr_keterangan:
                        current_row.iloc[1] = f"{prev_keterangan} {curr_keterangan}".strip() if prev_keterangan else curr_keterangan
                
                # Merge DETAIL TRANSAKSI (index 2)
                if len(current_row) > 2 and len(row) > 2:
                    prev_detail = str(current_row.iloc[2]).strip() if pd.notna(current_row.iloc[2]) else ""
                    curr_detail = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
                    if curr_detail:
                        current_row.iloc[2] = f"{prev_detail} {curr_detail}".strip() if prev_detail else curr_detail
                
                # Handle MUTASI and SALDO if missing
                if len(current_row) > 3 and len(row) > 3:
                    if (not current_row.iloc[3] or not str(current_row.iloc[3]).strip()) and row.iloc[3] and str(row.iloc[3]).strip():
                        current_row.iloc[3] = row.iloc[3]
                if len(current_row) > 4 and len(row) > 4:
                    if (not current_row.iloc[4] or not str(current_row.iloc[4]).strip()) and row.iloc[4] and str(row.iloc[4]).strip():
                        current_row.iloc[4] = row.iloc[4]
    
    if current_row is not None:
        merged_rows.append(current_row)
    
    return pd.DataFrame(merged_rows).reset_index(drop=True) if merged_rows else df


def clean_transaction_data(df: pd.DataFrame, expected_columns: list = None) -> pd.DataFrame:
    """
    Apply all cleaning transformations to transaction data.
    
    Args:
        df: Raw DataFrame from PDF extraction
        expected_columns: List of expected column names in order
        
    Returns:
        Cleaned DataFrame ready for display/export
    """
    if df.empty:
        return df
    
    df = df.copy()
    
    # Normalize column names
    df = normalize_columns(df)
    
    # Set expected column names if provided
    if expected_columns and len(df.columns) >= len(expected_columns):
        df.columns = expected_columns[:len(df.columns)] + list(df.columns[len(expected_columns):])
    
    # Remove completely empty rows
    df = df.dropna(how='all')
    
    # Handle multi-line descriptions
    df = merge_multiline_descriptions(df)
    
    # Clean string columns (strip whitespace)
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].apply(lambda x: str(x).strip() if pd.notna(x) else "")
    
    # Clean numeric columns (MUTASI and SALDO)
    numeric_columns = ['MUTASI', 'SALDO']
    for col in numeric_columns:
        if col in df.columns:
            df[col] = df[col].apply(clean_currency_value)
    
    # Remove rows where TANGGAL is empty (invalid transactions)
    if 'TANGGAL' in df.columns:
        df = df[df['TANGGAL'].notna() & (df['TANGGAL'].astype(str).str.strip() != "")]
    
    # Reset index
    df = df.reset_index(drop=True)
    
    return df

