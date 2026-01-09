import { Category } from './types';

/**
 * Default starter categories for transaction categorization.
 */
export const STARTER_CATEGORIES: Category[] = [
  {
    category: "Grocery",
    keywords: [
      "indomaret",
      "idm indoma",
      "alfamart",
      "aqshamart"
    ]
  },
  {
    category: "Makan",
    keywords: [
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
    category: "Shopping",
    keywords: [
      "shopee",
      "tokopedia"
    ]
  },
  {
    category: "Gopay",
    keywords: [
      "gopay",
      "topup",
      "gopay topup"
    ]
  },
  {
    category: "ATM",
    keywords: [
      "tarikan atm",
      "bi-fast",
      "biaya txn",
      "bif transfer"
    ]
  },
  {
    category: "Income",
    keywords: [
      "salary",
      "transfer cr"
    ]
  },
  {
    category: "Gift",
    keywords: [
      "masjid"
    ]
  },
  {
    category: "Kostan",
    keywords: [
      "kost"
    ]
  }
];

/**
 * Get the default starter categories.
 */
export function getStarterCategories(): Category[] {
  return JSON.parse(JSON.stringify(STARTER_CATEGORIES));
}
