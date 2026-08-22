import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

export type RestaurantRole = "customer" | "admin" | "staff" | "rider";

export function requireRole(ctx: TrpcContext, allowed: readonly RestaurantRole[]) {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to continue." });
  }
  if (!allowed.includes(ctx.user.role as RestaurantRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this area." });
  }
  return ctx.user;
}

export function requireOperationsRole(ctx: TrpcContext) {
  return requireRole(ctx, ["admin", "staff"]);
}

