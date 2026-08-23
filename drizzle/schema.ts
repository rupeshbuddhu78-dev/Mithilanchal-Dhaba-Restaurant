import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"), email: varchar("email", { length: 320 }), loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["customer", "admin", "staff", "rider"]).default("customer").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  passwordHash: varchar("passwordHash", { length: 255 }), phone: varchar("phone", { length: 30 }), isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const restaurantSettings = mysqlTable("restaurant_settings", {
  id: int("id").autoincrement().primaryKey(), name: varchar("name", { length: 160 }).notNull(), formattedAddress: text("formattedAddress").notNull(),
  city: varchar("city", { length: 120 }), state: varchar("state", { length: 120 }), country: varchar("country", { length: 120 }), pincode: varchar("pincode", { length: 20 }),
  latitude: varchar("latitude", { length: 32 }), longitude: varchar("longitude", { length: 32 }), phone: varchar("phone", { length: 30 }), email: varchar("email", { length: 320 }),
  heroHeading: text("heroHeading"), heroSubtitle: text("heroSubtitle"), heroImageUrl: text("heroImageUrl"), aboutText: text("aboutText"), logoUrl: text("logoUrl"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(), name: varchar("name", { length: 120 }).notNull(), slug: varchar("slug", { length: 160 }).notNull().unique(),
  description: text("description"), imageUrl: text("imageUrl"), sortOrder: int("sortOrder").default(0).notNull(), isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const menuItems = mysqlTable("menu_items", {
  id: int("id").autoincrement().primaryKey(), categoryId: int("categoryId").notNull(), name: varchar("name", { length: 180 }).notNull(), slug: varchar("slug", { length: 220 }).notNull().unique(),
  description: text("description"), pricePaise: int("pricePaise").notNull(), imageUrl: text("imageUrl"), isVegetarian: boolean("isVegetarian").default(true).notNull(), isFeatured: boolean("isFeatured").default(false).notNull(), isAvailable: boolean("isAvailable").default(true).notNull(),
  customisation: json("customisation").$type<unknown>().notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("menu_category_idx").on(table.categoryId), index("menu_available_idx").on(table.isAvailable)]);

export const addresses = mysqlTable("addresses", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), label: varchar("label", { length: 80 }).notNull(), recipientName: varchar("recipientName", { length: 160 }).notNull(), phone: varchar("phone", { length: 30 }).notNull(),
  line1: text("line1").notNull(), line2: text("line2"), city: varchar("city", { length: 120 }).notNull(), state: varchar("state", { length: 120 }).notNull(), pincode: varchar("pincode", { length: 20 }).notNull(), deliveryInstructions: text("deliveryInstructions"), isDefault: boolean("isDefault").default(false).notNull(),
  latitude: varchar("latitude", { length: 32 }), longitude: varchar("longitude", { length: 32 }), locationConsentAt: timestamp("locationConsentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("addresses_user_idx").on(table.userId)]);

export const carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("carts_user_unique").on(table.userId)]);

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(), cartId: int("cartId").notNull(), menuItemId: int("menuItemId").notNull(), quantity: int("quantity").notNull(), selectedOptions: json("selectedOptions").$type<unknown>().notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("cart_items_cart_idx").on(table.cartId), index("cart_items_menu_idx").on(table.menuItemId)]);

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(), orderNo: varchar("orderNo", { length: 32 }).notNull().unique(), userId: int("userId").notNull(),
  status: mysqlEnum("orderStatus", ["pending_payment", "placed", "accepted", "preparing", "ready_for_pickup", "rider_assigned", "out_for_delivery", "delivered", "cancelled"]).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cod", "stripe", "cashfree"]).notNull(), paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "failed", "refunded"]).default("pending").notNull(),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }), stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  itemTotalPaise: int("itemTotalPaise").notNull(), deliveryFeePaise: int("deliveryFeePaise").notNull(), discountPaise: int("discountPaise").notNull(), grandTotalPaise: int("grandTotalPaise").notNull(),
  deliveryAddressSnapshot: json("deliveryAddressSnapshot").$type<unknown>().notNull(), customerNote: text("customerNote"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("orders_user_idx").on(table.userId), index("orders_status_idx").on(table.status)]);

