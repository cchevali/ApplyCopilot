import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sora)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular"],
      },
      colors: {
        ink: "#0f172a",
        fog: "#f8fafc",
        accent: "#0ea5e9",
        muted: "#64748b",
      },
    },
  },
  plugins: [],
};

export default config;
