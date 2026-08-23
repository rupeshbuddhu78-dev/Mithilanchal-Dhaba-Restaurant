import { sql } from "drizzle-orm";
import { getDb } from "./db";

export const TRACKING_MIGRATION_STATEMENTS = [
  "ALTER TABLE `addresses` ADD COLUMN IF NOT EXISTS `latitude` varchar(32)",
  "ALTER TABLE `addresses` ADD COLUMN IF NOT EXISTS `longitude` varchar(32)",
  "ALTER TABLE `addresses` ADD COLUMN IF NOT EXISTS `locationConsentAt` timestamp NULL",
  "ALTER TABLE `rider_assignments` ADD COLUMN IF NOT EXISTS `lastLatitude` varchar(32)",
  "ALTER TABLE `rider_assignments` ADD COLUMN IF NOT EXISTS `lastLongitude` varchar(32)",
  "ALTER TABLE `rider_assignments` ADD COLUMN IF NOT EXISTS `lastLocationAt` timestamp NULL",
  "ALTER TABLE `rider_assignments` ADD COLUMN IF NOT EXISTS `trackingConsentAt` timestamp NULL",
  "ALTER TABLE `rider_assignments` ADD COLUMN IF NOT EXISTS `trackingStoppedAt` timestamp NULL",
] as const;

let migrationPromise: Promise<void> | null = null;

export function ensureTrackingSchema() {
  if (!migrationPromise) migrationPromise = applyTrackingSchema();
  return migrationPromise;
}

async function applyTrackingSchema() {
  const db = await getDb();
  if (!db) {
    console.warn("[Tracking schema] Database is unavailable; tracking schema check skipped.");
    return;
  }
  for (const statement of TRACKING_MIGRATION_STATEMENTS) await db.execute(sql.raw(statement));
  console.info("[Tracking schema] Additive location columns verified.");
}
