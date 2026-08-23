export const ACTIVE_DELIVERY_STATUSES = ["rider_assigned", "out_for_delivery"] as const;

export type TrackingRole = "customer" | "admin" | "staff" | "rider";

export function isActiveDeliveryStatus(status: string) {
  return (ACTIVE_DELIVERY_STATUSES as readonly string[]).includes(status);
}

export function canReadDeliveryTracking(input: { orderUserId: number; riderUserId?: number | null; requesterUserId: number; requesterRole: TrackingRole }) {
  if (input.requesterRole === "admin" || input.requesterRole === "staff") return true;
  if (input.requesterRole === "customer") return input.orderUserId === input.requesterUserId;
  return input.requesterRole === "rider" && input.riderUserId === input.requesterUserId;
}

export function parseTrackingCoordinates(snapshot: unknown) {
  const value = snapshot as { latitude?: unknown; longitude?: unknown } | null;
  const latitude = typeof value?.latitude === "number" ? value.latitude : Number(value?.latitude);
  const longitude = typeof value?.longitude === "number" ? value.longitude : Number(value?.longitude);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 ? { latitude, longitude } : null;
}
