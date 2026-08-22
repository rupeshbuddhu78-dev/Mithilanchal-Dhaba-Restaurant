import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
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
  }),

  restaurant: restaurantRouter,
  commerce: commerceRouter,
  operations: operationsRouter,
});

export type AppRouter = typeof appRouter;
