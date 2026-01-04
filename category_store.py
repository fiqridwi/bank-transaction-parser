"""
Category Storage Module for Transaction Categories

This module handles persistence and CRUD operations for transaction category mappings.
Categories are stored in browser localStorage and can be managed through CRUD operations.
"""

import json
from typing import List, Dict, Optional, Any
import streamlit as st
import streamlit.components.v1 as components


# Default starter data
STARTER_CATEGORIES = [
    {
        "category": "Grocery",
        "keywords": [
            "indomaret",
            "idm indoma",
            "alfamart",
            "aqshamart"
        ]
    },
    {
        "category": "Makan",
        "keywords": [
            "warung",
            "warteg",
            "nasi uduk",
            "bubur ayam",
            "bakso",
            "sop ayam",
            "ayam bakar",
            "jos chicke",
            "kopi",
            "es oyen",
            "roti",
            "gehu",
            "sabana",
            "just nona",
            "dapur nuda",
            "kebab",
            "tomoro",
            "warung k",
            "warung mad",
            "aeon store"
        ]
    },
    {
        "category": "Shopping",
        "keywords": [
            "shopee",
            "tokopedia"
        ]
    },
    {
        "category": "Gopay",
        "keywords": [
            "gopay",
            "topup",
            "gopay topup"
        ]
    },
    {
        "category": "ATM",
        "keywords": [
            "tarikan atm",
            "bi-fast",
            "biaya txn",
            "bif transfer"
        ]
    },
    {
        "category": "Income",
        "keywords": [
            "salary",
            "transfer cr"
        ]
    },
    {
        "category": "Gift",
        "keywords": [
            "masjid"
        ]
    },
    {
        "category": "Kostan",
        "keywords": [
            "kost"
        ]
    }
]


LOCALSTORAGE_KEY = "transaction_categories"


