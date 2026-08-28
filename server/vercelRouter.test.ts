import { beforeAll, describe, expect, it } from "vitest";
import { appRouter, SESSION_COOKIE } from "./vercelRouter";

beforeAll(() => {
  process.env.JWT_SECRET = "chave-de-teste-da-api-vercel";
});

describe("rotas tRPC independentes da Vercel", () => {
  it("encerra a sessão no cookie HTTP-only do domínio publicado", async () => {
    const resHeaders = new Headers();
    const caller = appRouter.createCaller({
      req: new Request("https://hub-seja-meu-socio.vercel.app/api/trpc/auth.logout"),
      resHeaders,
      user: null,
    });

    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
    expect(resHeaders.get("set-cookie")).toContain(`${SESSION_COOKIE}=`);
    expect(resHeaders.get("set-cookie")).toContain("HttpOnly");
    expect(resHeaders.get("set-cookie")).toContain("Max-Age=0");
  });
});
