import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock("./db", () => ({ getDb }));

import { operationsRouter } from "./routers/operations";
import { verifyPassword } from "./passwordAuth";

describe("administrator rider password reset", () => {
  const updateSet = vi.fn();
  const updateWhere = vi.fn();
  const auditValues = vi.fn();

  beforeEach(() => {
    updateSet.mockReset().mockReturnValue({ where: updateWhere });
    updateWhere.mockReset().mockResolvedValue(undefined);
    auditValues.mockReset().mockResolvedValue(undefined);
    const transactionDb = {
      update: vi.fn(() => ({ set: updateSet })),
      insert: vi.fn(() => ({ values: auditValues })),
    };
    const database = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 77, role: "rider" }]) })) })) })),
      transaction: vi.fn(async (callback: (tx: typeof transactionDb) => Promise<unknown>) => callback(transactionDb)),
    };
    getDb.mockResolvedValue(database);
  });

  it("allows an administrator to reset only a rider password, stores a scrypt hash, and writes an audit event", async () => {
    const caller = operationsRouter.createCaller({ user: { id: 5, role: "admin" }, req: {}, res: {} } as any);
    await expect(caller.admin.resetRiderPassword({ riderUserId: 77, password: "new-temporary-password" })).resolves.toEqual({ success: true });
    const update = updateSet.mock.calls[0]?.[0] as { passwordHash?: string };
    expect(update.passwordHash).toMatch(/^scrypt\$/);
    await expect(verifyPassword("new-temporary-password", update.passwordHash ?? null)).resolves.toBe(true);
    expect(auditValues).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 5, action: "rider.password_reset", resourceId: "77", metadata: { targetRole: "rider" } }));
  });

  it("rejects a non-administrator before any password-reset database work", async () => {
    const caller = operationsRouter.createCaller({ user: { id: 9, role: "staff" }, req: {}, res: {} } as any);
    await expect(caller.admin.resetRiderPassword({ riderUserId: 77, password: "new-temporary-password" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
