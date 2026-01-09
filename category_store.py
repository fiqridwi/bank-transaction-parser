"""
Category Storage Module for Transaction Categories

This module provides default starter categories for transaction categorization.
Category management is handled client-side via browser localStorage.
"""

from typing import List, Dict, Any


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


def get_starter_categories() -> List[Dict[str, Any]]:
    """
    Get the default starter categories.
    
    Returns:
        List of category dictionaries, each with 'category' and 'keywords' keys
    """
    return STARTER_CATEGORIES.copy()

