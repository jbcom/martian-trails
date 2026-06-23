import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
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
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, "./src/lib"),
      $assets: path.resolve(__dirname, "./src/assets"),
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
