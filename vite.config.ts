import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

// mkcert is only for local HTTPS against Connect; production builds skip it.
export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [react()];
  const localHttps = command === "serve";

  if (localHttps) {
    const { default: mkcert } = await import("vite-plugin-mkcert");
    plugins.push(mkcert());
  }

  return {
    plugins,
    base: "./",
    server: {
      port: 5173,
      strictPort: true,
      cors: true,
      host: true,
      https: localHttps,
    },
  };
});
