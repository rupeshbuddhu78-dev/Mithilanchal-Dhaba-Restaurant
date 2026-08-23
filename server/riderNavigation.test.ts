import { describe, expect, it } from "vitest";
import { buildAddressDirectionsUrl, buildLiveDirectionsUrl } from "../client/src/lib/riderNavigation";

describe("rider navigation links", () => {
  it("builds a driving route from a permission-granted rider location to the delivery address", () => {
    expect(buildLiveDirectionsUrl({ latitude: 25.6093, longitude: 85.1376 }, "Mission Rd, TEST CITY, 000000")).toBe("https://www.google.com/maps/dir/?api=1&origin=25.6093,85.1376&destination=Mission%20Rd%2C%20TEST%20CITY%2C%20000000&travelmode=driving");
  });

  it("returns safe null values when no destination exists and provides an address-only fallback otherwise", () => {
    expect(buildLiveDirectionsUrl({ latitude: 1, longitude: 2 }, " ")).toBeNull();
    expect(buildAddressDirectionsUrl("Mission Rd, TEST CITY")).toBe("https://www.google.com/maps/search/?api=1&query=Mission%20Rd%2C%20TEST%20CITY");
  });
});
