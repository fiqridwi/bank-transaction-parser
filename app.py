"""
Streamlit Application for PDF to Excel Converter

This is the main application file that provides a web UI for:
- Uploading PDF bank transaction statements
- Previewing extracted transaction data
- Exporting data to Excel format
"""

import streamlit as st
import pandas as pd
import io
from datetime import datetime
from pdf_parser import extract_tables_from_pdf, get_expected_columns
from data_cleaner import clean_transaction_data
from category_store import load_categories, add_category, update_category, delete_category, init_localstorage_sync
from category_mapper import apply_categories_to_dataframe


# Page configuration
st.set_page_config(
    page_title="Bank Transaction Converter",
    page_icon="📊",
    layout="wide"
)


def generate_excel_file(df: pd.DataFrame) -> bytes:
    """
    Generate Excel file from DataFrame.
    
    Args:
        df: Cleaned DataFrame with transaction data
        
    Returns:
        bytes: Excel file as bytes
    """
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Transactions', index=False)
    
    output.seek(0)
    return output.getvalue()


def reapply_categories_to_transaction_data():
    """Re-apply categories to existing transaction data if it exists."""
    if 'transaction_data' in st.session_state and st.session_state.transaction_data is not None:
        if not st.session_state.transaction_data.empty and 'DETAIL TRANSAKSI' in st.session_state.transaction_data.columns:
            apply_categories_to_dataframe(st.session_state.transaction_data, st.session_state.categories)
            # Reorder columns if needed
            if 'CATEGORY' in st.session_state.transaction_data.columns:
                cols = list(st.session_state.transaction_data.columns)
                if 'DETAIL TRANSAKSI' in cols:
                    detail_idx = cols.index('DETAIL TRANSAKSI')
                    cols.remove('CATEGORY')
                    cols.insert(detail_idx + 1, 'CATEGORY')
                    st.session_state.transaction_data = st.session_state.transaction_data[cols]


@st.dialog("📝 Category Management")
def render_category_management_dialog():
    """Render the category management UI in a dialog."""
    st.title("📝 Category Management")
    
    # Initialize categories in session state
    if 'categories' not in st.session_state:
        st.session_state.categories = load_categories()
    
    # Add New Category Section
    with st.expander("➕ Add New Category", expanded=False):
        new_category_name = st.text_input(
            "Category Name",
            key="new_category_name",
            help="Enter a unique category name"
        )
        new_keywords_text = st.text_area(
            "Keywords (comma-separated)",
            key="new_keywords",
            help="Enter keywords separated by commas, e.g., 'indomaret, alfamart'",
            height=100
        )
        
        if st.button("Add Category", key="add_category_btn"):
            if new_category_name and new_keywords_text:
                # Parse keywords (split by comma and clean)
                keywords_list = [k.strip() for k in new_keywords_text.split(',') if k.strip()]
                
                if keywords_list:
                    try:
                        success = add_category(new_category_name, keywords_list)
                        if success:
                            st.session_state.categories = load_categories()
                            reapply_categories_to_transaction_data()
                            st.success(f"✅ Category '{new_category_name}' added!")
                            # Clear inputs
                            st.session_state.new_category_name = ""
                            st.session_state.new_keywords = ""
                            st.rerun()
                        else:
                            st.error(f"❌ Category '{new_category_name}' already exists!")
                    except ValueError as e:
                        st.error(f"❌ Error: {str(e)}")
                else:
                    st.error("❌ Please enter at least one keyword")
            else:
                st.error("❌ Please fill in both category name and keywords")
    
    st.markdown("---")
    
    # Existing Categories Section
    st.subheader("📋 Existing Categories")
    
    if not st.session_state.categories:
        st.info("No categories defined. Add one above to get started.")
    else:
        for idx, cat in enumerate(st.session_state.categories):
            category_name = cat['category']
            keywords_count = len(cat.get('keywords', []))
            
            with st.container():
                col1, col2 = st.columns([3, 1])
                with col1:
                    st.markdown(f"**{category_name}** ({keywords_count} keywords)")
                with col2:
                    if st.button("✏️", key=f"edit_{idx}", help="Edit category"):
                        st.session_state[f"editing_{idx}"] = True
                        st.session_state[f"edit_name_{idx}"] = category_name
                        st.session_state[f"edit_keywords_{idx}"] = ", ".join(cat.get('keywords', []))
                
                # Edit form (shown when edit button is clicked)
                if st.session_state.get(f"editing_{idx}", False):
                    edit_name = st.text_input(
                        "Category Name",
                        value=st.session_state.get(f"edit_name_{idx}", category_name),
                        key=f"edit_name_input_{idx}"
                    )
                    edit_keywords_text = st.text_area(
                        "Keywords (comma-separated)",
                        value=st.session_state.get(f"edit_keywords_{idx}", ""),
                        key=f"edit_keywords_input_{idx}",
                        height=80
                    )
                    
                    col_save, col_cancel, col_delete = st.columns([1, 1, 1])
                    with col_save:
                        if st.button("💾 Save", key=f"save_{idx}"):
                            keywords_list = [k.strip() for k in edit_keywords_text.split(',') if k.strip()]
                            try:
                                success = update_category(category_name, edit_name, keywords_list)
                                if success:
                                    st.session_state.categories = load_categories()
                                    st.session_state[f"editing_{idx}"] = False
                                    reapply_categories_to_transaction_data()
                                    st.success("✅ Updated!")
                                    st.rerun()
                                else:
                                    st.error("❌ Category name already exists or category not found")
                            except ValueError as e:
                                st.error(f"❌ Error: {str(e)}")
                    
                    with col_cancel:
                        if st.button("❌ Cancel", key=f"cancel_{idx}"):
                            st.session_state[f"editing_{idx}"] = False
                            st.rerun()
                    
                    with col_delete:
                        if st.button("🗑️ Delete", key=f"delete_{idx}"):
                            if delete_category(category_name):
                                st.session_state.categories = load_categories()
                                st.session_state[f"editing_{idx}"] = False
                                reapply_categories_to_transaction_data()
                                st.success("✅ Deleted!")
                                st.rerun()
                            else:
                                st.error("❌ Category not found")
            
            st.markdown("---")


