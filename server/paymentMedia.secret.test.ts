import { describe, expect, it } from "vitest";

describe("configured external payment and media credentials", () => {
  it("authenticates with Cashfree without exposing its client secret", async () => {
    const environment = process.env.CASHFREE_ENVIRONMENT === "production" ? "production" : "sandbox";
    const baseUrl = environment === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
    const response = await fetch(`${baseUrl}/orders/md-credential-check-do-not-create`, { headers: { "x-api-version": process.env.CASHFREE_API_VERSION || "2023-08-01", "x-client-id": process.env.CASHFREE_CLIENT_ID || "", "x-client-secret": process.env.CASHFREE_CLIENT_SECRET || "" } });
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  }, 20_000);

  it("authenticates with Cloudinary without exposing the API secret", async () => {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME || "";
    const key = process.env.CLOUDINARY_API_KEY || "";
    const secret = process.env.CLOUDINARY_API_SECRET || "";
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/resources/image?max_results=1`, { headers: { authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` } });
    expect(response.status).toBeLessThan(400);
  }, 20_000);
});
