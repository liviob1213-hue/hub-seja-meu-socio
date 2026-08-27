import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createContext } from "../../server/vercelRouter";

const endpoint = "/api/trpc";

export default async function handler(request: Request): Promise<Response> {
  return fetchRequestHandler({
    endpoint,
    req: request,
    router: appRouter,
    createContext,
    responseMeta({ ctx }) {
      return { headers: ctx?.resHeaders };
    },
  });
}
