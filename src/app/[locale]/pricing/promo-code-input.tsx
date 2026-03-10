"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-react";

type PromoCodeInputProps = {
  placeholder: string;
  buttonLabel: string;
  onPromoApplied?: (code: string) => void;
  onPromoCleared?: () => void;
};

export function PromoCodeInput({ placeholder, buttonLabel, onPromoApplied, onPromoCleared }: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    discountText?: string;
    error?: string;
    code?: string;
  } | null>(null);

  async function handleApply() {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/stripe/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      setResult(data);
      if (data.valid && onPromoApplied) {
        onPromoApplied(data.code || code.trim().toUpperCase());
      }
    } catch {
      setResult({ valid: false, error: "Failed to validate code" });
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setCode("");
    setResult(null);
    onPromoCleared?.();
  }

  return (
    <div className="max-w-md mx-auto space-y-2">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (result) {
              setResult(null);
              onPromoCleared?.();
            }
          }}
          placeholder={placeholder}
          className="text-center sm:text-left font-mono"
          disabled={result?.valid}
        />
        {result?.valid ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleClear}
            className="w-full sm:w-auto shrink-0"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="w-full sm:w-auto shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {buttonLabel}
          </Button>
        )}
      </div>
      {result?.valid && (
        <p className="text-sm text-success font-medium flex items-center justify-center gap-1">
          <Check className="h-4 w-4" />
          {result.code} applied — {result.discountText}
        </p>
      )}
      {result && !result.valid && result.error && (
        <p className="text-sm text-red-500 font-medium text-center">
          {result.error}
        </p>
      )}
    </div>
  );
}
