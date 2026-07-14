import { useAccount, useReadContract } from "wagmi";
import { DEMO_ADDRESS, useWinningProposalId, useWorkflowStatus, votingContractConfig } from "../contracts/useVoting";

interface WinnerProps {
  demoMode: boolean;
}

export function Winner({ demoMode }: WinnerProps) {
  const { address } = useAccount();
  const { data: status } = useWorkflowStatus();
  const { data: winningId } = useWinningProposalId();

  const readerAddress = demoMode ? DEMO_ADDRESS : address;

  const { data: winningProposal } = useReadContract({
    ...votingContractConfig,
    functionName: "getOneProposal",
    args: winningId !== undefined ? [BigInt(winningId as number)] : undefined,
    account: readerAddress,
    query: {
      enabled: winningId !== undefined && !!readerAddress && Number(status ?? 0) === 5,
    },
  });

  if (Number(status ?? 0) !== 5) return null;

  const proposalDesc = (winningProposal as any)?.description;

  return (
    <section className="animate-fade-up rounded-[28px] border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900/60 p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-400">Résultat final</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white">Proposition gagnante</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Le dépouillement est terminé. La proposition #{winningId?.toString()} a été élue.
          </p>
          {proposalDesc && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Description :</span>
              <p className="mt-1 text-sm italic text-slate-200">“{proposalDesc}”</p>
            </div>
          )}
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/20 text-xl font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-float">
          🏆
        </div>
      </div>
    </section>
  );
}
