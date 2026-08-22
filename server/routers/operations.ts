import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { auditEvents, categories, menuItems, notifications, orderStatusHistory, orders, restaurantSettings, riderAssignments, riderProfiles, users } from "../../drizzle/schema";
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS, ORDER_STATUSES } from "../../shared/restaurant";
import { requireOperationsRole, requireRole } from "../guards";
import { getDb } from "../db";
import { ensureRestaurantSeed } from "../seed";
import { uploadCloudinaryImage } from "../cloudinary";
import { protectedProcedure, router } from "../_core/trpc";

async function requiredDb() { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); return db; }
const orderStatus = z.enum(ORDER_STATUSES);

async function changeStatus(input: { orderId: number; status: z.infer<typeof orderStatus>; note?: string }, actorUserId: number) {
  const db = await requiredDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
  if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
  if (!ORDER_TRANSITIONS[order.status].includes(input.status)) throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot move from ${ORDER_STATUS_LABELS[order.status]} to ${ORDER_STATUS_LABELS[input.status]}.` });
  await db.update(orders).set({ status: input.status }).where(eq(orders.id, order.id));
  await db.insert(orderStatusHistory).values({ orderId: order.id, status: input.status, note: input.note || null, actorUserId });
  await db.insert(notifications).values({ userId: order.userId, type: "order_status", title: "Your order has moved", body: `${order.orderNo}: ${ORDER_STATUS_LABELS[input.status]}.`, orderId: order.id });
  await db.insert(auditEvents).values({ actorUserId, action: "order.status_updated", resourceType: "order", resourceId: String(order.id), metadata: { from: order.status, to: input.status } });
  return { success: true, status: input.status };
}

export const operationsRouter = router({
  admin: router({
    overview: protectedProcedure.query(async ({ ctx }) => {
      requireOperationsRole(ctx); const db = await requiredDb();
      const [recentOrders, menuCount, categoryCount, customerCount] = await Promise.all([
        db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
        db.select({ count: sql<number>`count(*)` }).from(menuItems), db.select({ count: sql<number>`count(*)` }).from(categories), db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "customer")),
      ]);
      const sales = recentOrders.filter(order => order.paymentStatus === "paid" || order.paymentMethod === "cod").reduce((sum, order) => sum + order.grandTotalPaise, 0);
      return { recentOrders, metrics: { menuCount: Number(menuCount[0]?.count ?? 0), categoryCount: Number(categoryCount[0]?.count ?? 0), customerCount: Number(customerCount[0]?.count ?? 0), recentSalesPaise: sales } };
    }),
    orders: protectedProcedure.query(async ({ ctx }) => { requireOperationsRole(ctx); return (await requiredDb()).select().from(orders).orderBy(desc(orders.createdAt)).limit(100); }),
    customers: protectedProcedure.query(async ({ ctx }) => { requireOperationsRole(ctx); return (await requiredDb()).select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.role, "customer")).orderBy(desc(users.createdAt)).limit(100); }),
    updateStatus: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), status: orderStatus, note: z.string().trim().max(500).optional() })).mutation(({ ctx, input }) => { requireOperationsRole(ctx); return changeStatus(input, ctx.user.id); }),
    assignRider: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), riderUserId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireOperationsRole(ctx); const db = await requiredDb();
      const [rider] = await db.select().from(users).where(and(eq(users.id, input.riderUserId), eq(users.role, "rider"))).limit(1);
      if (!rider) throw new TRPCError({ code: "NOT_FOUND", message: "Rider not found." });
      const [existing] = await db.select().from(riderAssignments).where(eq(riderAssignments.orderId, input.orderId)).limit(1);
      if (existing) await db.update(riderAssignments).set({ riderUserId: rider.id, assignedByUserId: ctx.user.id }).where(eq(riderAssignments.id, existing.id));
      else await db.insert(riderAssignments).values({ orderId: input.orderId, riderUserId: rider.id, assignedByUserId: ctx.user.id });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (order && order.status === "ready_for_pickup") await changeStatus({ orderId: order.id, status: "rider_assigned", note: "A delivery rider has been assigned." }, ctx.user.id);
      await db.insert(notifications).values({ userId: rider.id, type: "delivery_assignment", title: "New delivery assignment", body: "A delivery is ready for your review.", orderId: input.orderId });
      return { success: true };
    }),
    menu: router({
      save: protectedProcedure.input(z.object({ id: z.number().int().positive().optional(), categoryId: z.number().int().positive(), name: z.string().trim().min(2).max(180), slug: z.string().trim().min(2).max(220), description: z.string().trim().max(1200).optional(), pricePaise: z.number().int().min(0), imageUrl: z.string().trim().max(2000).nullable().optional(), isVegetarian: z.boolean(), isFeatured: z.boolean(), isAvailable: z.boolean(), customisation: z.unknown().default([]) })).mutation(async ({ ctx, input }) => {
        requireOperationsRole(ctx); const db = await requiredDb(); const { id, ...values } = input;
        if (id) await db.update(menuItems).set(values).where(eq(menuItems.id, id)); else await db.insert(menuItems).values(values);
        return { success: true };
      }),
    }),
    categories: router({
      save: protectedProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(120), slug: z.string().trim().min(2).max(160), description: z.string().trim().max(1200).nullable().optional(), imageUrl: z.string().trim().max(2000).nullable().optional(), sortOrder: z.number().int().min(0).max(10000), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
        requireOperationsRole(ctx); const db = await requiredDb(); const { id, ...values } = input;
        if (id) await db.update(categories).set(values).where(eq(categories.id, id)); else await db.insert(categories).values(values);
        return { success: true };
      }),
    }),
    settings: router({
      get: protectedProcedure.query(async ({ ctx }) => { requireOperationsRole(ctx); const [settings] = await (await requiredDb()).select().from(restaurantSettings).limit(1); return settings ?? null; }),
      save: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(160), formattedAddress: z.string().trim().min(4).max(1000), city: z.string().trim().max(120).nullable().optional(), state: z.string().trim().max(120).nullable().optional(), country: z.string().trim().max(120).nullable().optional(), pincode: z.string().trim().max(20).nullable().optional(), phone: z.string().trim().max(30).nullable().optional(), email: z.string().email().max(320).nullable().optional(), heroHeading: z.string().trim().max(500).nullable().optional(), heroSubtitle: z.string().trim().max(1200).nullable().optional(), heroImageUrl: z.string().trim().max(2000).nullable().optional(), aboutText: z.string().trim().max(3000).nullable().optional(), logoUrl: z.string().trim().max(2000).nullable().optional() })).mutation(async ({ ctx, input }) => { requireOperationsRole(ctx); const db = await requiredDb(); const [existing] = await db.select().from(restaurantSettings).limit(1); if (existing) await db.update(restaurantSettings).set(input).where(eq(restaurantSettings.id, existing.id)); else await db.insert(restaurantSettings).values(input); return { success: true }; }),
    }),
    seedCatalog: protectedProcedure.mutation(async ({ ctx }) => { requireRole(ctx, ["admin"]); return { seeded: await ensureRestaurantSeed() }; }),
    media: router({
      uploadImage: protectedProcedure.input(z.object({ dataUrl: z.string().max(8_000_000), folder: z.enum(["restaurant", "menu", "categories"]) })).mutation(async ({ ctx, input }) => {
        requireRole(ctx, ["admin"]);
        const uploaded = await uploadCloudinaryImage({ dataUrl: input.dataUrl, folder: `mithilanchal-dhaba/${input.folder}` });
        await (await requiredDb()).insert(auditEvents).values({ actorUserId: ctx.user.id, action: "media.uploaded", resourceType: "cloudinary", resourceId: uploaded.publicId || uploaded.url, metadata: { folder: input.folder } });
        return uploaded;
      }),
    }),
  }),
  rider: router({
    tasks: protectedProcedure.query(async ({ ctx }) => {
      requireRole(ctx, ["rider"]); const db = await requiredDb();
      return db.select({ assignment: riderAssignments, order: orders }).from(riderAssignments).innerJoin(orders, eq(riderAssignments.orderId, orders.id)).where(and(eq(riderAssignments.riderUserId, ctx.user.id), inArray(orders.status, ["rider_assigned", "out_for_delivery"]))).orderBy(desc(riderAssignments.assignedAt));
    }),
    updateLocation: protectedProcedure.input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx, ["rider"]); const db = await requiredDb(); const values = { userId: ctx.user.id, displayName: ctx.user.name || "Rider", lastLatitude: String(input.latitude), lastLongitude: String(input.longitude), lastLocationAt: new Date() };
      const [profile] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, ctx.user.id)).limit(1);
      if (profile) await db.update(riderProfiles).set(values).where(eq(riderProfiles.id, profile.id)); else await db.insert(riderProfiles).values(values);
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), status: z.enum(["out_for_delivery", "delivered"]), note: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx, ["rider"]); const db = await requiredDb(); const [assignment] = await db.select().from(riderAssignments).where(and(eq(riderAssignments.orderId, input.orderId), eq(riderAssignments.riderUserId, ctx.user.id))).limit(1);
      if (!assignment) throw new TRPCError({ code: "FORBIDDEN", message: "This delivery is not assigned to you." });
      const result = await changeStatus(input, ctx.user.id);
      if (input.status === "out_for_delivery") await db.update(riderAssignments).set({ pickedUpAt: new Date() }).where(eq(riderAssignments.id, assignment.id));
      if (input.status === "delivered") await db.update(riderAssignments).set({ deliveredAt: new Date() }).where(eq(riderAssignments.id, assignment.id));
      return result;
    }),
  }),
});
