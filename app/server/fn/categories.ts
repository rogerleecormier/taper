import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, asc } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { categories } from "~/db/schema/categories";
import { DEFAULT_CATEGORIES } from "~/lib/default-categories";

const CategoryInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["expense", "income"]),
  color: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const getCategories = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ type: z.enum(["expense", "income"]).optional() }).optional())
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const where = data?.type
      ? and(eq(categories.userId, user.id), eq(categories.type, data.type))
      : eq(categories.userId, user.id);
    return db
      .select()
      .from(categories)
      .where(where)
      .orderBy(asc(categories.sortOrder), asc(categories.name))
      .all();
  });

export const createCategory = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(CategoryInputSchema)
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const now = new Date();
    const id = nanoid();
    await db.insert(categories).values({
      id,
      userId: user.id,
      name: data.name,
      type: data.type,
      color: data.color || null,
      icon: data.icon || null,
      sortOrder: data.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  });

export const updateCategory = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }).merge(CategoryInputSchema))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await db
      .update(categories)
      .set({
        name: data.name,
        type: data.type,
        color: data.color || null,
        icon: data.icon || null,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(and(eq(categories.id, data.id), eq(categories.userId, user.id)));
  });

export const deleteCategory = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await db
      .delete(categories)
      .where(
        and(eq(categories.id, data.id), eq(categories.userId, user.id))
      );
  });


export const seedDefaultCategories = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context;
    const now = new Date();

    const existing = await db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.userId, user.id))
      .all();
    const existingNames = new Set(existing.map((c) => c.name));

    const toInsert = DEFAULT_CATEGORIES.filter(
      (c) => !existingNames.has(c.name)
    );
    if (toInsert.length === 0) return { inserted: 0 };

    for (const c of toInsert) {
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

    return { inserted: toInsert.length };
  });