def main():
    """Main application function."""
    
    # Initialize localStorage sync (only runs once per session)
    init_localstorage_sync()
    
    # Initialize categories in session state
    if 'categories' not in st.session_state:
        st.session_state.categories = load_categories()
    
    # Header
    st.title("📊 Bank Transaction Converter")
    st.markdown("**Convert bank transaction PDF statements to Excel format**")
    
    # Category Management Button
    col1, col2, col3 = st.columns([2, 1, 2])
    with col2:
        if st.button("📝 Manage Categories", type="secondary", use_container_width=True):
            render_category_management_dialog()
    
    st.markdown("---")
    
    # File uploader
    uploaded_file = st.file_uploader(
        "Upload PDF File",
        type=['pdf'],
        help="Select a PDF file containing bank transaction statements"
    )
    
    # Initialize session state for storing extracted data
    if 'transaction_data' not in st.session_state:
        st.session_state.transaction_data = None
    if 'error_message' not in st.session_state:
        st.session_state.error_message = None
    
    # Process uploaded file
    if uploaded_file is not None:
        try:
            # Reset error state
            st.session_state.error_message = None
            
            # Show processing message
            with st.spinner("Extracting data from PDF... Please wait."):
                # Read PDF file
                pdf_bytes = uploaded_file.read()
                pdf_file = io.BytesIO(pdf_bytes)
                
                # Extract tables from PDF
                raw_rows = extract_tables_from_pdf(pdf_file)
                
                if not raw_rows:
                    st.session_state.error_message = "No transaction tables found in the PDF. Please verify the file format."
                    st.session_state.transaction_data = None
                else:
                    # Convert to DataFrame
                    expected_columns = get_expected_columns()
                    
                    # Create DataFrame with expected columns
                    if len(raw_rows) > 0:
                        # Determine number of columns
                        max_cols = max(len(row) for row in raw_rows) if raw_rows else len(expected_columns)
                        columns = expected_columns[:max_cols] if max_cols <= len(expected_columns) else expected_columns + [f"COL_{i}" for i in range(len(expected_columns), max_cols)]
                        
                        # Pad rows to have same number of columns
                        padded_rows = []
                        for row in raw_rows:
                            padded_row = list(row) + [None] * (max_cols - len(row))
                            padded_rows.append(padded_row[:max_cols])
                        
                        df_raw = pd.DataFrame(padded_rows, columns=columns[:max_cols])
                        
                        # Clean the data
                        df_cleaned = clean_transaction_data(df_raw, expected_columns)
                        
                        if df_cleaned.empty:
                            st.session_state.error_message = "No valid transaction data found after cleaning. Please verify the PDF format."
                            st.session_state.transaction_data = None
                        else:
                            # Apply category mapping
                            categories = st.session_state.categories if 'categories' in st.session_state else load_categories()
                            apply_categories_to_dataframe(df_cleaned, categories)
                            
                            # Reorder columns to put CATEGORY after DETAIL TRANSAKSI
                            if 'CATEGORY' in df_cleaned.columns:
                                cols = list(df_cleaned.columns)
                                if 'DETAIL TRANSAKSI' in cols:
                                    detail_idx = cols.index('DETAIL TRANSAKSI')
                                    # Remove CATEGORY from current position
                                    cols.remove('CATEGORY')
                                    # Insert CATEGORY after DETAIL TRANSAKSI
                                    cols.insert(detail_idx + 1, 'CATEGORY')
                                    df_cleaned = df_cleaned[cols]
                            
                            st.session_state.transaction_data = df_cleaned
                            st.success(f"✅ Successfully extracted {len(df_cleaned)} transactions!")
        
        except Exception as e:
            st.session_state.error_message = f"Error processing PDF: {str(e)}"
            st.session_state.transaction_data = None
            st.error(st.session_state.error_message)
    
    # Display error message if any
    if st.session_state.error_message:
        st.warning(st.session_state.error_message)
    
    # Display preview and export section
    if st.session_state.transaction_data is not None and not st.session_state.transaction_data.empty:
        df = st.session_state.transaction_data
        
        st.markdown("---")
        
        # Statistics section
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Transactions", len(df))
        with col2:
            st.metric("Columns", len(df.columns))
        with col3:
            # Calculate date range if TANGGAL column exists
            if 'TANGGAL' in df.columns:
                st.metric("Date Range", "Available")
            else:
                st.metric("Date Range", "N/A")
        
        st.markdown("---")
        
        # Preview section
        st.subheader("📋 Transaction Preview")
        st.dataframe(
            df,
            use_container_width=True,
            height=400
        )
        
        st.markdown("---")
        
        # Export section
        st.subheader("💾 Export to Excel")
        
        # Generate Excel file
        excel_data = generate_excel_file(df)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"bank_transaction_{timestamp}.xlsx"
        
        # Download button
        st.download_button(
            label="📥 Download Excel File",
            data=excel_data,
            file_name=filename,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            help="Click to download the transaction data as an Excel file"
        )
    
    # Footer
    st.markdown("---")
    st.markdown(
        """
        <div style='text-align: center; color: gray;'>
        <small>Bank Transaction Converter</small>
        </div>
        """,
        unsafe_allow_html=True
    )


if __name__ == "__main__":
    main()