def init_localstorage_sync():
    """
    Initialize localStorage synchronization. 
    This loads data from localStorage into session state on first run.
    """
    # Check if we need to load from localStorage
    if '_categories_data' in st.session_state:
        return  # Already initialized
    
    # Create a component that tries to load from localStorage
    html_code = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <script>
            // Try to load from localStorage and pass back to Streamlit
            function loadFromLocalStorage() {{
                try {{
                    const data = localStorage.getItem('{LOCALSTORAGE_KEY}');
                    if (data) {{
                        // Parse to validate
                        const parsed = JSON.parse(data);
                        // Send back to Streamlit via return value
                        return data;
                    }}
                }} catch (e) {{
                    console.error('Error loading from localStorage:', e);
                }}
                return null;
            }}
            
            // Execute immediately
            const result = loadFromLocalStorage();
            
            // For debugging
            if (result) {{
                console.log('Loaded categories from localStorage');
            }} else {{
                console.log('No categories in localStorage, will use defaults');
            }}
        </script>
    </head>
    <body>
        <div id="result"></div>
    </body>
    </html>
    """
    
    # The component returns the localStorage data
    result = components.html(html_code, height=0)
    
    # If we got data back, try to parse and use it
    if result:
        try:
            loaded_categories = json.loads(result)
            if isinstance(loaded_categories, list) and len(loaded_categories) > 0:
                # Validate structure
                valid = all(
                    isinstance(cat, dict) and 
                    'category' in cat and 
                    'keywords' in cat and 
                    isinstance(cat['keywords'], list)
                    for cat in loaded_categories
                )
                if valid:
                    st.session_state._categories_data = loaded_categories
                    return
        except (json.JSONDecodeError, Exception) as e:
            print(f"Error parsing localStorage data: {e}")
    
    # If we reach here, use starter data
    st.session_state._categories_data = STARTER_CATEGORIES.copy()
    # Sync to localStorage
    sync_to_localstorage(st.session_state._categories_data)


def sync_to_localstorage(categories: List[Dict[str, Any]]):
    """
    Sync categories data to browser localStorage.
    
    Args:
        categories: List of category dictionaries to save
    """
    try:
        json_data = json.dumps(categories, ensure_ascii=False)
        # Escape for JavaScript
        escaped_data = json_data.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n').replace('\r', '\\r').replace('"', '\\"')
        
        html_code = f"""
        <script>
            try {{
                const data = '{escaped_data}';
                // Unescape the data
                const unescaped = data.replace(/\\\\"/g, '"');
                localStorage.setItem('{LOCALSTORAGE_KEY}', unescaped);
                console.log('Categories synced to localStorage');
            }} catch (e) {{
                console.error('Error saving to localStorage:', e);
            }}
        </script>
        """
        
        components.html(html_code, height=0)
    except Exception as e:
        print(f"Error syncing to localStorage: {str(e)}")


def load_categories() -> List[Dict[str, Any]]:
    """
    Load categories from Streamlit session state (backed by localStorage).
    
    Returns:
        List of category dictionaries, each with 'category' and 'keywords' keys
    """
    # Check if categories are already in session state
    if '_categories_data' not in st.session_state:
        # Initialize with starter data
        st.session_state._categories_data = STARTER_CATEGORIES.copy()
        # Sync to localStorage
        sync_to_localstorage(st.session_state._categories_data)
    
    return st.session_state._categories_data.copy()


def save_categories(categories: List[Dict[str, Any]]) -> None:
    """
    Save categories to session state and sync to localStorage.
    
    Args:
        categories: List of category dictionaries to save
    """
    # Save to session state
    st.session_state._categories_data = categories.copy()
    
    # Sync to localStorage
    sync_to_localstorage(categories)


def get_categories() -> List[Dict[str, Any]]:
    """
    Get all categories.
    
    Returns:
        List of category dictionaries
    """
    return load_categories()


def add_category(name: str, keywords: List[str]) -> bool:
    """
    Add a new category.
    
    Args:
        name: Category name (must be unique)
        keywords: List of keyword strings
        
    Returns:
        True if added successfully, False if category name already exists
        
    Raises:
        ValueError: If name is empty or keywords list is empty
    """
    if not name or not name.strip():
        raise ValueError("Category name cannot be empty")
    
    if not keywords or len(keywords) == 0:
        raise ValueError("Keywords list cannot be empty")
    
    # Clean keywords: strip whitespace and filter empty strings
    cleaned_keywords = [k.strip() for k in keywords if k.strip()]
    if not cleaned_keywords:
        raise ValueError("Keywords list cannot be empty after cleaning")
    
    categories = load_categories()
    
    # Check if category name already exists (case-insensitive)
    name_lower = name.strip().lower()
    for cat in categories:
        if cat['category'].lower() == name_lower:
            return False  # Category already exists
    
    # Add new category
    new_category = {
        "category": name.strip(),
        "keywords": cleaned_keywords
    }
    categories.append(new_category)
    save_categories(categories)
    return True


def update_category(old_name: str, new_name: Optional[str], keywords: Optional[List[str]]) -> bool:
    """
    Update an existing category.
    
    Args:
        old_name: Current category name
        new_name: New category name (None to keep same)
        keywords: New keywords list (None to keep same)
        
    Returns:
        True if updated successfully, False if category doesn't exist or new_name already exists
        
    Raises:
        ValueError: If new_name or keywords are invalid
    """
    categories = load_categories()
    
    # Find the category to update
    category_index = None
    for i, cat in enumerate(categories):
        if cat['category'].lower() == old_name.lower():
            category_index = i
            break
    
    if category_index is None:
        return False  # Category not found
    
    # Validate new_name if provided
    if new_name is not None:
        new_name = new_name.strip()
        if not new_name:
            raise ValueError("Category name cannot be empty")
        
        # Check if new name conflicts with existing category (excluding current one)
        new_name_lower = new_name.lower()
        for i, cat in enumerate(categories):
            if i != category_index and cat['category'].lower() == new_name_lower:
                return False  # New name already exists
    
    # Validate keywords if provided
    if keywords is not None:
        if len(keywords) == 0:
            raise ValueError("Keywords list cannot be empty")
        
        # Clean keywords
        cleaned_keywords = [k.strip() for k in keywords if k.strip()]
        if not cleaned_keywords:
            raise ValueError("Keywords list cannot be empty after cleaning")
    
    # Update category
    if new_name is not None:
        categories[category_index]['category'] = new_name
    if keywords is not None:
        categories[category_index]['keywords'] = cleaned_keywords
    
    save_categories(categories)
    return True


def delete_category(name: str) -> bool:
    """
    Delete a category.
    
    Args:
        name: Category name to delete
        
    Returns:
        True if deleted successfully, False if category doesn't exist
    """
    categories = load_categories()
    
    # Find and remove category
    original_count = len(categories)
    categories = [cat for cat in categories if cat['category'].lower() != name.lower()]
    
    if len(categories) == original_count:
        return False  # Category not found
    
    save_categories(categories)
    return True

