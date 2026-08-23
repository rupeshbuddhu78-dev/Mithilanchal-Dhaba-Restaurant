export type RiderCoordinates = { latitude: number; longitude: number };
export type DeliveryDestination = string | RiderCoordinates;

export function buildLiveDirectionsUrl(origin: RiderCoordinates, destination: DeliveryDestination) {
  const target = typeof destination === "string" ? destination.trim() : Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude) ? `${destination.latitude},${destination.longitude}` : "";
  if (!target) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${encodeURIComponent(target)}&travelmode=driving`;
}

export function buildAddressDirectionsUrl(destination: string) {
  const target = destination.trim();
  if (!target) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
}
