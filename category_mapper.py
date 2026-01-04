"""
Category Mapper Module for Transaction Categorization

This module handles automatic categorization of transactions based on keyword
matching in the transaction description field.
"""

from typing import List, Dict, Any


def map_category(description: str, category_config: List[Dict[str, Any]]) -> str:
    """
    Map a transaction description to a category based on keyword matching.
    
    Matching rules:
    - Case-insensitive substring matching
    - First match wins (based on config order)
    - Returns "Uncategorized" if no match found
    
    Args:
        description: Transaction description text (from DETAIL TRANSAKSI column)
        category_config: List of category dictionaries, each with 'category' and 'keywords' keys
        
    Returns:
        Category name as string, or "Uncategorized" if no match
    """
    # Handle empty/None descriptions
    if not description:
        return "Uncategorized"
    
    description_lower = str(description).lower().strip()
    
    if not description_lower:
        return "Uncategorized"
    
    # Iterate through categories in order (first match wins)
    for cat_dict in category_config:
        category_name = cat_dict.get('category', '')
        keywords = cat_dict.get('keywords', [])
        
        if not category_name or not keywords:
            continue
        
        # Check if any keyword matches (case-insensitive substring search)
        for keyword in keywords:
            keyword_lower = str(keyword).lower().strip()
            if keyword_lower and keyword_lower in description_lower:
                return category_name
    
    # No match found
    return "Uncategorized"


def apply_categories_to_dataframe(df, category_config: List[Dict[str, Any]], description_column: str = "DETAIL TRANSAKSI") -> None:
    """
    Apply category mapping to a DataFrame by adding/updating a CATEGORY column.
    
    This function modifies the DataFrame in-place.
    
    Args:
        df: pandas DataFrame with transaction data
        category_config: List of category dictionaries
        description_column: Name of the column containing transaction descriptions
    """
    if df.empty or description_column not in df.columns:
        # Add CATEGORY column with "Uncategorized" if description column doesn't exist
        if 'CATEGORY' not in df.columns:
            df['CATEGORY'] = 'Uncategorized'
        return
    
    # Apply category mapping to each row
    df['CATEGORY'] = df[description_column].apply(
        lambda desc: map_category(desc, category_config)
    )

