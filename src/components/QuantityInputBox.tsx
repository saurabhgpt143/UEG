import { useState, useEffect, ChangeEvent, KeyboardEvent } from "react";

interface QuantityInputBoxProps {
  itemId: string;
  quantity: number;
  onUpdateQty: (id: string, newQty: number) => void;
  className?: string;
  min?: number;
}

/**
 * QuantityInputBox
 * Provides direct input box editing of item quantity after adding it,
 * with synchronized keystroke editing, decimal support, and quick - / + steppers.
 */
export default function QuantityInputBox({
  itemId,
  quantity,
  onUpdateQty,
  className = "",
  min = 0.01,
}: QuantityInputBoxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [rawText, setRawText] = useState<string>(String(quantity));

  // Sync rawText with external quantity when not actively typing
  useEffect(() => {
    if (!isFocused) {
      setRawText(String(quantity));
    }
  }, [quantity, isFocused]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawText(val);

    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateQty(itemId, parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(rawText);
    if (isNaN(parsed) || parsed <= 0) {
      const fallback = quantity > 0 ? quantity : 1;
      setRawText(String(fallback));
      onUpdateQty(itemId, fallback);
    } else {
      setRawText(String(parsed));
      onUpdateQty(itemId, parsed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleDecrement = () => {
    const current = typeof quantity === "number" && !isNaN(quantity) ? quantity : 1;
    // If integer, step by 1; if decimal, decrease cleanly
    const next = current > 1 ? Math.round((current - 1) * 100) / 100 : Math.max(min, 0.5);
    setRawText(String(next));
    onUpdateQty(itemId, next);
  };

  const handleIncrement = () => {
    const current = typeof quantity === "number" && !isNaN(quantity) ? quantity : 1;
    const next = Math.round((current + 1) * 100) / 100;
    setRawText(String(next));
    onUpdateQty(itemId, next);
  };

  return (
    <div
      className={`inline-flex items-center border border-slate-300 hover:border-slate-400 bg-white rounded-md overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-2xs group ${className}`}
      title="Edit Quantity: type directly in the input box, or use - / +"
    >
      <button
        type="button"
        onClick={handleDecrement}
        className="px-1.5 py-0.5 hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-800 font-black cursor-pointer transition-colors select-none text-[11px]"
        title="Decrease quantity"
        aria-label="Decrease quantity"
      >
        -
      </button>

      <div className="relative flex items-center border-x border-slate-200">
        <input
          type="number"
          min={min}
          step="any"
          value={rawText}
          onFocus={() => setIsFocused(true)}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-13 sm:w-15 px-1 py-0.5 text-center font-extrabold text-[11px] text-slate-800 bg-transparent focus:bg-indigo-50/40 focus:outline-hidden transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text select-all"
          placeholder="Qty"
          title="Type quantity directly (e.g. 5, 25, 100)"
          aria-label="Edit Item Quantity"
        />
      </div>

      <button
        type="button"
        onClick={handleIncrement}
        className="px-1.5 py-0.5 hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-800 font-black cursor-pointer transition-colors select-none text-[11px]"
        title="Increase quantity"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
