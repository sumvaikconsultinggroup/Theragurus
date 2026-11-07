"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import type { ReactNode } from "react";

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  return <ClerkProvider ui={ui}>{children}</ClerkProvider>;
}
