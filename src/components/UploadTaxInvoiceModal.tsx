import { useState, useRef, ChangeEvent, DragEvent } from "react";
import {
  Upload,
  FileText,
  FileUp,
  FileSpreadsheet,
  Truck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  ClipboardPaste,
  ShieldCheck,
  Check,
  Package,
  Plus,
  Trash2,
  Edit3,
  HelpCircle,
  FileCheck,
  FileCode,
  ImageIcon
} from "lucide-react";
import { QuoteState, QuoteItem } from "../types";
import QuantityInputBox from "./QuantityInputBox";

interface UploadTaxInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyChallan: (newChallanState: QuoteState, feedback: string) => void;
  currentProfileName?: string;
}

const COMMON_UNITS = [
  "Pcs",
  "Nos",
  "Kg",
  "Mtr",
  "Box",
  "Set",
  "Ton",
  "Bags",
  "Sq.Ft",
  "Sq.Mtr",
  "Bundle",
  "Ltr",
  "Roll",
  "Coil",
  "Drum",
  "Packet",
  "Pair",
  "Sheet",
  "Quintal"
];

const SAMPLE_INVOICE_TEXT = `TAX INVOICE
Invoice No: TI-2024-8842
Date: 14/10/2024
Vehicle No: MP-20-HB-7721
Transporter / LR No: TR-5509 (V-Trans Logistics)

BUYER / BILL TO / SHIP TO:
Consignee: Bharat Infra Construction Works
Address: Plot 108, Industrial Growth Center, Richhai, Jabalpur (M.P.) 482010
Contact: +91 94251 77890
Email: purchase@bharatinfra.in
GSTIN: 23AABCB1234F1Z8

LINE ITEMS DISPATCHED:
1. M.S. Round Pipe 50mm - HSN: 7306 - Qty: 40 Mtr - Unit: Mtr
   Specs: IS 1239 Heavy Class, Length 6 Mtr
2. Heavy Duty Profile Sheet 0.5mm - HSN: 7210 - Qty: 25 Pcs - Unit: Pcs
   Specs: AZ-150 Galvalume Coated 10ft length
3. Hex Head Nut Bolt 10x40 - HSN: 7318 - Qty: 150 Pcs - Unit: Pcs
   Specs: Grade 8.8 High Tensile Zinc Plated
4. Structural Fabrication Channels - HSN: 7216 - Qty: 12 Set - Unit: Set
   Specs: ISMC 100x50mm Fabricated Framework
5. Welding Electrodes 3.15mm - HSN: 8311 - Qty: 8 Box - Unit: Box
   Specs: E6013 Low Carbon Steel Electrodes

Terms: Goods dispatched for transport against Delivery Challan. Dispatched in sound condition.`;

