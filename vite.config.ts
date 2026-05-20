import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Multi-page app config — each entry point is a separate OBR extension page.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "src/background/background.html"),
        token_menu: resolve(__dirname, "src/tokenMenu/tokenMenu.html"),
        action: resolve(__dirname, "src/action/action.html"),
      },
    },
  },
  server: {
    cors: true,
  },
});
