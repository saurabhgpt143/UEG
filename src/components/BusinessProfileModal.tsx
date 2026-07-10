import { useState, FormEvent } from "react";
import { BusinessProfile } from "../types";
import { X, Save, Building, MapPin, Mail, Phone, Globe, DollarSign, Landmark } from "lucide-react";

interface BusinessProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BusinessProfile;
  onSave: (updatedProfile: BusinessProfile) => void;
}

export default function BusinessProfileModal({ isOpen, onClose, profile, onSave }: BusinessProfileModalProps) {
  const [formData, setFormData] = useState<BusinessProfile>({ ...profile });

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="profile-modal-overlay">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" id="profile-modal-container">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Business Settings</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Sender profile & payment info</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Core Identity */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1">Business Identity</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Business Name</label>
                <div className="relative mt-1">
                  <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                    placeholder="Apex Solutions Ltd"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Logo Image URL (Optional)</label>
                <div className="relative mt-1">
                  <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.logoUrl || ""}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1">Contact Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Address</label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                    placeholder="100 Innovation Way, Tech District, NY 10001"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                    placeholder="billing@apexsolutions.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                    placeholder="+1 (555) 019-2834"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tax/VAT Registration No.</label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.taxNumber || ""}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                    placeholder="VAT-US92834710"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Bank Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1">Payment Instructions</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Bank Name</label>
                <div className="relative mt-1">
                  <Landmark className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.bankName || ""}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                    placeholder="Chase Bank"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Account Number</label>
                <input
                  type="text"
                  value={formData.bankAccount || ""}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Routing / SWIFT Code</label>
                <input
                  type="text"
                  value={formData.bankRouting || ""}
                  onChange={(e) => setFormData({ ...formData, bankRouting: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-hidden focus:border-indigo-500 transition-colors"
                  placeholder="121000248"
                />
              </div>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-150 flex items-center justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold uppercase flex items-center gap-1.5 shadow-md shadow-indigo-600/10 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </div>

      </div>
    </div>
  );
}
