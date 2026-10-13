import { useState, useRef } from "react";
import { QuoteState, BusinessProfile, TemplateType } from "../types";
import { Printer, Download, Receipt, Eye, Sparkles, Check, CheckCircle2, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import Logo from "./Logo";
import { isNilOrEmpty } from "../data";

interface PrintPreviewProps {
  state: QuoteState;
  businessProfile: BusinessProfile;
  templateType: TemplateType;
  setTemplateType: (type: TemplateType) => void;
}

export default function PrintPreview({
  state,
  businessProfile,
  templateType,
  setTemplateType,
}: PrintPreviewProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const isDeliveryChallan = state.documentType === "Delivery Challan";
  const totalQtyCount = state.items.reduce((acc, item) => acc + (item.quantity || 0), 0);

  // Helper calculation
  const calculateSubtotal = () => {
    return state.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = (subtotal * (state.discountPercentage || 0)) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = 0; // Tax rate removed
  const total = taxableAmount;

  const docTitle = (state.documentType || "Quotation").toUpperCase();
  const numLabel = isDeliveryChallan ? "CHALLAN NO" : state.documentType === "Order" ? "ORDER NO" : "QUOTE NO";
  const numLabelFriendly = isDeliveryChallan ? "Challan Number" : state.documentType === "Order" ? "Order Number" : "Quotation Number";
  const subLabel = isDeliveryChallan ? "Official Delivery Challan (Non-Commercial Dispatch)" : state.documentType === "Order" ? "Official Order Details" : "Official Price Estimate";

  // Visibility flags: If a field or section is nil/empty, remove its heading and content completely
  const hasClientInfo =
    !isNilOrEmpty(state.clientName) ||
    !isNilOrEmpty(state.clientPhone) ||
    !isNilOrEmpty(state.vehicleNumber) ||
    !isNilOrEmpty(state.remarks) ||
    !isNilOrEmpty(state.clientAddress) ||
    !isNilOrEmpty(state.clientEmail);

  const hasNotes = !isNilOrEmpty(state.notes);
  const hasTerms = !isNilOrEmpty(state.terms);
  const hasBankDetails =
    !isDeliveryChallan &&
    (!isNilOrEmpty(businessProfile.bankName) ||
      !isNilOrEmpty(businessProfile.bankAccount) ||
      !isNilOrEmpty(businessProfile.bankRouting));

  const hasTermsOrBank = hasTerms || hasBankDetails;
  const hasFooterSection = hasNotes || hasTermsOrBank;

  const metaCount = [
    !isNilOrEmpty(state.quoteNumber),
    !isNilOrEmpty(state.date),
    !isDeliveryChallan ? !isNilOrEmpty(state.currency) : true,
    !isNilOrEmpty(state.vehicleNumber),
    !isNilOrEmpty(state.remarks),
  ].filter(Boolean).length;

  // Real print action: uses the browser's native print engine with dynamic styles.
  const handlePrint = (type: "pdf" | "thermal") => {
    // Generate styled print contents
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print/export.");
      return;
    }

    const isThermal = type === "thermal";
    const paperWidth = templateType === "thermal-58" ? "58mm" : "80mm";

    const thermalStyles = `
      @page {
        size: ${paperWidth} auto;
        margin: 0;
      }
      body {
        width: ${paperWidth};
        margin: 0;
        padding: 8px;
        font-family: 'Courier New', Courier, monospace;
        font-size: 11px;
        color: #000;
        background: #fff;
      }
      .thermal-receipt {
        max-width: 100%;
        box-sizing: border-box;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .bold { font-weight: bold; }
      .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
      .flex { display: flex; justify-content: space-between; }
      .mb-1 { margin-bottom: 2px; }
      .mb-2 { margin-bottom: 4px; }
      .mt-2 { margin-top: 4px; }
      .barcode-placeholder {
        height: 30px;
        background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 6px);
        margin: 10px auto;
        width: 85%;
      }
    `;

    const pdfStyles = `
      @page {
        size: A4 portrait;
        margin: 15mm;
      }
      body {
        font-family: system-ui, -apple-system, sans-serif;
        color: #1e293b;
        background: #fff;
        font-size: 13px;
        line-height: 1.5;
        margin: 0;
      }
      .pdf-container {
        max-width: 100%;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #4f46e5;
        padding-bottom: 15px;
        margin-bottom: 25px;
      }
      .logo-box {
        width: 40px;
        height: 40px;
        background: #4f46e5;
        color: #fff;
        font-size: 22px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-bottom: 25px;
      }
      .title-section {
        text-align: right;
      }
      .title {
        font-size: 24px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 5px 0;
        letter-spacing: -0.05em;
      }
      .label-sub {
        font-size: 10px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .meta-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
      }
      .meta-item label {
        font-size: 9px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        display: block;
        margin-bottom: 2px;
      }
      .meta-item span {
        font-weight: 600;
        color: #1e293b;
      }
      .section-title {
        font-size: 11px;
        font-weight: 800;
        color: #4f46e5;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 5px;
        margin-bottom: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }
      th {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        background: #f8fafc;
        border-bottom: 1px solid #cbd5e1;
        padding: 8px 10px;
        text-align: left;
      }
      td {
        padding: 10px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 12px;
      }
      .total-flex {
        display: flex;
        justify-content: flex-end;
      }
      .total-table {
        width: 250px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        font-size: 12px;
      }
      .total-row.grand {
        font-size: 16px;
        font-weight: 700;
        border-top: 1.5px solid #0f172a;
        padding-top: 8px;
        margin-top: 5px;
        color: #0f172a;
      }
      .footer {
        margin-top: 50px;
        font-size: 10px;
        text-align: center;
        color: #94a3b8;
        border-top: 1px solid #f1f5f9;
        padding-top: 15px;
      }
    `;

    // Dynamic HTML rendering
    const htmlContent = isThermal
      ? `
        <div class="thermal-receipt">
          ${!isNilOrEmpty(businessProfile.name) ? `<p class="text-center bold">${businessProfile.name.toUpperCase()}</p>` : ""}
          ${!isNilOrEmpty(businessProfile.address) ? `<p class="text-center" style="font-size: 9px;">${businessProfile.address}</p>` : ""}
          ${!isNilOrEmpty(businessProfile.phone) ? `<p class="text-center" style="font-size: 9px;">TEL: ${businessProfile.phone}</p>` : ""}
          
          <div class="divider"></div>
          <p class="text-center bold">${docTitle}</p>
          <div class="divider"></div>
          
          ${!isNilOrEmpty(state.quoteNumber) ? `<div class="flex"><span class="bold">${numLabel}:</span><span>${state.quoteNumber}</span></div>` : ""}
          ${!isNilOrEmpty(state.date) ? `<div class="flex"><span>DATE:</span><span>${state.date}</span></div>` : ""}
          ${!isDeliveryChallan ? (!isNilOrEmpty(state.currency) ? `<div class="flex"><span>CURRENCY:</span><span>${state.currency}</span></div>` : "") : `<div class="flex"><span>TYPE:</span><span>DELIVERY CHALLAN</span></div>`}
          
          ${hasClientInfo ? `
            <div class="divider"></div>
            <p class="bold">${isDeliveryChallan ? "DISPATCHED TO:" : "CLIENT:"}</p>
            ${!isNilOrEmpty(state.clientName) ? `<p class="mb-1">${state.clientName}</p>` : ""}
            ${!isNilOrEmpty(state.clientPhone) ? `<p class="mb-1">MOB: ${state.clientPhone}</p>` : ""}
            ${!isNilOrEmpty(state.vehicleNumber) ? `<p class="mb-1">VEHICLE NO: ${state.vehicleNumber}</p>` : ""}
            ${!isNilOrEmpty(state.remarks) ? `<p class="mb-1">REMARKS: ${state.remarks}</p>` : ""}
            ${!isNilOrEmpty(state.clientAddress) ? `<p class="mb-1" style="font-size: 9px;">${state.clientAddress}</p>` : ""}
            ${!isNilOrEmpty(state.clientEmail) ? `<p class="mb-1" style="font-size: 9px;">EMAIL: ${state.clientEmail}</p>` : ""}
          ` : ""}
          <div class="divider"></div>

          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; font-weight: bold; padding: 2px 0;">ITEM</th>
                <th style="text-align: center; font-weight: bold; padding: 2px 0; width: 55px;">QTY/UNIT</th>
                ${!isDeliveryChallan ? `<th style="text-align: right; font-weight: bold; padding: 2px 0; width: 60px;">PRICE</th>` : ""}
              </tr>
            </thead>
            <tbody>
              ${state.items
                .map(
                  (item) => `
                <tr>
                  <td style="padding: 2px 0; max-width: 120px; word-wrap: break-word;">
                    ${item.name}
                    ${!isNilOrEmpty(item.description) ? `<div style="font-size: 8px; color: #555;">${item.description}</div>` : ""}
                  </td>
                  <td style="text-align: center; padding: 2px 0;">${item.quantity} ${item.unit || "Pcs"}</td>
                  ${!isDeliveryChallan ? `<td style="text-align: right; padding: 2px 0;">${state.currency}${(item.quantity * item.unitPrice).toFixed(2)}</td>` : ""}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="divider"></div>
          ${!isDeliveryChallan ? `
            <div class="flex"><span>SUBTOTAL</span><span>${state.currency}${subtotal.toFixed(2)}</span></div>
            ${
              state.discountPercentage > 0 && !isNilOrEmpty(state.discountPercentage)
                ? `<div class="flex"><span>DISCOUNT (${state.discountPercentage}%)</span><span>-${state.currency}${discountAmount.toFixed(2)}</span></div>`
                : ""
            }
            <div class="divider"></div>
            <div class="flex bold" style="font-size: 13px;"><span>TOTAL</span><span>${state.currency}${total.toFixed(2)}</span></div>
          ` : `
            <div class="flex"><span>TOTAL ITEMS:</span><span class="bold">${state.items.length}</span></div>
            <div class="flex"><span>TOTAL DISPATCH QTY:</span><span class="bold">${totalQtyCount}</span></div>
            <div class="divider"></div>
            <p class="bold text-center" style="font-size: 9px; margin-top: 6px;">DISPATCHED IN SOUND CONDITION</p>
            <p style="font-size: 9px; margin-top: 14px;">RECEIVER SIGN: ________________</p>
          `}
          
          ${hasNotes || hasTerms ? `
            <div class="divider"></div>
            ${hasNotes ? `<p style="font-size: 9px; margin: 4px 0;"><strong>NOTE:</strong> ${state.notes}</p>` : ""}
            ${hasTerms ? `<p style="font-size: 8px; margin: 4px 0; color: #444;"><strong>TERMS:</strong> ${state.terms}</p>` : ""}
          ` : ""}
          
          <div class="barcode-placeholder"></div>
          <p class="text-center" style="font-size: 8px; margin-top: 10px;">${isDeliveryChallan ? "SAFE DELIVERY ASSURED" : "THANK YOU FOR YOUR BUSINESS"}</p>
          <p class="text-center" style="font-size: 7px; color: #555;">Generated with Universe Estimate Generator</p>
        </div>
      `
      : `
        <div class="pdf-container">
          <div class="header">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="logo-box" style="background: #030712; color: #38bdf8;">U</div>
              <div>
                <h1 style="font-size: 18px; font-weight: 800; margin: 0; color: #1e293b; tracking-tight">${businessProfile.name.toUpperCase()}</h1>
              </div>
            </div>
            <div class="title-section">
              <h1 class="title">${docTitle}</h1>
              <span class="label-sub">${subLabel}</span>
            </div>
          </div>

          <div class="grid-2">
            <div>
              <div class="section-title">SENDER PROFILE</div>
              ${!isNilOrEmpty(businessProfile.name) ? `<p style="margin: 0 0 4px 0; font-weight: 700;">${businessProfile.name}</p>` : ""}
              ${!isNilOrEmpty(businessProfile.address) ? `<p style="margin: 0 0 4px 0; color: #64748b;">${businessProfile.address}</p>` : ""}
              ${
                !isNilOrEmpty(businessProfile.phone) || !isNilOrEmpty(businessProfile.email)
                  ? `<p style="margin: 0 0 4px 0; color: #64748b;">${[
                      !isNilOrEmpty(businessProfile.phone) ? `Phone: ${businessProfile.phone}` : "",
                      !isNilOrEmpty(businessProfile.email) ? `Email: ${businessProfile.email}` : "",
                    ].filter(Boolean).join(" | ")}</p>`
                  : ""
              }
              ${!isNilOrEmpty(businessProfile.taxNumber) ? `<p style="margin: 0; color: #64748b;">GSTIN / TAX: ${businessProfile.taxNumber}</p>` : ""}
            </div>
            ${hasClientInfo ? `
              <div style="text-align: right;">
                <div class="section-title" style="text-align: right;">${isDeliveryChallan ? "DISPATCHED TO / RECEIVER" : "PREPARED FOR"}</div>
                ${!isNilOrEmpty(state.clientName) ? `<p style="margin: 0 0 4px 0; font-weight: 700;">${state.clientName}</p>` : ""}
                ${!isNilOrEmpty(state.clientPhone) ? `<p style="margin: 0 0 4px 0; font-weight: 600; color: #1e293b;">MOB: ${state.clientPhone}</p>` : ""}
                ${!isNilOrEmpty(state.vehicleNumber) ? `<p style="margin: 0 0 4px 0; font-weight: 600; color: #1e293b;">VEHICLE NO: ${state.vehicleNumber}</p>` : ""}
                ${!isNilOrEmpty(state.remarks) ? `<p style="margin: 0 0 4px 0; color: #475569; font-style: italic;">REMARKS: ${state.remarks}</p>` : ""}
                ${!isNilOrEmpty(state.clientAddress) ? `<p style="margin: 0 0 4px 0; color: #64748b;">${state.clientAddress}</p>` : ""}
                ${!isNilOrEmpty(state.clientEmail) ? `<p style="margin: 0; color: #64748b;">Email: ${state.clientEmail}</p>` : ""}
              </div>
            ` : ""}
          </div>

          ${metaCount > 0 ? `
            <div class="meta-box">
              <div class="meta-grid" style="display: grid; grid-template-columns: repeat(${metaCount}, 1fr); gap: 15px;">
                ${!isNilOrEmpty(state.quoteNumber) ? `
                  <div class="meta-item">
                    <label>${numLabelFriendly}</label>
                    <span>${state.quoteNumber}</span>
                  </div>
                ` : ""}
                ${!isNilOrEmpty(state.date) ? `
                  <div class="meta-item">
                    <label>${isDeliveryChallan ? "Date Dispatched" : "Issue Date"}</label>
                    <span>${state.date}</span>
                  </div>
                ` : ""}
                ${!isDeliveryChallan ? (!isNilOrEmpty(state.currency) ? `
                  <div class="meta-item">
                    <label>Currency</label>
                    <span>${state.currency}</span>
                  </div>
                ` : "") : `
                  <div class="meta-item">
                    <label>Total Dispatch Qty</label>
                    <span style="font-weight: 700; color: #4f46e5;">${totalQtyCount} Units</span>
                  </div>
                `}
                ${!isNilOrEmpty(state.vehicleNumber) ? `
                  <div class="meta-item">
                    <label>Vehicle No.</label>
                    <span style="font-family: monospace; font-weight: 700;">${state.vehicleNumber}</span>
                  </div>
                ` : ""}
                ${!isNilOrEmpty(state.remarks) ? `
                  <div class="meta-item">
                    <label>Remarks</label>
                    <span style="font-style: italic;">${state.remarks}</span>
                  </div>
                ` : ""}
              </div>
            </div>
          ` : ""}

          <div class="section-title">LINE ITEMS & GOODS SPECIFICATIONS</div>
          <table>
            <thead>
              <tr>
                <th style="border-top-left-radius: 4px; border-bottom-left-radius: 4px;">PRODUCT / SERVICE DESCRIPTION</th>
                <th style="width: 120px; text-align: center;">QUANTITY & UNIT</th>
                ${!isDeliveryChallan ? `
                  <th style="width: 120px; text-align: right;">UNIT PRICE</th>
                  <th style="width: 140px; text-align: right; border-top-right-radius: 4px; border-bottom-right-radius: 4px;">TOTAL PRICE</th>
                ` : `
                  <th style="width: 140px; text-align: right; border-top-right-radius: 4px; border-bottom-right-radius: 4px;">STATUS</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${state.items
                .map(
                  (item) => `
                <tr>
                  <td>
                    <div style="font-weight: 600; color: #0f172a;">${item.name}</div>
                    ${!isNilOrEmpty(item.description) ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${item.description}</div>` : ""}
                  </td>
                  <td style="text-align: center; font-weight: 700;">
                    ${item.quantity} <span style="font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase;">${item.unit || "Pcs"}</span>
                  </td>
                  ${!isDeliveryChallan ? `
                    <td style="text-align: right;">${state.currency}${item.unitPrice.toFixed(2)}</td>
                    <td style="text-align: right; font-weight: 600; color: #0f172a;">${state.currency}${(
                      item.quantity * item.unitPrice
                    ).toFixed(2)}</td>
                  ` : `
                    <td style="text-align: right; color: #059669; font-weight: 700;">✓ Dispatched</td>
                  `}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          ${!isDeliveryChallan ? `
            <div class="total-flex">
              <div class="total-table">
                <div class="total-row">
                  <span style="color: #64748b;">Subtotal:</span>
                  <span style="font-weight: 600;">${state.currency}${subtotal.toFixed(2)}</span>
                </div>
                ${
                  state.discountPercentage > 0 && !isNilOrEmpty(state.discountPercentage)
                    ? `<div class="total-row">
                        <span style="color: #64748b;">Discount (${state.discountPercentage}%):</span>
                        <span style="color: #b91c1c; font-weight: 600;">-${state.currency}${discountAmount.toFixed(2)}</span>
                      </div>`
                    : ""
                }
                <div class="total-row grand">
                  <span>Grand Total:</span>
                  <span>${state.currency}${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ` : `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">Delivery Challan Summary</span>
                <span style="font-size: 13px; font-weight: 800; color: #0f172a;">Total Items: ${state.items.length} | Dispatched Units: ${totalQtyCount}</span>
                <p style="margin: 3px 0 0 0; font-size: 10px; color: #64748b; font-style: italic;">Non-commercial movement of goods. Transported without monetary consideration on delivery.</p>
              </div>
              <div style="text-align: right; font-size: 11px; font-weight: 700; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 6px 12px; border-radius: 6px;">
                Verified for Dispatch
              </div>
            </div>

            <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
              <div style="border-top: 1.5px solid #94a3b8; padding-top: 8px;">
                <span style="font-size: 10px; font-weight: 800; color: #1e293b; text-transform: uppercase; display: block;">Receiver's Signature & Stamp</span>
                <span style="font-size: 10px; color: #64748b;">Received all materials in sound & satisfactory condition</span>
              </div>
              <div style="border-top: 1.5px solid #94a3b8; padding-top: 8px; text-align: right;">
                <span style="font-size: 10px; font-weight: 800; color: #1e293b; text-transform: uppercase; display: block;">Authorized Dispatch Signatory</span>
                <span style="font-size: 10px; color: #64748b;">For ${businessProfile.name}</span>
              </div>
            </div>
          `}

          ${hasFooterSection ? `
            <div style="margin-top: 30px; grid-template-columns: ${hasNotes && hasTermsOrBank ? "1fr 1fr" : "1fr"}; display: grid; gap: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              ${hasNotes ? `
                <div>
                  <div class="section-title" style="border: 0; padding: 0;">${isDeliveryChallan ? "SPECIAL DISPATCH INSTRUCTIONS" : "NOTES & SPECIAL INSTRUCTIONS"}</div>
                  <p style="margin: 0; font-size: 11px; color: #64748b; font-style: italic;">${state.notes}</p>
                </div>
              ` : ""}
              ${hasTermsOrBank ? `
                <div>
                  ${hasTerms ? `
                    <div class="section-title" style="border: 0; padding: 0;">${isDeliveryChallan ? "DELIVERY & ACCEPTANCE TERMS" : "PAYMENT TERMS"}</div>
                    <p style="margin: 0; font-size: 11px; color: #64748b;">${state.terms}</p>
                  ` : ""}
                  ${
                    hasBankDetails
                      ? `<div style="margin-top: ${hasTerms ? "10px" : "0"}; font-size: 10px; background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                          <span style="font-weight: 700; color: #475569; display: block;">Bank Details:</span>
                          ${[
                            !isNilOrEmpty(businessProfile.bankName) ? `Bank: ${businessProfile.bankName}` : '',
                            !isNilOrEmpty(businessProfile.bankAccount) ? `Acc: ${businessProfile.bankAccount}` : '',
                            !isNilOrEmpty(businessProfile.bankRouting) ? `Routing: ${businessProfile.bankRouting}` : ''
                          ].filter(Boolean).join(' | ')}
                        </div>`
                      : ""
                  }
                </div>
              ` : ""}
            </div>
          ` : ""}

          <div class="footer">
            Generated with Universe Estimate Generator
          </div>
        </div>
      `;

    printWindow.document.write(`
      <html>
        <head>
          <title>${state.quoteNumber} - ${state.clientName}</title>
          <style>
            ${isThermal ? thermalStyles : pdfStyles}
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Trigger local completion animation
    setSuccessMessage("Document print stylesheet loaded. Print/Export ready!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleShareReceipt = async () => {
    const targetId = isThermalSelected ? "simulated-receipt-roll" : "pdf-view-container";
    const receiptElement = document.getElementById(targetId);
    if (!receiptElement) return;

    try {
      const displayType = isThermalSelected ? "thermal receipt" : "document preview";
      setSuccessMessage(`Generating ${displayType} image for sharing...`);
      
      const captureOptions = isThermalSelected ? {
        pixelRatio: 2, // High resolution output
        backgroundColor: "#ffffff",
        style: {
          boxShadow: "none",
          border: "none",
          borderRadius: "0",
        },
      } : {
        pixelRatio: 1.5, // High resolution output for A4 preview
        backgroundColor: "#ffffff",
        style: {
          boxShadow: "none",
          border: "none",
        },
      };

      const image = await toPng(receiptElement, captureOptions);

      // Convert data URL to Blob & File for Web Share API
      const res = await fetch(image);
      const blob = await res.blob();
      const filename = `${state.documentType || "Quotation"}_${state.quoteNumber || "Receipt"}_${isThermalSelected ? "Thermal" : "Full"}.png`;
      const file = new File([blob], filename, { type: "image/png" });

      // Check if navigator.share supports file sharing
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `${state.documentType || "Quotation"} ${isThermalSelected ? "Receipt" : "Document"}`,
          text: isDeliveryChallan
            ? `Here is the delivery challan for ${state.documentType} #${state.quoteNumber} (${state.items.length} items, ${totalQtyCount} units dispatched).`
            : `Here is the ${isThermalSelected ? "receipt" : "estimate"} for ${state.documentType || "Quotation"} #${state.quoteNumber}. Total: ${state.currency}${total.toFixed(2)}`,
        });
        setSuccessMessage("Shared successfully!");
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        // Fallback for environments where Web Share API is blocked or unsupported (e.g., iframes, desktop)
        // We will trigger a download of the image, and copy summary text to clipboard
        const link = document.createElement("a");
        link.download = filename;
        link.href = image;
        link.click();

        // Copy text summary to clipboard as a "sharing" helper
        const summaryText = isDeliveryChallan
          ? `${state.documentType || "Delivery Challan"} #${state.quoteNumber}\nItems: ${state.items.length} (${totalQtyCount} units)\nVehicle: ${state.vehicleNumber || "N/A"}\nDate: ${state.date}`
          : `${state.documentType || "Receipt"} #${state.quoteNumber}\nTotal: ${state.currency}${total.toFixed(2)}\nDate: ${state.date}`;
        try {
          await navigator.clipboard.writeText(summaryText);
          setSuccessMessage("Web Share not fully supported in this browser. Copied details to clipboard & saved image!");
        } catch {
          setSuccessMessage("Web Share not supported. Saved image instead!");
        }
        setTimeout(() => setSuccessMessage(null), 4500);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isCancel = (error instanceof Error && error.name === "AbortError") || 
                      errorMsg.toLowerCase().includes("cancel") || 
                      errorMsg.toLowerCase().includes("abort");

      if (isCancel) {
        setSuccessMessage("Share canceled.");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        console.error("Error sharing receipt:", error);
        setSuccessMessage("Failed to share. Please try printing/exporting instead.");
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    }
  };

  const isThermalSelected = templateType.startsWith("thermal-");

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 h-full" id="print-preview-root">
      
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white px-3 sm:px-6 py-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-2 sm:flex gap-2">
          <button
            onClick={() => setTemplateType("modern")}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              !isThermalSelected
                ? "bg-slate-800 text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
            id="tab-pdf-preview"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="truncate">Full PDF</span>
          </button>
          
          <button
            onClick={() => setTemplateType("thermal-58")}
            className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isThermalSelected
                ? "bg-slate-800 text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
            id="tab-thermal-preview"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span className="truncate">Thermal Roll</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
          {isThermalSelected && (
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as TemplateType)}
              className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-2 rounded-lg border border-slate-200 focus:outline-hidden cursor-pointer"
              id="thermal-width-selector"
            >
              <option value="thermal-58">58mm (Receipt)</option>
              <option value="thermal-80">80mm (Wide)</option>
            </select>
          )}

          <button
            onClick={handleShareReceipt}
            className="flex-1 sm:flex-none p-2 sm:px-3 sm:py-2 hover:bg-indigo-50 border border-indigo-200 text-indigo-600 hover:text-indigo-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 font-bold text-xs uppercase cursor-pointer"
            title={isThermalSelected ? "Share Receipt" : "Share Document"}
            id="btn-trigger-share-image"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            onClick={() => handlePrint(isThermalSelected ? "thermal" : "pdf")}
            className="flex-1 sm:flex-none p-2 sm:px-3 sm:py-2 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors flex items-center justify-center gap-1.5 font-bold text-xs uppercase cursor-pointer"
            title={isThermalSelected ? "Print Thermal" : "Download PDF"}
            id="btn-trigger-print"
          >
            <Printer className="w-4 h-4" />
            <span>{isThermalSelected ? "Print" : "Export / Print"}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Bubble */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2.5 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="line-clamp-2">{successMessage}</span>
        </div>
      )}

      {/* Actual Viewport Rendering */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 overflow-hidden">
        
        {/* PDF Main Preview Container */}
        {!isThermalSelected ? (
          <div className="col-span-12 bg-white border border-slate-200 shadow-xl overflow-hidden flex flex-col rounded-xl" id="pdf-view-container">
            <div className="p-4 sm:p-6 md:p-8 lg:p-10 space-y-6 flex-grow overflow-y-auto h-full">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <Logo className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-800 uppercase tracking-tight">{businessProfile.name}</h3>
                    {businessProfile.taxNumber && (
                      <span className="text-[10px] text-slate-400 font-bold block">{businessProfile.taxNumber}</span>
                    )}
                  </div>
                </div>
                <div className="sm:text-right">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{docTitle}</h3>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mt-0.5">{subLabel}</span>
                </div>
              </div>

              {/* Profiles columns */}
              <div className={`grid grid-cols-1 ${hasClientInfo ? "sm:grid-cols-2" : ""} gap-4 sm:gap-8 pt-2 text-xs`}>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">From (Sender)</p>
                  {!isNilOrEmpty(businessProfile.name) && <p className="font-bold text-slate-800 mt-1">{businessProfile.name}</p>}
                  {!isNilOrEmpty(businessProfile.address) && <p className="text-slate-500 mt-1 leading-relaxed max-w-xs">{businessProfile.address}</p>}
                  {(!isNilOrEmpty(businessProfile.phone) || !isNilOrEmpty(businessProfile.email)) && (
                    <p className="text-slate-500 mt-1">
                      {!isNilOrEmpty(businessProfile.phone) && <span>Tel: {businessProfile.phone}</span>}
                      {!isNilOrEmpty(businessProfile.phone) && !isNilOrEmpty(businessProfile.email) && <span> | </span>}
                      {!isNilOrEmpty(businessProfile.email) && <span>{businessProfile.email}</span>}
                    </p>
                  )}
                </div>
                {hasClientInfo && (
                  <div className="sm:text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {isDeliveryChallan ? "Dispatched To / Receiver" : "Prepared For"}
                    </p>
                    {!isNilOrEmpty(state.clientName) && <p className="font-bold text-slate-800 mt-1">{state.clientName}</p>}
                    {!isNilOrEmpty(state.clientPhone) && <p className="font-semibold text-slate-700">MOB: {state.clientPhone}</p>}
                    {!isNilOrEmpty(state.vehicleNumber) && <p className="font-semibold text-slate-700">Vehicle No: {state.vehicleNumber}</p>}
                    {!isNilOrEmpty(state.remarks) && <p className="text-slate-500 mt-1 italic">Remarks: {state.remarks}</p>}
                    {!isNilOrEmpty(state.clientAddress) && <p className="text-slate-500 mt-1 leading-relaxed max-w-xs sm:ml-auto">{state.clientAddress}</p>}
                    {!isNilOrEmpty(state.clientEmail) && <p className="text-slate-500 mt-1">Email: {state.clientEmail}</p>}
                  </div>
                )}
              </div>

              {/* Summary metadata bar */}
              {metaCount > 0 && (
                <div className="bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 text-center">
                  {!isNilOrEmpty(state.quoteNumber) && (
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400">
                        {isDeliveryChallan ? "Challan No" : state.documentType === "Order" ? "Order No" : "Quote No"}
                      </span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">{state.quoteNumber}</span>
                    </div>
                  )}
                  {!isNilOrEmpty(state.date) && (
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400">
                        {isDeliveryChallan ? "Dispatch Date" : "Issue Date"}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 mt-0.5 block">{state.date}</span>
                    </div>
                  )}
                  {!isDeliveryChallan ? (
                    !isNilOrEmpty(state.currency) && (
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Currency</span>
                        <span className="text-xs font-semibold text-indigo-600 mt-0.5 block">
                          {state.currency === "₹" || state.currency === "INR" ? "INR (₹)" : state.currency === "$" || state.currency === "USD" ? "USD ($)" : state.currency === "€" ? "EUR (€)" : state.currency === "£" ? "GBP (£)" : state.currency === "¥" ? "JPY (¥)" : `${state.currency}`}
                        </span>
                      </div>
                    )
                  ) : (
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400">Total Dispatch Qty</span>
                      <span className="text-xs font-bold text-indigo-600 mt-0.5 block">
                        {totalQtyCount} Units
                      </span>
                    </div>
                  )}
                  {!isNilOrEmpty(state.vehicleNumber) && (
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400">Vehicle No.</span>
                      <span className="text-xs font-bold text-indigo-600 mt-0.5 block font-mono">{state.vehicleNumber}</span>
                    </div>
                  )}
                  {!isNilOrEmpty(state.remarks) && (
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400">Remarks</span>
                      <span className="text-xs font-medium text-slate-600 mt-0.5 block italic">{state.remarks}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    {isDeliveryChallan ? "Dispatched Items & Goods Specification" : "Line Items & Services"}
                  </h4>
                  {isDeliveryChallan && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                      Non-Commercial Dispatch (No Price)
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
                  <table className="w-full text-left min-w-[360px]">
                    <thead>
                      <tr className="text-[10px] uppercase text-slate-400 bg-slate-50 rounded-lg">
                        <th className="px-3 sm:px-4 py-2.5 rounded-l-lg">Item description</th>
                        <th className="px-3 sm:px-4 py-2.5 text-center w-28">Quantity / Unit</th>
                        {!isDeliveryChallan ? (
                          <>
                            <th className="px-3 sm:px-4 py-2.5 text-right w-28">Unit Price</th>
                            <th className="px-3 sm:px-4 py-2.5 text-right w-32 rounded-r-lg">Total</th>
                          </>
                        ) : (
                          <th className="px-3 sm:px-4 py-2.5 text-right w-32 rounded-r-lg">Dispatch Status</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.items.map((item) => (
                        <tr key={item.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 sm:px-4 py-3">
                            <p className="font-bold text-xs sm:text-sm text-slate-800">{item.name}</p>
                            {item.description && <p className="text-[11px] text-slate-500 mt-0.5 max-w-lg">{item.description}</p>}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm font-bold text-slate-900">
                            <span>{item.quantity}</span>
                            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase ml-1">
                              {item.unit || "Pcs"}
                            </span>
                          </td>
                          {!isDeliveryChallan ? (
                            <>
                              <td className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">{state.currency}{item.unitPrice.toFixed(2)}</td>
                              <td className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-bold text-slate-900">{state.currency}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                            </>
                          ) : (
                            <td className="px-3 sm:px-4 py-3 text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Dispatched
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                      {state.items.length === 0 && (
                        <tr>
                          <td colSpan={isDeliveryChallan ? 3 : 4} className="text-center py-6 text-slate-400 text-xs">No items added to this document yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Foot Section: Either Calculations (Quote/Order) or Challan Verification & Signatures */}
              {!isDeliveryChallan ? (
                <div className="flex justify-end pt-4">
                  <div className="w-full sm:w-64 space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Subtotal:</span>
                      <span>{state.currency}{subtotal.toFixed(2)}</span>
                    </div>
                    {state.discountPercentage > 0 && (
                      <div className="flex justify-between text-xs text-red-600 font-semibold">
                        <span>Discount ({state.discountPercentage}%):</span>
                        <span>-{state.currency}{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-900">
                      <span>Grand Total:</span>
                      <span className="text-indigo-600">{state.currency}{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider block">Delivery Challan Dispatch Summary</span>
                      <p className="text-xs sm:text-sm font-black text-slate-800 mt-0.5">
                        {state.items.length} Line Items • {totalQtyCount} Total Quantity Dispatched
                      </p>
                      <p className="text-[11px] text-slate-500 italic mt-0.5">
                        Goods dispatched without commercial amount for transport & delivery verification.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold self-stretch sm:self-auto justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Ready for Transport</span>
                    </div>
                  </div>

                  {/* Dual Signature Blocks for Transport / Delivery verification */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 pt-4">
                    <div className="border-t-2 border-slate-300 pt-2">
                      <p className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider">Receiver's Signature & Stamp</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Received all items in sound & satisfactory condition</p>
                      <div className="h-8 mt-2 border-b border-dashed border-slate-200"></div>
                    </div>
                    <div className="border-t-2 border-slate-300 pt-2 sm:text-right">
                      <p className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider">Authorized Dispatch Signatory</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">For {businessProfile.name}</p>
                      <div className="h-8 mt-2 border-b border-dashed border-slate-200"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes & Terms block */}
              {hasFooterSection && (
                <div className={`grid grid-cols-1 ${hasNotes && hasTermsOrBank ? "sm:grid-cols-2" : ""} gap-4 sm:gap-8 border-t border-slate-100 pt-6`}>
                  {hasNotes && (
                    <div>
                      <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {isDeliveryChallan ? "Special Dispatch Instructions" : "Notes & Special Instructions"}
                      </h5>
                      <p className="text-xs text-slate-500 italic mt-1.5 leading-relaxed">{state.notes}</p>
                    </div>
                  )}
                  {hasTermsOrBank && (
                    <div>
                      {hasTerms && (
                        <>
                          <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {isDeliveryChallan ? "Delivery & Acceptance Terms" : "Terms & Conditions"}
                          </h5>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{state.terms}</p>
                        </>
                      )}
                      {hasBankDetails && (
                        <div className={`${hasTerms ? "mt-3" : ""} bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] text-slate-500`}>
                          <span className="font-bold text-slate-700 block mb-1">Direct Bank Deposit Details:</span>
                          {!isNilOrEmpty(businessProfile.bankName) && <span>Bank: {businessProfile.bankName} </span>}
                          {!isNilOrEmpty(businessProfile.bankAccount) && <span>| Acc: {businessProfile.bankAccount} </span>}
                          {!isNilOrEmpty(businessProfile.bankRouting) && <span>| Routing: {businessProfile.bankRouting}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
            <div className="bg-slate-50 border-t border-slate-150 px-4 sm:px-6 py-3 text-[10px] text-center text-slate-400 font-medium">
              Generated securely via Universe Estimate Generator.
            </div>
          </div>
        ) : (
          /* Thermal Receipt Printer Simulator view */
          <div className="col-span-12 bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center py-4 px-2 sm:px-4 overflow-y-auto relative" id="thermal-view-container">
            {/* Ambient indicator lights */}
            <div className="self-start mb-2 sm:mb-4 flex items-center gap-1.5 px-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Thermal Emulator Active</span>
            </div>

            {/* Simulated Receipt Roll paper card container */}
            <div
              className={`bg-white shadow-xl p-4 sm:p-6 font-mono text-xs leading-tight text-slate-900 relative transition-all duration-300 border-x border-slate-300 w-full ${
                templateType === "thermal-58" ? "max-w-[280px]" : "max-w-[360px]"
              }`}
              id="simulated-receipt-roll"
              style={{
                backgroundImage: "radial-gradient(#ffffff 0%, #ffffff 90%, #f9fafb 100%)"
              }}
            >
              {/* Jagged / zig-zag simulated top tear paper border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-repeat-x flex overflow-hidden -mt-1 select-none">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-4 h-2 bg-slate-100 rotate-45 transform origin-top-left flex-shrink-0"></div>
                ))}
              </div>

              {/* Store header info */}
              <div className="text-center space-y-1">
                {!isNilOrEmpty(businessProfile.name) && <h4 className="font-black text-sm tracking-tight">{businessProfile.name.toUpperCase()}</h4>}
                {!isNilOrEmpty(businessProfile.address) && <p className="text-[10px] opacity-75">{businessProfile.address}</p>}
                {!isNilOrEmpty(businessProfile.phone) && <p className="text-[10px] opacity-75">TEL: {businessProfile.phone}</p>}
              </div>

              <div className="border-b border-dashed border-slate-400 my-3"></div>

              {/* Bill Details */}
              <div className="text-center font-bold tracking-widest text-xs mb-2">
                === {docTitle} ===
              </div>

              <div className="space-y-1 text-[11px]">
                {!isNilOrEmpty(state.quoteNumber) && (
                  <div className="flex justify-between">
                    <span>{numLabel}:</span>
                    <span className="font-bold">{state.quoteNumber}</span>
                  </div>
                )}
                {!isNilOrEmpty(state.date) && (
                  <div className="flex justify-between">
                    <span>DATE:</span>
                    <span>{state.date}</span>
                  </div>
                )}
                {!isDeliveryChallan ? (
                  !isNilOrEmpty(state.currency) && (
                    <div className="flex justify-between">
                      <span>CURRENCY:</span>
                      <span>{state.currency}</span>
                    </div>
                  )
                ) : (
                  <div className="flex justify-between">
                    <span>TYPE:</span>
                    <span className="font-bold">DELIVERY CHALLAN</span>
                  </div>
                )}
              </div>

              {hasClientInfo && (
                <>
                  <div className="border-b border-dashed border-slate-400 my-3"></div>
                  {/* Client detail */}
                  <div className="text-[11px] space-y-0.5">
                    <span className="font-bold block">
                      {isDeliveryChallan ? "DISPATCHED TO:" : "CLIENT PROFILE:"}
                    </span>
                    {!isNilOrEmpty(state.clientName) && <p className="font-bold">{state.clientName}</p>}
                    {!isNilOrEmpty(state.clientPhone) && <p>MOB: {state.clientPhone}</p>}
                    {!isNilOrEmpty(state.vehicleNumber) && <p>VEHICLE: {state.vehicleNumber}</p>}
                    {!isNilOrEmpty(state.remarks) && <p className="italic">REMARKS: {state.remarks}</p>}
                    {!isNilOrEmpty(state.clientAddress) && <p className="opacity-80 text-[10px]">{state.clientAddress}</p>}
                    {!isNilOrEmpty(state.clientEmail) && <p className="opacity-80 text-[10px]">EMAIL: {state.clientEmail}</p>}
                  </div>
                </>
              )}

              <div className="border-b border-dashed border-slate-400 my-3"></div>

              {/* Line Items detail */}
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-dashed border-slate-300">
                    <th className="font-bold pb-1 text-left">ITEM</th>
                    <th className="font-bold pb-1 text-center w-16">QTY/UNIT</th>
                    {!isDeliveryChallan && <th className="font-bold pb-1 text-right w-20">PRICE</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-200">
                  {state.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 pr-2">
                        <span className="font-bold block">{item.name}</span>
                        {!isNilOrEmpty(item.description) && <span className="text-[9px] text-slate-500 block leading-tight">{item.description}</span>}
                      </td>
                      <td className="py-1.5 text-center font-bold text-[10px]">{item.quantity} {item.unit || "Pcs"}</td>
                      {!isDeliveryChallan && (
                        <td className="py-1.5 text-right font-medium">{state.currency}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                      )}
                    </tr>
                  ))}
                  {state.items.length === 0 && (
                    <tr>
                      <td colSpan={isDeliveryChallan ? 2 : 3} className="text-center py-4 text-slate-400">Empty List</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="border-b border-dashed border-slate-400 my-3"></div>

              {/* Calculations / Summary Block */}
              {!isDeliveryChallan ? (
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>SUBTOTAL</span>
                    <span>{state.currency}{subtotal.toFixed(2)}</span>
                  </div>
                  {state.discountPercentage > 0 && !isNilOrEmpty(state.discountPercentage) && (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>DISCOUNT ({state.discountPercentage}%)</span>
                      <span>-{state.currency}{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-slate-400 my-1"></div>
                  <div className="flex justify-between text-sm font-black pt-1">
                    <span>TOTAL ESTIMATED</span>
                    <span>{state.currency}{total.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>TOTAL ITEMS</span>
                    <span className="font-bold">{state.items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TOTAL DISPATCH UNITS</span>
                    <span className="font-bold">{totalQtyCount}</span>
                  </div>
                  <div className="border-t border-dashed border-slate-400 my-1"></div>
                  <p className="font-bold text-center text-[10px] pt-1">GOODS RECEIVED IN FULL</p>
                  <p className="text-[9px] pt-2">RECEIVER SIGN: ________________</p>
                </div>
              )}

              {/* Notes & Terms */}
              {(hasNotes || hasTerms) && (
                <>
                  <div className="border-b border-dashed border-slate-400 my-3"></div>
                  {hasNotes && (
                    <div className="text-[10px] text-slate-600 mb-2 leading-relaxed">
                      <span className="font-bold">NOTE:</span> {state.notes}
                    </div>
                  )}
                  {hasTerms && (
                    <div className="text-[9px] text-slate-500 mb-2 leading-relaxed">
                      <span className="font-bold">TERMS:</span> {state.terms}
                    </div>
                  )}
                </>
              )}

              {/* Barcode Simulator */}
              <div className="my-4 flex flex-col items-center justify-center">
                <div className="w-4/5 h-8 bg-slate-900 relative overflow-hidden" style={{
                  backgroundImage: "repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 6px, #000 6px, #000 8px, #fff 8px, #fff 10px)"
                }}></div>
                <span className="text-[8px] text-slate-500 font-mono mt-1 tracking-widest">{state.quoteNumber}</span>
              </div>

              {/* Footer messages */}
              <p className="text-center text-[10px] font-bold uppercase mt-4 mb-3">
                {isDeliveryChallan ? "SAFE DELIVERY ASSURED" : "THANK YOU FOR YOUR BUSINESS"}
              </p>

              {/* Jagged simulated bottom tear border */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-repeat-x flex overflow-hidden mb-[-4px] select-none">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-4 h-2 bg-slate-100 rotate-45 transform origin-bottom-left flex-shrink-0"></div>
                ))}
              </div>
            </div>

            {/* Quick Emulator Action Triggers */}
            <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3 justify-center w-full px-2">
              <button
                onClick={() => handlePrint("thermal")}
                className="flex-1 sm:flex-none bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                id="btn-print-receipt"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print Thermal Receipt</span>
              </button>
              <button
                onClick={handleShareReceipt}
                className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                id="btn-share-receipt-image"
              >
                <Share2 className="w-4 h-4 text-indigo-200" />
                <span>Share Receipt</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
