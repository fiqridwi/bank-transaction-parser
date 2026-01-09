'use client';

import { useState, useEffect, useCallback } from 'react';
import { Category } from '@/lib/types';

const LOCALSTORAGE_KEY = 'transaction_categories';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load categories from localStorage or fetch starter categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const stored = localStorage.getItem(LOCALSTORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setCategories(parsed);
          setIsLoading(false);
        } else {
          // Fetch starter categories from server
          const response = await fetch('/api/categories');
          if (response.ok) {
            const starterCategories = await response.json();
            setCategories(starterCategories);
            localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(starterCategories));
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  const saveCategories = useCallback((newCategories: Category[]) => {
    setCategories(newCategories);
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(newCategories));
  }, []);

  const addCategory = useCallback((name: string, keywords: string): boolean => {
    const nameLower = name.trim().toLowerCase();
    if (categories.some(cat => cat.category.toLowerCase() === nameLower)) {
      return false; // Category already exists
    }

    const cleanedKeywords = keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (cleanedKeywords.length === 0) {
      throw new Error('At least one keyword is required');
    }

    const newCategories = [
      ...categories,
      {
        category: name.trim(),
        keywords: cleanedKeywords,
      },
    ];

    saveCategories(newCategories);
    return true;
  }, [categories, saveCategories]);

  const updateCategory = useCallback((oldName: string, newName: string | null, keywords: string | null): boolean => {
    const categoryIndex = categories.findIndex(
      cat => cat.category.toLowerCase() === oldName.toLowerCase()
    );

    if (categoryIndex === -1) {
      return false; // Category not found
    }

    const newCategories = [...categories];

    // Validate new name if provided
    if (newName !== null && newName !== undefined) {
      const newNameTrimmed = newName.trim();
      if (!newNameTrimmed) {
        throw new Error('Category name cannot be empty');
      }

      // Check if new name conflicts with existing category
      const newNameLower = newNameTrimmed.toLowerCase();
      if (categories.some((cat, idx) =>
        idx !== categoryIndex && cat.category.toLowerCase() === newNameLower
      )) {
        return false; // New name already exists
      }

      newCategories[categoryIndex].category = newNameTrimmed;
    }

    // Update keywords if provided
    if (keywords !== null && keywords !== undefined) {
      const cleanedKeywords = keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      if (cleanedKeywords.length === 0) {
        throw new Error('At least one keyword is required');
      }

      newCategories[categoryIndex].keywords = cleanedKeywords;
    }

    saveCategories(newCategories);
    return true;
  }, [categories, saveCategories]);

  const deleteCategory = useCallback((name: string): boolean => {
    const newCategories = categories.filter(
      cat => cat.category.toLowerCase() !== name.toLowerCase()
    );

    if (newCategories.length === categories.length) {
      return false; // Category not found
    }

    saveCategories(newCategories);
    return true;
  }, [categories, saveCategories]);

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
  };
}
