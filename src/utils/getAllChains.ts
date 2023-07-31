import { type Chain, allChains } from "@thirdweb-dev/chains";

// Code copied from thirdweb dashboard's `chainlist.tsx`

export type MinimalRPCChain = Pick<Chain, "slug" | "name" | "chainId"> & {
  iconUrl: string;
  symbol: string;
  hasRpc: boolean;
};

export function getAllChains(): MinimalRPCChain[] {
  const chains = allChains
    .filter((c) => c.chainId !== 1337)
    .map((chain) => ({
      slug: chain.slug,
      name: chain.name,
      chainId: chain.chainId,
      iconUrl: chain?.icon?.url || "",
      symbol: chain.nativeCurrency.symbol,
      hasRpc:
        "rpc" in chain &&
        chain.rpc.findIndex((c) => c.indexOf("thirdweb.com") > -1) > -1,
    }));
  return chains;
}
