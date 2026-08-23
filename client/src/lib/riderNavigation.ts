export type RiderCoordinates = { latitude: number; longitude: number };

export function buildLiveDirectionsUrl(origin: RiderCoordinates, destination: string) {
  const target = destination.trim();
  if (!target) return null;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${encodeURIComponent(target)}&travelmode=driving`;
}

export function buildAddressDirectionsUrl(destination: string) {
  const target = destination.trim();
  if (!target) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
}
