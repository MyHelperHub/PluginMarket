import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-mhplugin-json",
      writeBundle() {
        if (!fs.existsSync("dist")) {
          fs.mkdirSync("dist");
        }
        fs.copyFileSync("mhPlugin.json", "dist/mhPlugin.json");
      },
    },
  ],
  base: "./",
  server: {
    port: 1421,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
    dedupe: ["react"],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      input: {
        main: "index.html",
      },
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react")) {
              return "vendor-react";
            }
            return "vendor";
          }
        },
      },
    },
    minify: "esbuild",
    target: "esnext",
  },
});
