import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { auditEvents, categories, menuItems, notifications, orderItems, orderStatusHistory, orders, restaurantSettings, riderAssignments, riderProfiles, users } from "../../drizzle/schema";
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS, ORDER_STATUSES } from "../../shared/restaurant";
import { requireOperationsRole, requireRole } from "../guards";
import { getDb } from "../db";
import { ensureRestaurantSeed } from "../seed";
import { cloudinaryPublicIdFromUrl, destroyCloudinaryImage, uploadCloudinaryImage } from "../cloudinary";
import { hashPassword } from "../passwordAuth";
import { localOpenId } from "../passwordAuth";
import { hasPersistedMediaReference } from "../mediaSafety";
import { protectedProcedure, router } from "../_core/trpc";
import { ACTIVE_DELIVERY_STATUSES, canReadDeliveryTracking, isActiveDeliveryStatus, parseTrackingCoordinates } from "../trackingPolicy";

async function requiredDb() { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." }); return db; }
const orderStatus = z.enum(ORDER_STATUSES);
const coordinateInput = z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) });

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
    riders: protectedProcedure.query(async ({ ctx }) => { requireOperationsRole(ctx); return (await requiredDb()).select({ id: users.id, name: users.name, email: users.email, phone: users.phone, createdAt: users.createdAt }).from(users).where(eq(users.role, "rider")).orderBy(desc(users.createdAt)).limit(100); }),
    provisionRider: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(320), phone: z.string().trim().min(7).max(30), password: z.string().min(12).max(200) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx, ["admin"]); const db = await requiredDb(); const email = input.email.toLowerCase(); const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      try {
        const passwordHash = await hashPassword(input.password); const openId = localOpenId(email);
        const riderUserId = await db.transaction(async tx => {
          await tx.insert(users).values({ openId, name: input.name, email, phone: input.phone, role: "rider", passwordHash, loginMethod: "password", isActive: true });
          const [created] = await tx.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
          if (!created) throw new Error("Created rider account could not be resolved.");
          await tx.insert(riderProfiles).values({ userId: created.id, displayName: input.name, phone: input.phone });
          await tx.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "rider.provisioned", resourceType: "user", resourceId: String(created.id), metadata: { email } });
          return created.id;
        });
        return { success: true, riderUserId };
      } catch (error) {
        console.error("[Rider provisioning]", { message: error instanceof Error ? error.message : "Unknown failure", code: (error as { code?: string } | undefined)?.code });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Rider account could not be created. Please try again." });
      }
    }),
    resetRiderPassword: protectedProcedure.input(z.object({ riderUserId: z.number().int().positive(), password: z.string().min(12).max(200) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx, ["admin"]);
      const db = await requiredDb();
      const [rider] = await db.select({ id: users.id, role: users.role }).from(users).where(and(eq(users.id, input.riderUserId), eq(users.role, "rider"))).limit(1);
      if (!rider) throw new TRPCError({ code: "NOT_FOUND", message: "Rider account not found." });
      const passwordHash = await hashPassword(input.password);
      await db.transaction(async tx => {
        await tx.update(users).set({ passwordHash, loginMethod: "password", isActive: true }).where(eq(users.id, rider.id));
        await tx.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "rider.password_reset", resourceType: "user", resourceId: String(rider.id), metadata: { targetRole: "rider" } });
      });
      return { success: true } as const;
    }),
    resetCustomerPassword: protectedProcedure.input(z.object({ customerUserId: z.number().int().positive(), password: z.string().min(12).max(200) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx, ["admin"]);
      try {
        const db = await requiredDb();
        const [customer] = await db.select({ id: users.id, role: users.role }).from(users).where(and(eq(users.id, input.customerUserId), eq(users.role, "customer"))).limit(1);
        if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer account not found." });
        const passwordHash = await hashPassword(input.password);
        await db.transaction(async tx => {
          await tx.update(users).set({ passwordHash, loginMethod: "password", isActive: true }).where(eq(users.id, customer.id));
          await tx.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "customer.password_reset", resourceType: "user", resourceId: String(customer.id), metadata: { targetRole: "customer" } });
        });
        return { success: true } as const;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Customer password reset]", {
          message: error instanceof Error ? error.message : "Unknown failure",
          code: (error as { code?: string } | undefined)?.code,
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Customer password could not be reset. Please try again." });
      }
    }),
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
      archive: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { requireOperationsRole(ctx); await (await requiredDb()).update(menuItems).set({ isAvailable: false, isFeatured: false }).where(eq(menuItems.id, input.id)); return { success: true }; }),
    }),
    categories: router({
      save: protectedProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(120), slug: z.string().trim().min(2).max(160), description: z.string().trim().max(1200).nullable().optional(), imageUrl: z.string().trim().max(2000).nullable().optional(), sortOrder: z.number().int().min(0).max(10000), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
        requireOperationsRole(ctx); const db = await requiredDb(); const { id, ...values } = input;
        if (id) await db.update(categories).set(values).where(eq(categories.id, id)); else await db.insert(categories).values(values);
        return { success: true };
      }),
      archive: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { requireOperationsRole(ctx); await (await requiredDb()).update(categories).set({ isActive: false }).where(eq(categories.id, input.id)); return { success: true }; }),
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
      deleteImage: protectedProcedure.input(z.object({ publicId: z.string().trim().min(1).max(512).optional(), url: z.string().url().max(2000) })).mutation(async ({ ctx, input }) => {
        requireRole(ctx, ["admin"]);
        const publicId = input.publicId || cloudinaryPublicIdFromUrl(input.url);
        if (!publicId?.startsWith("mithilanchal-dhaba/")) throw new TRPCError({ code: "FORBIDDEN", message: "Only Mithilanchal Dhaba media can be deleted." });
        const db = await requiredDb(); const [settings] = await db.select({ logoUrl: restaurantSettings.logoUrl, heroImageUrl: restaurantSettings.heroImageUrl }).from(restaurantSettings).limit(1);
        const [categoryReference, menuReference, historicalOrderReference] = await Promise.all([
          db.select({ id: categories.id }).from(categories).where(eq(categories.imageUrl, input.url)).limit(1),
          db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.imageUrl, input.url)).limit(1),
          db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.imageUrlSnapshot, input.url)).limit(1),
        ]);
        if (hasPersistedMediaReference({ targetUrl: input.url, settingsUrls: [settings?.logoUrl, settings?.heroImageUrl], categoryReferenced: Boolean(categoryReference[0]), menuReferenced: Boolean(menuReference[0]), orderSnapshotReferenced: Boolean(historicalOrderReference[0]) })) throw new TRPCError({ code: "CONFLICT", message: "This image is still used by restaurant content or order history and cannot be deleted." });
        await destroyCloudinaryImage(publicId);
        await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "media.deleted", resourceType: "cloudinary", resourceId: publicId, metadata: { url: input.url } });
        return { success: true };
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
    updateTrackingLocation: protectedProcedure.input(coordinateInput.extend({ orderId: z.number().int().positive(), locationConsent: z.literal(true) })).mutation(async ({ ctx, input }) => {
      requireRole(ctx, ["rider"]); const db = await requiredDb();
      const [assignment] = await db.select({ assignment: riderAssignments, order: orders }).from(riderAssignments).innerJoin(orders, eq(riderAssignments.orderId, orders.id)).where(and(eq(riderAssignments.orderId, input.orderId), eq(riderAssignments.riderUserId, ctx.user.id), inArray(orders.status, [...ACTIVE_DELIVERY_STATUSES]))).limit(1);
      if (!assignment) throw new TRPCError({ code: "FORBIDDEN", message: "Live tracking is available only for your active delivery." });
      const now = new Date();
      await db.transaction(async tx => {
        await tx.update(riderAssignments).set({ lastLatitude: String(input.latitude), lastLongitude: String(input.longitude), lastLocationAt: now, trackingConsentAt: assignment.assignment.trackingConsentAt ?? now, trackingStoppedAt: null }).where(eq(riderAssignments.id, assignment.assignment.id));
        const values = { userId: ctx.user.id, displayName: ctx.user.name || "Rider", lastLatitude: String(input.latitude), lastLongitude: String(input.longitude), lastLocationAt: now };
        const [profile] = await tx.select().from(riderProfiles).where(eq(riderProfiles.userId, ctx.user.id)).limit(1);
        if (profile) await tx.update(riderProfiles).set(values).where(eq(riderProfiles.id, profile.id)); else await tx.insert(riderProfiles).values(values);
      });
      return { success: true, locationUpdatedAt: now };
    }),
    stopTracking: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx, ["rider"]); const db = await requiredDb();
      const [assignment] = await db.select().from(riderAssignments).where(and(eq(riderAssignments.orderId, input.orderId), eq(riderAssignments.riderUserId, ctx.user.id))).limit(1);
      if (!assignment) throw new TRPCError({ code: "FORBIDDEN", message: "This delivery is not assigned to you." });
      await db.update(riderAssignments).set({ trackingStoppedAt: new Date() }).where(eq(riderAssignments.id, assignment.id));
      return { success: true };
    }),
    updateStatus: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), status: z.enum(["out_for_delivery", "delivered"]), note: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      requireRole(ctx, ["rider"]); const db = await requiredDb(); const [assignment] = await db.select().from(riderAssignments).where(and(eq(riderAssignments.orderId, input.orderId), eq(riderAssignments.riderUserId, ctx.user.id))).limit(1);
      if (!assignment) throw new TRPCError({ code: "FORBIDDEN", message: "This delivery is not assigned to you." });
      const result = await changeStatus(input, ctx.user.id);
      if (input.status === "out_for_delivery") await db.update(riderAssignments).set({ pickedUpAt: new Date() }).where(eq(riderAssignments.id, assignment.id));
      if (input.status === "delivered") await db.update(riderAssignments).set({ deliveredAt: new Date(), trackingStoppedAt: new Date() }).where(eq(riderAssignments.id, assignment.id));
      return result;
    }),
  }),
  tracking: router({
    current: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await requiredDb();
      const [record] = await db.select({ order: orders, assignment: riderAssignments }).from(orders).leftJoin(riderAssignments, eq(riderAssignments.orderId, orders.id)).where(eq(orders.id, input.orderId)).limit(1);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      if (!canReadDeliveryTracking({ orderUserId: record.order.userId, riderUserId: record.assignment?.riderUserId, requesterUserId: ctx.user.id, requesterRole: ctx.user.role })) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this delivery location." });
      const isActive = isActiveDeliveryStatus(record.order.status);
      const riderLatitude = Number(record.assignment?.lastLatitude);
      const riderLongitude = Number(record.assignment?.lastLongitude);
      const riderLocation = isActive && record.assignment?.trackingConsentAt && !record.assignment.trackingStoppedAt && Number.isFinite(riderLatitude) && Number.isFinite(riderLongitude) ? { latitude: riderLatitude, longitude: riderLongitude, updatedAt: record.assignment.lastLocationAt } : null;
      return { orderId: record.order.id, orderNo: record.order.orderNo, status: record.order.status, destination: parseTrackingCoordinates(record.order.deliveryAddressSnapshot), riderLocation };
    }),
  }),
});
