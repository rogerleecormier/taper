import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, asc } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { categories } from "~/db/schema/categories";

const CategoryInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["expense", "income"]),
  color: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const getCategories = createServerFn()
  .middleware([authMiddleware])
  .validator(z.object({ type: z.enum(["expense", "income"]).optional() }).optional())
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const base = db
      .select()
      .from(categories)
      .where(eq(categories.userId, user.id))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
    return base.all();
  });

export const createCategory = createServerFn()
  .middleware([authMiddleware])
  .validator(CategoryInputSchema)
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
  .validator(z.object({ id: z.string() }).merge(CategoryInputSchema))
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
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await db
      .delete(categories)
      .where(
        and(eq(categories.id, data.id), eq(categories.userId, user.id))
      );
  });
