"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function useAdminTheme() {
  return useContext(ThemeContext);
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("admin-theme") as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("admin-theme", next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div className={theme === "dark" ? "admin-dark" : "admin-light"}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function AdminThemeToggle() {
  const { theme, toggle } = useAdminTheme();

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors cursor-pointer admin-theme-toggle"
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-3.5 w-3.5" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
