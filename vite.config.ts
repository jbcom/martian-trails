import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The same bundle must serve from three origins:
//  - GitHub Pages under a repo subpath (/martian-trails/)
//  - Capacitor's file:// origin on-device (relative paths)
//  - a local dev/preview server at root (/)
const isCapacitor = process.env.CAPACITOR === "true";
const isPages = process.env.GITHUB_PAGES === "true";
const resolveBase = () => {
  if (isCapacitor) return "./";
  if (isPages) return "/martian-trails/";
  return "/";
};

export default defineConfig({
  base: resolveBase(),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
  },
});
