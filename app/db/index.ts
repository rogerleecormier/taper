import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../drizzle/schema";

export type AppDB = ReturnType<typeof createDb>;

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
