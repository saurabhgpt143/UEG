# Implementation Plan: Precision Tax Invoice Extraction to Zero-Amount Delivery Challan

Enhance the tax invoice extraction system using a hybrid multimodal AI engine combined with a structured tabular parser. The system extracts customer/consignee details, transport and vehicle numbers, dispatched items, exact quantities, units, and HSN codes, generating a clean industrial Delivery Challan with zero pricing.

---

## User Preferences & Architecture Alignment

- **Extraction Engine**: Hybrid Multimodal AI (Gemini 3.8 Flash / 2.5 Flash with fallback) + advanced tabular rule-based regex parser for structured line items.
- **Challan Format**: Standard industrial Delivery Challan format enforcing the Zero-Amount rule (all item unit prices = 0, tax = 0%, discount = 0%).
- **Item Structuring**: Clean item title with HSN code, material grade, and specifications placed in the secondary description field.
- **Nil Heading Suppression**: All omitted fields (empty notes, unused remarks, zero discounts) omit their respective headers in print and PDF preview.

---

## Proposed Changes

### 1. Server-Side Extraction Engine (`server.ts`)

- **Robust Multimodal AI Extraction (`/api/parse-invoice-to-challan`)**:
  - Update the Gemini model configuration to support `gemini-3.8-flash` with graceful fallback to `gemini-2.5-flash`.
  - Pass image and PDF inline data directly to Gemini's visual document understanding engine, allowing scanned invoices and complex multi-column layouts to be parsed accurately.
  - Refine prompt schema to require:
    - `name`: Clean product or item name.
    - `description`: HSN code (e.g., `HSN: 7307.22`) and technical specifications.
    - `quantity`: Dispatched quantity (numeric).
    - `unit`: Standardized unit (e.g., `Pcs`, `Nos`, `Kg`, `Mtr`, `Box`, `Set`, `Ton`, `Bags`, `Bundle`).
    - `unitPrice`: Enforced to `0`.
    - Buyer/Consignee separation from Seller/Consignor details.
    - Vehicle number and transport/LR reference.
- **Advanced Deterministic Fallback Parser (`parseInvoiceTextAdvanced`)**:
  - Enhance table column extraction for space-aligned, tab-aligned, and pipe-aligned invoice rows.
  - Support multi-line descriptions and inline HSN code detection (`HSN / SAC: \d{4,8}`).
  - Improve buyer address extraction to skip seller GSTIN and header blocks.

### 2. Upload & Verification Modal (`src/components/UploadTaxInvoiceModal.tsx`)

- **Interactive Verification Grid**:
  - Display extracted items with separate columns: **Item Name**, **HSN & Specs Description**, **Quantity**, and **Unit**.
  - Show a clear banner confirming: *"Delivery Challan Mode: Amounts automatically omitted for transport compliance"*.
  - Allow in-place editing, adding items, removing items, and reordering before applying to the main document.
- **Document Metadata Verification**:
  - Quick-edit fields for **Consignee / Buyer Name**, **Delivery Site Address**, **Vehicle Number**, and **Invoice / DC Reference**.
- **Visual File Preview**:
  - Show a thumbnail/preview of uploaded image or PDF with toggleable side-by-side view for manual cross-verification.

### 3. Delivery Challan Document View (`src/components/QuotePreview.tsx` & `src/types.ts`)

- **Zero-Amount Presentation**:
  - Ensure Delivery Challan mode hides columns for Rate/Price, Tax, Discount, and Total Amount, focusing strictly on Serial No, Item Description & HSN, Quantity, and Unit.
  - Render industrial transport acknowledgment blocks:
    - Vehicle No & E-Way / LR Reference badge.
    - Received in good condition declaration.
    - Consignee signature & official rubber stamp box alongside authorized signatory.

---

## Verification Plan

### Automated Verification
- Run `compile_applet` to verify TypeScript compilation and absence of bundle errors.
- Run `lint_applet` to ensure code style and clean imports.

### Manual Verification
1. **Sample Text Extraction**:
   - Open *Upload Tax Invoice* modal, click *Load Sample Tax Invoice*, and click *Extract & Convert to Delivery Challan*.
   - Confirm extracted items have clean names, HSN codes in descriptions, exact quantities, units, and 0 price.
2. **File Upload Verification**:
   - Upload a sample tax invoice image/PDF.
   - Verify that consignee, vehicle number, items, and quantities are parsed into the editable grid.
3. **Delivery Challan Preview**:
   - Click *Apply to Delivery Challan*.
   - Verify that the generated document displays *DELIVERY CHALLAN*, includes vehicle number and transport details, shows items with quantities and units, omits pricing columns, and includes receiver sign-off blocks.
