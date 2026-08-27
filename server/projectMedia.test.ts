import { describe, expect, it, vi } from "vitest";

const { storagePutMock } = vi.hoisted(() => ({ storagePutMock: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: storagePutMock }));

import { mediaByteLength, sanitizeMediaFilename, uploadProjectMedia, validateProjectMedia } from "./projectMedia";
import { createEmailSession, getEmailSessionUserId, hashPassword, verifyPassword } from "./passwordAuth";

describe("project media validation", () => {
  it("normalizes upload filenames safely", () => {
    expect(sanitizeMediaFilename("Capa Clínica 01.PNG")).toBe("capa-clinica-01.png");
  });

  it("calculates decoded base64 byte length", () => {
    expect(mediaByteLength("YWJjZA==")).toBe(4);
  });

  it("accepts a valid image cover", () => {
    expect(() => validateProjectMedia("cover", "image/png", "YWJjZA==")).not.toThrow();
  });

  it("stores a valid cover in the project media path", async () => {
    storagePutMock.mockResolvedValueOnce({ key: "projects/7/cover/123-capa.png", url: "/manus-storage/capa.png" });
    const result = await uploadProjectMedia({ ownerId: 7, slot: "cover", filename: "Capa.png", mimeType: "image/png", base64: "YWJjZA==" });
    expect(storagePutMock).toHaveBeenCalledWith(expect.stringMatching(/^projects\/7\/cover\/\d+-capa\.png$/), expect.any(Buffer), "image/png");
    expect(result.url).toBe("/manus-storage/capa.png");
  });

  it("rejects a non-image file selected as cover", () => {
    expect(() => validateProjectMedia("cover", "video/mp4", "YWJjZA==")).toThrow("imagem válida");
  });

  it("rejects a non-video file selected as video", () => {
    expect(() => validateProjectMedia("video", "image/jpeg", "YWJjZA==")).toThrow("arquivo de vídeo válido");
  });

  it("hashes and verifies passwords without accepting an incorrect value", async () => {
    const hash = await hashPassword("senha-segura-123");
    await expect(verifyPassword("senha-segura-123", hash)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", hash)).resolves.toBe(false);
  });

  it("creates and validates an email-password session token", async () => {
    const priorSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "secret-for-email-session-tests-only";
    const token = await createEmailSession(42);
    await expect(getEmailSessionUserId(token)).resolves.toBe(42);
    process.env.JWT_SECRET = priorSecret;
  });
});
