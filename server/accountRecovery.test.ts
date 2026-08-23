import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock("./db", () => ({ getDb }));

import { appRouter } from "./routers";

function chain(result: unknown) {
  return { from: () => ({ where: () => ({ limit: async () => result }) }) };
}

describe("password recovery requests", () => {
  beforeEach(() => getDb.mockReset());

  it("returns the same generic result for an unknown account without writing an event", async () => {
    const insert = vi.fn();
    getDb.mockResolvedValue({ select: vi.fn(() => chain([])), insert });
    const caller = appRouter.createCaller({ user: null, req: {}, res: {} } as any);
    await expect(caller.auth.passwordResetRequest({ email: "unknown@example.invalid", role: "customer" })).resolves.toEqual({ success: true });
    expect(insert).not.toHaveBeenCalled();
  });

  it("records an eligible request for administrators while preserving the same generic response", async () => {
    const auditValues = vi.fn().mockResolvedValue(undefined);
    const notificationValues = vi.fn().mockResolvedValue(undefined);
    const select = vi.fn().mockReturnValueOnce(chain([{ id: 41, role: "customer", isActive: true }])).mockReturnValueOnce({ from: () => ({ where: async () => [{ id: 5 }] }) });
    const insert = vi.fn().mockReturnValueOnce({ values: auditValues }).mockReturnValueOnce({ values: notificationValues });
    getDb.mockResolvedValue({ select, insert });
    const caller = appRouter.createCaller({ user: null, req: {}, res: {} } as any);
    await expect(caller.auth.passwordResetRequest({ email: "customer@example.invalid", role: "customer" })).resolves.toEqual({ success: true });
    expect(auditValues).toHaveBeenCalledWith(expect.objectContaining({ action: "account.password_reset_requested", resourceId: "41" }));
    expect(notificationValues).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ userId: 5, type: "password_reset_request" })]));
  });
});

