import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 🚀 Solución correcta para Vite + import.meta.env
export default defineConfig({
  server: {
    port: 3000,        // Puedes cambiarlo a 5173 si prefieres
    host: "0.0.0.0",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});