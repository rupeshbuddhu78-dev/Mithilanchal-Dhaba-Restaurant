import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsertUser, signSession } = vi.hoisted(() => ({
  upsertUser: vi.fn(),
  signSession: vi.fn(),
}));

vi.mock("./db", () => ({ upsertUser }));
vi.mock("./_core/sdk", () => ({ sdk: { signSession } }));

import { appRouter } from "./routers";
import { clearAdminLoginAttempts, getLocalAdminCredentials } from "./localAdminAuth";

describe("configured Render administrator login", () => {
  beforeEach(() => {
    clearAdminLoginAttempts("secret-validation-client");
    upsertUser.mockReset();
    signSession.mockReset().mockResolvedValue("local-admin-session");
  });

  it("accepts the securely configured credentials through the localAdminLogin endpoint", async () => {
    const credentials = getLocalAdminCredentials();
    expect(credentials).not.toBeNull();
    if (!credentials) return;

    const cookie = vi.fn();
    const caller = appRouter.createCaller({
      req: { ip: "secret-validation-client", headers: {}, protocol: "https" } as any,
      res: { cookie } as any,
      user: null,
    });

    await expect(caller.auth.localAdminLogin(credentials)).resolves.toEqual({ success: true });
    expect(upsertUser).toHaveBeenCalledWith(expect.objectContaining({ role: "admin" }));
    expect(cookie).toHaveBeenCalledWith(expect.any(String), "local-admin-session", expect.objectContaining({ httpOnly: true }));
  });
});
