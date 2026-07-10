export interface QuoteItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface BusinessProfile {
  name: string;
  logoUrl?: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  taxNumber?: string;
  bankName?: string;
  bankAccount?: string;
  bankRouting?: string;
}

export interface QuoteState {
  quoteNumber: string;
  date: string;
  validUntil: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  currency: string;
  documentType?: string;
  items: QuoteItem[];
  discountPercentage: number;
  taxPercentage: number;
  notes: string;
  terms: string;
}

export interface SavedQuote extends QuoteState {
  id: string;
  createdAt: string;
  totalAmount: number;
}

export type TemplateType = "modern" | "classic" | "minimal" | "thermal-58" | "thermal-80";
