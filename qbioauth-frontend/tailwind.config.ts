import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#111827",
        panelborder: "#1f2937",
      },
    },
  },
  plugins: [],
};

export default config;
