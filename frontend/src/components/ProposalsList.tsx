import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { DEMO_ADDRESS, useVotingOwner, useVotingWrite, votingContractConfig } from "../contracts/useVoting";

interface Proposal {
  id: number;
  description: string;
  voteCount: bigint;
  proposer: string;
  isCancelled: boolean;
}

interface ProposalsListProps {
  demoMode: boolean;
}

export function ProposalsList({ demoMode }: ProposalsListProps) {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { data: owner } = useVotingOwner();
  const { writeContract, isPending, isConfirming, isConfirmed, error: writeError } = useVotingWrite(demoMode);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [newProposal, setNewProposal] = useState("");
  const [loading, setLoading] = useState(false);

  const loadProposals = useCallback(async () => {
    if (!publicClient) return;
    const readerAddress = demoMode ? DEMO_ADDRESS : address;
    if (!readerAddress) {
      setProposals([]);
      return;
    }
    setLoading(true);
    try {
      const logs = (await publicClient.getContractEvents({
        ...votingContractConfig,
        eventName: "ProposalRegistered",
        fromBlock: 0n,
        toBlock: "latest",
      })) as Array<any> | undefined;

      const ids = Array.isArray(logs) ? logs.map((log: any) => Number(log?.args?.proposalId)) : [];
      const results = await Promise.all(
        ids.map(async (id) => {
          const proposal: any = await publicClient.readContract({
            ...votingContractConfig,
            functionName: "getOneProposal",
            args: [BigInt(id)],
            account: readerAddress,
          });
          return {
            id,
            description: proposal?.description ?? "",
            voteCount: proposal?.voteCount ?? 0n,
            proposer: proposal?.proposer ?? "",
            isCancelled: proposal?.isCancelled ?? false,
          };
        }),
      );

      setProposals(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error("Failed to load proposals:", error);
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [publicClient, demoMode, address]);

  useWatchContractEvent({
    ...votingContractConfig,
    onLogs() {
      void loadProposals();
    },
  });

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const submitProposal = () => {
    if (!newProposal.trim()) return;
    void writeContract({
      functionName: "addProposal",
      args: [newProposal],
    });
    setNewProposal("");
  };

  const vote = (id: number) => {
    void writeContract({
      functionName: "setVote",
      args: [BigInt(id)],
    });
  };

  const cancelProposal = (id: number) => {
    void writeContract({
      functionName: "cancelProposal",
      args: [BigInt(id)],
    });
  };

  const safeProposals = Array.isArray(proposals) ? proposals : [];
  const sortedProposals = [...safeProposals].sort((left, right) => {
    // Keep cancelled proposals at the bottom
    if (left.isCancelled && !right.isCancelled) return 1;
    if (!left.isCancelled && right.isCancelled) return -1;
    return Number(right.voteCount - left.voteCount);
  });

  return (
    <section className="glass-panel p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-400">Participation</p>
          <h2 className="panel-title mt-2">Propositions</h2>
        </div>
        <button
          className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          onClick={loadProposals}
          disabled={loading}
        >
          {loading ? "Chargement…" : "Actualiser"}
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row">
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-sm outline-none transition focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)] placeholder:text-slate-600"
          placeholder="Rédigez votre proposition..."
          value={newProposal}
          onChange={(event) => setNewProposal(event.target.value)}
        />
        <button
          className="rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-bold text-white transition hover:from-violet-500 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.55)] cursor-pointer"
          disabled={isPending || isConfirming}
          onClick={submitProposal}
        >
          Proposer
        </button>
      </div>

      {isPending && <p className="mt-3 text-sm text-slate-400">Confirme la transaction dans votre wallet…</p>}
      {isConfirming && <p className="mt-3 text-sm text-violet-300 animate-pulse">Validation de la proposition en cours…</p>}
      {isConfirmed && <p className="mt-3 text-sm font-semibold text-emerald-400">Proposition enregistrée avec succès !</p>}
      {writeError && <p className="mt-3 text-sm font-semibold text-rose-400">{writeError.message.slice(0, 150)}</p>}

      {safeProposals.length === 0 && !loading ? (
        <p className="mt-4 text-sm text-slate-400">Aucune proposition n’a encore été soumise.</p>
      ) : (
        <div className="mt-5 grid gap-3">
          {sortedProposals.map((proposal) => {
            const isProposerOrOwner = !!(demoMode || (address && (
              address.toLowerCase() === proposal.proposer.toLowerCase() ||
              (owner && address.toLowerCase() === (owner as string).toLowerCase())
            )));

            return (
              <article
                key={proposal.id}
                className={`flex flex-col gap-4 rounded-2xl border p-4 transition-all duration-300 sm:flex-row sm:items-center sm:justify-between ${
                  proposal.isCancelled
                    ? "border-rose-500/10 bg-rose-950/5 opacity-50"
                    : "border-white/5 bg-white/3 shadow-inner hover:-translate-y-0.5 hover:border-violet-500/20 hover:bg-white/5 hover:shadow-[0_0_20px_rgba(139,92,246,0.05)]"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-950 border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300">#{proposal.id}</span>
                    {proposal.isCancelled ? (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-400">Annulée</span>
                    ) : (
                      <span className="text-xs font-semibold border border-violet-500/20 bg-violet-500/5 px-2 py-0.5 rounded-full text-violet-300">
                        {proposal.voteCount.toString()} voix
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 text-sm leading-6 text-slate-200 ${proposal.isCancelled ? "line-through text-slate-500" : ""}`}>
                    {proposal.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isProposerOrOwner && !proposal.isCancelled && (
                    <button
                      className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      disabled={isPending || isConfirming}
                      onClick={() => cancelProposal(proposal.id)}
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    className="rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2.5 text-xs font-bold text-white transition hover:from-violet-500 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-[0_0_10px_rgba(139,92,246,0.25)] hover:shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                    disabled={isPending || isConfirming || proposal.isCancelled}
                    onClick={() => vote(proposal.id)}
                  >
                    Voter
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
