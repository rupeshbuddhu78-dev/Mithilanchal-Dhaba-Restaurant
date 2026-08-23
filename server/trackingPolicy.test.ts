import { describe, expect, it } from "vitest";
import { canReadDeliveryTracking, isActiveDeliveryStatus, parseTrackingCoordinates } from "./trackingPolicy";

describe("delivery tracking policy", () => {
  it("limits tracking reads to the order customer, assigned rider, or operations roles", () => {
    expect(canReadDeliveryTracking({ orderUserId: 20, riderUserId: 30, requesterUserId: 20, requesterRole: "customer" })).toBe(true);
    expect(canReadDeliveryTracking({ orderUserId: 20, riderUserId: 30, requesterUserId: 31, requesterRole: "rider" })).toBe(false);
    expect(canReadDeliveryTracking({ orderUserId: 20, riderUserId: 30, requesterUserId: 30, requesterRole: "rider" })).toBe(true);
    expect(canReadDeliveryTracking({ orderUserId: 20, riderUserId: 30, requesterUserId: 99, requesterRole: "admin" })).toBe(true);
  });

  it("accepts valid coordinate pairs and suppresses absent or invalid coordinates", () => {
    expect(parseTrackingCoordinates({ latitude: "25.5941", longitude: "85.1376" })).toEqual({ latitude: 25.5941, longitude: 85.1376 });
    expect(parseTrackingCoordinates({ latitude: 91, longitude: 85 })).toBeNull();
    expect(parseTrackingCoordinates({ latitude: 25 })).toBeNull();
    expect(isActiveDeliveryStatus("out_for_delivery")).toBe(true);
    expect(isActiveDeliveryStatus("delivered")).toBe(false);
  });
});
