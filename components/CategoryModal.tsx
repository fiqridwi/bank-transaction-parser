'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/lib/types';
import { useCategories } from '@/hooks/useCategories';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryModal({ isOpen, onClose }: CategoryModalProps) {
  const { categories, addCategory, updateCategory, deleteCategory, isLoading } = useCategories();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editKeywords, setEditKeywords] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setNewCategoryName('');
      setNewKeywords('');
      setEditingIndex(null);
    }
  }, [isOpen]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim() || !newKeywords.trim()) {
      alert('❌ Please fill in both category name and keywords');
      return;
    }

    try {
      const success = addCategory(newCategoryName, newKeywords);
      if (success) {
        alert(`✅ Category '${newCategoryName}' added!`);
        setNewCategoryName('');
        setNewKeywords('');
      } else {
        alert(`❌ Category '${newCategoryName}' already exists!`);
      }
    } catch (error) {
      alert('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleStartEdit = (index: number, category: Category) => {
    setEditingIndex(index);
    setEditName(category.category);
    setEditKeywords(category.keywords.join(', '));
  };

  const handleSaveEdit = (oldName: string) => {
    try {
      const success = updateCategory(oldName, editName, editKeywords);
      if (success) {
        alert('✅ Updated!');
        setEditingIndex(null);
      } else {
        alert('❌ Category name already exists or category not found');
      }
    } catch (error) {
      alert('❌ Error: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDelete = (name: string) => {
    if (confirm(`Are you sure you want to delete category "${name}"?`)) {
      const success = deleteCategory(name);
      if (success) {
        alert('✅ Deleted!');
      } else {
        alert('❌ Category not found');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">📝 Category Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Add New Category Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">➕ Add New Category</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category Name
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter a unique category name"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Keywords (comma-separated)
              </label>
              <textarea
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                rows={3}
                placeholder="Enter keywords separated by commas, e.g., 'indomaret, alfamart'"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              onClick={handleAddCategory}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Add Category
            </button>
          </div>

          <hr className="border-gray-700" />

          {/* Existing Categories Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">📋 Existing Categories</h3>
            
            {isLoading ? (
              <p className="text-gray-400 italic text-center py-8">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="text-gray-400 italic text-center py-8">
                No categories defined. Add one above to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                  >
                    {editingIndex === idx ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Category Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Keywords (comma-separated)
                          </label>
                          <textarea
                            value={editKeywords}
                            onChange={(e) => setEditKeywords(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(cat.category)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            💾 Save
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            ❌ Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(cat.category)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <strong className="text-white">{cat.category}</strong>
                            <span className="text-gray-400 text-sm ml-2">
                              ({cat.keywords.length} keywords)
                            </span>
                          </div>
                          <button
                            onClick={() => handleStartEdit(idx, cat)}
                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium transition-colors"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
