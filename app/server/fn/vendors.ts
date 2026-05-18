import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, asc } from "drizzle-orm";
import { authMiddleware } from "~/server/middleware";
import { vendors } from "~/db/schema/vendors";

const VendorInputSchema = z.object({
  name: z.string().min(1).max(100),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export const getVendors = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { db, user } = context;
    return db
      .select()
      .from(vendors)
      .where(eq(vendors.userId, user.id))
      .orderBy(asc(vendors.name))
      .all();
  });

export const getVendor = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const rows = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.id, data.id), eq(vendors.userId, user.id)))
      .all();
    return rows[0] ?? null;
  });

export const createVendor = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(VendorInputSchema)
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    const now = new Date();
    const id = nanoid();
    await db.insert(vendors).values({
      id,
      userId: user.id,
      name: data.name,
      website: data.website || null,
      phone: data.phone || null,
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  });

export const updateVendor = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }).merge(VendorInputSchema))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await db
      .update(vendors)
      .set({
        name: data.name,
        website: data.website || null,
        phone: data.phone || null,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(and(eq(vendors.id, data.id), eq(vendors.userId, user.id)));
  });

export const deleteVendor = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const { db, user } = context;
    await db
      .delete(vendors)
      .where(and(eq(vendors.id, data.id), eq(vendors.userId, user.id)));
  });
