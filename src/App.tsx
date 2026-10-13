import { useState, useEffect, FormEvent } from "react";
import { QuoteState, BusinessProfile, QuoteItem, TemplateType, SavedQuote } from "./types";
import {
  DEFAULT_BUSINESS_PROFILE,
  DEFAULT_QUOTE_STATE,
  SAMPLE_PRODUCTS,
  SAMPLE_CLIENTS,
  COMMON_UNITS,
  isNilOrEmpty
} from "./data";
import VoiceAssistant from "./components/VoiceAssistant";
import PrintPreview from "./components/PrintPreview";
import BusinessProfileModal from "./components/BusinessProfileModal";
import UploadTaxInvoiceModal from "./components/UploadTaxInvoiceModal";
import QuantityInputBox from "./components/QuantityInputBox";
import Logo from "./components/Logo";
import {
  Plus,
  Trash2,
  Settings,
  FolderOpen,
  FileText,
  User,
  Calendar,
  DollarSign,
  Tag,
  Percent,
  Briefcase,
  Layers,
  Sparkles,
  Info,
  Clock,
  LayoutTemplate,
  MessageCircle,
  Eye,
  Truck,
  FileUp
} from "lucide-react";

export default function App() {
  // State definitions
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    const saved = localStorage.getItem("quotify_profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.name === "Apex Solutions Ltd" || parsed.name === "Apex Solutions") {
        localStorage.setItem("quotify_profile", JSON.stringify(DEFAULT_BUSINESS_PROFILE));
        return DEFAULT_BUSINESS_PROFILE;
      }
      if (parsed.website) {
        parsed.website = "";
        localStorage.setItem("quotify_profile", JSON.stringify(parsed));
      }
      return parsed;
    }
    return DEFAULT_BUSINESS_PROFILE;
  });

  const [state, setState] = useState<QuoteState>(() => {
    const saved = localStorage.getItem("quotify_current_draft");
    if (saved) {
      const parsed = JSON.parse(saved);
      let changed = false;
      if (parsed.currency === "INR" || !parsed.currency) {
        parsed.currency = "₹";
        changed = true;
      }
      if (!parsed.documentType) {
        parsed.documentType = "Quotation";
        changed = true;
      }
      if (parsed.taxPercentage !== 0) {
        parsed.taxPercentage = 0;
        changed = true;
      }
      if (parsed.discountPercentage !== 0) {
        parsed.discountPercentage = 0;
        changed = true;
      }
      // Ensure customer details are blank initially if they are mock values
      if (parsed.clientName === "Sarah Jenkins" || parsed.clientCompany === "Stellar Horizon Media") {
        parsed.clientName = "";
        parsed.clientCompany = "";
        parsed.clientEmail = "";
        parsed.clientPhone = "";
        parsed.clientAddress = "";
        changed = true;
      }
      if (changed) {
        localStorage.setItem("quotify_current_draft", JSON.stringify(parsed));
      }
      return parsed;
    }
    return DEFAULT_QUOTE_STATE(businessProfile.name);
  });

  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>(() => {
    const saved = localStorage.getItem("quotify_saved_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [templateType, setTemplateType] = useState<TemplateType>("modern");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUploadInvoiceOpen, setIsUploadInvoiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"drafts" | "history">("drafts");
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");
  const [assistantFeedback, setAssistantFeedback] = useState<string | null>(null);

  const isDeliveryChallan = state.documentType === "Delivery Challan";

  // New item draft state
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState<number | "">("");
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnit, setNewItemUnit] = useState<string>("Pcs");
  const [newItemDesc, setNewItemDesc] = useState("");

  // Sync to localstorage
  useEffect(() => {
    localStorage.setItem("quotify_profile", JSON.stringify(businessProfile));
  }, [businessProfile]);

  useEffect(() => {
    localStorage.setItem("quotify_current_draft", JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem("quotify_saved_history", JSON.stringify(savedQuotes));
  }, [savedQuotes]);

  // Calculations
  const calculateSubtotal = () => {
    return state.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = (subtotal * state.discountPercentage) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = 0; // Tax rate completely removed
  const totalAmount = isDeliveryChallan ? 0 : taxableAmount;

  // Handlers
  const handleVoiceUpdate = (newState: QuoteState, feedback: string) => {
    setState(newState);
    setAssistantFeedback(feedback);
    setTimeout(() => setAssistantFeedback(null), 6000);
  };

  const handleApplyChallan = (newChallanState: QuoteState, feedback: string) => {
    setState(newChallanState);
    setActiveTab("drafts");
    setAssistantFeedback(feedback);
    if (window.innerWidth < 1024) {
      setMobileTab("preview");
    }
    setTimeout(() => setAssistantFeedback(null), 8000);
  };

  const addLineItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const parsedPrice = isDeliveryChallan ? 0 : (typeof newItemPrice === "number" ? newItemPrice : 0);
    const item: QuoteItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      description: newItemDesc.trim(),
      quantity: Math.max(0.01, typeof newItemQty === "number" ? newItemQty : 1),
      unit: newItemUnit.trim() || "Pcs",
      unitPrice: Math.max(0, parsedPrice),
    };

    setState((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));

    // Reset inputs
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQty(1);
    setNewItemUnit("Pcs");
    setNewItemDesc("");
  };

  const removeLineItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const updateItemQty = (id: string, qty: number) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0.01, qty) } : item
      ),
    }));
  };

  const updateItemUnit = (id: string, unit: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, unit } : item
      ),
    }));
  };

  const updateItemPrice = (id: string, price: number) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, unitPrice: Math.max(0, price) } : item
      ),
    }));
  };

  const updateItemName = (id: string, name: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, name } : item
      ),
    }));
  };

  const updateItemDescription = (id: string, description: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, description } : item
      ),
    }));
  };

  const loadSampleClient = (client: typeof SAMPLE_CLIENTS[0]) => {
    setState((prev) => ({
      ...prev,
      clientName: client.name,
      clientCompany: client.company,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientAddress: client.address,
    }));
  };

  const loadSampleProduct = (prod: Omit<QuoteItem, "id">) => {
    const item: QuoteItem = {
      id: `item-${Date.now()}`,
      ...prod,
      unit: prod.unit || "Pcs",
      unitPrice: isDeliveryChallan ? 0 : prod.unitPrice,
    };
    setState((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
  };

  const saveCurrentQuoteToHistory = () => {
    const newQuote: SavedQuote = {
      ...state,
      id: `saved-${Date.now()}`,
      createdAt: new Date().toLocaleDateString(),
      totalAmount: isDeliveryChallan ? 0 : totalAmount,
    };
    setSavedQuotes((prev) => [newQuote, ...prev]);

    // Create a new fresh empty draft
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setState((prev) => ({
      ...DEFAULT_QUOTE_STATE(businessProfile.name),
      quoteNumber: `QT-${year}-${randomNum}`,
    }));

    alert(`${isDeliveryChallan ? "Delivery Challan" : "Quotation"} draft successfully saved to system history.`);
  };

  const loadSavedQuote = (quote: SavedQuote) => {
    const { id, createdAt, totalAmount, ...draftState } = quote;
    setState(draftState as QuoteState);
    setActiveTab("drafts");
  };

  const deleteSavedQuote = (id: string) => {
    if (confirm("Are you sure you want to delete this quote from history?")) {
      setSavedQuotes((prev) => prev.filter((q) => q.id !== id));
    }
  };

  const clearAllDraftItems = () => {
    setState((prev) => ({ ...prev, items: [] }));
  };

  return (
    <div className="flex flex-col min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900" id="app-root-container">
      
      {/* Header: Geometric Symmetry */}
      <header className="h-16 sm:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 lg:px-8 flex-shrink-0 z-10 shadow-xs" id="app-header">
        <div className="flex items-center gap-2 sm:gap-3">
          <Logo className="w-8 h-8 sm:w-11 sm:h-11 flex-shrink-0" />
          <div className="flex flex-col">
            <h1 className="text-xs sm:text-base lg:text-lg font-black tracking-tight text-slate-900 leading-tight">UNIVERSE ESTIMATE GENERATOR</h1>
            <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-cyan-600 font-extrabold">UEG Professional Estimations</span>
          </div>
        </div>

        {/* Center Navigation Tabs & Profile */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-8 h-full">
          <nav className="flex gap-1.5 sm:gap-4 lg:gap-6 h-full">
            <button
              onClick={() => setActiveTab("drafts")}
              className={`h-full flex items-center border-b-2 font-bold text-[11px] sm:text-xs uppercase tracking-wider px-1.5 sm:px-2 transition-all cursor-pointer ${
                activeTab === "drafts"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Drafts
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`h-full flex items-center border-b-2 font-bold text-[11px] sm:text-xs uppercase tracking-wider px-1.5 sm:px-2 transition-all cursor-pointer ${
                activeTab === "history"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              History ({savedQuotes.length})
            </button>
          </nav>

          {/* Upload Tax Invoice to Delivery Challan Button */}
          <button
            onClick={() => setIsUploadInvoiceOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
            id="header-upload-invoice-btn"
            title="Upload Tax Invoice to generate Delivery Challan"
          >
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Tax Invoice → Challan</span>
          </button>

          {/* WhatsApp Contact Button */}
          <a
            href="https://wa.me/+916232101154"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            id="whatsapp-contact-btn"
            title="Chat on WhatsApp (+91 6232101154)"
          >
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-emerald-500/10" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>

          {/* Right Side: Profile Widget */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200 h-9 sm:h-10">
            <div className="text-right hidden md:block">
              <p className="text-xs font-extrabold text-slate-800 line-clamp-1 max-w-[130px]">{businessProfile.name}</p>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest hover:underline text-left block cursor-pointer"
              >
                Edit Business
              </button>
            </div>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
              title="Business profile Settings"
              id="header-profile-btn"
            >
              <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0 overflow-y-auto lg:overflow-hidden lg:h-[calc(100vh-112px)]">
        
        {/* Mobile View Toggle Switch (visible on screens below lg) */}
        {activeTab === "drafts" && (
          <div className="lg:hidden flex bg-slate-200/80 p-1 rounded-xl flex-shrink-0" id="mobile-tab-toggle">
            <button
              onClick={() => setMobileTab("editor")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === "editor"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editor & Builder</span>
            </button>
            <button
              onClick={() => setMobileTab("preview")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === "preview"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview ({state.items.length})</span>
            </button>
          </div>
        )}

        {/* Left Side: Builder input and Voice control */}
        <section
          className={`w-full lg:w-[480px] flex-col gap-4 flex-shrink-0 lg:h-full lg:overflow-y-auto lg:pr-2 ${
            activeTab === "drafts" && mobileTab === "preview" ? "hidden lg:flex" : "flex"
          }`}
          id="left-builder-panel"
        >
          
          {/* Active state feedback banner */}
          {assistantFeedback && (
            <div className="bg-indigo-900 text-white rounded-xl p-3.5 border border-indigo-800 shadow-md flex items-start gap-2.5 animate-slide-up">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5 animate-bounce" />
              <div>
                <span className="font-extrabold text-[10px] uppercase text-indigo-300 tracking-wider block">Assistant Updated State:</span>
                <p className="text-xs italic mt-0.5 text-slate-100">"{assistantFeedback}"</p>
              </div>
            </div>
          )}

          {activeTab === "drafts" ? (
            <>
              {/* Quick Action Banner: Upload Tax Invoice to Make Delivery Challan */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-3.5 sm:p-4 text-white shadow-sm border border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 flex-shrink-0 shadow-inner">
                    <Truck className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">Tax Invoice → Delivery Challan</h4>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                        No Amount
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                      Upload tax invoice PDF or photo to auto-generate a dispatched goods challan
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadInvoiceOpen(true)}
                  className="self-start sm:self-auto px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 hover:text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  id="builder-upload-invoice-btn"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Upload Tax Invoice</span>
                </button>
              </div>

              {/* Card: Client Information */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {isDeliveryChallan ? "Receiver & Transport Info" : "Client Profile"}
                  </h3>
                  {/* Sample Client Quick Injector */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Insert Sample:</span>
                    <div className="flex gap-1 flex-wrap">
                      {SAMPLE_CLIENTS.slice(0, 3).map((sc, i) => (
                        <button
                          key={i}
                          onClick={() => loadSampleClient(sc)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                          title={`Insert ${sc.company}`}
                        >
                          {sc.name.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Document Type</label>
                      <button
                        type="button"
                        onClick={() => setIsUploadInvoiceOpen(true)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                        title="Upload Tax Invoice to auto-fill delivery challan"
                      >
                        <FileUp className="w-3 h-3 text-indigo-500" />
                        <span>Upload Invoice to Make Challan</span>
                      </button>
                    </div>
                    <select
                      value={state.documentType || "Quotation"}
                      onChange={(e) => setState({ ...state, documentType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="Quotation">Quotation / Estimate</option>
                      <option value="Delivery Challan">Delivery Challan (No Amount / Transport)</option>
                      <option value="Order">Order</option>
                    </select>

                    {isDeliveryChallan && (
                      <div className="mt-2 p-2.5 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-between gap-2 text-xs text-cyan-950">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-cyan-700 flex-shrink-0" />
                          <span className="text-[11px] font-semibold">Delivery Challan mode: Dispatched goods without price</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsUploadInvoiceOpen(true)}
                          className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                        >
                          Upload Invoice
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {isDeliveryChallan ? "Recipient / Consignee Name" : "Client / Customer Name"}
                    </label>
                    <input
                      type="text"
                      value={state.clientName}
                      onChange={(e) => setState({ ...state, clientName: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors font-medium text-slate-800"
                      placeholder="e.g. Acme Industries Ltd."
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {isDeliveryChallan ? "Contact Mobile" : "Customer Mobile Number"}
                    </label>
                    <input
                      type="text"
                      value={state.clientPhone}
                      onChange={(e) => setState({ ...state, clientPhone: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors font-medium text-slate-800"
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {isDeliveryChallan ? "Challan No. / Ref ID" : state.documentType === "Order" ? "Order No. / Ref ID" : "Quote Reference ID"}
                    </label>
                    <input
                      type="text"
                      value={state.quoteNumber}
                      onChange={(e) => setState({ ...state, quoteNumber: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {isDeliveryChallan ? "Dispatch Date" : "Issue Date"}
                    </label>
                    <input
                      type="date"
                      value={state.date}
                      onChange={(e) => setState({ ...state, date: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Client Email address</label>
                    <input
                      type="email"
                      value={state.clientEmail}
                      onChange={(e) => setState({ ...state, clientEmail: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors text-slate-800"
                      placeholder="e.g. client@example.com"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {isDeliveryChallan ? "Delivery / Unloading Site Address" : "Client Billing Address"}
                    </label>
                    <textarea
                      value={state.clientAddress}
                      onChange={(e) => setState({ ...state, clientAddress: e.target.value })}
                      rows={2}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors resize-none text-slate-800"
                      placeholder="e.g. Plot 45, Industrial Area Phase 2"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Vehicle No.</label>
                    <input
                      type="text"
                      value={state.vehicleNumber || ""}
                      onChange={(e) => setState({ ...state, vehicleNumber: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors font-medium text-slate-800"
                      placeholder="e.g. MP-20-HA-5678"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Note</label>
                    <input
                      type="text"
                      value={state.remarks || ""}
                      onChange={(e) => setState({ ...state, remarks: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors font-medium text-slate-800"
                      placeholder="e.g. Site Delivery by Road"
                    />
                  </div>
                </div>
              </div>

              {/* Card: Add & Edit Line Items */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isDeliveryChallan ? "Dispatched Items (Qty Only)" : "Line Items"}</span>
                    </h3>
                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                      Direct Qty Input Box
                    </span>
                  </div>
                  
                  {/* Clean items option */}
                  <button
                    onClick={clearAllDraftItems}
                    disabled={state.items.length === 0}
                    className="text-[10px] text-red-500 hover:text-red-700 hover:underline font-bold uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Column header hint when items are present */}
                {state.items.length > 0 && (
                  <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                    <span>Added Goods & Materials</span>
                    <div className="flex items-center gap-2 pr-6">
                      <span className="w-20 text-center text-indigo-600 font-extrabold">Qty (Input)</span>
                      <span className="w-12 text-center">Unit</span>
                      {!isDeliveryChallan && <span className="w-16 text-right">Price</span>}
                    </div>
                  </div>
                )}

                {/* Items List (Table Edit View) */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {state.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 rounded-lg border border-slate-200 p-2.5 flex items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-400 text-[10px] flex-shrink-0">#{index + 1}</span>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItemName(item.id, e.target.value)}
                            className="w-full font-extrabold text-slate-800 bg-transparent hover:bg-slate-200/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden border border-transparent rounded px-1.5 py-0.5 text-xs transition-colors"
                            placeholder="Item Name"
                          />
                        </div>
                        <input
                          type="text"
                          value={item.description || ""}
                          onChange={(e) => updateItemDescription(item.id, e.target.value)}
                          className="w-full text-[10px] text-slate-500 bg-transparent hover:bg-slate-200/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden border border-transparent rounded px-1.5 py-0.5 transition-colors"
                          placeholder="Item Description (Optional)"
                        />
                      </div>

                      {/* Interactive inline editing inputs */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Qty edit via input box method */}
                        <QuantityInputBox
                          itemId={item.id}
                          quantity={item.quantity}
                          onUpdateQty={updateItemQty}
                        />

                        {/* Unit edit */}
                        <div className="flex items-center bg-white border border-slate-200 rounded-md px-1 py-0.5" title="Unit of Quantity (e.g. Pcs, Kg, Mtr, Box)">
                          <input
                            type="text"
                            list="common-units-list"
                            value={item.unit || "Pcs"}
                            onChange={(e) => updateItemUnit(item.id, e.target.value)}
                            className="w-11 sm:w-13 text-center font-bold text-[10px] text-slate-700 uppercase bg-transparent focus:outline-hidden"
                            placeholder="Unit"
                          />
                        </div>

                        {/* Price Input (Hidden for Delivery Challan) */}
                        {!isDeliveryChallan && (
                          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 w-[70px] sm:w-[75px]">
                            <span className="text-slate-400 text-[10px]">{state.currency}</span>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                              className="w-full text-right bg-transparent focus:outline-hidden font-bold"
                            />
                          </div>
                        )}

                        {/* Remove item button */}
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {state.items.length === 0 && (
                    <div className="text-center py-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium">No items added yet. Speak to add items, insert samples, or use the quick form below.</p>
                    </div>
                  )}
                </div>

                {/* Quick Add Form / Sample Product Injector */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                      {isDeliveryChallan ? "Add Dispatched Good (No Price)" : "Manual Entry & Samples"}
                    </span>
                    {/* Sample products dropdown */}
                    <select
                      onChange={(e) => {
                        const index = parseInt(e.target.value);
                        if (!isNaN(index)) {
                          loadSampleProduct(SAMPLE_PRODUCTS[index]);
                          e.target.value = ""; // Reset selector
                        }
                      }}
                      className="bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 px-2 py-0.5 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">+ Inject Sample Product</option>
                      {SAMPLE_PRODUCTS.map((p, i) => (
                        <option key={i} value={i}>
                          {p.name} {isDeliveryChallan ? `(${p.quantity} ${p.unit || "Pcs"})` : `(${p.quantity} ${p.unit || "Pcs"} @ ${state.currency || "₹"}${p.unitPrice})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <form onSubmit={addLineItem} className="grid grid-cols-12 gap-2">
                    <div className="col-span-12">
                      <input
                        type="text"
                        placeholder="Product / Item description..."
                        required
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div className="col-span-12">
                      <input
                        type="text"
                        placeholder="Specifications / Packaging note (optional)"
                        value={newItemDesc}
                        onChange={(e) => setNewItemDesc(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] focus:outline-hidden focus:border-indigo-500 font-medium"
                      />
                    </div>

                    {!isDeliveryChallan ? (
                      <>
                        <div className="col-span-6 sm:col-span-4">
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs">
                            <span className="text-slate-400 font-bold mr-1">{state.currency}</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              required
                              value={newItemPrice}
                              onChange={(e) => setNewItemPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                              className="w-full bg-transparent focus:outline-hidden font-bold"
                            />
                          </div>
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            placeholder="Qty"
                            required
                            value={newItemQty}
                            onChange={(e) => setNewItemQty(parseFloat(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 font-bold text-center"
                            title="Quantity"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-3">
                          <input
                            type="text"
                            list="common-units-list"
                            placeholder="Unit (Pcs, Kg...)"
                            required
                            value={newItemUnit}
                            onChange={(e) => setNewItemUnit(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 font-bold text-center uppercase"
                            title="Unit of Quantity (e.g. Pcs, Kg, Mtr, Box, Sets)"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-3">
                          <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase py-2 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Item
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-6 sm:col-span-4 flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">Qty:</label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            placeholder="Qty"
                            required
                            value={newItemQty}
                            onChange={(e) => setNewItemQty(parseFloat(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 font-bold text-center"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-4 flex items-center gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">Unit:</label>
                          <input
                            type="text"
                            list="common-units-list"
                            placeholder="Unit (Pcs, Kg...)"
                            required
                            value={newItemUnit}
                            onChange={(e) => setNewItemUnit(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 font-bold text-center uppercase"
                            title="Unit of Quantity"
                          />
                        </div>
                        <div className="col-span-12 sm:col-span-4">
                          <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase py-2 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Item
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                </div>

                {/* Common units datalist for autocomplete */}
                <datalist id="common-units-list">
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>

                {/* Global Variables: Currency & Discount (Hidden for Delivery Challan) */}
                {!isDeliveryChallan ? (
                  <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Currency</label>
                      <select
                        value={state.currency}
                        onChange={(e) => setState({ ...state, currency: e.target.value })}
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="₹">INR (₹)</option>
                        <option value="$">USD ($)</option>
                        <option value="€">EUR (€)</option>
                        <option value="£">GBP (£)</option>
                        <option value="¥">JPY (¥)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Discount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={state.discountPercentage}
                        onChange={(e) => setState({ ...state, discountPercentage: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">Delivery Challan Mode</span>
                      <p className="text-[11px] text-slate-600 mt-0.5 font-medium">Amounts, currency, and discounts are excluded from transport challans.</p>
                    </div>
                  </div>
                )}

                {/* Terms and notes */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">
                      {isDeliveryChallan ? "Special Dispatch Instructions" : "Special Note on Quote"}
                    </label>
                    <input
                      type="text"
                      value={state.notes}
                      onChange={(e) => setState({ ...state, notes: e.target.value })}
                      placeholder={isDeliveryChallan ? "e.g. Unload at bay 3, handle with care." : "Thank you for your business!"}
                      className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">
                      {isDeliveryChallan ? "Delivery & Acceptance Terms" : "Payment Terms"}
                    </label>
                    <input
                      type="text"
                      value={state.terms}
                      onChange={(e) => setState({ ...state, terms: e.target.value })}
                      placeholder={isDeliveryChallan ? "Subject to verification and physical count upon arrival." : "Due on receipt."}
                      className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
                    />
                  </div>
                </div>

                {/* Primary Finish/Action Buttons */}
                <div className="border-t border-slate-100 pt-3 flex gap-2">
                  <button
                    onClick={saveCurrentQuoteToHistory}
                    disabled={state.items.length === 0}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase py-2.5 rounded-lg shadow-md shadow-emerald-600/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FolderOpen className="w-4 h-4" /> Save to System History
                  </button>
                </div>

              </div>

              {/* Voice Control Unit (Gemini Hands-Free Voice Assistant) */}
              <VoiceAssistant
                currentState={state}
                onStateUpdate={handleVoiceUpdate}
              />
            </>
          ) : (
            /* System Quote History Tab */
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 flex flex-col flex-1 lg:h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Document Archives
                </h3>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {savedQuotes.length} Total
                </span>
              </div>

              <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                {savedQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="border border-slate-200 rounded-xl p-4 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono font-bold text-xs text-indigo-600">{quote.quoteNumber}</span>
                        <p className="font-extrabold text-sm text-slate-800 mt-0.5">{!isNilOrEmpty(quote.clientName) ? quote.clientName : "Unnamed Client"}</p>
                        {!isNilOrEmpty(quote.clientPhone) && <p className="text-xs text-slate-500 font-semibold">MOB: {quote.clientPhone}</p>}
                        {!isNilOrEmpty(quote.vehicleNumber) && <p className="text-[11px] text-slate-500 font-medium">Vehicle: {quote.vehicleNumber}</p>}
                        {!isNilOrEmpty(quote.remarks) && <p className="text-[10px] text-slate-500 italic">Remarks: {quote.remarks}</p>}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">{quote.createdAt}</span>
                        {quote.documentType === "Delivery Challan" ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block mt-1">
                            Challan (No Amount)
                          </span>
                        ) : (
                          <span className="text-sm font-black text-slate-900 block mt-1">
                            {quote.currency}{quote.totalAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 mt-3 pt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {quote.items.length} line items listed
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteSavedQuote(quote.id)}
                          className="px-2 py-1 text-[10px] font-bold uppercase text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => loadSavedQuote(quote)}
                          className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold uppercase rounded-md transition-colors cursor-pointer"
                        >
                          Load Draft
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {savedQuotes.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-semibold">No documents saved in archives yet.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Create an estimate or challan in the Builder tab and click "Save to System History".</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </section>

        {/* Right Side: PDF & Thermal Previews */}
        <section
          className={`flex-1 flex-col gap-4 min-w-0 lg:h-full lg:min-h-0 ${
            activeTab === "drafts" && mobileTab === "editor" ? "hidden lg:flex" : "flex"
          }`}
          id="right-previews-panel"
        >
          <PrintPreview
            state={state}
            businessProfile={businessProfile}
            templateType={templateType}
            setTemplateType={setTemplateType}
          />
        </section>

      </main>

      {/* Footer: System Status */}
      <footer className="h-auto sm:h-10 py-2 sm:py-0 bg-white border-t border-slate-200 px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 gap-1.5 sm:gap-0" id="app-footer">
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center sm:justify-start">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span>All Systems Online</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3 sm:pl-6">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            <span>Thermal Roll (58/80mm)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span>Voice: Hands-Free</span>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">v2.5.0-Stable</span>
        </div>
      </footer>

      {/* Business settings overlay modal */}
      <BusinessProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={businessProfile}
        onSave={(updated) => setBusinessProfile(updated)}
      />

      {/* Upload Tax Invoice to Delivery Challan Modal */}
      <UploadTaxInvoiceModal
        isOpen={isUploadInvoiceOpen}
        onClose={() => setIsUploadInvoiceOpen(false)}
        onApplyChallan={handleApplyChallan}
        currentProfileName={businessProfile.name}
      />

    </div>
  );
}
