import { useState, useRef } from "react";
import { QuoteState, BusinessProfile, TemplateType } from "../types";
import { Printer, Download, Receipt, Eye, Sparkles, Check, CheckCircle2, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import Logo from "./Logo";

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

  // Helper calculation
  const calculateSubtotal = () => {
    return state.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = (subtotal * state.discountPercentage) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = 0; // Tax rate removed
  const total = taxableAmount;

  const docTitle = (state.documentType || "Quotation").toUpperCase();
  const numLabel = state.documentType === "Delivery Challan" ? "CHALLAN NO" : state.documentType === "Order" ? "ORDER NO" : "QUOTE NO";
  const numLabelFriendly = state.documentType === "Delivery Challan" ? "Challan Number" : state.documentType === "Order" ? "Order Number" : "Quotation Number";
  const subLabel = state.documentType === "Delivery Challan" ? "Official Delivery Challan" : state.documentType === "Order" ? "Official Order Details" : "Official Price Estimate";

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
          <p class="text-center bold">${businessProfile.name.toUpperCase()}</p>
          <p class="text-center" style="font-size: 9px;">${businessProfile.address}</p>
          <p class="text-center" style="font-size: 9px;">TEL: ${businessProfile.phone}</p>
          
          <div class="divider"></div>
          <p class="text-center bold">${docTitle}</p>
          <div class="divider"></div>
          
          <div class="flex"><span class="bold">${numLabel}:</span><span>${state.quoteNumber}</span></div>
          <div class="flex"><span>DATE:</span><span>${state.date}</span></div>
          <div class="flex"><span>CURRENCY:</span><span>${state.currency}</span></div>
          
          <div class="divider"></div>
          <p class="bold">CLIENT:</p>
          ${state.clientName ? `<p class="mb-1">${state.clientName}</p>` : ""}
          ${state.clientPhone ? `<p class="mb-1">MOB: ${state.clientPhone}</p>` : ""}
          ${state.vehicleNumber ? `<p class="mb-1">VEHICLE NO: ${state.vehicleNumber}</p>` : ""}
          ${state.remarks ? `<p class="mb-1">REMARKS: ${state.remarks}</p>` : ""}
          <div class="divider"></div>

          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; font-weight: bold; padding: 2px 0;">ITEM</th>
                <th style="text-align: center; font-weight: bold; padding: 2px 0; width: 35px;">QTY</th>
                <th style="text-align: right; font-weight: bold; padding: 2px 0; width: 60px;">PRICE</th>
              </tr>
            </thead>
            <tbody>
              ${state.items
                .map(
                  (item) => `
                <tr>
                  <td style="padding: 2px 0; max-width: 100px; word-wrap: break-word;">${item.name}</td>
                  <td style="text-align: center; padding: 2px 0;">${item.quantity}</td>
                  <td style="text-align: right; padding: 2px 0;">${state.currency}${(
                    item.quantity * item.unitPrice
                  ).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="divider"></div>
          <div class="flex"><span>SUBTOTAL</span><span>${state.currency}${subtotal.toFixed(2)}</span></div>
          ${
            state.discountPercentage > 0
              ? `<div class="flex"><span>DISCOUNT (${state.discountPercentage}%)</span><span>-${state.currency}${discountAmount.toFixed(
                  2
                )}</span></div>`
              : ""
          }
          <div class="divider"></div>
          <div class="flex bold" style="font-size: 13px;"><span>TOTAL</span><span>${state.currency}${total.toFixed(
          2
        )}</span></div>
          
          <div class="divider"></div>
          ${state.notes ? `<p style="font-size: 9px; margin: 4px 0;">NOTE: ${state.notes}</p>` : ""}
          
          <div class="barcode-placeholder"></div>
          <p class="text-center" style="font-size: 8px; margin-top: 10px;">THANK YOU FOR YOUR BUSINESS</p>
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
              <p style="margin: 0 0 4px 0; font-weight: 700;">${businessProfile.name}</p>
              <p style="margin: 0 0 4px 0; color: #64748b;">${businessProfile.address}</p>
              <p style="margin: 0 0 4px 0; color: #64748b;">Phone: ${businessProfile.phone} | Email: ${businessProfile.email}</p>
              ${businessProfile.taxNumber ? `<p style="margin: 0; color: #64748b;">VAT ID: ${businessProfile.taxNumber}</p>` : ""}
            </div>
            <div style="text-align: right;">
              <div class="section-title" style="text-align: right;">PREPARED FOR</div>
              ${state.clientName ? `<p style="margin: 0 0 4px 0; font-weight: 700;">${state.clientName}</p>` : ""}
              ${state.clientPhone ? `<p style="margin: 0 0 4px 0; font-weight: 600; color: #1e293b;">MOB: ${state.clientPhone}</p>` : ""}
              ${state.vehicleNumber ? `<p style="margin: 0 0 4px 0; font-weight: 600; color: #1e293b;">VEHICLE NO: ${state.vehicleNumber}</p>` : ""}
              ${state.remarks ? `<p style="margin: 0 0 4px 0; color: #475569; font-style: italic;">REMARKS: ${state.remarks}</p>` : ""}
              ${state.clientAddress ? `<p style="margin: 0 0 4px 0; color: #64748b;">${state.clientAddress}</p>` : ""}
              ${state.clientEmail ? `<p style="margin: 0; color: #64748b;">Email: ${state.clientEmail}</p>` : ""}
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-grid" style="display: grid; grid-template-columns: repeat(${state.vehicleNumber || state.remarks ? '5' : '3'}, 1fr); gap: 15px;">
              <div class="meta-item">
                <label>${numLabelFriendly}</label>
                <span>${state.quoteNumber}</span>
              </div>
              <div class="meta-item">
                <label>Date Generated</label>
                <span>${state.date}</span>
              </div>
              <div class="meta-item">
                <label>Currency</label>
                <span>${state.currency}</span>
              </div>
              ${state.vehicleNumber ? `
              <div class="meta-item">
                <label>Vehicle No.</label>
                <span style="font-family: monospace; font-weight: 700;">${state.vehicleNumber}</span>
              </div>` : ""}
              ${state.remarks ? `
              <div class="meta-item">
                <label>Remarks</label>
                <span style="font-style: italic;">${state.remarks}</span>
              </div>` : ""}
            </div>
          </div>

          <div class="section-title">LINE ITEMS</div>
          <table>
            <thead>
              <tr>
                <th style="border-top-left-radius: 4px; border-bottom-left-radius: 4px;">PRODUCT / SERVICE DESCRIPTION</th>
                <th style="width: 80px; text-align: center;">QTY</th>
                <th style="width: 120px; text-align: right;">UNIT PRICE</th>
                <th style="width: 140px; text-align: right; border-top-right-radius: 4px; border-bottom-right-radius: 4px;">TOTAL PRICE</th>
              </tr>
            </thead>
            <tbody>
              ${state.items
                .map(
                  (item) => `
                <tr>
                  <td>
                    <div style="font-weight: 600; color: #0f172a;">${item.name}</div>
                    ${item.description ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${item.description}</div>` : ""}
                  </td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">${state.currency}${item.unitPrice.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 600; color: #0f172a;">${state.currency}${(
                    item.quantity * item.unitPrice
                  ).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="total-flex">
            <div class="total-table">
              <div class="total-row">
                <span style="color: #64748b;">Subtotal:</span>
                <span style="font-weight: 600;">${state.currency}${subtotal.toFixed(2)}</span>
              </div>
              ${
                state.discountPercentage > 0
                  ? `<div class="total-row">
                      <span style="color: #64748b;">Discount (${state.discountPercentage}%):</span>
                      <span style="color: #b91c1c; font-weight: 600;">-${state.currency}${discountAmount.toFixed(
                      2
                    )}</span>
                    </div>`
                  : ""
              }
              <div class="total-row grand">
                <span>Grand Total:</span>
                <span>${state.currency}${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 30px; grid-template-columns: 1fr 1fr; display: grid; gap: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <div>
              <div class="section-title" style="border: 0; padding: 0;">NOTES</div>
              <p style="margin: 0; font-size: 11px; color: #64748b; font-style: italic;">${state.notes || "N/A"}</p>
            </div>
            <div>
              <div class="section-title" style="border: 0; padding: 0;">PAYMENT TERMS</div>
              <p style="margin: 0; font-size: 11px; color: #64748b;">${state.terms || "Due on receipt."}</p>
              ${
                businessProfile.bankName
                  ? `<div style="margin-top: 10px; font-size: 10px; background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                      <span style="font-weight: 700; color: #475569; display: block;">Bank Details:</span>
                      ${businessProfile.bankName} | Acc: ${businessProfile.bankAccount} | Routing: ${businessProfile.bankRouting}
                    </div>`
                  : ""
              }
            </div>
          </div>

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
          title: `${state.documentType || "Quotation"} ${isThermalSelected ? "Receipt" : "Estimate"}`,
          text: `Here is the ${isThermalSelected ? "receipt" : "estimate"} for ${state.documentType || "Quotation"} #${state.quoteNumber}. Total: ${state.currency}${total.toFixed(2)}`,
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
        const summaryText = `${state.documentType || "Receipt"} #${state.quoteNumber}\nTotal: ${state.currency}${total.toFixed(2)}\nDate: ${state.date}`;
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
      <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex gap-2">
          <button
            onClick={() => setTemplateType("modern")}
            className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center gap-2 ${
              !isThermalSelected
                ? "bg-slate-800 text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
            id="tab-pdf-preview"
          >
            <Eye className="w-3.5 h-3.5" />
            Full PDF Preview
          </button>
          
          <button
            onClick={() => setTemplateType("thermal-58")}
            className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all flex items-center gap-2 ${
              isThermalSelected
                ? "bg-slate-800 text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
            id="tab-thermal-preview"
          >
            <Receipt className="w-3.5 h-3.5" />
            Thermal Receipt View
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isThermalSelected && (
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as TemplateType)}
              className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-hidden"
              id="thermal-width-selector"
            >
              <option value="thermal-58">58mm Roll (Default)</option>
              <option value="thermal-80">80mm Roll (Standard)</option>
            </select>
          )}

          <button
            onClick={handleShareReceipt}
            className="p-2 hover:bg-indigo-50 border border-indigo-200 text-indigo-600 hover:text-indigo-800 rounded-lg transition-colors flex items-center gap-1.5 font-bold text-xs uppercase"
            title={isThermalSelected ? "Share Receipt" : "Share Estimate"}
            id="btn-trigger-share-image"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          <button
            onClick={() => handlePrint(isThermalSelected ? "thermal" : "pdf")}
            className="p-2 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors flex items-center gap-1.5 font-bold text-xs uppercase"
            title={isThermalSelected ? "Print Thermal" : "Download PDF"}
            id="btn-trigger-print"
          >
            <Printer className="w-4 h-4" />
            {isThermalSelected ? "Print Thermal" : "Export / Print"}
          </button>
        </div>
      </div>

      {/* Success Notification Bubble */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2.5 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Actual Viewport Rendering */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 overflow-hidden">
        
        {/* PDF Main Preview Container */}
        {!isThermalSelected ? (
          <div className="col-span-12 bg-white border border-slate-200 shadow-xl overflow-hidden flex flex-col rounded-xl" id="pdf-view-container">
            <div className="p-10 space-y-6 flex-grow overflow-y-auto h-full">
              
              {/* Header */}
              <div className="flex justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <Logo className="w-11 h-11" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">{businessProfile.name}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{docTitle}</h3>
                </div>
              </div>

              {/* Profiles columns */}
              <div className="grid grid-cols-2 gap-8 pt-2">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">From</p>
                  <p className="font-bold text-slate-800 mt-1">{businessProfile.name}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs">{businessProfile.address}</p>
                  <p className="text-xs text-slate-500 mt-1">Tel: {businessProfile.phone} | {businessProfile.email}</p>
                </div>
                 <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Prepared For</p>
                  {state.clientName && <p className="font-bold text-slate-800 mt-1">{state.clientName}</p>}
                  {state.clientPhone && <p className="text-xs font-semibold text-slate-700">MOB: {state.clientPhone}</p>}
                  {state.vehicleNumber && <p className="text-xs font-semibold text-slate-700">Vehicle No: {state.vehicleNumber}</p>}
                  {state.remarks && <p className="text-xs text-slate-500 mt-1 italic">Remarks: {state.remarks}</p>}
                  {state.clientAddress && <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs ml-auto">{state.clientAddress}</p>}
                  {state.clientEmail && <p className="text-xs text-slate-500 mt-1">Email: {state.clientEmail}</p>}
                </div>
              </div>

              {/* Summary metadata bar */}
              <div className={`bg-slate-50 border border-slate-100 p-4 rounded-xl grid gap-4 text-center ${state.vehicleNumber && state.remarks ? "grid-cols-5" : state.vehicleNumber || state.remarks ? "grid-cols-4" : "grid-cols-3"}`}>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">
                    {state.documentType === "Delivery Challan" ? "Challan No" : state.documentType === "Order" ? "Order No" : "Quote No"}
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">{state.quoteNumber}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Issue Date</span>
                  <span className="text-xs font-semibold text-slate-800 mt-0.5 block">{state.date}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Currency</span>
                  <span className="text-xs font-semibold text-indigo-600 mt-0.5 block">
                    {state.currency === "₹" || state.currency === "INR" ? "INR (₹)" : state.currency === "$" || state.currency === "USD" ? "USD ($)" : state.currency === "€" ? "EUR (€)" : state.currency === "£" ? "GBP (£)" : state.currency === "¥" ? "JPY (¥)" : `${state.currency}`}
                  </span>
                </div>
                {state.vehicleNumber && (
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Vehicle No.</span>
                    <span className="text-xs font-bold text-indigo-600 mt-0.5 block font-mono">{state.vehicleNumber}</span>
                  </div>
                )}
                {state.remarks && (
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Remarks</span>
                    <span className="text-xs font-medium text-slate-600 mt-0.5 block italic">{state.remarks}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Line Items & Services</h4>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase text-slate-400 bg-slate-50 rounded-lg">
                      <th className="px-4 py-2.5 rounded-l-lg">Item description</th>
                      <th className="px-4 py-2.5 text-center w-16">Qty</th>
                      <th className="px-4 py-2.5 text-right w-28">Unit Price</th>
                      <th className="px-4 py-2.5 text-right w-32 rounded-r-lg">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.items.map((item) => (
                      <tr key={item.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-sm text-slate-800">{item.name}</p>
                          {item.description && <p className="text-xs text-slate-500 mt-0.5 max-w-lg">{item.description}</p>}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">{state.currency}{item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{state.currency}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                    {state.items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400 text-xs">No items added to this document yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Foot Calculations */}
              <div className="flex justify-end pt-4">
                <div className="w-64 space-y-2 border-t border-slate-100 pt-4">
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

              {/* Notes block */}
              <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-6">
                <div>
                  <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Notes & Special Instructions</h5>
                  <p className="text-xs text-slate-500 italic mt-1.5 leading-relaxed">{state.notes || "No special instructions provided."}</p>
                </div>
                <div>
                  <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Terms & Conditions</h5>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{state.terms || "Due upon approval."}</p>
                  {businessProfile.bankName && (
                    <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] text-slate-500">
                      <span className="font-bold text-slate-700 block mb-1">Direct Bank Deposit Details:</span>
                      Bank: {businessProfile.bankName} | Acc: {businessProfile.bankAccount} <br />
                      Routing Code: {businessProfile.bankRouting}
                    </div>
                  )}
                </div>
              </div>

            </div>
            <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 text-[10px] text-center text-slate-400 font-medium">
              Generated securely via Universe Estimate Generator.
            </div>
          </div>
        ) : (
          /* Thermal Receipt Printer Simulator view */
          <div className="col-span-12 bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center py-4 px-4 overflow-y-auto relative" id="thermal-view-container">
            {/* Ambient indicator lights */}
            <div className="absolute top-4 left-6 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Emulator: Star Micronics TSP100 (Online)</span>
            </div>

            {/* Simulated Receipt Roll paper card container */}
            <div
              className={`bg-white shadow-xl p-6 font-mono text-xs leading-tight text-slate-900 relative transition-all duration-300 border-x border-slate-300 ${
                templateType === "thermal-58" ? "w-[280px]" : "w-[380px]"
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
                <h4 className="font-black text-sm tracking-tight">{businessProfile.name.toUpperCase()}</h4>
                <p className="text-[10px] opacity-75">{businessProfile.address}</p>
                <p className="text-[10px] opacity-75">TEL: {businessProfile.phone}</p>
              </div>

              <div className="border-b border-dashed border-slate-400 my-3"></div>

              {/* Bill Details */}
              <div className="text-center font-bold tracking-widest text-xs mb-2">
                === {docTitle} ===
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>{numLabel}:</span>
                  <span className="font-bold">{state.quoteNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{state.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>CURRENCY:</span>
                  <span>{state.currency}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-400 my-3"></div>

              {/* Client detail */}
              <div className="text-[11px] space-y-0.5">
                <span className="font-bold block">CLIENT PROFILE:</span>
                {state.clientName && <p className="font-bold">{state.clientName}</p>}
                {state.clientPhone && <p>MOB: {state.clientPhone}</p>}
                {state.vehicleNumber && <p>VEHICLE: {state.vehicleNumber}</p>}
                {state.remarks && <p className="italic">REMARKS: {state.remarks}</p>}
                {state.clientAddress && <p className="opacity-80 text-[10px]">{state.clientAddress}</p>}
              </div>

              <div className="border-b border-dashed border-slate-400 my-3"></div>

              {/* Line Items detail */}
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-dashed border-slate-300">
                    <th className="font-bold pb-1 text-left">ITEM</th>
                    <th className="font-bold pb-1 text-center w-12">QTY</th>
                    <th className="font-bold pb-1 text-right w-24">PRICE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-200">
                  {state.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 pr-2">
                        <span className="font-bold block">{item.name}</span>
                        {item.description && <span className="text-[9px] text-slate-500 block leading-tight">{item.description}</span>}
                      </td>
                      <td className="py-1.5 text-center">{item.quantity}</td>
                      <td className="py-1.5 text-right">{state.currency}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                  {state.items.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-slate-400">Empty List</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="border-b border-dashed border-slate-400 my-3"></div>

              {/* Calculations Block */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL</span>
                  <span>{state.currency}{subtotal.toFixed(2)}</span>
                </div>
                {state.discountPercentage > 0 && (
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

              <div className="border-b border-dashed border-slate-400 my-3"></div>

              {/* Notes */}
              {state.notes && (
                <div className="text-[10px] text-slate-600 mb-3 leading-relaxed">
                  <span className="font-bold">NOTE:</span> {state.notes}
                </div>
              )}

              {/* Barcode Simulator */}
              <div className="my-4 flex flex-col items-center justify-center">
                <div className="w-4/5 h-8 bg-slate-900 relative overflow-hidden" style={{
                  backgroundImage: "repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 6px, #000 6px, #000 8px, #fff 8px, #fff 10px)"
                }}></div>
                <span className="text-[8px] text-slate-500 font-mono mt-1 tracking-widest">{state.quoteNumber}</span>
              </div>

              {/* Footer messages */}
              <p className="text-center text-[10px] font-bold uppercase mt-4 mb-3">THANK YOU FOR YOUR BUSINESS</p>

              {/* Jagged simulated bottom tear border */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-repeat-x flex overflow-hidden mb-[-4px] select-none">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-4 h-2 bg-slate-100 rotate-45 transform origin-bottom-left flex-shrink-0"></div>
                ))}
              </div>
            </div>

            {/* Quick Emulator Action Triggers */}
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => handlePrint("thermal")}
                className="bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-[1.02]"
                id="btn-print-receipt"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                Print Thermal Receipt
              </button>
              <button
                onClick={handleShareReceipt}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-[1.02]"
                id="btn-share-receipt-image"
              >
                <Share2 className="w-4 h-4 text-indigo-200" />
                Share Receipt
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
