"use client";

import { useCallback, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { saveAs } from "file-saver";

export function useTicketExport() {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportingRef = useRef(false);

  const exportToPng = useCallback(async () => {
    if (!ticketRef.current || exportingRef.current) return;

    exportingRef.current = true;
    setIsExporting(true);
    try {
      // Wait for all fonts to be loaded before capturing
      await document.fonts.ready;

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
      exportingRef.current = false;
      setIsExporting(false);
    }
  }, []);

  return { ticketRef, exportToPng, isExporting };
}
