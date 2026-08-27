import { neon } from "@neondatabase/serverless";
import { TRPCError, initTRPC } from "@trpc/server";
import { getEmailSessionUserId, createEmailSession, emailSessionMaxAgeMs, hashPassword, verifyPassword, EMAIL_SESSION_COOKIE } from "./passwordAuth";
import superjson from "superjson";
import { z } from "zod";

export type HubUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
};

type StoredUser = HubUser & { passwordHash: string };
type VercelContext = {
  req: Request;
  resHeaders: Headers;
  user: HubUser | null;
};

let schemaReady: Promise<void> | null = null;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error("O banco de dados não está configurado. Conecte o Neon ao projeto Vercel e defina DATABASE_URL.");
  }
  return databaseUrl;
}

function getSql() {
  return neon(getDatabaseUrl());
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`CREATE TABLE IF NOT EXISTS hub_users (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS hub_projects (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price NUMERIC(12, 2) NOT NULL DEFAULT 0,
        kind TEXT NOT NULL CHECK (kind IN ('free', 'paid')),
        project_url TEXT NOT NULL,
        cover_url TEXT,
        cover_key TEXT,
        media_kind TEXT NOT NULL DEFAULT 'image' CHECK (media_kind IN ('image', 'video', 'iframe')),
        video_url TEXT,
        video_key TEXT,
        iframe_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS hub_projects_created_at_idx ON hub_projects (created_at DESC)`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  const prefix = `${name}=`;
  return header.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

function sessionCookie(token: string) {
  const maxAge = Math.floor(emailSessionMaxAgeMs / 1000);
  return `${EMAIL_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function expiredSessionCookie() {
  return `${EMAIL_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function withoutPassword(user: StoredUser): HubUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function getVercelUserById(id: number): Promise<HubUser | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, email, role
    FROM hub_users
    WHERE id = ${id}
    LIMIT 1
  `) as HubUser[];
  return rows[0] ?? null;
}

async function createContext({ req, resHeaders }: { req: Request; resHeaders: Headers }): Promise<VercelContext> {
  const rawToken = readCookie(req, EMAIL_SESSION_COOKIE);
  const userId = await getEmailSessionUserId(rawToken ? decodeURIComponent(rawToken) : undefined);
  let user: HubUser | null = null;
  if (userId) {
    try {
      user = await getVercelUserById(userId);
    } catch (error) {
      console.error("Falha ao recuperar a sessão do Hub", error);
    }
  }
  return { req, resHeaders, user };
}

const t = initTRPC.context<VercelContext>().create({ transformer: superjson });
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Faça login para continuar." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta ação exige uma conta de administrador." });
  }
  return next();
});

const projectInput = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().min(8).max(2500),
  price: z.number().finite().min(0).max(999999.99),
  kind: z.enum(["free", "paid"]),
  projectUrl: z.string().trim().url(),
  coverUrl: z.string().trim().url(),
  coverKey: z.string().trim().min(1).max(500).optional(),
  mediaKind: z.enum(["image", "video", "iframe"]),
  videoUrl: z.string().trim().url().optional(),
  videoKey: z.string().trim().min(1).max(500).optional(),
  iframeUrl: z.string().trim().url().optional(),
});

export const appRouter = t.router({
  auth: t.router({
    me: t.procedure.query(({ ctx }) => ctx.user),
    register: t.procedure.input(z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(320),
      password: z.string().min(8).max(200),
    })).mutation(async ({ input, ctx }) => {
      await ensureSchema();
      const sql = getSql();
      const email = input.email.toLowerCase();
      const passwordHash = await hashPassword(input.password);
      const existing = (await sql`SELECT id FROM hub_users WHERE email = ${email} LIMIT 1`) as { id: number }[];
      if (existing.length) {
        throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta com este e-mail." });
      }
      const countRows = (await sql`SELECT COUNT(*)::text AS count FROM hub_users`) as { count: string }[];
      const role = Number(countRows[0]?.count ?? 0) === 0 ? "admin" : "user";
      const rows = (await sql`
        INSERT INTO hub_users (name, email, password_hash, role)
        VALUES (${input.name}, ${email}, ${passwordHash}, ${role})
        RETURNING id, name, email, role, password_hash AS "passwordHash"
      `) as StoredUser[];
      const user = withoutPassword(rows[0]!);
      ctx.resHeaders.append("set-cookie", sessionCookie(await createEmailSession(user.id)));
      return user;
    }),
    login: t.procedure.input(z.object({
      email: z.string().trim().email().max(320),
      password: z.string().min(1).max(200),
    })).mutation(async ({ input, ctx }) => {
      await ensureSchema();
      const sql = getSql();
      const email = input.email.toLowerCase();
      const rows = (await sql`
        SELECT id, name, email, role, password_hash AS "passwordHash"
        FROM hub_users WHERE email = ${email} LIMIT 1
      `) as StoredUser[];
      const user = rows[0];
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos." });
      }
      const safeUser = withoutPassword(user);
      ctx.resHeaders.append("set-cookie", sessionCookie(await createEmailSession(safeUser.id)));
      return safeUser;
    }),
    logout: t.procedure.mutation(({ ctx }) => {
      ctx.resHeaders.append("set-cookie", expiredSessionCookie());
      return { success: true };
    }),
  }),
  projects: t.router({
    list: t.procedure.query(async () => {
      await ensureSchema();
      const sql = getSql();
      return sql`
        SELECT
          id, name, description, price, kind,
          project_url AS "projectUrl", cover_url AS "coverUrl", cover_key AS "coverKey",
          media_kind AS "mediaKind", video_url AS "videoUrl", video_key AS "videoKey",
          iframe_url AS "iframeUrl", created_at AS "createdAt"
        FROM hub_projects
        ORDER BY created_at DESC
      `;
    }),
    create: adminProcedure.input(projectInput).mutation(async ({ input }) => {
      if (input.kind === "paid" && input.price <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Projetos pagos precisam ter um valor maior que zero." });
      }
      if (input.mediaKind === "video" && !input.videoUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Envie o vídeo de apresentação antes de publicar." });
      }
      if (input.mediaKind === "iframe" && !input.iframeUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a URL incorporável do vídeo." });
      }
      await ensureSchema();
      const sql = getSql();
      const rows = await sql`
        INSERT INTO hub_projects (name, description, price, kind, project_url, cover_url, cover_key, media_kind, video_url, video_key, iframe_url)
        VALUES (${input.name}, ${input.description}, ${input.kind === "free" ? 0 : input.price}, ${input.kind}, ${input.projectUrl}, ${input.coverUrl}, ${input.coverKey ?? null}, ${input.mediaKind}, ${input.videoUrl ?? null}, ${input.videoKey ?? null}, ${input.iframeUrl ?? null})
        RETURNING
          id, name, description, price, kind,
          project_url AS "projectUrl", cover_url AS "coverUrl", cover_key AS "coverKey",
          media_kind AS "mediaKind", video_url AS "videoUrl", video_key AS "videoKey",
          iframe_url AS "iframeUrl", created_at AS "createdAt"
      `;
      return rows[0];
    }),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await ensureSchema();
      const sql = getSql();
      const rows = await sql`DELETE FROM hub_projects WHERE id = ${input.id} RETURNING id`;
      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado." });
      }
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
export { createContext };
