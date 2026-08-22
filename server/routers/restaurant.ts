import { and, asc, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { categories, menuItems, restaurantSettings } from "../../drizzle/schema";
import { DEFAULT_RESTAURANT_SEED } from "../../shared/restaurant";
import { getDb } from "../db";
import { ensureRestaurantSeed } from "../seed";
import { publicProcedure, router } from "../_core/trpc";

export const restaurantRouter = router({
  bootstrap: publicProcedure.mutation(async () => ({ seeded: await ensureRestaurantSeed() })),
  settings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return DEFAULT_RESTAURANT_SEED;
    const [settings] = await db.select().from(restaurantSettings).limit(1);
    return settings ?? DEFAULT_RESTAURANT_SEED;
  }),
  categories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder));
  }),
  menu: publicProcedure.input(z.object({ category: z.string().optional(), search: z.string().trim().max(80).optional(), featured: z.boolean().optional() }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const predicates = [eq(menuItems.isAvailable, true)];
    if (input?.category) {
      const [category] = await db.select().from(categories).where(eq(categories.slug, input.category)).limit(1);
      if (!category) return [];
      predicates.push(eq(menuItems.categoryId, category.id));
    }
    if (input?.featured) predicates.push(eq(menuItems.isFeatured, true));
    if (input?.search) {
      const term = `%${input.search}%`;
      predicates.push(or(like(menuItems.name, term), like(menuItems.description, term))!);
    }
    return db.select({ item: menuItems, category: categories }).from(menuItems).innerJoin(categories, eq(menuItems.categoryId, categories.id)).where(and(...predicates)).orderBy(desc(menuItems.isFeatured), asc(menuItems.name));
  }),
  itemBySlug: publicProcedure.input(z.object({ slug: z.string().min(1).max(220) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;
    const [result] = await db.select({ item: menuItems, category: categories }).from(menuItems).innerJoin(categories, eq(menuItems.categoryId, categories.id)).where(and(eq(menuItems.slug, input.slug), eq(menuItems.isAvailable, true))).limit(1);
    return result ?? null;
  }),
});

