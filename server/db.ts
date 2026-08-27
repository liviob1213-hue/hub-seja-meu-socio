import { count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, projects, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createPasswordUser(input: { name: string; email: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível. Tente novamente em instantes.");
  const [totals] = await db.select({ value: count() }).from(users);
  const role = totals?.value === 0 ? "admin" : "user";
  const result = await db.insert(users).values({
    openId: `email:${crypto.randomUUID()}`,
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    loginMethod: "email-password",
    role,
    lastSignedIn: new Date(),
  });
  return { id: Number(result[0].insertId), name: input.name, email: input.email, role };
}

async function projectDb() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível. Tente novamente em instantes.");
  return db;
}

const starterProjects = [
  {
    name: "SaaS de Gestão para Clínicas",
    description: "Projeto Lovable com estrutura de dashboard, agenda e indicadores para você modelar para um nicho específico.",
    price: "297.00",
    kind: "paid" as const,
    projectUrl: "https://lovable.dev",
    coverUrl: "/manus-storage/product-launch-kit_87eeff3c.jpg",
    mediaKind: "image" as const,
  },
  {
    name: "Landing Page de Produto Digital",
    description: "Base de landing page com blocos de oferta, prova de valor e conversão para adaptar ao seu produto.",
    price: "147.00",
    kind: "paid" as const,
    projectUrl: "https://lovable.dev",
    coverUrl: "/manus-storage/product-sales-class_78b877c6.jpg",
    mediaKind: "image" as const,
  },
  {
    name: "Portal de Clientes para Agências",
    description: "Projeto de área de cliente para organizar entregas, briefing e aprovações da sua operação.",
    price: "0.00",
    kind: "free" as const,
    projectUrl: "https://lovable.dev",
    coverUrl: "/manus-storage/product-growth-map_1a2920a1.jpg",
    mediaKind: "image" as const,
  },
];

export async function listProjects() {
  const db = await projectDb();
  const result = await db.select().from(projects).orderBy(desc(projects.createdAt));
  if (result.length > 0) return result;
  await db.insert(projects).values(starterProjects);
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export type CreateProjectData = {
  name: string;
  description: string;
  price: number;
  kind: "free" | "paid";
  projectUrl: string;
  coverUrl: string;
  coverKey?: string;
  mediaKind: "image" | "video" | "iframe";
  videoUrl?: string;
  videoKey?: string;
  iframeUrl?: string;
};

export async function createProject(data: CreateProjectData) {
  const db = await projectDb();
  await db.insert(projects).values({
    ...data,
    price: data.kind === "free" ? "0.00" : data.price.toFixed(2),
    coverKey: data.coverKey ?? null,
    videoUrl: data.videoUrl ?? null,
    videoKey: data.videoKey ?? null,
    iframeUrl: data.iframeUrl ?? null,
  });
}

export async function deleteProject(id: number) {
  const db = await projectDb();
  await db.delete(projects).where(eq(projects.id, id));
}
