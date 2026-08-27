import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/vercelRouter";

export const trpc = createTRPCReact<AppRouter>();
