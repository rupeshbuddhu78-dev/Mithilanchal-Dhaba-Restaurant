import { describe, expect, it } from "vitest";
import {
  clearAdminLoginAttempts,
  createLocalAdminOpenId,
  isAdminLoginAttemptAllowed,
  localAdminCredentialsMatch,
  recordFailedAdminLogin,
} from "./localAdminAuth";

describe("Render local administrator authentication", () => {
  const expected = { email: "admin@example.com", password: "a-long-private-password" };

  it("accepts only the configured credentials and produces a stable non-email identifier", () => {
    expect(localAdminCredentialsMatch("ADMIN@example.com", expected.password, expected)).toBe(true);
    expect(localAdminCredentialsMatch(expected.email, "wrong-password", expected)).toBe(false);
    expect(createLocalAdminOpenId(expected.email)).toMatch(/^render_admin_[a-f0-9]{32}$/);
    expect(createLocalAdminOpenId(expected.email)).not.toContain("@example.com");
  });

  it("limits repeated failed attempts within the configured window", () => {
    const client = "test-client";
    const now = 1_000;
    clearAdminLoginAttempts(client);
    for (let index = 0; index < 5; index += 1) recordFailedAdminLogin(client, now);
    expect(isAdminLoginAttemptAllowed(client, now)).toBe(false);
    expect(isAdminLoginAttemptAllowed(client, now + 15 * 60 * 1000 + 1)).toBe(true);
  });
});
