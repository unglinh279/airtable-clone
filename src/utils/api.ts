import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { QueryClient } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "~/server/api/root";

export const api = createTRPCReact<AppRouter>();

export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "";
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
};

export const trpcClient = api.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});

export const queryClient = new QueryClient();
