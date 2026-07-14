import { useQueryClient } from "@tanstack/react-query";
import { useWatchContractEvent } from "wagmi";
import { useWorkflowStatus, votingContractConfig } from "../contracts/useVoting";

const STATUS_LABELS = [
  "Inscription des votants",
  "Enregistrement des propositions",
  "Propositions closes",
  "Session de vote",
  "Session close",
  "Votes dépouillés",
];

const STATUS_DESCRIPTIONS = [
  "L’organisateur prépare la phase d’inscription avant d’autoriser toute participation.",
  "Les électeurs peuvent maintenant proposer des idées ou des initiatives.",
  "La soumission de propositions est close. La phase de vote approche.",
  "Chaque votant peut désormais exprimer son choix sur les propositions soumises.",
  "La session de vote est clôturée, le dépouillement est imminent.",
  "Le résultat final a été calculé et le gagnant est visible.",
];

export function WorkflowStatus() {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useWorkflowStatus();
  const index = Number(status ?? 0);

  useWatchContractEvent({
    ...votingContractConfig,
    onLogs() {
      void queryClient.invalidateQueries();
    },
  });

  return (
    <section className="glass-panel p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-400">État du processus</p>
          <h2 className="panel-title mt-2">Cycle de vote</h2>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold border ${
            index === 5
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : index >= 3
              ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300"
              : "border-violet-500/30 bg-violet-500/10 text-violet-300"
          }`}
        >
          {isLoading ? "Chargement…" : STATUS_LABELS[index]}
        </span>
      </div>

      <p className="soft-text mt-3">{isLoading ? "Récupération du statut en cours…" : STATUS_DESCRIPTIONS[index]}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Étapes du vote">
        {STATUS_LABELS.map((label, currentIndex) => {
          const isDone = currentIndex < index;
          const isCurrent = currentIndex === index;

          return (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-300 ${
                isDone
                  ? "border-emerald-500/20 bg-emerald-500/5 text-slate-300"
                  : isCurrent
                  ? "border-violet-500/40 bg-violet-500/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)] animate-pulse-glow"
                  : "border-white/5 bg-slate-950/20 text-slate-500"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isDone
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                    : isCurrent
                    ? "bg-violet-600 text-white border border-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                    : "bg-slate-900 border border-white/5 text-slate-600"
                }`}
              >
                {currentIndex + 1}
              </div>
              <span className="text-sm font-semibold">{label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
