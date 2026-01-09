// localStorage key for categories
const LOCALSTORAGE_KEY = 'transaction_categories';

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize categories from localStorage or fetch starter categories
    initializeCategories();
    
    // Set up file upload
    setupFileUpload();
    
    // Set up category management modal
    setupCategoryModal();
    
    // Set up download button
    setupDownloadButton();
}

// Category Management Functions

function initializeCategories() {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!stored) {
        // Fetch starter categories from server
        fetch('/api/starter-categories')
            .then(response => response.json())
            .then(categories => {
                localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(categories));
                console.log('Initialized with starter categories');
            })
            .catch(error => {
                console.error('Error fetching starter categories:', error);
            });
    }
}

function getCategories() {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing categories from localStorage:', e);
            return [];
        }
    }
    return [];
}

function saveCategories(categories) {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(categories));
}

function addCategory(name, keywords) {
    const categories = getCategories();
    
    // Check if category already exists (case-insensitive)
    const nameLower = name.trim().toLowerCase();
    if (categories.some(cat => cat.category.toLowerCase() === nameLower)) {
        return false; // Category already exists
    }
    
    // Clean keywords
    const cleanedKeywords = keywords.split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
    
    if (cleanedKeywords.length === 0) {
        throw new Error('At least one keyword is required');
    }
    
    // Add new category
    categories.push({
        category: name.trim(),
        keywords: cleanedKeywords
    });
    
    saveCategories(categories);
    return true;
}

function updateCategory(oldName, newName, keywords) {
    const categories = getCategories();
    const categoryIndex = categories.findIndex(
        cat => cat.category.toLowerCase() === oldName.toLowerCase()
    );
    
    if (categoryIndex === -1) {
        return false; // Category not found
    }
    
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
        
        categories[categoryIndex].category = newNameTrimmed;
    }
    
    // Update keywords if provided
    if (keywords !== null && keywords !== undefined) {
        const cleanedKeywords = keywords.split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0);
        
        if (cleanedKeywords.length === 0) {
            throw new Error('At least one keyword is required');
        }
        
        categories[categoryIndex].keywords = cleanedKeywords;
    }
    
    saveCategories(categories);
    return true;
}

function deleteCategory(name) {
    const categories = getCategories();
    const originalLength = categories.length;
    
    categories = categories.filter(
        cat => cat.category.toLowerCase() !== name.toLowerCase()
    );
    
    if (categories.length === originalLength) {
        return false; // Category not found
    }
    
    saveCategories(categories);
    return true;
}

// File Upload Functions

function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const uploadStatus = document.getElementById('uploadStatus');
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileUpload(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

function handleFileUpload(file) {
    const uploadStatus = document.getElementById('uploadStatus');
    const formData = new FormData();
    formData.append('file', file);
    
    // Include categories from localStorage
    const categories = getCategories();
    formData.append('categories', JSON.stringify(categories));
    
    // Show loading state
    uploadStatus.textContent = 'Extracting data from PDF... Please wait.';
    uploadStatus.className = 'status-message status-info';
    uploadStatus.style.display = 'block';
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            uploadStatus.textContent = '❌ ' + data.error;
            uploadStatus.className = 'status-message status-error';
            hidePreviewSections();
        } else {
            uploadStatus.textContent = `✅ Successfully extracted ${data.total_rows} transactions!`;
            uploadStatus.className = 'status-message status-success';
            displayPreview(data);
        }
    })
    .catch(error => {
        uploadStatus.textContent = '❌ Error processing PDF: ' + error.message;
        uploadStatus.className = 'status-message status-error';
        hidePreviewSections();
    });
}

