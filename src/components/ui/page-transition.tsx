"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
};

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in on mount/route change
    const raf = requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => {
      cancelAnimationFrame(raf);
      setVisible(false);
    };
  }, [pathname]);

  return (
    <div
      className={`transition-opacity duration-300 ease-out ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {children}
    </div>
  );
}
