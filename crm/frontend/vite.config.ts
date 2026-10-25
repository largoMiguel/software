import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  envDir: fileURLToPath(new URL("..", import.meta.url)),
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "crm-stylesheet-same-origin",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          return html.replace(
            /<link rel="stylesheet" crossorigin href="([^"]+)"\s*\/?>/g,
            '<link rel="stylesheet" href="$1" />',
          );
        },
      },
    },
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
  },
});
