# localStorage Migration Guide

## What Changed

The category management system has been migrated from JSON file storage to browser localStorage.

### Before
- Categories were stored in `categories.json` file on the server
- Data persisted on the server filesystem
- Shared across all users accessing the server

### After
- Categories are stored in browser localStorage
- Data persists in each user's browser
- Each browser maintains its own category configuration
- No server-side files needed

## Technical Implementation

### Storage Location
- **Key**: `transaction_categories`
- **Storage**: Browser localStorage (client-side)
- **Format**: JSON string containing array of category objects

### Files Modified

1. **category_store.py**
   - Removed file I/O operations
   - Added `init_localstorage_sync()` function to load from localStorage on startup
   - Added `sync_to_localstorage()` function to save changes to localStorage
   - Uses Streamlit's `components.html()` to interact with JavaScript/localStorage

2. **app.py**
   - Added call to `init_localstorage_sync()` in `main()` function
   - No other changes needed - all CRUD operations remain the same

3. **categories.json**
   - Deleted (no longer needed)

## How It Works

1. **Initialization**:
   - When app starts, `init_localstorage_sync()` is called
   - JavaScript component attempts to read from localStorage
   - If data exists and is valid, it's loaded into session state
   - If not, default starter categories are used and saved to localStorage

2. **Reading Categories**:
   - `load_categories()` returns data from session state
   - Session state is the single source of truth during the session

3. **Writing Categories**:
   - `save_categories()` updates session state
   - Calls `sync_to_localstorage()` which uses JavaScript to write to localStorage
   - Changes persist across browser sessions

## Testing the Migration

### Test 1: Fresh Start
1. Clear browser localStorage (DevTools → Application → localStorage → Clear)
2. Open the app
3. Verify default categories appear in Category Management
4. Check browser localStorage - should see `transaction_categories` key

### Test 2: Add New Category
1. Click "Manage Categories"
2. Add a new category with keywords
3. Refresh the page
4. Verify the new category persists

### Test 3: Edit Category
1. Edit an existing category
2. Refresh the page
3. Verify changes persist

### Test 4: Delete Category
1. Delete a category
2. Refresh the page
3. Verify deletion persists

### Test 5: Cross-Browser Verification
1. Configure categories in Chrome
2. Open same app in Firefox
3. Verify Firefox has default categories (not Chrome's)
4. This confirms browser-specific storage

## Advantages

✅ **No server storage** - Reduces server-side dependencies  
✅ **User-specific** - Each user has their own categories  
✅ **Persistent** - Survives browser restarts and sessions  
✅ **Fast** - No file I/O operations  
✅ **Simple deployment** - No file permissions needed  

## Considerations

⚠️ **Browser-specific** - Categories don't sync across browsers  
⚠️ **Clearing data** - Browser data clear will reset to defaults  
⚠️ **Storage limit** - localStorage has ~5-10MB limit (more than enough for categories)  
⚠️ **Private browsing** - May not persist in incognito/private mode  

## Debugging

### Check localStorage in Browser DevTools

```javascript
// View stored categories
localStorage.getItem('transaction_categories')

// Parse and view as object
JSON.parse(localStorage.getItem('transaction_categories'))

// Clear categories (reset to default)
localStorage.removeItem('transaction_categories')

// Clear all localStorage
localStorage.clear()
```

### Python Debugging

The `category_store.py` includes console.log statements visible in browser console:
- "Loaded categories from localStorage" - Successfully loaded
- "No categories in localStorage, will use defaults" - Using defaults
- "Categories synced to localStorage" - Successfully saved

## Rollback (if needed)

If you need to rollback to JSON file storage:

1. Restore `categories.json` file with default data
2. Revert `category_store.py` to use file I/O operations
3. Remove `init_localstorage_sync()` call from `app.py`

The git history contains the previous implementation.

## Next Steps

You may want to consider:
- Export/Import feature to backup categories
- Cloud sync option for cross-device support
- Migration tool to import from old JSON file (for existing deployments)

