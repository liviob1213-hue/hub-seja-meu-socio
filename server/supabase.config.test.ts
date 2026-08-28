import { describe, expect, it } from "vitest";
import { getSupabaseAdmin } from "./vercelRouter";

describe("configuração do Supabase", () => {
  it("aceita as credenciais e acessa a tabela de perfis sem escrever dados", async () => {
    const { error } = await getSupabaseAdmin()
      .from("hub_profiles")
      .select("id", { head: true, count: "exact" });
    expect(error, error?.message).toBeNull();
  }, 15_000);
});
