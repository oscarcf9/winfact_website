"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

type ReferralLinkCopyProps = {
  referralLink: string;
};

export function ReferralLinkCopy({ referralLink }: ReferralLinkCopyProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = referralLink;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex items-center gap-3 bg-bg-light rounded-xl border border-gray-200 p-4">
      <code className="flex-1 text-sm font-mono text-navy break-all select-all">
        {referralLink}
      </code>
      <button
        onClick={handleCopy}
        className={`flex-none inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
          copied
            ? "bg-success text-white"
            : "bg-primary text-white hover:bg-primary/90 active:scale-95"
        }`}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy
          </>
        )}
      </button>
    </div>
  );
}
