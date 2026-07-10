import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for body parsing
app.use(express.json());

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

  // 1. Clear items / Reset
  if (cmd.includes("clear items") || cmd.includes("reset quote") || cmd.includes("clear all items")) {
    state.items = [];
    return {
      feedback: "Offline Mode: Cleared all items from the quotation list.",
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

    if (namePart) {
      const name = namePart.replace(/\b\w/g, c => c.toUpperCase());
      const newItem = {
        id: "item-" + Date.now() + Math.random().toString(36).substr(2, 4),
        name,
        description: "",
        quantity: qty,
        unitPrice: price,
      };
      state.items.push(newItem);
      return {
        feedback: `Offline Mode: Added ${qty}x "${name}" at ${state.currency || "$"}${newItem.unitPrice.toFixed(2)} each. (Please configure GEMINI_API_KEY in Secrets panel for smart AI).`,
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
1. "add item": Parse the quantity, name, description (optional), and unit price. Example: "add five boxes of standard paper at fifteen dollars each" -> item { name: "Standard Paper", quantity: 5, unitPrice: 15 }. If no price is mentioned, default to 0. If no quantity is mentioned, default to 1.
2. "set client" / "client is": Update the customer's name, company, email, or phone. Example: "set client to John Doe from Acme Corp" -> clientName: "John Doe", clientCompany: "Acme Corp".
3. "apply discount" / "discount of": Update the discount percentage. Example: "give a ten percent discount" -> discountPercentage: 10.
4. "set tax" / "tax is": Update the tax percentage. Example: "tax rate is eight point five percent" -> taxPercentage: 8.5.
5. "remove item" / "delete item": Find the item in the list that matches the name or index and remove it. Example: "delete item two" or "remove the wireless mouse".
6. "update quantity" / "change quantity": Update an item's quantity. Example: "change standard paper quantity to ten".
7. "set currency": Update the currency. Example: "set currency to euros" -> currency: "EUR" or "€". Use standard symbols where possible (e.g., "$", "€", "£", "₹", "¥").
8. "clear items" / "reset quote": Clear all items in the list.
9. "set note" / "add term": Add notes or payment terms. Example: "add payment term net thirty" -> terms: "Net 30 days".

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
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
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
