import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getEmailSessionUserId, EMAIL_SESSION_COOKIE } from "../server/passwordAuth";
import { getVercelUserById } from "../server/vercelRouter";

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  const prefix = `${name}=`;
  return header.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

export default async function handler(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;
  const response = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      const rawToken = readCookie(request, EMAIL_SESSION_COOKIE);
      const userId = await getEmailSessionUserId(rawToken ? decodeURIComponent(rawToken) : undefined);
      const user = userId ? await getVercelUserById(userId) : null;
      if (!user || user.role !== "admin") {
        throw new Error("Apenas administradores podem enviar arquivos.");
      }
      const isCover = pathname.startsWith("projects/covers/");
      return {
        allowedContentTypes: isCover ? ["image/jpeg", "image/png", "image/webp", "image/gif"] : ["video/mp4", "video/webm", "video/quicktime"],
        maximumSizeInBytes: 25 * 1024 * 1024,
        addRandomSuffix: true,
      };
    },
    onUploadCompleted: async () => {},
  });
  return Response.json(response);
}
