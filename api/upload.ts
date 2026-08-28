import { getSupabaseAdmin, getSupabaseUserFromRequest, SUPABASE_MEDIA_BUCKET } from "../server/vercelRouter";

function response(data: unknown, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "no-store" } }); }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") return response({ error: "Método não permitido." }, 405);
  const user = await getSupabaseUserFromRequest(request).catch(() => null);
  if (!user || user.role !== "admin") return response({ error: "Apenas administradores podem enviar arquivos." }, 401);
  const body = await request.json() as { slot?: "cover" | "video"; filename?: string; mimeType?: string };
  const slot = body.slot;
  const filename = body.filename?.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-160);
  const mimeType = body.mimeType;
  const acceptedTypes = slot === "cover" ? ["image/jpeg", "image/png", "image/webp", "image/gif"] : ["video/mp4", "video/webm", "video/quicktime"];
  if (!slot || !filename || !mimeType || !acceptedTypes.includes(mimeType)) return response({ error: "Tipo de arquivo não permitido." }, 400);
  const path = `${slot === "cover" ? "covers" : "videos"}/${crypto.randomUUID()}-${filename}`;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage.from(SUPABASE_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return response({ error: error?.message ?? "Não foi possível criar a URL de upload." }, 500);
  const publicUrl = admin.storage.from(SUPABASE_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  return response({ path, token: data.token, publicUrl });
}
