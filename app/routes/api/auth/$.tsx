import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createAuth } from "~/auth/server";
import type { AppEnv } from "~/auth/server";

export const APIRoute = createAPIFileRoute("/api/auth/$")({
  GET: async ({ request }) => {
    const env = (request as any).cloudflare?.env as AppEnv;
    const auth = createAuth(env);
    return auth.handler(request);
  },
  POST: async ({ request }) => {
    const env = (request as any).cloudflare?.env as AppEnv;
    const auth = createAuth(env);
    return auth.handler(request);
  },
});
