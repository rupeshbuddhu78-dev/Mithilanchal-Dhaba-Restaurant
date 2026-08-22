import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { addresses, cartItems, carts, menuItems, notifications, orderItems, orders, orderStatusHistory, users } from "../../drizzle/schema";
import { ORDER_STATUS_LABELS } from "../../shared/restaurant";
import { calculateOptionDelta, calculateOrderTotals, type SelectedOption } from "../checkout";
import { getDb } from "../db";
import { getStripeClient } from "../stripe";
import { notifyOwner } from "../_core/notification";
import { buildCheckoutMetadata } from "../payment";
import { protectedProcedure, router } from "../_core/trpc";

const selectedOptions = z.array(z.object({ groupId: z.string().min(1).max(64), choiceId: z.string().min(1).max(64) })).max(12);
const addressInput = z.object({ label: z.string().trim().min(1).max(80), recipientName: z.string().trim().min(1).max(160), phone: z.string().trim().min(6).max(30), line1: z.string().trim().min(4).max(500), line2: z.string().trim().max(500).optional(), city: z.string().trim().min(2).max(120), state: z.string().trim().min(2).max(120), pincode: z.string().trim().min(3).max(20), deliveryInstructions: z.string().trim().max(500).optional(), isDefault: z.boolean().optional() });

async function requiredDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable. Please try again." });
  return db;
}

async function getOrCreateCart(userId: number) {
  const db = await requiredDb();
  const [existing] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  if (existing) return { db, cart: existing };
  await db.insert(carts).values({ userId });
  const [cart] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  if (!cart) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create cart." });
  return { db, cart };
}

async function listCart(userId: number) {
  const { db, cart } = await getOrCreateCart(userId);
  const lines = await db.select({ line: cartItems, item: menuItems }).from(cartItems).innerJoin(menuItems, eq(cartItems.menuItemId, menuItems.id)).where(eq(cartItems.cartId, cart.id));
  const calculated = lines.map(({ line, item }) => {
    const unitPricePaise = item.pricePaise + calculateOptionDelta(item.customisation, (line.selectedOptions as SelectedOption[]) ?? []);
    return { ...line, item, unitPricePaise, lineTotalPaise: unitPricePaise * line.quantity };
  });
  return { cartId: cart.id, lines: calculated, totals: calculateOrderTotals(calculated.map(line => ({ quantity: line.quantity, unitPricePaise: line.unitPricePaise }))) };
}

