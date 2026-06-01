"use client";

import { createConfig } from "@lifi/sdk";
import { type ReactNode } from "react";

createConfig({
  integrator: "Suivan",
});

export function LifiSdkProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
