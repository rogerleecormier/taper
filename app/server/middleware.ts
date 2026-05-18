import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
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
  const request = getRequest();
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

// Server function for SSR-safe session checking in beforeLoad.
// Works both during SSR (reads cookies from the incoming request) and
// during client-side navigation (makes an RPC call that forwards cookies).
export const getSession = createServerFn().handler(async () => {
  const env = getEnv();
  const auth = createAuth(env);
  const request = getRequest();
  return auth.api.getSession({ headers: request.headers });
});

export { getEnv };
