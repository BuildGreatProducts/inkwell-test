"use client";

import { ReactNode } from "react";
import { ClerkProvider } from "./clerk-provider";
import { ConvexClientProvider } from "./convex-provider";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export { ClerkProvider } from "./clerk-provider";
export { ConvexClientProvider } from "./convex-provider";
