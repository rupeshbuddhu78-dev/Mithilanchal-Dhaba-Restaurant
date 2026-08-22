import { eq } from "drizzle-orm";
import { categories, menuItems, orderItems, orders, orderStatusHistory, restaurantSettings, riderAssignments, riderProfiles, users } from "../drizzle/schema";
import { DEFAULT_MENU_SEED, DEFAULT_RESTAURANT_SEED } from "../shared/restaurant";
import { getDb } from "./db";

/** Seeds editable catalog and clearly-labelled operational sample records. It never seeds reviews, ratings, or real personal data. */
export async function ensureRestaurantSeed() {
  const db = await getDb();
  if (!db) return false;
  const [settings] = await db.select().from(restaurantSettings).limit(1);
  if (!settings) await db.insert(restaurantSettings).values(DEFAULT_RESTAURANT_SEED);
  const [existingCategory] = await db.select({ id: categories.id }).from(categories).limit(1);
  if (!existingCategory) for (const section of DEFAULT_MENU_SEED) { await db.insert(categories).values(section.category); const [category] = await db.select().from(categories).where(eq(categories.slug, section.category.slug)).limit(1); if (category) await db.insert(menuItems).values(section.items.map(item => ({ ...item, categoryId: category.id, customisation: "customisation" in item ? item.customisation : [] }))); }
  const seedUsers = [{ openId: "system_operational_sample", name: "Operational sample account", role: "customer" as const }, { openId: "system_rider_sample", name: "Operational sample rider", role: "rider" as const }];
  for (const seedUser of seedUsers) { const [found] = await db.select().from(users).where(eq(users.openId, seedUser.openId)).limit(1); if (!found) await db.insert(users).values({ ...seedUser, email: null, loginMethod: "seed", stripeCustomerId: null, lastSignedIn: new Date() }); }
  const [systemUser] = await db.select().from(users).where(eq(users.openId, "system_operational_sample")).limit(1);
  const [systemRider] = await db.select().from(users).where(eq(users.openId, "system_rider_sample")).limit(1);
  if (systemRider) { const [profile] = await db.select().from(riderProfiles).where(eq(riderProfiles.userId, systemRider.id)).limit(1); if (!profile) await db.insert(riderProfiles).values({ userId: systemRider.id, displayName: "Operational sample rider", isAvailable: true }); }
  const [sampleOrder] = await db.select().from(orders).where(eq(orders.orderNo, "MD-SAMPLE-001")).limit(1);
  const [sampleItem] = await db.select().from(menuItems).orderBy(menuItems.id).limit(1);
  let orderId = sampleOrder?.id;
  if (systemUser && sampleItem && !sampleOrder) { await db.insert(orders).values({ orderNo: "MD-SAMPLE-001", userId: systemUser.id, status: "rider_assigned", paymentMethod: "cod", paymentStatus: "pending", itemTotalPaise: sampleItem.pricePaise, deliveryFeePaise: 0, discountPaise: 0, grandTotalPaise: sampleItem.pricePaise, deliveryAddressSnapshot: { label: "Operational sample", line1: "No customer address: demo record only" }, customerNote: "Operational demonstration order; not a customer transaction." }); const [order] = await db.select().from(orders).where(eq(orders.orderNo, "MD-SAMPLE-001")).limit(1); orderId = order?.id; if (order) { await db.insert(orderItems).values({ orderId: order.id, menuItemId: sampleItem.id, itemNameSnapshot: sampleItem.name, imageUrlSnapshot: sampleItem.imageUrl, unitPricePaise: sampleItem.pricePaise, quantity: 1, selectedOptions: [] }); await db.insert(orderStatusHistory).values({ orderId: order.id, status: "rider_assigned", note: "Operational sample order seeded for the back-office workflow." }); } }
  if (orderId && systemRider) { const [assignment] = await db.select().from(riderAssignments).where(eq(riderAssignments.orderId, orderId)).limit(1); if (!assignment) await db.insert(riderAssignments).values({ orderId, riderUserId: systemRider.id, assignedByUserId: systemUser?.id || systemRider.id }); }
  return true;
}
