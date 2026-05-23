import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { nanoid } from "nanoid";
import { createDb } from "~/db";
import { categories } from "~/db/schema/categories";
import { DEFAULT_CATEGORIES } from "~/lib/default-categories";
import * as schema from "../../drizzle/schema";

export type AppEnv = {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AI: Ai;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

export function createAuth(env: AppEnv) {
  const db = createDb(env.DB);
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [
      "https://taper.rcormier.dev",
      "https://taper.rcormier.workers.dev",
    ],
    emailAndPassword: { enabled: true },
    plugins: [
      admin({
        defaultRole: "user",
        adminRole: "admin",
      }),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email") {
          throw new APIError("FORBIDDEN", {
            message: "Signups are disabled. Contact an administrator.",
          });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const now = new Date();
            for (const c of DEFAULT_CATEGORIES) {
              await db.insert(categories).values({
                id: nanoid(),
                userId: user.id,
                name: c.name,
                type: c.type,
                color: c.color,
                icon: c.icon,
                sortOrder: c.sortOrder,
                createdAt: now,
                updatedAt: now,
              });
            }
          },
        },
      },
    },
  });
}
