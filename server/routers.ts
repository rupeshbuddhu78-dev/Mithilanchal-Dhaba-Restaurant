import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import {
  clearAdminLoginAttempts,
  createLocalAdminOpenId,
  getLocalAdminCredentials,
  isAdminLoginAttemptAllowed,
  localAdminCredentialsMatch,
  recordFailedAdminLogin,
} from "./localAdminAuth";
import { canAttemptPasswordLogin, clearPasswordLoginAttempts, hashPassword, localOpenId, normaliseEmail, recordFailedPasswordLogin, verifyPassword } from "./passwordAuth";
import { commerceRouter } from "./routers/commerce";
import { operationsRouter } from "./routers/operations";
import { restaurantRouter } from "./routers/restaurant";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    localAdminLogin: publicProcedure
      .input(z.object({ email: z.string().email().max(320), password: z.string().min(1).max(1024) }))
      .mutation(async ({ ctx, input }) => {
        const credentials = getLocalAdminCredentials();
        if (!credentials) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Administrator sign-in is not configured yet.",
          });
        }

        const clientKey = ctx.req.ip || "unknown";
        if (!isAdminLoginAttemptAllowed(clientKey)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many sign-in attempts. Please wait and try again.",
          });
        }

        if (!localAdminCredentialsMatch(input.email, input.password, credentials)) {
          recordFailedAdminLogin(clientKey);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }

        clearAdminLoginAttempts(clientKey);
        const openId = createLocalAdminOpenId(credentials.email);
        const name = "Restaurant Administrator";
        await db.upsertUser({
          openId,
          name,
          email: credentials.email,
          loginMethod: "render_password",
          role: "admin",
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.signSession(
          { openId, appId: "render_local_admin", name },
          { expiresInMs: 12 * 60 * 60 * 1000 },
        );
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 12 * 60 * 60 * 1000,
        });

        return { success: true } as const;
      }),
    register: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().email().max(320), phone: z.string().trim().min(6).max(30), password: z.string().min(12).max(128) })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const email = normaliseEmail(input.email);
      const existing = await database.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      const openId = localOpenId(email);
      await database.insert(users).values({ openId, name: input.name, email, phone: input.phone, passwordHash: await hashPassword(input.password), loginMethod: "password", role: "customer", isActive: true, lastSignedIn: new Date() });
      const sessionToken = await sdk.signSession({ openId, appId: "local_customer", name: input.name }, { expiresInMs: 12 * 60 * 60 * 1000 });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: 12 * 60 * 60 * 1000 });
      return { success: true } as const;
    }),
    passwordLogin: publicProcedure.input(z.object({ email: z.string().email().max(320), password: z.string().min(1).max(128), role: z.enum(["customer", "rider"]) })).mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const key = `${ctx.req.ip || "unknown"}:${normaliseEmail(input.email)}`;
      if (!canAttemptPasswordLogin(key)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Please wait and try again." });
      const email = normaliseEmail(input.email);
      const [user] = await database.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user || !user.isActive || user.role !== input.role || !(await verifyPassword(input.password, user.passwordHash))) { recordFailedPasswordLogin(key); throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email, password, or account role." }); }
      clearPasswordLoginAttempts(key);
      await database.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      const sessionToken = await sdk.signSession({ openId: user.openId, appId: `local_${input.role}`, name: user.name || input.role }, { expiresInMs: 12 * 60 * 60 * 1000 });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: 12 * 60 * 60 * 1000 });
      return { success: true, role: user.role } as const;
    }),
    profile: router({
      update: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(160), phone: z.string().trim().min(6).max(30) })).mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login." });
        const database = await db.getDb(); if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
        await database.update(users).set(input).where(eq(users.id, ctx.user.id)); return { success: true } as const;
      }),
    }),
  }),

  restaurant: restaurantRouter,
  commerce: commerceRouter,
  operations: operationsRouter,
});

export type AppRouter = typeof appRouter;
