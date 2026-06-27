import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    lib: {
      entry: "src/squircle/index.ts",
      formats: ["es"],
      fileName: () => "sqircle.js",
      cssFileName: "style"
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "react-dom"],
      output: {
        assetFileNames: (assetInfo) => (assetInfo.name === "style.css" ? "style.css" : "[name][extname]")
      }
    },
    sourcemap: true
  }
});
