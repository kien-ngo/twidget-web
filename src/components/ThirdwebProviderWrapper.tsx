"use client";

import { ThirdwebProvider } from "@thirdweb-dev/react";
import { ReactNode } from "react";

export default function ThirdwebProviderWrapper({
  activeChain,
  children,
}: {
  activeChain?: string;
  children: ReactNode;
}) {
  return (
    <ThirdwebProvider
      activeChain={activeChain}
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_API_KEY}
    >
      {children}
    </ThirdwebProvider>
  );
}
