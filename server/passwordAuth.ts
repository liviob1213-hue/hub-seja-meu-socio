import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";

const scrypt = promisify(scryptCallback);
export const EMAIL_SESSION_COOKIE = "hub_email_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function passwordSecret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("A configuração de sessão não está disponível.");
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, key] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "hex");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createEmailSession(userId: number) {
  return new SignJWT({ type: "email-password" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(passwordSecret());
}

export async function getEmailSessionUserId(token?: string) {
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, passwordSecret());
    if (verified.payload.type !== "email-password" || !verified.payload.sub) return null;
    const id = Number(verified.payload.sub);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export const emailSessionMaxAgeMs = SESSION_DURATION_SECONDS * 1000;
