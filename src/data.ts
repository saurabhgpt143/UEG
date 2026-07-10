import { BusinessProfile, QuoteItem, QuoteState } from "./types";

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  name: "M.G. INDUSTRIES",
  logoUrl: "",
  address: "446, Vinoba Bhave Ward, Panagar, Jabalpur (M.P.) 483220 India",
  email: "mgindustriesjbp@gmail.com",
  phone: "9752556113",
  website: "",
  taxNumber: "GSTIN: 23BWVPG5505L1Z7",
  bankName: "BANK OF MAHARASHTRA, WRIGHT TOWN OPP TELEPHONE EXCH",
  bankAccount: "60325158144",
  bankRouting: "MAHB0000341",
};

export const SAMPLE_PRODUCTS: Omit<QuoteItem, "id">[] = [
  {
    name: "Profile Sheet",
    description: "",
    quantity: 1,
    unitPrice: 420.00,
  },
  {
    name: "M.S. Pipe",
    description: "",
    quantity: 1,
    unitPrice: 850.00,
  },
  {
    name: "Self-Drill Screw",
    description: "",
    quantity: 1,
    unitPrice: 2.50,
  },
  {
    name: "M.S. Flat",
    description: "",
    quantity: 1,
    unitPrice: 600.00,
  },
  {
    name: "Nut Bolt",
    description: "",
    quantity: 1,
    unitPrice: 5.00,
  },
  {
    name: "Accessories",
    description: "",
    quantity: 1,
    unitPrice: 1200.00,
  },
  {
    name: "Miscellaneous",
    description: "",
    quantity: 1,
    unitPrice: 500.00,
  },
];

export const SAMPLE_CLIENTS = [
  {
    name: "Sarah Jenkins",
    company: "Stellar Horizon Media",
    email: "sjenkins@stellarhorizon.com",
    phone: "+1 (555) 438-9210",
    address: "45 Broadway Suite 12, New York, NY 10006",
  },
  {
    name: "Devon Carter",
    company: "Quantum Cybernetics",
    email: "carter@quantumcyber.io",
    phone: "+1 (555) 722-1980",
    address: "800 Technology Parkway, Austin, TX 78759",
  },
  {
    name: "Nikhil Sharma",
    company: "Banyan Tree Retail",
    email: "payments@banyantree.in",
    phone: "+91 98765 43210",
    address: "MG Road Sector 4, Bangalore, KA 560001",
  },
  {
    name: "Claire Dubois",
    company: "La Maison Design",
    email: "claire@lamaisondesign.fr",
    phone: "+33 1 42 68 53 00",
    address: "12 Rue de la Paix, 75002 Paris, France",
  },
];

export const DEFAULT_QUOTE_STATE = (profileName: string): QuoteState => {
  const today = new Date();
  const formattedToday = today.toISOString().split("T")[0];

  const year = today.getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);

  return {
    quoteNumber: `QT-${year}-${randomNum}`,
    date: formattedToday,
    validUntil: formattedToday,
    clientName: "",
    clientCompany: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    currency: "₹",
    documentType: "Quotation",
    items: [
      {
        id: "item-1",
        name: "Profile Sheet",
        description: "",
        quantity: 10,
        unitPrice: 420.00,
      },
      {
        id: "item-2",
        name: "Self-Drill Screw",
        description: "",
        quantity: 200,
        unitPrice: 2.50,
      },
    ],
    discountPercentage: 0,
    taxPercentage: 0,
    notes: "Thank you for your business! We look forward to working with you.",
    terms: "Payment is due upon acceptance of this quotation. Work will commence after signature and deposit.",
  };
};
