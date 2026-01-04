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
    Rows without a date in TANGGAL are assumed to be continuations of the previous row.
    Updated for BCA format with DD/MM date pattern.
    
    Args:
        df: DataFrame with transaction data
        
    Returns:
        DataFrame with merged multi-line descriptions
    """
    if df.empty:
        return df
    
    df = df.copy()
    
    # Identify rows that are likely continuations (no date in first column)
    merged_rows = []
    current_row = None
    
    for idx, row in df.iterrows():
        tanggal = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
        
        # Check if this row has a date (DD/MM format for BCA statements)
        # Pattern: 01/08, 1/8, 31/12, etc.
        has_date = bool(re.search(r'\d{1,2}/\d{1,2}', tanggal)) if tanggal else False
        
        if has_date:
            # This is a new transaction row
            if current_row is not None:
                merged_rows.append(current_row)
            current_row = row.copy()
        else:
            # This is a continuation row - merge KETERANGAN and DETAIL TRANSAKSI with previous row
            if current_row is not None:
                # Merge KETERANGAN column (index 1)
                keterangan_col_idx = 1
                if len(current_row) > keterangan_col_idx and len(row) > keterangan_col_idx:
                    prev_keterangan = str(current_row.iloc[keterangan_col_idx]) if pd.notna(current_row.iloc[keterangan_col_idx]) else ""
                    curr_keterangan = str(row.iloc[keterangan_col_idx]) if pd.notna(row.iloc[keterangan_col_idx]) else ""
                    
                    if curr_keterangan.strip():
                        if prev_keterangan:
                            merged_keterangan = f"{prev_keterangan} {curr_keterangan}".strip()
                        else:
                            merged_keterangan = curr_keterangan.strip()
                        current_row.iloc[keterangan_col_idx] = merged_keterangan
                
                # Merge DETAIL TRANSAKSI column (index 2) - continuation details
                detail_col_idx = 2
                if len(current_row) > detail_col_idx and len(row) > detail_col_idx:
                    prev_detail = str(current_row.iloc[detail_col_idx]) if pd.notna(current_row.iloc[detail_col_idx]) else ""
                    curr_detail = str(row.iloc[detail_col_idx]) if pd.notna(row.iloc[detail_col_idx]) else ""
                    
                    if curr_detail.strip():
                        if prev_detail:
                            merged_detail = f"{prev_detail} {curr_detail}".strip()
                        else:
                            merged_detail = curr_detail.strip()
                        current_row.iloc[detail_col_idx] = merged_detail
                
                # If MUTASI or SALDO appear in continuation and are missing from main row, use them
                mutasi_col_idx = 3
                saldo_col_idx = 4
                if len(current_row) > mutasi_col_idx and len(row) > mutasi_col_idx:
                    if (not current_row.iloc[mutasi_col_idx] or str(current_row.iloc[mutasi_col_idx]).strip() == "") and \
                       row.iloc[mutasi_col_idx] and str(row.iloc[mutasi_col_idx]).strip():
                        current_row.iloc[mutasi_col_idx] = row.iloc[mutasi_col_idx]
                
                if len(current_row) > saldo_col_idx and len(row) > saldo_col_idx:
                    if (not current_row.iloc[saldo_col_idx] or str(current_row.iloc[saldo_col_idx]).strip() == "") and \
                       row.iloc[saldo_col_idx] and str(row.iloc[saldo_col_idx]).strip():
                        current_row.iloc[saldo_col_idx] = row.iloc[saldo_col_idx]
    
    # Add the last row
    if current_row is not None:
        merged_rows.append(current_row)
    
    if merged_rows:
        return pd.DataFrame(merged_rows).reset_index(drop=True)
    else:
        return df


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

