import { storagePut } from "./storage";

export const MAX_PROJECT_MEDIA_BYTES = 25 * 1024 * 1024;

export function sanitizeMediaFilename(filename: string) {
  const normalized = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cleaned = normalized.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "arquivo";
}

export function mediaByteLength(base64: string) {
  const normalized = base64.replace(/\s/g, "").replace(/=+$/, "");
  return Math.floor((normalized.length * 3) / 4);
}

export function validateProjectMedia(slot: "cover" | "video", mimeType: string, base64: string) {
  const validType = slot === "cover" ? mimeType.startsWith("image/") : mimeType.startsWith("video/");
  if (!validType) throw new Error(slot === "cover" ? "Envie uma imagem válida para a capa." : "Envie um arquivo de vídeo válido.");
  if (!base64 || mediaByteLength(base64) === 0) throw new Error("O arquivo enviado está vazio.");
  if (mediaByteLength(base64) > MAX_PROJECT_MEDIA_BYTES) throw new Error("O arquivo ultrapassa o limite de 25 MB.");
}

export async function uploadProjectMedia(input: {
  ownerId: number;
  slot: "cover" | "video";
  filename: string;
  mimeType: string;
  base64: string;
}) {
  validateProjectMedia(input.slot, input.mimeType, input.base64);
  const cleanName = sanitizeMediaFilename(input.filename);
  const data = Buffer.from(input.base64, "base64");
  const result = await storagePut(`projects/${input.ownerId}/${input.slot}/${Date.now()}-${cleanName}`, data, input.mimeType);
  return result;
}
