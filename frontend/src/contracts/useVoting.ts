import { useCallback, useEffect, useState } from "react";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { hardhatLocal } from "../config/wagmi";
import VotingArtifact from "./Voting.json";
import { VOTING_CONTRACT_ADDRESS } from "./address";

export const votingContractConfig = {
  address: VOTING_CONTRACT_ADDRESS as `0x${string}`,
  abi: VotingArtifact.abi,
};

export const DEMO_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}`;
const DEMO_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;
export const demoAccount = privateKeyToAccount(DEMO_PRIVATE_KEY);
const publicClient = createPublicClient({
  chain: hardhatLocal,
  transport: http("http://127.0.0.1:8545"),
});
const walletClient = createWalletClient({
  account: demoAccount,
  chain: hardhatLocal,
  transport: http("http://127.0.0.1:8545"),
});

// Lecture du statut du workflow (se rafraîchit automatiquement)
export function useWorkflowStatus() {
  return useReadContract({
    ...votingContractConfig,
    functionName: "workflowStatus",
  });
}

// Lecture de l'owner
export function useVotingOwner() {
  return useReadContract({
    ...votingContractConfig,
    functionName: "owner",
  });
}

// Lecture du gagnant
export function useWinningProposalId() {
  return useReadContract({
    ...votingContractConfig,
    functionName: "winningProposalID",
  });
}

// Écriture générique (transactions)
export function useVotingWrite(demoMode = false) {
  const { isConnected } = useAccount();
  const wagmiWrite = useWriteContract();
  const wagmiTxHash = wagmiWrite.data;
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: wagmiTxHash });

  const [demoTxHash, setDemoTxHash] = useState<`0x${string}` | undefined>();
  const [demoIsPending, setDemoIsPending] = useState(false);
  const [demoIsConfirmed, setDemoIsConfirmed] = useState(false);
  const [demoError, setDemoError] = useState<Error | null>(null);

  const ensureDemoVoter = useCallback(async () => {
    try {
      const voter = (await publicClient.readContract({
        ...votingContractConfig,
        functionName: "getVoter",
        args: [demoAccount.address],
        account: demoAccount.address,
      })) as { isRegistered?: boolean } | undefined;

      if (voter?.isRegistered) {
        return;
      }
    } catch {
      // The demo account is not registered yet.
    }

    try {
      const workflowStatus = await publicClient.readContract({
        ...votingContractConfig,
        functionName: "workflowStatus",
      });

      if (Number(workflowStatus) !== 0) {
        return;
      }

      const hash = await walletClient.writeContract({
        address: votingContractConfig.address,
        abi: votingContractConfig.abi,
        functionName: "addVoter",
        args: [demoAccount.address],
        account: demoAccount,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Already registered")) {
        throw error;
      }
    }
  }, []);

  const writeContract = useCallback(
    async ({ functionName, args }: { functionName: string; args: unknown[] }) => {
      if (demoMode) {
        setDemoError(null);
        setDemoIsConfirmed(false);
        setDemoIsPending(true);

        try {
          if (functionName === "addProposal" || functionName === "setVote") {
            await ensureDemoVoter();
          }

          const hash = await walletClient.writeContract({
            address: votingContractConfig.address,
            abi: votingContractConfig.abi,
            functionName,
            args,
            account: demoAccount,
          });

          setDemoTxHash(hash);
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          setDemoIsConfirmed(receipt.status === "success");
          return hash;
        } catch (error) {
          setDemoError(error as Error);
          throw error;
        } finally {
          setDemoIsPending(false);
        }
      }

      if (!isConnected) {
        setDemoError(new Error("Connectez un wallet ou activez le mode local pour lancer une transaction."));
        return undefined;
      }

      wagmiWrite.writeContract({
        ...votingContractConfig,
        functionName,
        args,
      });
      return undefined;
    },
    [demoMode, ensureDemoVoter, isConnected, wagmiWrite],
  );

  useEffect(() => {
    if (!demoMode) {
      setDemoTxHash(undefined);
      setDemoIsPending(false);
      setDemoIsConfirmed(false);
      setDemoError(null);
    }
  }, [demoMode]);

  return {
    writeContract,
    data: demoMode ? demoTxHash : wagmiTxHash,
    isPending: demoMode ? demoIsPending : wagmiWrite.isPending,
    isConfirming: demoMode ? false : isConfirming,
    isConfirmed: demoMode ? demoIsConfirmed : isConfirmed,
    error: demoMode ? demoError : (wagmiWrite.error as Error | null),
  };
}
