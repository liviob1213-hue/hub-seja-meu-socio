import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { trpc } from "./lib/trpc";
import "./index.css";

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [httpBatchLink({ url: `${window.location.origin}/api/trpc`, transformer: superjson })],
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
);