function displayPreview(data) {
    // Show sections
    document.getElementById('statisticsSection').style.display = 'block';
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('exportSection').style.display = 'block';
    
    // Update statistics
    document.getElementById('statTotalTransactions').textContent = data.statistics.total_transactions;
    document.getElementById('statColumns').textContent = data.statistics.columns_count;
    document.getElementById('statDateRange').textContent = data.statistics.has_date_range ? 'Available' : 'N/A';
    
    // Display table
    const tableHead = document.getElementById('previewTableHead');
    const tableBody = document.getElementById('previewTableBody');
    
    // Clear existing content
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('tr');
    data.columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);
    
    // Create data rows (show first 100 rows)
    data.preview.forEach(row => {
        const tr = document.createElement('tr');
        data.columns.forEach(column => {
            const td = document.createElement('td');
            const value = row[column];
            td.textContent = value !== null && value !== undefined ? value : '';
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

function hidePreviewSections() {
    document.getElementById('statisticsSection').style.display = 'none';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('exportSection').style.display = 'none';
}

// Category Modal Functions

function setupCategoryModal() {
    const modal = document.getElementById('categoryModal');
    const manageBtn = document.getElementById('manageCategoriesBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    
    manageBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        renderCategoriesList();
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Add category form
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        const name = document.getElementById('newCategoryName').value.trim();
        const keywords = document.getElementById('newKeywords').value.trim();
        
        if (!name || !keywords) {
            alert('❌ Please fill in both category name and keywords');
            return;
        }
        
        try {
            const success = addCategory(name, keywords);
            if (success) {
                alert(`✅ Category '${name}' added!`);
                document.getElementById('newCategoryName').value = '';
                document.getElementById('newKeywords').value = '';
                renderCategoriesList();
            } else {
                alert(`❌ Category '${name}' already exists!`);
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    });
}

function renderCategoriesList() {
    const categoriesList = document.getElementById('categoriesList');
    const categories = getCategories();
    
    if (categories.length === 0) {
        categoriesList.innerHTML = '<p class="info-message">No categories defined. Add one above to get started.</p>';
        return;
    }
    
    categoriesList.innerHTML = '';
    
    categories.forEach((cat, idx) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-item';
        categoryDiv.id = `category-${idx}`;
        
        const isEditing = categoryDiv.dataset.editing === 'true';
        
        categoryDiv.innerHTML = `
            <div class="category-header">
                <div class="category-info">
                    <strong>${escapeHtml(cat.category)}</strong> (${cat.keywords.length} keywords)
                </div>
                <button class="btn btn-small btn-edit" data-index="${idx}">✏️</button>
            </div>
            <div class="category-edit-form" id="edit-form-${idx}" style="display: none;">
                <div class="form-group">
                    <label>Category Name</label>
                    <input type="text" id="edit-name-${idx}" value="${escapeHtml(cat.category)}">
                </div>
                <div class="form-group">
                    <label>Keywords (comma-separated)</label>
                    <textarea id="edit-keywords-${idx}" rows="2">${escapeHtml(cat.keywords.join(', '))}</textarea>
                </div>
                <div class="form-actions">
                    <button class="btn btn-small btn-primary btn-save" data-index="${idx}">💾 Save</button>
                    <button class="btn btn-small btn-secondary btn-cancel" data-index="${idx}">❌ Cancel</button>
                    <button class="btn btn-small btn-danger btn-delete" data-index="${idx}">🗑️ Delete</button>
                </div>
            </div>
        `;
        
        categoriesList.appendChild(categoryDiv);
        
        // Set up edit button
        const editBtn = categoryDiv.querySelector('.btn-edit');
        editBtn.addEventListener('click', () => {
            document.getElementById(`edit-form-${idx}`).style.display = 'block';
        });
        
        // Set up save button
        const saveBtn = categoryDiv.querySelector('.btn-save');
        saveBtn.addEventListener('click', () => {
            const newName = document.getElementById(`edit-name-${idx}`).value.trim();
            const newKeywords = document.getElementById(`edit-keywords-${idx}`).value.trim();
            
            try {
                const success = updateCategory(cat.category, newName, newKeywords);
                if (success) {
                    alert('✅ Updated!');
                    renderCategoriesList();
                } else {
                    alert('❌ Category name already exists or category not found');
                }
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        });
        
        // Set up cancel button
        const cancelBtn = categoryDiv.querySelector('.btn-cancel');
        cancelBtn.addEventListener('click', () => {
            renderCategoriesList();
        });
        
        // Set up delete button
        const deleteBtn = categoryDiv.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete category "${cat.category}"?`)) {
                const success = deleteCategory(cat.category);
                if (success) {
                    alert('✅ Deleted!');
                    renderCategoriesList();
                } else {
                    alert('❌ Category not found');
                }
            }
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Download Functions

function setupDownloadButton() {
    document.getElementById('downloadBtn').addEventListener('click', () => {
        const categories = getCategories();
        
        fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ categories: categories })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Error downloading file');
                });
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bank_transaction_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(error => {
            alert('❌ Error downloading file: ' + error.message);
        });
    });
}

