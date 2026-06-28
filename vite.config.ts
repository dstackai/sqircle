import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
        demo: "demo.html",
        events: "events.html",
        constructor: "constructor.html",
        react: "react.html"
      }
    }
  }
});