export const commerceRouter = router({
  cart: router({
    get: protectedProcedure.query(({ ctx }) => listCart(ctx.user.id)),
    add: protectedProcedure.input(z.object({ menuItemId: z.number().int().positive(), quantity: z.number().int().min(1).max(20).default(1), selectedOptions: selectedOptions.default([]) })).mutation(async ({ ctx, input }) => {
      const { db, cart } = await getOrCreateCart(ctx.user.id);
      const [item] = await db.select().from(menuItems).where(and(eq(menuItems.id, input.menuItemId), eq(menuItems.isAvailable, true))).limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "This menu item is unavailable." });
      calculateOptionDelta(item.customisation, input.selectedOptions);
      const signature = JSON.stringify(input.selectedOptions);
      const existing = (await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.menuItemId, item.id)))).find(line => JSON.stringify(line.selectedOptions) === signature);
      if (existing) await db.update(cartItems).set({ quantity: existing.quantity + input.quantity }).where(eq(cartItems.id, existing.id));
      else await db.insert(cartItems).values({ cartId: cart.id, menuItemId: item.id, quantity: input.quantity, selectedOptions: input.selectedOptions });
      return listCart(ctx.user.id);
    }),
    setQuantity: protectedProcedure.input(z.object({ cartItemId: z.number().int().positive(), quantity: z.number().int().min(0).max(20) })).mutation(async ({ ctx, input }) => {
      const { db, cart } = await getOrCreateCart(ctx.user.id);
      const [line] = await db.select().from(cartItems).where(and(eq(cartItems.id, input.cartItemId), eq(cartItems.cartId, cart.id))).limit(1);
      if (!line) throw new TRPCError({ code: "NOT_FOUND", message: "Cart line not found." });
      if (input.quantity === 0) await db.delete(cartItems).where(eq(cartItems.id, line.id));
      else await db.update(cartItems).set({ quantity: input.quantity }).where(eq(cartItems.id, line.id));
      return listCart(ctx.user.id);
    }),
  }),
  addresses: router({
    list: protectedProcedure.query(async ({ ctx }) => (await requiredDb()).select().from(addresses).where(eq(addresses.userId, ctx.user.id)).orderBy(desc(addresses.isDefault), desc(addresses.updatedAt))),
    save: protectedProcedure.input(addressInput.extend({ id: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      const db = await requiredDb();
      if (input.isDefault) await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, ctx.user.id));
      const values = { ...input, userId: ctx.user.id, line2: input.line2 || null, deliveryInstructions: input.deliveryInstructions || null, isDefault: input.isDefault ?? false };
      if (input.id !== undefined) {
        const { id, userId: _userId, ...update } = values;
        await db.update(addresses).set(update).where(and(eq(addresses.id, input.id), eq(addresses.userId, ctx.user.id)));
        return input.id;
      }
      await db.insert(addresses).values(values);
      const [address] = await db.select().from(addresses).where(and(eq(addresses.userId, ctx.user.id), eq(addresses.label, input.label))).orderBy(desc(addresses.id)).limit(1);
      return address?.id;
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requiredDb();
      await db.delete(addresses).where(and(eq(addresses.id, input.id), eq(addresses.userId, ctx.user.id)));
      return { success: true };
    }),
  }),
  orders: router({
    list: protectedProcedure.query(async ({ ctx }) => (await requiredDb()).select().from(orders).where(eq(orders.userId, ctx.user.id)).orderBy(desc(orders.createdAt))),
    detail: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await requiredDb();
      const [order] = await db.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.userId, ctx.user.id))).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      const [items, history] = await Promise.all([db.select().from(orderItems).where(eq(orderItems.orderId, order.id)), db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, order.id)).orderBy(ascHistory())]);
      return { order, items, history };
    }),
  }),
  checkout: protectedProcedure.input(z.object({ addressId: z.number().int().positive(), paymentMethod: z.enum(["cod", "stripe"]), customerNote: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const db = await requiredDb();
    const cart = await listCart(ctx.user.id);
    if (!cart.lines.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Your cart is empty." });
    const [address] = await db.select().from(addresses).where(and(eq(addresses.id, input.addressId), eq(addresses.userId, ctx.user.id))).limit(1);
    if (!address) throw new TRPCError({ code: "NOT_FOUND", message: "Select a saved delivery address." });
    const pendingPayment = input.paymentMethod === "stripe";
    const orderNo = `MD-${nanoid(8).toUpperCase()}`;
    await db.insert(orders).values({ orderNo, userId: ctx.user.id, status: pendingPayment ? "pending_payment" : "placed", paymentMethod: input.paymentMethod, paymentStatus: "pending", ...cart.totals, deliveryAddressSnapshot: address, customerNote: input.customerNote || null });
    const [order] = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
    if (!order) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Order creation failed." });
    await db.insert(orderItems).values(cart.lines.map(line => ({ orderId: order.id, menuItemId: line.item.id, itemNameSnapshot: line.item.name, imageUrlSnapshot: line.item.imageUrl, unitPricePaise: line.unitPricePaise, quantity: line.quantity, selectedOptions: line.selectedOptions })));
    await db.insert(orderStatusHistory).values({ orderId: order.id, status: order.status, note: pendingPayment ? "Waiting for secure online payment." : "Cash on delivery order received.", actorUserId: ctx.user.id });
    const staff = await db.select({ id: users.id }).from(users).where(inArray(users.role, ["admin", "staff"]));
    if (staff.length) await db.insert(notifications).values(staff.map(member => ({ userId: member.id, type: "new_order", title: "New order received", body: `${order.orderNo} is ready for review.`, orderId: order.id })));
    void notifyOwner({ title: "New Mithilanchal Dhaba order", content: `${order.orderNo} was placed. Review it in Restaurant HQ.` }).catch(error => console.warn("[Order notification]", error));
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.cartId));
    if (input.paymentMethod === "cod") return { orderId: order.id, orderNo, checkoutUrl: null };
    const stripe = getStripeClient();
    if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Online payment is not configured yet. Please choose cash on delivery." });
    const origin = ctx.req.headers.origin ?? `${ctx.req.protocol}://${ctx.req.get("host")}`;
    const session = await stripe.checkout.sessions.create({ mode: "payment", currency: "inr", allow_promotion_codes: true, client_reference_id: String(ctx.user.id), customer_email: ctx.user.email ?? undefined, metadata: buildCheckoutMetadata({ orderId: order.id, userId: ctx.user.id, email: ctx.user.email, name: ctx.user.name }), line_items: cart.lines.map(line => ({ quantity: line.quantity, price_data: { currency: "inr", unit_amount: line.unitPricePaise, product_data: { name: line.item.name } } })), success_url: `${origin}/order-success/${order.id}?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/checkout?cancelled=1` });
    await db.update(orders).set({ stripeCheckoutSessionId: session.id }).where(eq(orders.id, order.id));
    return { orderId: order.id, orderNo, checkoutUrl: session.url };
  }),
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => (await requiredDb()).select().from(notifications).where(eq(notifications.userId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(30)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requiredDb(); await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id))); return { success: true };
    }),
  }),
});

function ascHistory() { return orderStatusHistory.createdAt; }
