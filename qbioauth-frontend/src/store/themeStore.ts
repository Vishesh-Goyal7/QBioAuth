import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "qbioauth_theme";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

function applyThemeClass(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

// Applied at module load (before the first render) rather than in an
// effect, so the app never flashes the wrong theme on startup.
const initialTheme = readInitialTheme();
applyThemeClass(initialTheme);

interface ThemeStoreState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  theme: initialTheme,
  toggleTheme: () =>
    set((state) => {
      const next: Theme = state.theme === "dark" ? "light" : "dark";
      applyThemeClass(next);
      window.localStorage.setItem(STORAGE_KEY, next);
      return { theme: next };
    }),
}));
