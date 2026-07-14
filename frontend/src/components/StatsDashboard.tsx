import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { DEMO_ADDRESS, useWorkflowStatus, votingContractConfig } from "../contracts/useVoting";

const STATUS_LABELS = [
  "Inscription",
  "Propositions",
  "Clôture propositions",
  "Vote",
  "Clôture vote",
  "Résultat",
];

const STATUS_DESCRIPTIONS = [
  "Les votants sont en cours d’inscription.",
  "Les propositions sont ouvertes.",
  "La soumission de propositions est clôturée.",
  "La session de vote est active.",
  "Le vote est clôturé, le dépouillement approche.",
  "Les résultats sont finalisés.",
];

interface StatsDashboardProps {
  demoMode: boolean;
}

export function StatsDashboard({ demoMode }: StatsDashboardProps) {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { data: workflowStatus, isLoading: isStatusLoading } = useWorkflowStatus();
  const [stats, setStats] = useState({ proposalCount: 0, totalVotes: 0, loading: false });

  const loadStats = useCallback(async () => {
    if (!publicClient) return;
    const readerAddress = demoMode ? DEMO_ADDRESS : address;
    if (!readerAddress) {
      setStats({ proposalCount: 0, totalVotes: 0, loading: false });
      return;
    }

    setStats((current) => ({ ...current, loading: true }));

    try {
      const logs = (await publicClient.getContractEvents({
        ...votingContractConfig,
        eventName: "ProposalRegistered",
        fromBlock: 0n,
        toBlock: "latest",
      })) as Array<any> | undefined;

      const ids = Array.isArray(logs) ? logs.map((log: any) => Number(log?.args?.proposalId)) : [];
      const proposals = await Promise.all(
        ids.map(async (id) => {
          const proposal: any = await publicClient.readContract({
            ...votingContractConfig,
            functionName: "getOneProposal",
            args: [BigInt(id)],
            account: readerAddress,
          });
          return proposal;
        }),
      );

      const totalVotes = (Array.isArray(proposals) ? proposals : []).reduce((sum, proposal) => sum + Number(proposal?.voteCount ?? 0), 0);
      setStats({ proposalCount: ids.length, totalVotes, loading: false });
    } catch (error) {
      console.error("Failed to load stats:", error);
      setStats((current) => ({ ...current, loading: false }));
    }
  }, [publicClient, demoMode, address]);

  useWatchContractEvent({
    ...votingContractConfig,
    onLogs() {
      void loadStats();
    },
  });

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const phaseIndex = Number(workflowStatus ?? 0);
  const progress = Math.min(100, Math.round((phaseIndex / 5) * 100));
  const engagement = stats.totalVotes > 0 ? Math.min(100, Math.round((stats.totalVotes / 10) * 100)) : 0;

  return (
    <section className="glass-panel p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-400">Tableau de bord</p>
          <h2 className="panel-title mt-2">Vue synthétique du vote</h2>
        </div>
        <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-300">
          {isStatusLoading ? "Chargement…" : STATUS_LABELS[phaseIndex] ?? "En cours"}
        </span>
      </div>

      <p className="soft-text mt-3">{STATUS_DESCRIPTIONS[phaseIndex] ?? "Suivi continu du processus."}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-white/5 bg-white/3 p-4 shadow-inner transition-transform duration-300 hover:-translate-y-0.5">
          <p className="text-sm text-slate-400">Propositions</p>
          <p className="mt-2 text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
            {stats.loading ? "…" : stats.proposalCount}
          </p>
        </article>
        <article className="rounded-2xl border border-white/5 bg-white/3 p-4 shadow-inner transition-transform duration-300 hover:-translate-y-0.5">
          <p className="text-sm text-slate-400">Voix exprimées</p>
          <p className="mt-2 text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
            {stats.loading ? "…" : stats.totalVotes}
          </p>
        </article>
        <article className="rounded-2xl border border-white/5 bg-white/3 p-4 shadow-inner transition-transform duration-300 hover:-translate-y-0.5">
          <p className="text-sm text-slate-400">Participation</p>
          <p className="mt-2 text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
            {engagement}%
          </p>
        </article>
      </div>

      <div className="mt-5 rounded-2xl border border-white/5 bg-white/3 p-4">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Progression du cycle</span>
          <span className="font-bold text-violet-300">{progress}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-950" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 transition-all duration-700 shadow-[0_0_15px_rgba(167,139,250,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
