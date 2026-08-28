import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "../../server/vercelRouter";

const endpoint = "/api/trpc";

export function errorResponse(request: Request, error: unknown) {
  const message = error instanceof Error ? error.message : "Falha interna ao processar a solicitação.";
  console.error("[api/trpc]", error);
  const payload = {
    error: {
      message,
      code: -32603,
      data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
    },
  };
  const isBatch = new URL(request.url).searchParams.get("batch") === "1";
  return Response.json(isBatch ? [payload] : payload, { status: 500, headers: { "Cache-Control": "no-store" } });
}

export default async function handler(request: Request): Promise<Response> {
  try {
    return await fetchRequestHandler({
      endpoint,
      req: request,
      router: appRouter,
      createContext,
      responseMeta({ ctx }) {
        return { headers: ctx?.resHeaders };
      },
    });
  } catch (error) {
    return errorResponse(request, error);
  }
}

export const config = { runtime: "edge" };
