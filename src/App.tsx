import { useState, useEffect, FormEvent } from "react";
import { QuoteState, BusinessProfile, QuoteItem, TemplateType, SavedQuote } from "./types";
import {
  DEFAULT_BUSINESS_PROFILE,
  DEFAULT_QUOTE_STATE,
  SAMPLE_PRODUCTS,
  SAMPLE_CLIENTS
} from "./data";
import VoiceAssistant from "./components/VoiceAssistant";
import PrintPreview from "./components/PrintPreview";
import BusinessProfileModal from "./components/BusinessProfileModal";
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
  MessageCircle
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
  const [activeTab, setActiveTab] = useState<"drafts" | "history">("drafts");
  const [assistantFeedback, setAssistantFeedback] = useState<string | null>(null);

  // New item draft state
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState<number | "">("");
  const [newItemQty, setNewItemQty] = useState<number>(1);
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
  const totalAmount = taxableAmount;

  // Handlers
  const handleVoiceUpdate = (newState: QuoteState, feedback: string) => {
    setState(newState);
    setAssistantFeedback(feedback);
    setTimeout(() => setAssistantFeedback(null), 6000);
  };

  const addLineItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const parsedPrice = typeof newItemPrice === "number" ? newItemPrice : 0;
    const item: QuoteItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      description: newItemDesc.trim(),
      quantity: Math.max(1, newItemQty),
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
        item.id === id ? { ...item, quantity: Math.max(1, qty) } : item
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
      totalAmount: totalAmount,
    };
    setSavedQuotes((prev) => [newQuote, ...prev]);

    // Create a new fresh empty draft
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setState((prev) => ({
      ...DEFAULT_QUOTE_STATE(businessProfile.name),
      quoteNumber: `QT-${year}-${randomNum}`,
    }));

    alert("Quotation draft successfully saved to system history.");
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
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 flex-shrink-0 z-10 shadow-xs" id="app-header">
        <div className="flex items-center gap-4">
          <Logo className="w-12 h-12" />
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">UNIVERSE ESTIMATE GENERATOR</h1>
            <span className="text-[10px] uppercase tracking-widest text-cyan-600 font-extrabold mt-1">UEG Professional Estimations</span>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <div className="flex items-center gap-8 h-full">
          <nav className="flex gap-8 h-full">
            <button
              onClick={() => setActiveTab("drafts")}
              className={`h-full flex items-center border-b-2 font-bold text-xs uppercase tracking-wider px-2 transition-all cursor-pointer ${
                activeTab === "drafts"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Drafts & Builder
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`h-full flex items-center border-b-2 font-bold text-xs uppercase tracking-wider px-2 transition-all cursor-pointer ${
                activeTab === "history"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              History ({savedQuotes.length})
            </button>
          </nav>

          {/* WhatsApp Contact Button */}
          <a
            href="https://wa.me/+916232101154"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer ml-2"
            id="whatsapp-contact-btn"
          >
            <MessageCircle className="w-4 h-4 fill-emerald-500/10" />
            <span>WhatsApp</span>
          </a>

          {/* Right Side: Profile Widget */}
          <div className="flex items-center gap-3 pl-8 border-l border-slate-200 h-10">
            <div className="text-right">
              <p className="text-xs font-extrabold text-slate-800">{businessProfile.name}</p>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest hover:underline text-left block cursor-pointer"
              >
                Edit Business Details
              </button>
            </div>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
              title="Business profile Settings"
              id="header-profile-btn"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6 overflow-hidden lg:h-[calc(100vh-120px)] lg:min-h-0">
        
        {/* Left Side: Builder input and Voice control */}
        <section className="w-full lg:w-[480px] flex flex-col gap-4 flex-shrink-0 lg:h-full lg:overflow-y-auto lg:pr-2" id="left-builder-panel">
          
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
              {/* Card: Client Information */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    Client Profile
                  </h3>
                  {/* Sample Client Quick Injector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Insert Sample:</span>
                    <div className="flex gap-1">
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

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Document Type</label>
                    <select
                      value={state.documentType || "Quotation"}
                      onChange={(e) => setState({ ...state, documentType: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="Quotation">Quotation / Estimate</option>
                      <option value="Delivery Challan">Delivery Challan</option>
                      <option value="Order">Order</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Client / Customer Name</label>
                    <input
                      type="text"
                      value={state.clientName}
                      onChange={(e) => setState({ ...state, clientName: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors font-medium text-slate-800"
                      placeholder=""
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Customer Mobile Number</label>
                    <input
                      type="text"
                      value={state.clientPhone}
                      onChange={(e) => setState({ ...state, clientPhone: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors font-medium text-slate-800"
                      placeholder=""
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      {state.documentType === "Delivery Challan" ? "Challan No. / Ref ID" : state.documentType === "Order" ? "Order No. / Ref ID" : "Quote Reference ID"}
                    </label>
                    <input
                      type="text"
                      value={state.quoteNumber}
                      onChange={(e) => setState({ ...state, quoteNumber: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Issue Date</label>
                    <input
                      type="date"
                      value={state.date}
                      onChange={(e) => setState({ ...state, date: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors text-slate-800"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Client Email address</label>
                    <input
                      type="email"
                      value={state.clientEmail}
                      onChange={(e) => setState({ ...state, clientEmail: e.target.value })}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors text-slate-800"
                      placeholder=""
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Client Billing Address</label>
                    <textarea
                      value={state.clientAddress}
                      onChange={(e) => setState({ ...state, clientAddress: e.target.value })}
                      rows={2}
                      className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 transition-colors resize-none text-slate-800"
                      placeholder=""
                    />
                  </div>
                </div>
              </div>

              {/* Card: Add & Edit Line Items */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Line Items
                  </h3>
                  
                  {/* Clean items option */}
                  <button
                    onClick={clearAllDraftItems}
                    disabled={state.items.length === 0}
                    className="text-[10px] text-red-500 hover:text-red-700 hover:underline font-bold uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Items List (Table Edit View) */}
                <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                  {state.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 rounded-lg border border-slate-150 p-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
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
                          placeholder="Item Description"
                        />
                      </div>

                      {/* Interactive inline editing inputs */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Qty edit */}
                        <div className="flex items-center border border-slate-200 bg-white rounded-md overflow-hidden">
                          <button
                            onClick={() => updateItemQty(item.id, item.quantity - 1)}
                            className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-500 font-bold"
                          >
                            -
                          </button>
                          <span className="px-1 text-center font-bold min-w-[20px] text-[11px]">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQty(item.id, item.quantity + 1)}
                            className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-500 font-bold"
                          >
                            +
                          </button>
                        </div>

                        {/* Price Input */}
                        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 w-[75px]">
                          <span className="text-slate-400 text-[10px]">{state.currency}</span>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                            className="w-full text-right bg-transparent focus:outline-hidden font-bold"
                          />
                        </div>

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
                      <p className="text-xs text-slate-400 font-medium">No items yet. Speak to add items, insert samples, or use the quick form below.</p>
                    </div>
                  )}
                </div>

                {/* Quick Add Form / Sample Product Injector */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Manual Entry & Samples</span>
                    {/* Sample products dropdown */}
                    <select
                      onChange={(e) => {
                        const index = parseInt(e.target.value);
                        if (!isNaN(index)) {
                          loadSampleProduct(SAMPLE_PRODUCTS[index]);
                          e.target.value = ""; // Reset selector
                        }
                      }}
                      className="bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 px-2 py-0.5 focus:outline-hidden"
                    >
                      <option value="">+ Inject Sample Product</option>
                      {SAMPLE_PRODUCTS.map((p, i) => (
                        <option key={i} value={i}>
                          {p.name} ({state.currency || "₹"} {p.unitPrice})
                        </option>
                      ))}
                    </select>
                  </div>

                  <form onSubmit={addLineItem} className="grid grid-cols-12 gap-2">
                    <div className="col-span-12">
                      <input
                        type="text"
                        placeholder="Product/Service description..."
                        required
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div className="col-span-12">
                      <input
                        type="text"
                        placeholder="Sub-description/detail (optional)"
                        value={newItemDesc}
                        onChange={(e) => setNewItemDesc(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] focus:outline-hidden focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div className="col-span-5">
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
                    <div className="col-span-4">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        required
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 font-bold text-center"
                      />
                    </div>
                    <div className="col-span-3">
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase py-2 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  </form>
                </div>

                {/* Global Variables (Currency, Discount) */}
                <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Currency</label>
                    <select
                      value={state.currency}
                      onChange={(e) => setState({ ...state, currency: e.target.value })}
                      className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
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

                {/* Terms and notes */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Special Note on Quote</label>
                    <input
                      type="text"
                      value={state.notes}
                      onChange={(e) => setState({ ...state, notes: e.target.value })}
                      placeholder="Thank you for your business!"
                      className="w-full mt-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Payment Terms</label>
                    <input
                      type="text"
                      value={state.terms}
                      onChange={(e) => setState({ ...state, terms: e.target.value })}
                      placeholder="Due on receipt."
                      className="w-full mt-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
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
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col flex-1 lg:h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Quotation Archives
                </h3>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {savedQuotes.length} Total
                </span>
              </div>

              <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                {savedQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="border border-slate-150 rounded-xl p-4 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono font-bold text-xs text-indigo-600">{quote.quoteNumber}</span>
                        <p className="font-extrabold text-sm text-slate-800 mt-1">{quote.clientName}</p>
                        {quote.clientPhone && <p className="text-xs text-slate-500 font-semibold">MOB: {quote.clientPhone}</p>}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">{quote.createdAt}</span>
                        <span className="text-sm font-black text-slate-900 block mt-1">
                          {quote.currency}{quote.totalAmount.toFixed(2)}
                        </span>
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
                    <p className="text-xs font-semibold">No quotations saved in archives yet.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Create an estimate in the Builder tab and click "Save to System History".</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </section>

        {/* Right Side: PDF & Thermal Previews */}
        <section className="flex-1 flex flex-col gap-4 min-w-0 lg:h-full lg:min-h-0" id="right-previews-panel">
          <PrintPreview
            state={state}
            businessProfile={businessProfile}
            templateType={templateType}
            setTemplateType={setTemplateType}
          />
        </section>

      </main>

      {/* Footer: System Status */}
      <footer className="h-10 bg-white border-t border-slate-200 px-10 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-shrink-0" id="app-footer">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span>All Systems Online</span>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            <span>Thermal Emulator Active (58/80mm)</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span>Voice Mode: Hands-Free</span>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">v2.4.0-Stable</span>
        </div>
      </footer>

      {/* Business settings overlay modal */}
      <BusinessProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={businessProfile}
        onSave={(updated) => setBusinessProfile(updated)}
      />

    </div>
  );
}
