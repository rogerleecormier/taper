import { defineConfig } from "@tanstack/react-start/config";

export default defineConfig({
  server: {
    preset: "cloudflare-workers",
    experimental: { asyncContext: true },
  },
  routers: {
    api: { entry: "./app/api.ts" },
    ssr: { entry: "./app/ssr.tsx" },
    client: { entry: "./app/client.tsx" },
  },
});
