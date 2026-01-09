import { Category, TransactionRow } from './types';

/**
 * Map a transaction description to a category based on keyword matching.
 * 
 * Matching rules:
 * - Case-insensitive substring matching
 * - First match wins (based on config order)
 * - Returns "Uncategorized" if no match found
 */
export function mapCategory(
  description: string | null | undefined,
  categoryConfig: Category[]
): string {
  // Handle empty/None descriptions
  if (!description) {
    return "Uncategorized";
  }

  const descriptionLower = String(description).toLowerCase().trim();

  if (!descriptionLower) {
    return "Uncategorized";
  }

  // Iterate through categories in order (first match wins)
  for (const catDict of categoryConfig) {
    const categoryName = catDict.category || '';
    const keywords = catDict.keywords || [];

    if (!categoryName || keywords.length === 0) {
      continue;
    }

    // Check if any keyword matches (case-insensitive substring search)
    for (const keyword of keywords) {
      const keywordLower = String(keyword).toLowerCase().trim();
      if (keywordLower && descriptionLower.includes(keywordLower)) {
        return categoryName;
      }
    }
  }

  // No match found
  return "Uncategorized";
}

/**
 * Apply category mapping to transaction data by adding/updating a CATEGORY column.
 * 
 * This function modifies the data in-place.
 */
export function applyCategoriesToData(
  data: TransactionRow[],
  categoryConfig: Category[],
  descriptionColumn: string = "DETAIL TRANSAKSI"
): void {
  if (!data || data.length === 0) {
    return;
  }

  // Apply category mapping to each row
  for (const row of data) {
    const description = row[descriptionColumn] as string | undefined;
    row.CATEGORY = mapCategory(description, categoryConfig);
  }
}
