import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for body parsing (support large PDF and image uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini Client
// We use a lazy check in the request or route, but initialize the client securely here.
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Offline-first fallback command parser when Gemini API Key is not set
const fallbackParseCommand = (command: string, currentState: any) => {
  const cmd = command.toLowerCase().trim();
  const state = JSON.parse(JSON.stringify(currentState)); // deep clone

  // Helper to parse numbers (either digit or words)
  const extractNumber = (text: string): number => {
    const trimmed = text.trim();
    if (!isNaN(Number(trimmed))) return Number(trimmed);
    const textNumbers: { [key: string]: number } = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, a: 1, an: 1,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
      sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
      thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100
    };
    if (textNumbers[trimmed] !== undefined) return textNumbers[trimmed];
    const parts = trimmed.split(/[\s-]+/);
    let total = 0;
    for (const part of parts) {
      if (textNumbers[part] !== undefined) {
        if (part === "hundred") {
          total = (total || 1) * 100;
        } else {
          total += textNumbers[part];
        }
      }
    }
    return total > 0 ? total : NaN;
  };

  // 0. Set Document Type (e.g. Delivery Challan, Quotation, Order)
  if (cmd.includes("delivery challan") || cmd.includes("delivery channel") || cmd.includes("challan")) {
    state.documentType = "Delivery Challan";
    return {
      feedback: "Offline Mode: Switched document type to Delivery Challan (processed without amount).",
      updatedState: state,
    };
  }
  if (cmd.includes("quotation") || cmd.includes("estimate") || cmd.includes("quote")) {
    state.documentType = "Quotation";
    return {
      feedback: "Offline Mode: Switched document type to Quotation / Estimate.",
      updatedState: state,
    };
  }
  if (cmd.includes("order") && !cmd.includes("disorder")) {
    state.documentType = "Order";
    return {
      feedback: "Offline Mode: Switched document type to Order.",
      updatedState: state,
    };
  }

  // Set vehicle number
  const vehicleMatch = cmd.match(/(?:vehicle number is|vehicle no is|vehicle is|vehicle to|set vehicle to)\s*([^\s,]+(?:\s+[^\s,]+)*)/);
  if (vehicleMatch) {
    state.vehicleNumber = vehicleMatch[1].trim().toUpperCase();
    return {
      feedback: `Offline Mode: Vehicle number updated to "${state.vehicleNumber}".`,
      updatedState: state,
    };
  }

  // 1. Clear items / Reset
  if (cmd.includes("clear items") || cmd.includes("reset quote") || cmd.includes("clear all items")) {
    state.items = [];
    return {
      feedback: "Offline Mode: Cleared all items from the list.",
      updatedState: state,
    };
  }

  // 2. Set tax: e.g., "set tax to 15%" or "tax is 12"
  const taxMatch = cmd.match(/(?:set tax|tax is|tax rate|tax to)\s*([\w\d\.-]+)/);
  if (taxMatch) {
    let rateStr = taxMatch[1].replace("%", "");
    const rate = extractNumber(rateStr);
    if (!isNaN(rate)) {
      state.taxPercentage = rate;
      return {
        feedback: `Offline Mode: Updated tax rate to ${rate}%.`,
        updatedState: state,
      };
    }
  }

  // 3. Set discount: e.g., "set discount to 10%" or "discount of 5"
  const discountMatch = cmd.match(/(?:set discount|discount is|discount of|discount to)\s*([\w\d\.-]+)/);
  if (discountMatch) {
    let rateStr = discountMatch[1].replace("%", "");
    const rate = extractNumber(rateStr);
    if (!isNaN(rate)) {
      state.discountPercentage = rate;
      return {
        feedback: `Offline Mode: Applied discount of ${rate}%.`,
        updatedState: state,
      };
    }
  }

  // 4. Set currency: e.g., "set currency to euros" or "currency dollar"
  const currencyMatch = cmd.match(/(?:set currency to|set currency|currency to|currency is)\s*([^\s,]+)/);
  if (currencyMatch) {
    let cur = currencyMatch[1].trim();
    if (cur.includes("dollar")) cur = "$";
    else if (cur.includes("euro")) cur = "€";
    else if (cur.includes("pound")) cur = "£";
    else if (cur.includes("rupee")) cur = "₹";
    else if (cur.includes("yen")) cur = "¥";
    state.currency = cur;
    return {
      feedback: `Offline Mode: Switched currency symbol to ${state.currency}.`,
      updatedState: state,
    };
  }

  // 5. Set client: e.g., "set client to John Doe" or "client is Acme Corp"
  const clientMatch = cmd.match(/(?:set client to|set client|client is|customer is|set customer to)\s*([^,]+)/);
  if (clientMatch) {
    const name = clientMatch[1].trim();
    const capitalized = name.replace(/\b\w/g, c => c.toUpperCase());
    state.clientName = capitalized;
    return {
      feedback: `Offline Mode: Customer name updated to "${capitalized}".`,
      updatedState: state,
    };
  }

  // 6. Set notes or terms: e.g., "set note to payment due in 30 days"
  const noteMatch = cmd.match(/(?:set note to|set notes to|add note|notes is|notes|set note)\s*([^,]+)/);
  if (noteMatch) {
    const text = noteMatch[1].trim();
    state.notes = text;
    return {
      feedback: `Offline Mode: Internal notes updated.`,
      updatedState: state,
    };
  }

  // 7. Set terms: e.g., "set terms to net 30"
  const termMatch = cmd.match(/(?:set terms to|set term to|add term|terms are|terms)\s*([^,]+)/);
  if (termMatch) {
    const text = termMatch[1].trim();
    state.terms = text;
    return {
      feedback: `Offline Mode: Terms of payment updated.`,
      updatedState: state,
    };
  }

  // 8. Add item: e.g., "add 5 laptops at 1000 each"
  if (cmd.startsWith("add ")) {
    let qty = 1;
    let price = 0;

    // Check for quantity at start of the item
    const qtyWordMatch = cmd.match(/^add\s+([\w\d]+)\s+/);
    if (qtyWordMatch) {
      const parsedQty = extractNumber(qtyWordMatch[1]);
      if (!isNaN(parsedQty)) {
        qty = parsedQty;
      }
    }

    // Check for price
    const priceSeparators = [
      /\bat\s+([\w\d\.\s\-]+)/,
      /\bfor\s+([\w\d\.\s\-]+)/,
      /\bprice\s+([\w\d\.\s\-]+)/,
      /\bpriced\s+at\s+([\w\d\.\s\-]+)/
    ];
    for (const sep of priceSeparators) {
      const match = cmd.match(sep);
      if (match) {
        const cleanedPriceStr = match[1].replace(/[\$€£₹¥]/g, "").trim().split(/\s+/)[0];
        const parsedPrice = extractNumber(cleanedPriceStr);
        if (!isNaN(parsedPrice)) {
          price = parsedPrice;
          break;
        }
      }
    }

    // Extract item name between "add [qty]" and the price separator
    let namePart = cmd.substring(4); // strip "add "
    if (qtyWordMatch) {
      const parsedQty = extractNumber(qtyWordMatch[1]);
      if (!isNaN(parsedQty)) {
        namePart = namePart.substring(qtyWordMatch[1].length).trim();
      }
    }

    // Strip price phrase from item name
    const pricePhraseMatch = namePart.match(/\s+(?:at|for|price|priced|each|dollars|euros|pounds)\b.*/);
    if (pricePhraseMatch && pricePhraseMatch.index !== undefined) {
      namePart = namePart.substring(0, pricePhraseMatch.index).trim();
    }

    // Extract potential unit of quantity
    let unit = "Pcs";
    const unitMatch = cmd.match(/\b(pcs|piece|pieces|kg|kgs|kilos|kilogram|kilograms|mtr|meter|meters|box|boxes|set|sets|nos|number|numbers|ton|tons|bag|bags|bundle|bundles|sqft|sq ft|ltr|liter|liters|job|hrs|hour|hours)\b/i);
    if (unitMatch) {
      const u = unitMatch[1].toLowerCase();
      if (u.startsWith("piece") || u === "pcs") unit = "Pcs";
      else if (u.startsWith("kilo") || u.startsWith("kg")) unit = "Kg";
      else if (u.startsWith("meter") || u === "mtr") unit = "Mtr";
      else if (u.startsWith("box")) unit = "Box";
      else if (u.startsWith("set")) unit = "Set";
      else if (u.startsWith("number") || u === "nos") unit = "Nos";
      else if (u.startsWith("ton")) unit = "Ton";
      else if (u.startsWith("bag")) unit = "Bag";
      else if (u.startsWith("bundle")) unit = "Bundle";
      else if (u.startsWith("sq")) unit = "Sq.Ft";
      else if (u.startsWith("lit") || u === "ltr") unit = "Ltr";
      else if (u.startsWith("hour") || u === "hrs") unit = "Hrs";
      else unit = u.toUpperCase();
    }

    if (namePart) {
      // Clean unit word if it got attached to the start of item name
      let cleanedName = namePart;
      if (unitMatch) {
        cleanedName = cleanedName.replace(new RegExp(`^(?:${unitMatch[1]}|of\\s+${unitMatch[1]}|${unitMatch[1]}\\s+of)\\s+`, "i"), "");
      }
      cleanedName = cleanedName.replace(/^of\s+/i, "").trim();

      const name = (cleanedName || namePart).replace(/\b\w/g, c => c.toUpperCase());
      const newItem = {
        id: "item-" + Date.now() + Math.random().toString(36).substr(2, 4),
        name,
        description: "",
        quantity: qty,
        unit,
        unitPrice: price,
      };
      state.items.push(newItem);
      return {
        feedback: `Offline Mode: Added ${qty} ${unit} "${name}" at ${state.currency || "$"}${newItem.unitPrice.toFixed(2)} each.`,
        updatedState: state,
      };
    }
  }

  // 9. Remove item by name or index
  if (cmd.includes("delete") || cmd.includes("remove")) {
    const indexMatch = cmd.match(/(?:item|number|no|index)\s*([\w\d]+)/);
    if (indexMatch) {
      const idxVal = indexMatch[1];
      const parsedIdx = extractNumber(idxVal);
      const idx = (isNaN(parsedIdx) ? parseInt(idxVal, 10) : parsedIdx) - 1;
      if (idx >= 0 && idx < state.items.length) {
        const removed = state.items[idx];
        state.items.splice(idx, 1);
        return {
          feedback: `Offline Mode: Removed item #${idx + 1} ("${removed.name}").`,
          updatedState: state,
        };
      }
    }

    // Try name matching
    for (let i = 0; i < state.items.length; i++) {
      const itemName = state.items[i].name.toLowerCase();
      if (cmd.includes(itemName)) {
        const removed = state.items[i];
        state.items.splice(i, 1);
        return {
          feedback: `Offline Mode: Removed item "${removed.name}".`,
          updatedState: state,
        };
      }
    }
  }

  // Clear / nil specific fields
  if (cmd.includes("clear note") || cmd.includes("remove note") || cmd.includes("delete note") || cmd.includes("nil note") || cmd.includes("no note")) {
    state.notes = "";
    return {
      feedback: `Offline Mode: Cleared notes. Notes heading removed from document.`,
      updatedState: state,
    };
  }
  if (cmd.includes("clear term") || cmd.includes("remove term") || cmd.includes("delete term") || cmd.includes("nil term") || cmd.includes("no term")) {
    state.terms = "";
    return {
      feedback: `Offline Mode: Cleared terms. Terms heading removed from document.`,
      updatedState: state,
    };
  }
  if (cmd.includes("clear vehicle") || cmd.includes("remove vehicle") || cmd.includes("delete vehicle")) {
    state.vehicleNumber = "";
    return {
      feedback: `Offline Mode: Removed vehicle number.`,
      updatedState: state,
    };
  }
  if (cmd.includes("clear remark") || cmd.includes("remove remark") || cmd.includes("delete remark")) {
    state.remarks = "";
    return {
      feedback: `Offline Mode: Removed remarks.`,
      updatedState: state,
    };
  }
  if (cmd.includes("clear client") || cmd.includes("remove client")) {
    state.clientName = "";
    state.clientPhone = "";
    state.clientAddress = "";
    state.clientEmail = "";
    return {
      feedback: `Offline Mode: Cleared client information. Client heading removed from document.`,
      updatedState: state,
    };
  }

  return {
    feedback: `Offline Mode: Unrecognized voice command. Configure GEMINI_API_KEY for dynamic AI processing.`,
    updatedState: state,
  };
};

