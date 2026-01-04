"""
Category Storage Module for Transaction Categories

This module handles persistence and CRUD operations for transaction category mappings.
Categories are stored in a JSON file and can be managed through CRUD operations.
"""

import json
import os
from typing import List, Dict, Optional, Any
from pathlib import Path


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


def get_categories_file_path() -> Path:
    """
    Get the path to the categories JSON file.
    
    Returns:
        Path object pointing to categories.json in project root
    """
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    return script_dir / "categories.json"


def load_categories() -> List[Dict[str, Any]]:
    """
    Load categories from JSON file or create with starter data if file doesn't exist.
    
    Returns:
        List of category dictionaries, each with 'category' and 'keywords' keys
    """
    categories_file = get_categories_file_path()
    
    # If file doesn't exist, create it with starter data
    if not categories_file.exists():
        save_categories(STARTER_CATEGORIES)
        return STARTER_CATEGORIES.copy()
    
    try:
        with open(categories_file, 'r', encoding='utf-8') as f:
            categories = json.load(f)
        
        # Validate structure
        if not isinstance(categories, list):
            # Invalid format, recreate with starter data
            save_categories(STARTER_CATEGORIES)
            return STARTER_CATEGORIES.copy()
        
        # Validate each category has required fields
        valid_categories = []
        for cat in categories:
            if isinstance(cat, dict) and 'category' in cat and 'keywords' in cat:
                if isinstance(cat['keywords'], list):
                    valid_categories.append(cat)
        
        if not valid_categories:
            # No valid categories, use starter data
            save_categories(STARTER_CATEGORIES)
            return STARTER_CATEGORIES.copy()
        
        return valid_categories
    
    except (json.JSONDecodeError, IOError) as e:
        # File is corrupted or unreadable, recreate with starter data
        save_categories(STARTER_CATEGORIES)
        return STARTER_CATEGORIES.copy()


def save_categories(categories: List[Dict[str, Any]]) -> None:
    """
    Save categories to JSON file.
    
    Args:
        categories: List of category dictionaries to save
        
    Raises:
        IOError: If file cannot be written
    """
    categories_file = get_categories_file_path()
    
    try:
        with open(categories_file, 'w', encoding='utf-8') as f:
            json.dump(categories, f, indent=2, ensure_ascii=False)
    except IOError as e:
        raise IOError(f"Error saving categories to {categories_file}: {str(e)}")


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

