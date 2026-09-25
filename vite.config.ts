import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Only src/ is bundled for the browser. lib/ and api/ are server-only.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" },
});