export default function UploadTaxInvoiceModal({
  isOpen,
  onClose,
  onApplyChallan,
  currentProfileName = "M.G. INDUSTRIES",
}: UploadTaxInvoiceModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedChallan, setExtractedChallan] = useState<QuoteState | null>(null);
  const [extractedFeedback, setExtractedFeedback] = useState<string | null>(null);
  const [rawExtractedText, setRawExtractedText] = useState<string | null>(null);
  const [reviewTab, setReviewTab] = useState<"review" | "raw">("review");
  const [showDocPreview, setShowDocPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setError(null);
    setExtractedChallan(null);
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = () => {
    setActiveTab("paste");
    setPastedText(SAMPLE_INVOICE_TEXT);
    setError(null);
    setExtractedChallan(null);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64Data);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleProcessInvoice = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      const payload: any = {
        currentProfileName,
      };

      if (activeTab === "file") {
        if (!selectedFile) {
          throw new Error("Please select or drop a tax invoice file (PDF or Image).");
        }
        const base64 = await readFileAsBase64(selectedFile);
        payload.fileBase64 = base64;
        payload.mimeType = selectedFile.type || "application/pdf";
        payload.fileName = selectedFile.name;
      } else {
        if (!pastedText.trim()) {
          throw new Error("Please paste tax invoice text or load a sample.");
        }
        payload.invoiceText = pastedText.trim();
      }

      const response = await fetch("/api/parse-invoice-to-challan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error status ${response.status}`);
      }

      const result = await response.json();
      if (!result.challanState) {
        throw new Error("Invalid response format received from invoice parsing engine.");
      }

      // Ensure all unit prices are 0 for Delivery Challan
      const sanitizedChallan: QuoteState = {
        ...result.challanState,
        documentType: "Delivery Challan",
        discountPercentage: 0,
        taxPercentage: 0,
        items: (result.challanState.items || []).map((item: any, idx: number) => ({
          id: item.id || `item-${Date.now()}-${idx}`,
          name: item.name || "",
          description: item.description || "",
          quantity: typeof item.quantity === "number" ? item.quantity : 1,
          unit: item.unit || "Pcs",
          unitPrice: 0,
        })),
      };

      setExtractedChallan(sanitizedChallan);
      setExtractedFeedback(result.feedback || "Tax Invoice extracted into Delivery Challan!");
      setRawExtractedText(result.rawExtractedText || pastedText || "");
      setReviewTab("review");
    } catch (err: any) {
      console.error("Error processing invoice:", err);
      setError(err.message || "Failed to process tax invoice. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Editing helpers for Extracted Delivery Challan
  const handleUpdateChallanField = (field: keyof QuoteState, value: any) => {
    if (!extractedChallan) return;
    setExtractedChallan({
      ...extractedChallan,
      [field]: value,
    });
  };

  const handleUpdateItem = (index: number, field: keyof QuoteItem, value: any) => {
    if (!extractedChallan) return;
    const updated = [...extractedChallan.items];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setExtractedChallan({
      ...extractedChallan,
      items: updated,
    });
  };

  const handleDeleteItem = (index: number) => {
    if (!extractedChallan) return;
    const updated = extractedChallan.items.filter((_, idx) => idx !== index);
    setExtractedChallan({
      ...extractedChallan,
      items: updated,
    });
  };

  const handleAddItem = () => {
    if (!extractedChallan) return;
    const newItem: QuoteItem = {
      id: `item-${Date.now()}-${extractedChallan.items.length + 1}`,
      name: "",
      description: "",
      quantity: 1,
      unit: "Pcs",
      unitPrice: 0,
    };
    setExtractedChallan({
      ...extractedChallan,
      items: [...extractedChallan.items, newItem],
    });
  };

  const handleApply = () => {
    if (extractedChallan) {
      onApplyChallan(
        extractedChallan,
        extractedFeedback || "Delivery Challan generated from Tax Invoice (processed without amount)."
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-auto overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Upload Tax Invoice to Make Delivery Challan</h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Zero Amount
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Precise extraction of consignee, vehicle number, dispatch items, quantities, and units. Omits monetary amounts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Method Switcher Tabs (when not yet extracted) */}
          {!extractedChallan && (
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveTab("file");
                      setError(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "file"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    Upload File (PDF / Image)
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("paste");
                      setError(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "paste"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    Paste Invoice Text
                  </button>
                </div>

                <button
                  onClick={handleLoadSample}
                  className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Try Sample Tax Invoice
                </button>
              </div>

              {/* Tab 1: File Upload */}
              {activeTab === "file" && (
                <div className="mt-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                      isDragging
                        ? "border-indigo-600 bg-indigo-50/50 scale-[1.01]"
                        : selectedFile
                        ? "border-emerald-400 bg-emerald-50/30"
                        : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80 bg-slate-50/40"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {selectedFile ? (
                      <div className="space-y-3 w-full flex flex-col items-center">
                        {filePreview ? (
                          <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white">
                            <img src={filePreview} alt="Invoice preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center">
                              <span className="text-[9px] font-extrabold text-white bg-slate-900/80 px-1.5 py-0.5 rounded">
                                Image Ready
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-xs">
                            <FileSpreadsheet className="w-7 h-7" />
                          </div>
                        )}
                        <div>
                          <p className="font-extrabold text-sm text-slate-800 break-all">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {(selectedFile.size / 1024).toFixed(1)} KB &bull; {selectedFile.type || "Document"}
                          </p>
                        </div>
                        <p className="text-[11px] text-indigo-600 font-bold">Click or drag another file to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2 flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-1">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-extrabold text-slate-800">
                          Click to browse or drag & drop Tax Invoice
                        </p>
                        <p className="text-xs text-slate-500">
                          Supports Tax Invoice PDF, scanned JPG, PNG, WEBP documents up to 50MB
                        </p>
                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700">
                          Direct PDF Text Extraction & Gemini Multimodal
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Paste Invoice Text */}
              {activeTab === "paste" && (
                <div className="mt-4 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Paste Tax Invoice / Bill Text or Accounting Software Export:
                  </label>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste text from Tally, GST Invoice, PDF copy, or email here..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:border-indigo-500 transition-colors resize-y leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500">
                    Supports tabular GST invoices, column lists, and bulleted item descriptions with quantities and units.
                  </p>
                </div>
              )}

              {/* Processing Info Banner */}
              <div className="mt-4 p-3 rounded-xl bg-slate-100 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-slate-800">Delivery Challan Rule Enforced:</span> All prices, taxes, and amounts are stripped or set to 0. Only dispatched quantities and units will appear on the delivery challan.
                </div>
              </div>
            </div>
          )}

          {/* Extracted Delivery Challan Review Stage */}
          {extractedChallan && (
            <div className="space-y-4 animate-slide-up">
              {/* Top Banner & Tab Toggle */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-emerald-900 tracking-wide">
                      Invoice Parsed &bull; Review & Verify Details
                    </h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {extractedFeedback}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setReviewTab("review")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                      reviewTab === "review"
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-emerald-100/70 text-emerald-800 hover:bg-emerald-200"
                    }`}
                  >
                    <Edit3 className="w-3 h-3 inline mr-1" />
                    Verify & Edit Form
                  </button>
                  {rawExtractedText && (
                    <button
                      type="button"
                      onClick={() => setReviewTab("raw")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                        reviewTab === "raw"
                          ? "bg-slate-800 text-white shadow-xs"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      <FileCode className="w-3 h-3 inline mr-1" />
                      Raw Text
                    </button>
                  )}
                </div>
              </div>

              {reviewTab === "raw" && rawExtractedText ? (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-900 text-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">Extracted Text from Document ({rawExtractedText.length} characters):</span>
                    <button
                      onClick={() => navigator.clipboard?.writeText(rawExtractedText)}
                      className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      Copy All Text
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono whitespace-pre-wrap max-h-60 overflow-y-auto p-2 bg-slate-950 rounded-lg text-slate-300 leading-relaxed">
                    {rawExtractedText}
                  </pre>
                </div>
              ) : (
                /* Interactive Extracted Form Card */
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-4 text-xs">
                  {/* Row 1: Consignee & Vehicle / Transport Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-3 border-b border-slate-200">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Dispatched To (Consignee / Buyer)
                      </span>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500">Recipient Name / M/s:</label>
                        <input
                          type="text"
                          value={extractedChallan.clientName}
                          onChange={(e) => handleUpdateChallanField("clientName", e.target.value)}
                          placeholder="e.g. Acme Infra Works"
                          className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500">Delivery Address:</label>
                        <input
                          type="text"
                          value={extractedChallan.clientAddress}
                          onChange={(e) => handleUpdateChallanField("clientAddress", e.target.value)}
                          placeholder="Delivery site or plant address"
                          className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Challan & Transport Reference
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500">Challan Ref No:</label>
                          <input
                            type="text"
                            value={extractedChallan.quoteNumber}
                            onChange={(e) => handleUpdateChallanField("quoteNumber", e.target.value)}
                            className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-700 focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500">Dispatch Date:</label>
                          <input
                            type="text"
                            value={extractedChallan.date}
                            onChange={(e) => handleUpdateChallanField("date", e.target.value)}
                            className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500">Vehicle / Truck No:</label>
                          <input
                            type="text"
                            value={extractedChallan.vehicleNumber || ""}
                            onChange={(e) => handleUpdateChallanField("vehicleNumber", e.target.value)}
                            placeholder="e.g. MP-20-HB-7721"
                            className="w-full mt-0.5 px-2.5 py-1.5 bg-amber-50/60 border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-900 focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500">Contact / Phone:</label>
                          <input
                            type="text"
                            value={extractedChallan.clientPhone || ""}
                            onChange={(e) => handleUpdateChallanField("clientPhone", e.target.value)}
                            placeholder="e.g. +91 94251..."
                            className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500">Dispatch Remarks / LR Ref:</label>
                        <input
                          type="text"
                          value={extractedChallan.remarks || ""}
                          onChange={(e) => handleUpdateChallanField("remarks", e.target.value)}
                          placeholder="e.g. Dispatched against Tax Invoice No: ... "
                          className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-600 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Optional Document Image Preview Toggle */}
                  {filePreview && (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                      <div className="p-2.5 bg-slate-100/80 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                          Original Invoice Document Preview
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDocPreview(!showDocPreview)}
                          className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 bg-white hover:bg-slate-50 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          {showDocPreview ? "Hide Preview" : "Show Document"}
                        </button>
                      </div>
                      {showDocPreview && (
                        <div className="p-3 bg-slate-900/5 flex justify-center border-t border-slate-200">
                          <img
                            src={filePreview}
                            alt="Uploaded Tax Invoice"
                            className="max-h-72 object-contain rounded border border-slate-300 shadow-sm bg-white"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dispatched Line Items Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-indigo-600" />
                          Dispatched Goods ({extractedChallan.items.length} items &bull; {(extractedChallan.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0)} Total Units)
                        </span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Zero-Amount Enforced
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Add Dispatched Item
                      </button>
                    </div>

                    {extractedChallan.items.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-center space-y-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 mx-auto" />
                        <p className="text-xs font-bold text-amber-900">
                          No line items could be parsed automatically from this invoice.
                        </p>
                        <p className="text-[11px] text-amber-700">
                          Click below to add your dispatched goods, or switch to the "Raw Text" tab to copy line descriptions.
                        </p>
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Dispatched Item
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                            <tr>
                              <th className="py-2 px-2.5 w-8">#</th>
                              <th className="py-2 px-2.5">Clean Item Name & Description / HSN</th>
                              <th className="py-2 px-2 text-center w-36">Dispatched Qty (Input Box)</th>
                              <th className="py-2 px-2 text-center w-24">Unit</th>
                              <th className="py-2 px-2 text-right w-24">Rate / Amount</th>
                              <th className="py-2 px-2 text-center w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {extractedChallan.items.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-slate-50/80">
                                <td className="py-2 px-2.5 font-mono text-slate-400 text-[11px] align-top pt-3">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-2.5 space-y-1">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                                    placeholder="Clean Product / Material Name"
                                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                                  />
                                  <input
                                    type="text"
                                    value={item.description || ""}
                                    onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                                    placeholder="HSN Code (e.g. HSN: 7306) & Specifications / Grade"
                                    className="w-full px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center align-top pt-2">
                                  <div className="flex justify-center">
                                    <QuantityInputBox
                                      itemId={item.id || `item-${idx}`}
                                      quantity={item.quantity}
                                      onUpdateQty={(_, newQty) =>
                                        handleUpdateItem(idx, "quantity", newQty)
                                      }
                                      min={0.01}
                                    />
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center align-top pt-2">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      list={`unit-options-${idx}`}
                                      value={item.unit || "Pcs"}
                                      onChange={(e) => handleUpdateItem(idx, "unit", e.target.value)}
                                      className="w-20 px-1.5 py-1 text-center bg-indigo-50/50 border border-indigo-200 rounded text-xs font-bold text-indigo-700 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                                    />
                                    <datalist id={`unit-options-${idx}`}>
                                      {COMMON_UNITS.map((u) => (
                                        <option key={u} value={u} />
                                      ))}
                                    </datalist>
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-right align-top pt-3 font-mono">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                    0 (Nil)
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-center align-top pt-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(idx)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                    title="Delete line"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error: </span>
                {error}
                <div className="mt-1 text-[11px] text-red-600">
                  Tip: If your document is a scanned image or protected PDF, try pasting the invoice text directly in the "Paste Invoice Text" tab.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between flex-shrink-0">
          {extractedChallan ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setExtractedChallan(null);
                  setExtractedFeedback(null);
                  setRawExtractedText(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Scan Another Invoice
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                Apply to Delivery Challan
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing || (activeTab === "file" && !selectedFile) || (activeTab === "paste" && !pastedText.trim())}
                onClick={handleProcessInvoice}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Extracting & Converting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    Convert to Delivery Challan
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
