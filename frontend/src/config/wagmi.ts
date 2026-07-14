import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const hardhatLocal = defineChain({
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
});

export const config = getDefaultConfig({
  appName: "Voting DApp",
  // À définir dans frontend/.env.local : VITE_WALLETCONNECT_PROJECT_ID=<votre id cloud.reown.com>
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "b133cc9d18454bbcba4ec9447a8ef263",
  chains: [hardhatLocal],
  ssr: false,
});
