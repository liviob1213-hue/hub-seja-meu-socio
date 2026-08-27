import { beforeAll, describe, expect, it } from "vitest";
import { createEmailSession, getEmailSessionUserId, hashPassword, verifyPassword } from "./passwordAuth";

beforeAll(() => {
  process.env.JWT_SECRET = "chave-de-teste-da-api-vercel";
});

describe("autenticação por e-mail da API Vercel", () => {
  it("gera um hash scrypt que só aceita a senha correta", async () => {
    const hash = await hashPassword("senha-segura-123");

    await expect(verifyPassword("senha-segura-123", hash)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", hash)).resolves.toBe(false);
    expect(hash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  });

  it("assina e recupera o identificador do usuário na sessão", async () => {
    const token = await createEmailSession(42);

    await expect(getEmailSessionUserId(token)).resolves.toBe(42);
    await expect(getEmailSessionUserId("token-inválido")).resolves.toBeNull();
  });
});
