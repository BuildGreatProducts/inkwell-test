"use client";

import { ClerkProvider as BaseClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";

export function ClerkProvider({ children }: { children: ReactNode }) {
  return (
    <BaseClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#5b6cf0",
          colorBackground: "#ffffff",
          colorText: "#1c1917",
          colorTextSecondary: "#78716c",
          borderRadius: "0.75rem",
        },
        elements: {
          formButtonPrimary:
            "bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors",
          card: "shadow-lg rounded-2xl",
          headerTitle: "font-heading",
          headerSubtitle: "text-neutral-500",
        },
      }}
    >
      {children}
    </BaseClerkProvider>
  );
}
