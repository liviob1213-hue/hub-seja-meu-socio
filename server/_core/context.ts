import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { parse } from "cookie";
import type { User } from "../../drizzle/schema";
import { getUserById } from "../db";
import { EMAIL_SESSION_COOKIE, getEmailSessionUserId } from "../passwordAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const sessionCookie = parse(opts.req.headers.cookie ?? "")[EMAIL_SESSION_COOKIE];
    const sessionUserId = await getEmailSessionUserId(sessionCookie);
    user = sessionUserId ? (await getUserById(sessionUserId)) ?? null : await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
