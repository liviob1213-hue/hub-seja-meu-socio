import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { createPasswordUser, createProject, deleteProject, getUserByEmail, listProjects } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createEmailSession, EMAIL_SESSION_COOKIE, emailSessionMaxAgeMs, hashPassword, verifyPassword } from "./passwordAuth";
import { uploadProjectMedia } from "./projectMedia";

const emailAuthInput = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(72),
});

function safeUser(user: NonNullable<Awaited<ReturnType<typeof getUserByEmail>>>) {
  const { passwordHash: _passwordHash, ...data } = user;
  return data;
}

function setEmailSessionCookie(ctx: { req: any; res: any }, token: string) {
  ctx.res.cookie(EMAIL_SESSION_COOKIE, token, { ...getSessionCookieOptions(ctx.req), maxAge: emailSessionMaxAgeMs });
}

const projectInput = z.object({
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().min(12).max(1600),
  price: z.number().nonnegative(),
  kind: z.enum(["free", "paid"]),
  projectUrl: z.string().url(),
  coverUrl: z.string().min(1).max(2000),
  coverKey: z.string().max(512).optional(),
  mediaKind: z.enum(["image", "video", "iframe"]),
  videoUrl: z.string().max(2000).optional(),
  videoKey: z.string().max(512).optional(),
  iframeUrl: z.string().max(2000).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user ? safeUser(opts.ctx.user) : null),
    register: publicProcedure.input(emailAuthInput.extend({ name: z.string().trim().min(2).max(80) })).mutation(async ({ ctx, input }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) throw new Error("Já existe uma conta com este e-mail.");
      const user = await createPasswordUser({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password) });
      setEmailSessionCookie(ctx, await createEmailSession(user.id));
      return { user };
    }),
    login: publicProcedure.input(emailAuthInput.pick({ email: true, password: true })).mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email);
      if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw new Error("E-mail ou senha incorretos.");
      setEmailSessionCookie(ctx, await createEmailSession(user.id));
      return { user: safeUser(user) };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      ctx.res.clearCookie(EMAIL_SESSION_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  projects: router({
    list: publicProcedure.query(() => listProjects()),
    create: adminProcedure.input(projectInput).mutation(async ({ input }) => {
      if (input.kind === "paid" && input.price <= 0) throw new Error("Projetos pagos precisam ter um valor maior que zero.");
      if (input.mediaKind === "video" && !input.videoUrl) throw new Error("Envie um vídeo antes de publicar o projeto.");
      if (input.mediaKind === "iframe" && !input.iframeUrl) throw new Error("Informe o link incorporável do vídeo.");
      await createProject(input);
      return { success: true } as const;
    }),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await deleteProject(input.id);
      return { success: true } as const;
    }),
    uploadMedia: adminProcedure.input(z.object({
      slot: z.enum(["cover", "video"]),
      filename: z.string().min(1).max(240),
      mimeType: z.string().min(3).max(120),
      base64: z.string().min(1).max(36_000_000),
    })).mutation(({ ctx, input }) => uploadProjectMedia({ ownerId: ctx.user.id, ...input })),
  }),
});

export type AppRouter = typeof appRouter;