// API: Parse Voice Command
app.post("/api/voice-command", async (req: Request, res: Response): Promise<void> => {
  try {
    const { command, currentState } = req.body;

    if (!command || typeof command !== "string") {
      res.status(400).json({ error: "Command string is required." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("No GEMINI_API_KEY configured. Executing offline-first rule-based fallback parser.");
      const fallbackResult = fallbackParseCommand(command, currentState);
      res.json(fallbackResult);
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are an expert voice command parsing agent for an offline-first professional PDF quotation and thermal print system designed for small businesses.
Your goal is to parse the user's natural language command and intelligently update the current quotation state.

The user is speaking to add items, modify client information, change tax, apply discounts, or update other fields.

IMPORTANT GUIDELINES FOR PARSING:
1. "add item": Parse the quantity, unit of quantity (e.g. "Pcs", "Kg", "Mtr", "Box", "Set", "Ton", "Bags" - default to "Pcs" if not specified), name, description (optional), and unit price. Example: "add five boxes of standard paper at fifteen dollars each" -> item { name: "Standard Paper", quantity: 5, unit: "Box", unitPrice: 15 }. If no price is mentioned, default to 0. If no quantity is mentioned, default to 1.
2. "set client" / "client is": Update the customer's name, company, email, or phone. Example: "set client to John Doe from Acme Corp" -> clientName: "John Doe", clientCompany: "Acme Corp".
3. "apply discount" / "discount of": Update the discount percentage. Example: "give a ten percent discount" -> discountPercentage: 10.
4. "set tax" / "tax is": Update the tax percentage. Example: "tax rate is eight point five percent" -> taxPercentage: 8.5.
5. "remove item" / "delete item": Find the item in the list that matches the name or index and remove it. Example: "delete item two" or "remove the wireless mouse".
6. "update quantity" / "change quantity": Update an item's quantity or unit. Example: "change standard paper quantity to ten".
7. "set currency": Update the currency. Example: "set currency to euros" -> currency: "EUR" or "€". Use standard symbols where possible (e.g., "$", "€", "£", "₹", "¥").
8. "clear items" / "reset quote": Clear all items in the list.
9. "set note" / "add term": Add notes or payment terms. Example: "add payment term net thirty" -> terms: "Net 30 days".
10. "set document type" / "delivery challan": If the user requests a "delivery challan" or "delivery channel" or "transport challan", set documentType: "Delivery Challan". When in Delivery Challan mode, items do not have an associated amount (unitPrice defaults to 0). If user asks for "quotation" or "order", update documentType accordingly.
11. "vehicle number": Update vehicleNumber (e.g. "set vehicle number to KA-01-MJ-1234").
12. "clear" / "remove" / "nil": If user asks to remove or clear or set to nil/empty any field (e.g. "remove notes", "clear terms", "remove remarks", "clear client", "remove vehicle number", "set discount to nil/zero"), set that field to "" or 0 as appropriate so the heading is omitted from the document.

Your response MUST be in JSON format conforming to the requested schema.
Provide a clear, friendly "feedback" string summarizing the action taken (e.g. "Added 5 boxes of Standard Paper at $15.00 each.").
If the command was unrecognized or could not be parsed, keep the state intact and return an appropriate feedback message (e.g. "I didn't quite catch that. Could you repeat the command?").
`;

    // Define response schema
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        feedback: {
          type: Type.STRING,
          description: "Friendly description of what action was taken based on the voice command.",
        },
        updatedState: {
          type: Type.OBJECT,
          description: "The complete updated quotation state.",
          properties: {
            clientName: { type: Type.STRING },
            clientCompany: { type: Type.STRING },
            clientEmail: { type: Type.STRING },
            clientPhone: { type: Type.STRING },
            clientAddress: { type: Type.STRING },
            quoteNumber: { type: Type.STRING },
            date: { type: Type.STRING },
            validUntil: { type: Type.STRING },
            currency: { type: Type.STRING },
            documentType: { type: Type.STRING },
            vehicleNumber: { type: Type.STRING },
            remarks: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  unitPrice: { type: Type.NUMBER },
                },
                required: ["id", "name", "quantity", "unitPrice"],
              },
            },
            discountPercentage: { type: Type.NUMBER },
            taxPercentage: { type: Type.NUMBER },
            notes: { type: Type.STRING },
            terms: { type: Type.STRING },
          },
          required: ["clientName", "items", "discountPercentage", "taxPercentage", "currency"],
        },
      },
      required: ["feedback", "updatedState"],
    };

    const prompt = `
Current Quotation State:
${JSON.stringify(currentState, null, 2)}

User's Voice Command:
"${command}"

Update the state based on the voice command. Be highly robust in parsing numeric quantities, amounts, name matches, and updates.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // low temperature for precise JSON parsing
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini.");
    }

    const result = JSON.parse(text.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Error in voice-command route:", error);
    res.status(500).json({ error: error.message || "Failed to process voice command." });
  }
});

// Advanced high-precision Tax Invoice to Delivery Challan Parser
interface ExtractedItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const UNIT_MAP: { [key: string]: string } = {
  pcs: "Pcs",
  pc: "Pcs",
  nos: "Nos",
  no: "Nos",
  unit: "Pcs",
  units: "Pcs",
  qty: "Pcs",
  kg: "Kg",
  kgs: "Kg",
  kilogram: "Kg",
  kilograms: "Kg",
  kilo: "Kg",
  mtr: "Mtr",
  mtrs: "Mtr",
  meter: "Mtr",
  meters: "Mtr",
  metre: "Mtr",
  metres: "Mtr",
  box: "Box",
  boxes: "Box",
  ctn: "Box",
  carton: "Box",
  cartons: "Box",
  set: "Set",
  sets: "Set",
  ton: "Ton",
  tons: "Ton",
  mt: "Ton",
  bag: "Bags",
  bags: "Bags",
  "sq.ft": "Sq.Ft",
  sqft: "Sq.Ft",
  "sq.mtr": "Sq.Mtr",
  sqm: "Sq.Mtr",
  bundle: "Bundle",
  bundles: "Bundle",
  bdl: "Bundle",
  ltr: "Ltr",
  ltrs: "Ltr",
  liter: "Ltr",
  liters: "Ltr",
  litre: "Ltr",
  litres: "Ltr",
  roll: "Roll",
  rolls: "Roll",
  drum: "Drum",
  drums: "Drum",
  packet: "Packet",
  packets: "Packet",
  pkt: "Packet",
  pkts: "Packet",
  pair: "Pair",
  pairs: "Pair",
  sheet: "Sheet",
  sheets: "Sheet",
  coil: "Coil",
  coils: "Coil",
  length: "Length",
  lengths: "Length",
  quintal: "Quintal",
  qtl: "Quintal",
};

const normalizeUnit = (rawUnit: string): string => {
  const clean = rawUnit.toLowerCase().trim().replace(/[^a-z.]/g, "");
  return UNIT_MAP[clean] || rawUnit.charAt(0).toUpperCase() + rawUnit.slice(1).toLowerCase();
};

// Safe helper to extract text from PDF buffer across pdf-parse versions
const extractTextFromPdfBuffer = async (buffer: Buffer): Promise<string> => {
  try {
    const pdfParseMod = require("pdf-parse");
    // Standard function export
    if (typeof pdfParseMod === "function") {
      const data = await pdfParseMod(buffer);
      if (data && data.text) return data.text.trim();
    }
    // Default export
    if (typeof pdfParseMod?.default === "function") {
      const data = await pdfParseMod.default(buffer);
      if (data && data.text) return data.text.trim();
    }
    // PDFParse class export (pdf-parse v2)
    if (pdfParseMod?.PDFParse) {
      const parser = new pdfParseMod.PDFParse({ data: buffer });
      await parser.load();
      const text = await parser.getText();
      if (text) return text.trim();
    }
  } catch (err: any) {
    console.warn("PDF parse extractor warning:", err?.message);
  }
  return "";
};

const parseInvoiceTextAdvanced = (
  rawText?: string,
  fileName?: string,
  currentProfileName?: string
) => {
  const text = (rawText || "").trim();
  const today = new Date().toISOString().split("T")[0];

  if (!text) {
    return {
      feedback: "No invoice text or readable content could be extracted from the file.",
      invoiceNumber: fileName ? fileName.replace(/\.[^/.]+$/, "").toUpperCase().slice(0, 16) : "DC-NEW",
      challanState: {
        documentType: "Delivery Challan",
        quoteNumber: `DC-${Math.floor(1000 + Math.random() * 9000)}`,
        date: today,
        validUntil: "",
        clientName: "",
        clientCompany: "",
        clientPhone: "",
        clientEmail: "",
        clientAddress: "",
        vehicleNumber: "",
        remarks: "Dispatched against uploaded tax invoice.",
        currency: "₹",
        items: [],
        discountPercentage: 0,
        taxPercentage: 0,
        notes: "Goods dispatched in sound condition for road transport.",
        terms: "1. Received the above mentioned materials in good condition.\n2. Receiver signature & official seal required.",
      },
    };
  }

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. EXTRACT INVOICE NUMBER
  let invoiceNumber = "";
  const invMatch = text.match(
    /(?:tax\s*invoice\s*(?:no\.?|#|num(?:ber)?)|invoice\s*(?:no\.?|num(?:ber)?|#)|inv\s*(?:no\.?|#)|bill\s*(?:no\.?|num(?:ber)?|#)|doc\s*(?:no\.?|#)|challan\s*(?:ref|no\.?|#))\s*[:\-]?\s*([A-Za-z0-9\/\-_]+)/i
  );
  if (invMatch && invMatch[1]) {
    invoiceNumber = invMatch[1].trim();
  } else {
    const altInvMatch = text.match(/\b([A-Z]{2,4}[/-][0-9]{2,4}[/-][A-Za-z0-9]+|[A-Z]{2,5}[-_][0-9]{3,8})\b/);
    if (altInvMatch && altInvMatch[1]) {
      invoiceNumber = altInvMatch[1].trim();
    } else if (fileName) {
      const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      if (cleanName) invoiceNumber = cleanName.toUpperCase().slice(0, 16);
    } else {
      invoiceNumber = "TI-" + Math.floor(1000 + Math.random() * 9000);
    }
  }

  // 2. EXTRACT DATE
  let invoiceDate = today;
  const dateMatch = text.match(
    /(?:invoice\s*date|dispatch\s*date|challan\s*date|dated|date)\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+[0-9]{2,4}|[0-9]{4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,2})/i
  );
  if (dateMatch && dateMatch[1]) {
    invoiceDate = dateMatch[1].trim();
  }

  // 3. EXTRACT VEHICLE NUMBER & TRANSPORT / LR DETAILS
  let vehicleNumber = "";
  let transportLR = "";

  const vehMatch = text.match(
    /(?:vehicle|truck|lorry|motor\s*vehicle|carrier|tempo|transport\s*vehicle)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z0-9\- ]+?)(?:\r?\n|$|,|;)/i
  );
  if (vehMatch && vehMatch[1] && vehMatch[1].trim().length >= 4) {
    vehicleNumber = vehMatch[1].trim().toUpperCase();
  } else {
    // Check Indian vehicle license registration format (e.g. MP-20-HB-7721, MH-12-AB-1234, DL-1C-A-1111)
    const plateMatch = text.match(/\b([A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{3,4})\b/i);
    if (plateMatch && plateMatch[1]) {
      vehicleNumber = plateMatch[1].trim().toUpperCase();
    }
  }

  const lrMatch = text.match(
    /(?:transporter|transport|lr|l\.r\.|bilty|consignment|e-?way\s*bill|ewb)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z0-9\/\-_ ]+?)(?:\r?\n|$|,|;)/i
  );
  if (lrMatch && lrMatch[1]) {
    transportLR = lrMatch[1].trim();
  }

  // 4. EXTRACT CONSIGNEE / BUYER (BILL TO / SHIP TO)
  let clientName = "";
  let clientCompany = "";
  let clientAddress = "";
  let clientPhone = "";
  let clientEmail = "";

  let buyerSectionIndex = -1;
  const buyerHeaderRegex = /^(?:consignee|buyer|billed?\s*to|ship(?:ped)?\s*to|customer|party\s*name|details\s*of\s*(?:receiver|recipient|buyer)|sold\s*to|deliver(?:y)?\s*to|m\/s)\b[:\-]?\s*(.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(buyerHeaderRegex);
    if (match) {
      buyerSectionIndex = i;
      const afterColon = match[1]?.trim();
      if (afterColon && afterColon.length > 2 && !/^(details|party|name|info|m\/s)$/i.test(afterColon)) {
        clientName = afterColon;
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.toLowerCase().includes("address") && !nextLine.toLowerCase().includes("gstin")) {
          clientName = nextLine.replace(/^(?:m\/s\.?|mr\.?|shree|shri)\s+/i, "");
        }
      }
      break;
    }
  }

  if (!clientName) {
    const msMatch = text.match(/(?:m\/s\.?|to\s*[:\-]?)\s*([A-Za-z0-9&.,' -]{3,45})/i);
    if (msMatch && msMatch[1]) {
      const candidate = msMatch[1].trim();
      if (!currentProfileName || !candidate.toLowerCase().includes(currentProfileName.toLowerCase())) {
        clientName = candidate;
      }
    }
  }

  // Clean seller name if it was mistakenly picked
  if (currentProfileName && clientName.toLowerCase().includes(currentProfileName.toLowerCase())) {
    clientName = "";
  }

  // Collect buyer delivery address
  if (buyerSectionIndex >= 0) {
    const addrLines: string[] = [];
    const searchLimit = Math.min(lines.length, buyerSectionIndex + 7);
    for (let j = buyerSectionIndex + 1; j < searchLimit; j++) {
      const line = lines[j];
      if (line === clientName || line.includes(clientName)) continue;
      if (
        /^(?:s\.?no|description|item|particulars|qty|quantity|hsn|rate|amount|sr\b|line\s*items|dispatched|goods|products)/i.test(line) ||
        /^(?:tax\s*invoice|original|duplicate|triplicate)/i.test(line) ||
        /^\d+[\.\)]\s+/.test(line)
      ) {
        break;
      }
      const gstinMatch = line.match(/\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/);
      if (gstinMatch) continue;

      const phMatch = line.match(/(?:ph|phone|mob|mobile|contact|tel)[:\s-]*([+]?[0-9\s-]{10,15})/i);
      if (phMatch && phMatch[1]) {
        clientPhone = phMatch[1].trim();
        continue;
      }

      const emMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emMatch && emMatch[1]) {
        clientEmail = emMatch[1].trim();
        continue;
      }

      if (
        line.length > 3 &&
        !line.toLowerCase().startsWith("state") &&
        !line.toLowerCase().startsWith("pan") &&
        !/^(?:vehicle|truck|lorry|transport|transporter|lr|carrier|bilty|e-?way|date|inv)/i.test(line)
      ) {
        addrLines.push(line.replace(/^(?:address|site|delivery\s*address|site\s*address)[:\s-]*/i, "").trim());
      }
    }
    if (addrLines.length > 0) {
      clientAddress = addrLines.slice(0, 3).join(", ");
    }
  }

  if (!clientPhone) {
    const phMatch = text.match(/(?:ph|phone|mob|mobile|contact|tel)[:\s-]*([+]?[0-9\s-]{10,15})/i);
    if (phMatch && phMatch[1]) clientPhone = phMatch[1].trim();
  }
  if (!clientEmail) {
    const emMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emMatch && emMatch[1]) clientEmail = emMatch[1].trim();
  }

  if (
    clientName &&
    /(?:works|infra|enterprises|industries|private|pvt|ltd|limited|corp|co|engineering|solutions|suppliers|traders|agency|associates|contractors)/i.test(
      clientName
    )
  ) {
    clientCompany = clientName;
  }

  // 5. EXTRACT DISPATCHED LINE ITEMS (Hybrid Structured Table Parser)
  const parsedItems: ExtractedItem[] = [];
  const unitRegexPattern =
    /\b(pcs|pc|nos|no|kg|kgs|kilogram|kilograms|mtr|mtrs|meter|meters|box|boxes|set|sets|ton|tons|mt|bag|bags|sq\.ft|sqft|sqm|bundle|bundles|ltr|ltrs|roll|rolls|drum|drums|packet|packets|pkt|pkts|pair|pairs|sheet|sheets|coil|coils|length|lengths|quintal|qtl|carton|cartons|crate|crates|unit|units)\b/i;

  // Scan for line items across lines with multi-line description support
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip headers and global metadata
    if (
      /^(?:tax\s*invoice|original|duplicate|triplicate|buyer|consignee|bill\s*to|ship\s*to|gstin|pan|date|invoice\s*no|vehicle|e-?way|total|subtotal|cgst|sgst|igst|grand\s*total|terms|signature|bank|authorized|consignor|seller)/i.test(
        line
      )
    ) {
      continue;
    }
    if (
      /(?:description|particulars|item\s*name)\b/i.test(line) &&
      /(?:qty|quantity|unit|rate|amount|hsn)\b/i.test(line)
    ) {
      continue;
    }

    // Check for inline HSN in the line or next line
    let hsnCode = "";
    const hsnMatch = line.match(/(?:hsn(?:\/sac)?|sac)\s*[:\-]?\s*(\d{4,8})/i) || line.match(/\b(\d{4,8})\b/);
    if (hsnMatch && hsnMatch[1]) {
      // Confirm it's likely an HSN (not a phone number or year)
      const num = parseInt(hsnMatch[1]);
      if (num >= 1000 && num <= 99999999 && num !== 2024 && num !== 2025 && num !== 2026) {
        hsnCode = hsnMatch[1];
      }
    }

    // Pattern 1: Explicit Qty and Unit (e.g. "M.S. Round Pipe 50mm - Qty: 40 Mtr - Unit: Mtr")
    const explicitMatch = line.match(
      /(?:^\d+[\.\)]\s*)?([^\-\–:]+?)\s*[-–:]\s*Qty:\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:[-–:]?\s*Unit:\s*([A-Za-z.]+)|([A-Za-z.]+))?/i
    );
    if (explicitMatch && explicitMatch[1] && explicitMatch[2]) {
      const name = explicitMatch[1].replace(/^\d+[\.\)]\s*/, "").trim();
      const qty = parseFloat(explicitMatch[2].replace(/,/g, ""));
      const rawUnit = (explicitMatch[3] || explicitMatch[4] || "Pcs").trim();

      // Look at next line for specifications/HSN
      let specs = hsnCode ? `HSN: ${hsnCode}` : "";
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (
          nextLine.length > 2 &&
          !/^\d+[\.\)]/.test(nextLine) &&
          !/^(?:total|subtotal|terms|sign|authorized|gstin)/i.test(nextLine) &&
          !unitRegexPattern.test(nextLine)
        ) {
          specs = specs ? `${specs} | ${nextLine}` : nextLine;
        }
      }

      if (name.length > 2 && !isNaN(qty) && qty > 0) {
        parsedItems.push({
          id: `item-${Date.now()}-${parsedItems.length + 1}`,
          name: name,
          description: specs,
          quantity: qty,
          unit: normalizeUnit(rawUnit),
          unitPrice: 0,
        });
        continue;
      }
    }

    // Pattern 2: Line with Quantity and Unit (e.g. "1. SS 304 Pipe 2"  7306  50 Mtr  320.00")
    const qtyUnitMatch = line.match(
      /(?:^|[\s|\t\-])([0-9,]+(?:\.[0-9]+)?)\s*(pcs|pc|nos|no|kg|kgs|mtr|mtrs|meter|meters|box|boxes|set|sets|ton|tons|mt|bag|bags|sq\.ft|sqft|sqm|bundle|bundles|ltr|ltrs|roll|rolls|drum|drums|packet|packets|pkt|pkts|pair|pairs|sheet|sheets|coil|coils|length|lengths|quintal|qtl|carton|cartons|crate|crates|unit|units)\b/i
    );

    if (qtyUnitMatch && qtyUnitMatch[1] && qtyUnitMatch[2]) {
      const qty = parseFloat(qtyUnitMatch[1].replace(/,/g, ""));
      const rawUnit = qtyUnitMatch[2];
      const unit = normalizeUnit(rawUnit);

      let cleanLine = line.replace(/^\d+[\.\)]?\s+/, ""); // strip leading S.No
      const matchIndex = cleanLine.indexOf(qtyUnitMatch[0]);

      let itemName = "";
      let itemDescription = hsnCode ? `HSN: ${hsnCode}` : "";

      if (matchIndex > 0) {
        itemName = cleanLine.slice(0, matchIndex).trim();
        // Remove HSN code if it's attached to item title
        if (hsnCode && itemName.includes(hsnCode)) {
          itemName = itemName.replace(new RegExp(`(?:hsn(?:/sac)?\\s*[:\\-]?\\s*)?${hsnCode}`, "gi"), "").trim();
        }
      } else {
        const afterMatch = cleanLine.slice(matchIndex + qtyUnitMatch[0].length).trim();
        if (afterMatch.length > 2) {
          itemName = afterMatch;
        }
      }

      // Check next line for description / grade / size
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (
          nextLine.length > 2 &&
          !/^\d+[\.\)]/.test(nextLine) &&
          !/^(?:total|subtotal|terms|sign|authorized|gstin|vehicle|tax)/i.test(nextLine) &&
          !unitRegexPattern.test(nextLine)
        ) {
          itemDescription = itemDescription ? `${itemDescription} | ${nextLine}` : nextLine;
        }
      }

      itemName = itemName.replace(/^[-–:|]+|[-–:|]+$/g, "").trim();

      if (
        itemName.length >= 2 &&
        !/^(?:total|subtotal|grand\s*total|discount|tax|qty|quantity)$/i.test(itemName) &&
        !isNaN(qty) &&
        qty > 0
      ) {
        parsedItems.push({
          id: `item-${Date.now()}-${parsedItems.length + 1}`,
          name: itemName,
          description: itemDescription,
          quantity: qty,
          unit: unit,
          unitPrice: 0,
        });
        continue;
      }
    }

    // Pattern 3: Delimited Columns (Pipes, Tabs, Multiple Spaces)
    if (line.includes("|") || line.includes("\t") || /\s{3,}/.test(line)) {
      const cols = line
        .split(/[|\t]|\s{3,}/)
        .map((c) => c.trim())
        .filter(Boolean);

      if (cols.length >= 2) {
        let nameCol = "";
        let qtyVal = 0;
        let unitVal = "Pcs";
        let colHsn = "";

        // Strip leading S.No col
        const candidateCols = /^\d+$/.test(cols[0]) ? cols.slice(1) : cols;

        for (let c = 0; c < candidateCols.length; c++) {
          const col = candidateCols[c];
          // Check if column is an HSN code
          if (/^\d{4,8}$/.test(col) && !colHsn) {
            colHsn = col;
            continue;
          }
          // Check if column is a numeric quantity
          const cleanNum = col.replace(/,/g, "");
          const num = parseFloat(cleanNum);
          if (!isNaN(num) && num > 0 && num < 1000000 && qtyVal === 0) {
            // Check if column has unit attached
            const unitMatch = col.match(unitRegexPattern);
            if (unitMatch) {
              qtyVal = num;
              unitVal = normalizeUnit(unitMatch[0]);
              nameCol = candidateCols.slice(0, c).join(" ").trim();
              break;
            } else if (c + 1 < candidateCols.length && unitRegexPattern.test(candidateCols[c + 1])) {
              qtyVal = num;
              unitVal = normalizeUnit(candidateCols[c + 1].match(unitRegexPattern)![0]);
              nameCol = candidateCols.slice(0, c).join(" ").trim();
              break;
            } else if (candidateCols.length >= 3 && c === 1 || c === 2) {
              // Standard position for Qty
              qtyVal = num;
              nameCol = candidateCols.slice(0, c).join(" ").trim();
              break;
            }
          }
        }

        if (nameCol && qtyVal > 0 && nameCol.length >= 2 && !/^(?:total|subtotal|cgst|sgst|igst)$/i.test(nameCol)) {
          parsedItems.push({
            id: `item-${Date.now()}-${parsedItems.length + 1}`,
            name: nameCol,
            description: colHsn ? `HSN: ${colHsn}` : "",
            quantity: qtyVal,
            unit: unitVal,
            unitPrice: 0,
          });
          continue;
        }
      }
    }
  }

  const challanNo = invoiceNumber
    ? `DC-${invoiceNumber.replace(/^(?:TI|INV|BILL|TAX|DC)[-_/]?/i, "")}`
    : `DC-${Math.floor(1000 + Math.random() * 9000)}`;

  const feedbackMsg =
    parsedItems.length > 0
      ? `Tax Invoice ${invoiceNumber} parsed successfully! Extracted ${parsedItems.length} dispatched goods with exact quantities & units. Amounts omitted for industrial Delivery Challan compliance.`
      : `Tax Invoice ${invoiceNumber} identified for ${clientName || "recipient"}. You can review and verify dispatched materials in the editable grid below.`;

  return {
    feedback: feedbackMsg,
    invoiceNumber: invoiceNumber,
    rawExtractedText: text,
    challanState: {
      documentType: "Delivery Challan",
      quoteNumber: challanNo,
      date: invoiceDate,
      validUntil: "",
      clientName: clientName || "Customer / Consignee",
      clientCompany: clientCompany || (clientName.includes("Works") || clientName.includes("Infra") ? clientName : ""),
      clientPhone: clientPhone,
      clientEmail: clientEmail,
      clientAddress: clientAddress,
      vehicleNumber: vehicleNumber,
      remarks: transportLR
        ? `Dispatched against Tax Invoice No: ${invoiceNumber}. Transporter / LR: ${transportLR}.`
        : `Goods dispatched against Tax Invoice No: ${invoiceNumber} dated ${invoiceDate}.`,
      currency: "₹",
      items: parsedItems,
      discountPercentage: 0,
      taxPercentage: 0,
      notes: "Goods dispatched in sound condition for road transport. Subject to verification on unloading.",
      terms: "1. Received the above mentioned materials in good condition.\n2. Receiver signature & official seal required on receipt copy.",
    },
  };
};

