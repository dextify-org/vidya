import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = process.env.VIDYA_BACKEND_URL || "http://127.0.0.1:31415";
const backendProxy = () => ({
  target: backendTarget,
  changeOrigin: true,
  headers: {
    Origin: backendTarget,
  },
});

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "build",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": backendProxy(),
      "/assets": backendProxy(),
      "/isFirstStartUp": backendProxy(),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: "./src/test/setup.js",
    css: true,
  },
});
