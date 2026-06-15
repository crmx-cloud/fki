import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  // Honor the harness-assigned port (PORT env) so the preview tool's
  // readiness check finds the server; fall back to 5173 and auto-increment
  // if taken (e.g. by the unrelated guy-server.js squatting on 5173).
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
  },
});