// API: Upload / Parse Tax Invoice to Make Delivery Challan
app.post("/api/parse-invoice-to-challan", async (req: Request, res: Response) => {
  try {
    const { fileBase64, mimeType, fileName, invoiceText, currentProfileName } = req.body;

    if (!fileBase64 && !invoiceText) {
      res.status(400).json({ error: "Please provide either a file (PDF/Image) or invoice text to convert." });
      return;
    }

    let extractedText = (invoiceText || "").trim();

    // 1. If PDF file is provided, extract plain text directly from the PDF bytes
    if (fileBase64 && (!extractedText || extractedText.length < 10)) {
      try {
        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const isPdf =
          mimeType?.includes("pdf") ||
          fileName?.toLowerCase().endsWith(".pdf") ||
          buffer.slice(0, 5).toString().startsWith("%PDF");

        if (isPdf) {
          const pdfText = await extractTextFromPdfBuffer(buffer);
          if (pdfText && pdfText.trim()) {
            extractedText = pdfText.trim();
            console.log(`Successfully extracted ${extractedText.length} characters of raw text from PDF ${fileName || ""}`);
          }
        }
      } catch (pdfErr: any) {
        console.warn("PDF text extraction note:", pdfErr?.message);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 2. Hybrid Multimodal AI Extraction with Gemini
    if (apiKey) {
      try {
        const ai = getGeminiClient();

        const systemInstruction = `
You are an expert Tax Invoice to Delivery Challan extraction engine for industrial manufacturing, fabrication, engineering, and logistics.
Your goal is to parse an uploaded Tax Invoice (provided as an image, PDF document, or text) and convert it into a structured Delivery Challan state.

CRITICAL USER PREFERENCES & DELIVERY CHALLAN RULES:
1. "documentType": MUST be "Delivery Challan".
2. ZERO-AMOUNT ENFORCEMENT: In a Delivery Challan, goods are dispatched WITHOUT showing prices or commercial amounts.
   - For every item in "items", set "unitPrice" to 0.
   - Set "discountPercentage" to 0.
   - Set "taxPercentage" to 0.
3. STRUCTURED ITEM EXTRACTION:
   - "name": Clean item title only (e.g. "Mild Steel Round Pipe 50mm", "SS 304 Flange Class 150"). Do NOT leave HSN codes or clutter in the title.
   - "description": Secondary details: HSN/SAC code (formatted as "HSN: [CODE]") and technical specifications, material grade, dimensions, or thickness (e.g. "HSN: 7306 | OD 48.3mm x WT 3.2mm"). If multiple lines of specs exist on the invoice, join them cleanly.
   - "quantity": Number of units dispatched (positive numeric value).
   - "unit": Standardized Unit of Quantity (e.g. "Pcs", "Nos", "Kg", "Mtr", "Box", "Set", "Ton", "Bags", "Sq.Ft", "Sq.Mtr", "Bundle", "Ltr", "Roll", "Drum", "Packet", "Pair", "Sheet", "Quintal", "Carton").
   - "unitPrice": MUST BE 0.
4. CONSIGNEE / RECIPIENT IDENTIFICATION:
   - "clientName": Buyer / Consignee / Bill To / Ship To name. Do NOT pick the seller/consignor name.
   - "clientCompany": Buyer company name if distinct.
   - "clientAddress": Delivery site address or buyer shipping location.
   - "clientPhone": Contact phone / mobile if available, or empty string "".
   - "clientEmail": Email if available, or empty string "".
5. TRANSPORT & IDENTIFICATION:
   - "vehicleNumber": Extract vehicle no, lorry no, truck no, carrier or transport vehicle plate (e.g. "MP-20-HB-7721").
   - "quoteNumber": Format as "DC-<InvoiceNumber>" (e.g. if invoice is TI-8842, use DC-8842).
   - "date": Dispatch date in YYYY-MM-DD.
   - "remarks": Note reference, e.g. "Dispatched against Tax Invoice No: [INVOICE_NO] dated [DATE]." Include Transporter / LR / Bilty reference if present.
   - "notes": Delivery instructions (e.g. "Goods dispatched in sound condition for road transport.").
   - "terms": Acknowledgment terms (e.g. "Received goods in good order. Please sign and return duplicate copy.").
   - "currency": "₹".
6. NIL HEADING SUPPRESSION: Do not put placeholder strings like "N/A" or "None". If a field is not present on the invoice, return an empty string "" so that the heading is omitted cleanly.
`;

        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            feedback: {
              type: Type.STRING,
              description: "Summary message of the parsed invoice and created delivery challan.",
            },
            invoiceNumber: {
              type: Type.STRING,
              description: "Original tax invoice number.",
            },
            challanState: {
              type: Type.OBJECT,
              description: "Structured QuoteState formatted as an industrial Delivery Challan.",
              properties: {
                documentType: { type: Type.STRING },
                quoteNumber: { type: Type.STRING },
                date: { type: Type.STRING },
                validUntil: { type: Type.STRING },
                clientName: { type: Type.STRING },
                clientCompany: { type: Type.STRING },
                clientPhone: { type: Type.STRING },
                clientEmail: { type: Type.STRING },
                clientAddress: { type: Type.STRING },
                vehicleNumber: { type: Type.STRING },
                remarks: { type: Type.STRING },
                currency: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      description: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unit: { type: Type.STRING },
                      unitPrice: { type: Type.NUMBER },
                    },
                    required: ["id", "name", "quantity", "unit", "unitPrice"],
                  },
                },
                discountPercentage: { type: Type.NUMBER },
                taxPercentage: { type: Type.NUMBER },
                notes: { type: Type.STRING },
                terms: { type: Type.STRING },
              },
              required: [
                "documentType",
                "quoteNumber",
                "date",
                "clientName",
                "items",
                "discountPercentage",
                "taxPercentage",
                "currency",
              ],
            },
          },
          required: ["feedback", "challanState"],
        };

        const contents: any[] = [];

        if (fileBase64) {
          const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
          let effectiveMime = mimeType || "application/pdf";
          if (!mimeType || mimeType === "application/octet-stream") {
            if (fileName?.toLowerCase().match(/\.(png)$/)) effectiveMime = "image/png";
            else if (fileName?.toLowerCase().match(/\.(jpe?g)$/)) effectiveMime = "image/jpeg";
            else if (fileName?.toLowerCase().match(/\.(webp)$/)) effectiveMime = "image/webp";
            else effectiveMime = "application/pdf";
          }
          contents.push({
            inlineData: {
              data: cleanBase64,
              mimeType: effectiveMime,
            },
          });
        }

        if (extractedText) {
          contents.push(`Extracted Text from Invoice Document:\n${extractedText}\n\n`);
        }

        contents.push(
          `Please parse this Tax Invoice document and convert it into an industrial Delivery Challan. Extract consignee, site delivery address, vehicle number, dispatch items with clean names, HSN codes and specifications in description, quantities, and units. Ensure all unit prices are 0.`
        );

        // Try primary multimodal model gemini-3.8-flash, with fallback to gemini-2.5-flash
        let response;
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: responseSchema,
              temperature: 0.1,
            },
          });
        } catch (firstTryErr: any) {
          console.warn("gemini-3.8-flash attempt failed, retrying with gemini-2.5-flash:", firstTryErr?.message);
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: responseSchema,
              temperature: 0.1,
            },
          });
        }

        const text = response.text;
        if (text) {
          const cleanJsonText = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          const result = JSON.parse(cleanJsonText);
          if (result.challanState?.items) {
            result.challanState.items = result.challanState.items.map((item: any, idx: number) => ({
              ...item,
              id: item.id || `item-${Date.now()}-${idx}`,
              unitPrice: 0,
              unit: normalizeUnit(item.unit || "Pcs"),
            }));
            result.challanState.documentType = "Delivery Challan";
            result.challanState.discountPercentage = 0;
            result.challanState.taxPercentage = 0;
          }
          result.rawExtractedText = extractedText;
          res.json(result);
          return;
        }
      } catch (geminiError: any) {
        console.warn("Gemini API processing failed, switching to high-precision rule engine:", geminiError?.message);
      }
    }

    // 3. Deterministic high-precision table parser (runs offline or when API key is unavailable)
    const advancedResult = parseInvoiceTextAdvanced(extractedText, fileName, currentProfileName);
    res.json(advancedResult);
  } catch (error: any) {
    console.error("Error in parse-invoice-to-challan route:", error);
    res.status(500).json({ error: error.message || "Failed to parse tax invoice." });
  }
});

// Start server and handle Vite middleware
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} inside container`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
