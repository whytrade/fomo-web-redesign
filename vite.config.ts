import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // the sample data is bundled into the preview
  build: { chunkSizeWarningLimit: 1600 },
  server: { port: 5174 },
});
