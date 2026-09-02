import { createClient, type User } from "@supabase/supabase-js";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

export const SUPABASE_MEDIA_BUCKET = "hub-media";
export const SESSION_COOKIE = "hub_supabase_session";
export type HubUser = { id: string; name: string; email: string; role: "admin" | "user" };
type VercelContext = { req: Request; resHeaders: Headers; user: HubUser | null };

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) throw new Error("Supabase não configurado. Defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.");
  return { url, anonKey, serviceRoleKey };
}
export function getSupabaseAdmin() { const c = getConfig(); return createClient(c.url, c.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } }); }
function getSupabasePublic() { const c = getConfig(); return createClient(c.url, c.anonKey, { auth: { autoRefreshToken: false, persistSession: false } }); }
function readSession(req: Request) { const header = req.headers.get("cookie"); const prefix = `${SESSION_COOKIE}=`; return header?.split(";").map((v) => v.trim()).find((v) => v.startsWith(prefix))?.slice(prefix.length); }
function setSession(headers: Headers, token: string) { headers.append("set-cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`); }
function clearSession(headers: Headers) { headers.append("set-cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`); }
function toUser(profile: { id: string; name: string; email: string; role: "admin" | "user" }): HubUser { return { id: profile.id, name: profile.name, email: profile.email, role: profile.role }; }

export async function getSupabaseUserFromRequest(req: Request): Promise<HubUser | null> {
  const token = readSession(req); if (!token) return null;
  const admin = getSupabaseAdmin(); const { data: auth, error: authError } = await admin.auth.getUser(decodeURIComponent(token));
  if (authError || !auth.user) return null;
  const { data, error } = await admin.from("hub_profiles").select("id, name, email, role").eq("id", auth.user.id).maybeSingle();
  return error || !data ? null : toUser(data);
}
async function profileForUser(user: User) { const { data, error } = await getSupabaseAdmin().from("hub_profiles").select("id, name, email, role").eq("id", user.id).maybeSingle(); return error || !data ? null : toUser(data); }
async function createContext({ req, resHeaders }: { req: Request; resHeaders: Headers }): Promise<VercelContext> { return { req, resHeaders, user: await getSupabaseUserFromRequest(req).catch(() => null) }; }

const t = initTRPC.context<VercelContext>().create({ transformer: superjson });
const protectedProcedure = t.procedure.use(({ ctx, next }) => { if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Faça login para continuar." }); return next({ ctx: { ...ctx, user: ctx.user } }); });
const adminProcedure = protectedProcedure.use(({ ctx, next }) => { if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Esta ação exige uma conta de administrador." }); return next(); });
const projectInput = z.object({ name: z.string().trim().min(2).max(140), description: z.string().trim().min(8).max(2500), price: z.number().finite().min(0).max(999999.99), kind: z.enum(["free", "paid"]), status: z.enum(["normal", "featured", "coming_soon"]).default("normal"), projectUrl: z.string().trim().url(), coverUrl: z.string().trim().url(), coverKey: z.string().trim().min(1).max(500).optional(), mediaKind: z.enum(["image", "video", "iframe"]), videoUrl: z.string().trim().url().optional(), videoKey: z.string().trim().min(1).max(500).optional(), iframeUrl: z.string().trim().url().optional() });
function fail(error: { message?: string } | null, fallback: string): never { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error?.message ?? fallback }); }

export const appRouter = t.router({
  auth: t.router({
    me: t.procedure.query(({ ctx }) => ctx.user),
    register: t.procedure.input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), password: z.string().min(8).max(200) })).mutation(async ({ input, ctx }) => {
      const admin = getSupabaseAdmin(); const email = input.email.toLowerCase();
      const { data: existing } = await admin.from("hub_profiles").select("id").eq("email", email).maybeSingle();
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta com este e-mail." });
      const { count, error: countError } = await admin.from("hub_profiles").select("id", { count: "exact", head: true });
      if (countError) fail(countError, "Não foi possível verificar as contas existentes.");
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password: input.password, email_confirm: true, user_metadata: { name: input.name } });
      if (createError || !created.user) fail(createError, "Não foi possível criar a conta no Supabase Auth.");
      const { data: profile, error: profileError } = await admin.from("hub_profiles").insert({ id: created.user.id, name: input.name, email, role: (count ?? 0) === 0 ? "admin" : "user" }).select("id, name, email, role").single();
      if (profileError || !profile) fail(profileError, "A conta foi criada, mas o perfil não pôde ser concluído.");
      const { data: login, error: loginError } = await getSupabasePublic().auth.signInWithPassword({ email, password: input.password });
      if (loginError || !login.session) fail(loginError, "Conta criada. Faça login para continuar.");
      setSession(ctx.resHeaders, login.session.access_token); return toUser(profile);
    }),
    login: t.procedure.input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(200) })).mutation(async ({ input, ctx }) => {
      const { data, error } = await getSupabasePublic().auth.signInWithPassword({ email: input.email.toLowerCase(), password: input.password });
      if (error || !data.user || !data.session) throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos." });
      const profile = await profileForUser(data.user); if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "A conta ainda não possui um perfil autorizado." });
      setSession(ctx.resHeaders, data.session.access_token); return profile;
    }),
    logout: t.procedure.mutation(({ ctx }) => { clearSession(ctx.resHeaders); return { success: true }; }),
  }),
  projects: t.router({
    list: t.procedure.query(async () => {
      const { data, error } = await getSupabaseAdmin().from("hub_projects").select("id, name, description, price, kind, status, project_url, cover_url, cover_key, media_kind, video_url, video_key, iframe_url, created_at").order("created_at", { ascending: false });
      if (error) fail(error, "Não foi possível carregar o catálogo.");
      return (data ?? []).map((p) => ({ ...p, projectUrl: p.project_url, coverUrl: p.cover_url ?? "", coverKey: p.cover_key, mediaKind: p.media_kind, videoUrl: p.video_url, videoKey: p.video_key, iframeUrl: p.iframe_url, createdAt: p.created_at }));
    }),
    create: adminProcedure.input(projectInput).mutation(async ({ input, ctx }) => {
      if (input.kind === "paid" && input.price <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Projetos pagos precisam ter um valor maior que zero." });
      if (input.mediaKind === "video" && !input.videoUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Envie o vídeo de apresentação antes de publicar." });
      if (input.mediaKind === "iframe" && !input.iframeUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a URL incorporável do vídeo." });
      const { data, error } = await getSupabaseAdmin().from("hub_projects").insert({ name: input.name, description: input.description, price: input.kind === "free" ? 0 : input.price, kind: input.kind, status: input.status, project_url: input.projectUrl, cover_url: input.coverUrl, cover_key: input.coverKey ?? null, media_kind: input.mediaKind, video_url: input.videoUrl ?? null, video_key: input.videoKey ?? null, iframe_url: input.iframeUrl ?? null, created_by: ctx.user.id }).select("id, name, description, price, kind, status, project_url, cover_url, cover_key, media_kind, video_url, video_key, iframe_url, created_at").single();
      if (error || !data) fail(error, "Não foi possível publicar o projeto.");
      return { ...data, projectUrl: data.project_url, coverUrl: data.cover_url ?? "", coverKey: data.cover_key, mediaKind: data.media_kind, videoUrl: data.video_url, videoKey: data.video_key, iframeUrl: data.iframe_url, createdAt: data.created_at };
    }),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const { error } = await getSupabaseAdmin().from("hub_projects").delete().eq("id", input.id); if (error) fail(error, "Não foi possível remover o projeto."); return { success: true }; }),
  }),
});
export type AppRouter = typeof appRouter;
export { createContext };
