"use client";

import { useCallback, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { saveAs } from "file-saver";

export function useTicketExport() {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportToPng = useCallback(async () => {
    if (!ticketRef.current || isExporting) return;

    setIsExporting(true);
    try {
      // Use toBlob directly — avoids CSP connect-src issues with data: URIs
      const blob = await toBlob(ticketRef.current, {
        pixelRatio: 2,
        quality: 1.0,
        cacheBust: true,
      });

      if (blob) {
        const timestamp = Date.now();
        saveAs(blob, `ticket_${timestamp}.png`);
      }
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  return { ticketRef, exportToPng, isExporting };
}
