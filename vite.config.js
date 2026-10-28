import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const parseAllowedHosts = (value) =>
  value
    ?.split(",")
    .map((host) => host.trim())
    .filter(Boolean);

const backendProxy = (backendTarget) => ({
  target: backendTarget,
  changeOrigin: true,
  headers: {
    Origin: backendTarget,
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VIDYA_");
  const backendTarget = env.VIDYA_BACKEND_URL || "http://127.0.0.1:31415";

  return {
    plugins: [react()],
    build: {
      outDir: "build",
      emptyOutDir: true,
    },
    server: {
      host: "127.0.0.1",
      allowedHosts: parseAllowedHosts(env.VIDYA_ALLOWED_HOSTS),
      proxy: {
        "/api": backendProxy(backendTarget),
        "/assets": backendProxy(backendTarget),
        "/isFirstStartUp": backendProxy(backendTarget),
      },
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{js,jsx}"],
      setupFiles: "./src/test/setup.js",
      css: true,
    },
  };
});
