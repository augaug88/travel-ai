import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Only src/ is bundled for the browser. lib/ and api/ are server-only.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" },
  server: {
    // AI Studio sets DISABLE_HMR=true while editing; keep file watching off then.
    hmr: process.env.DISABLE_HMR !== "true",
    watch: process.env.DISABLE_HMR === "true" ? null : {},
  },
});
