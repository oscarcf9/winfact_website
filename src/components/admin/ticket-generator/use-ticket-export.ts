"use client";

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { saveAs } from "file-saver";

export function useTicketExport() {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportToPng = useCallback(async () => {
    if (!ticketRef.current || isExporting) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(ticketRef.current, {
        pixelRatio: 2,
        quality: 1.0,
        cacheBust: true,
        style: {
          transform: "none",
        },
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const timestamp = Date.now();
      saveAs(blob, `ticket_${timestamp}.png`);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  return { ticketRef, exportToPng, isExporting };
}