export const paymentAttempts = mysqlTable("payment_attempts", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), userId: int("userId").notNull(),
  provider: mysqlEnum("paymentProvider", ["stripe", "cashfree"]).notNull(), providerOrderId: varchar("providerOrderId", { length: 96 }).notNull(), paymentSessionId: text("paymentSessionId"), providerPaymentId: varchar("providerPaymentId", { length: 128 }),
  status: mysqlEnum("paymentAttemptStatus", ["created", "pending", "paid", "failed", "expired", "cancelled"]).default("created").notNull(), amountPaise: int("amountPaise").notNull(), idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("payment_attempt_provider_order_unique").on(table.provider, table.providerOrderId), uniqueIndex("payment_attempt_idempotency_unique").on(table.idempotencyKey), index("payment_attempt_order_idx").on(table.orderId)]);

export const paymentWebhookEvents = mysqlTable("payment_webhook_events", {
  id: int("id").autoincrement().primaryKey(), provider: mysqlEnum("webhookProvider", ["stripe", "cashfree"]).notNull(), providerEventId: varchar("providerEventId", { length: 160 }).notNull(), orderId: int("orderId"), payloadHash: varchar("payloadHash", { length: 64 }).notNull(), processedAt: timestamp("processedAt").defaultNow().notNull(),
}, table => [uniqueIndex("payment_webhook_event_unique").on(table.provider, table.providerEventId), index("payment_webhook_order_idx").on(table.orderId)]);

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), menuItemId: int("menuItemId").notNull(), itemNameSnapshot: varchar("itemNameSnapshot", { length: 180 }).notNull(), imageUrlSnapshot: text("imageUrlSnapshot"), unitPricePaise: int("unitPricePaise").notNull(), quantity: int("quantity").notNull(), selectedOptions: json("selectedOptions").$type<unknown>().notNull(),
}, table => [index("order_items_order_idx").on(table.orderId)]);

export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), status: mysqlEnum("historyStatus", ["pending_payment", "placed", "accepted", "preparing", "ready_for_pickup", "rider_assigned", "out_for_delivery", "delivered", "cancelled"]).notNull(), note: text("note"), actorUserId: int("actorUserId"), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("history_order_idx").on(table.orderId)]);

export const riderProfiles = mysqlTable("rider_profiles", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), displayName: varchar("displayName", { length: 160 }).notNull(), phone: varchar("phone", { length: 30 }), lastLatitude: varchar("lastLatitude", { length: 32 }), lastLongitude: varchar("lastLongitude", { length: 32 }), lastLocationAt: timestamp("lastLocationAt"), isAvailable: boolean("isAvailable").default(true).notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("rider_profile_user_unique").on(table.userId)]);

export const riderAssignments = mysqlTable("rider_assignments", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), riderUserId: int("riderUserId").notNull(), assignedByUserId: int("assignedByUserId").notNull(), assignedAt: timestamp("assignedAt").defaultNow().notNull(), pickedUpAt: timestamp("pickedUpAt"), deliveredAt: timestamp("deliveredAt"),
  lastLatitude: varchar("lastLatitude", { length: 32 }), lastLongitude: varchar("lastLongitude", { length: 32 }), lastLocationAt: timestamp("lastLocationAt"), trackingConsentAt: timestamp("trackingConsentAt"), trackingStoppedAt: timestamp("trackingStoppedAt"),
}, table => [uniqueIndex("assignment_order_unique").on(table.orderId), index("assignment_rider_idx").on(table.riderUserId)]);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), type: varchar("type", { length: 80 }).notNull(), title: varchar("title", { length: 180 }).notNull(), body: text("body").notNull(), orderId: int("orderId"), isRead: boolean("isRead").default(false).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("notifications_user_idx").on(table.userId)]);

export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(), code: varchar("code", { length: 64 }).notNull().unique(), description: text("description"), discountType: mysqlEnum("discountType", ["fixed", "percent"]).notNull(), discountValue: int("discountValue").notNull(), minimumOrderPaise: int("minimumOrderPaise").default(0).notNull(), isActive: boolean("isActive").default(true).notNull(), startsAt: timestamp("startsAt"), endsAt: timestamp("endsAt"),
});

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(), actorUserId: int("actorUserId"), action: varchar("action", { length: 120 }).notNull(), resourceType: varchar("resourceType", { length: 80 }).notNull(), resourceId: varchar("resourceId", { length: 80 }), metadata: json("metadata").$type<unknown>(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});
