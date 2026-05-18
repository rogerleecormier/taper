import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createAuth } from "~/auth/server";
import type { AppEnv } from "~/auth/server";

const startHandler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request, env: AppEnv, ctx: unknown) {
    // Make env available to server functions via getEnv()
    (globalThis as any).__env__ = env;

    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/auth")) {
      const auth = createAuth(env);
      return auth.handler(request);
    }

    return startHandler(request, env);
  },
};
