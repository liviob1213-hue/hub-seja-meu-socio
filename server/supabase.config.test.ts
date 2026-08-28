import { describe, expect, it } from "vitest";
import { getSupabaseAdmin, SUPABASE_MEDIA_BUCKET } from "./vercelRouter";

describe("configuração do Supabase", () => {
  it("acessa perfis, projetos e lista o bucket de mídia sem escrever dados", async () => {
    expect(process.env.SUPABASE_URL).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    const admin = getSupabaseAdmin();
    const [{ error: profilesError }, { error: projectsError }, { data: buckets, error: bucketsError }] = await Promise.all([
      admin.from("hub_profiles").select("id", { head: true, count: "exact" }),
      admin.from("hub_projects").select("id", { head: true, count: "exact" }),
      admin.storage.listBuckets(),
    ]);
    expect(profilesError, profilesError?.message).toBeNull();
    expect(projectsError, projectsError?.message).toBeNull();
    expect(bucketsError, bucketsError?.message).toBeNull();
    expect(buckets?.some((bucket) => bucket.id === SUPABASE_MEDIA_BUCKET)).toBe(true);
  }, 15_000);
});
