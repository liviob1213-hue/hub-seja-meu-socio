import { describe, expect, it } from "vitest";
import { errorResponse } from "./[...trpc]";

describe("fallback JSON do handler tRPC", () => {
  it("retorna envelope JSON para erro não tratado", async () => {
    const response = errorResponse(new Request("https://hub.test/api/trpc"), new Error("Supabase indisponível"));
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({ error: { message: "Supabase indisponível" } });
  });

  it("retorna lista JSON para requisição batch", async () => {
    const response = errorResponse(new Request("https://hub.test/api/trpc?batch=1"), new Error("Falha de configuração"));
    await expect(response.json()).resolves.toEqual([{ error: expect.objectContaining({ message: "Falha de configuração" }) }]);
  });
});
