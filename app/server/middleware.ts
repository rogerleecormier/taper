import { createMiddleware } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { createAuth, type AppEnv } from "~/auth/server";
import { createDb } from "~/db";

declare module "@tanstack/react-start" {
  interface Middleware {
    context: {
      user: { id: string; name: string; email: string };
      db: ReturnType<typeof createDb>;
      env: AppEnv;
    };
  }
}

function getEnv(): AppEnv {
  // In Cloudflare Workers, env is injected via the module context
  // During dev with wrangler, this is available on globalThis
  return (globalThis as unknown as { __env__: AppEnv }).__env__;
}

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const env = getEnv();
  const auth = createAuth(env);
  const request = getWebRequest();
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const db = createDb(env.DB);

  return next({
    context: {
      user: session.user as { id: string; name: string; email: string },
      db,
      env,
    },
  });
});

export { getEnv };
