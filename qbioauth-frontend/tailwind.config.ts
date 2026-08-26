import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Backed by CSS variables (see index.css) so these follow the
        // .dark class automatically without every usage needing a dark:
        // variant of its own.
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        panelborder: "rgb(var(--color-panelborder) / <alpha-value>)",
        appbg: "rgb(var(--color-appbg) / <alpha-value>)",
        diagrambg: "rgb(var(--color-diagrambg) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};

export default config;
