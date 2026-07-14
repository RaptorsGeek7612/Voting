import { useState } from "react";
import { useAccount } from "wagmi";
import { useVotingOwner, useVotingWrite } from "../contracts/useVoting";

interface OwnerPanelProps {
  demoMode: boolean;
}

export function OwnerPanel({ demoMode }: OwnerPanelProps) {
  const { address } = useAccount();
  const { data: owner } = useVotingOwner();
  const { writeContract, isPending, isConfirming, isConfirmed, error: writeError } = useVotingWrite(demoMode);
  const [voterAddress, setVoterAddress] = useState("");
  const [manualStatus, setManualStatus] = useState<number>(0);

  const isOwner = demoMode || (address && owner && address.toLowerCase() === (owner as string).toLowerCase());

  if (!isOwner) return null;

  const busy = isPending || isConfirming;

  const callFunction = (functionName: string, args: unknown[] = []) => {
    void writeContract({ functionName, args });
  };

  return (
    <section className="glass-panel relative overflow-hidden p-5 sm:p-8">
      <div className="absolute right-4 top-4 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-300">
        Owner Panel
      </div>
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-400">Administration</p>
          <h2 className="panel-title mt-2">Panneau de l’organisateur</h2>
          <p className="soft-text mt-2">Gérez le cycle de vote depuis un tableau clair et sécurisé.</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white shadow-sm outline-none transition focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)] placeholder:text-slate-600"
            placeholder="0x... adresse du votant à inscrire"
            value={voterAddress}
            onChange={(event) => setVoterAddress(event.target.value)}
          />
          <button
            className="rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3 text-sm font-bold text-white transition hover:from-violet-500 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.55)] cursor-pointer"
            disabled={busy || !voterAddress}
            onClick={() => callFunction("addVoter", [voterAddress])}
          >
            Inscrire le votant
          </button>
        </div>

        {isPending && <p className="text-sm text-slate-400">Confirme la transaction dans votre wallet…</p>}
        {isConfirming && <p className="text-sm text-slate-400 font-medium animate-pulse text-violet-300">Transaction en cours de validation sur la blockchain…</p>}
        {isConfirmed && <p className="text-sm font-semibold text-emerald-400">Transaction confirmée avec succès !</p>}
        {writeError && <p className="text-sm font-semibold text-rose-400">{writeError.message.slice(0, 150)}</p>}

        <div className="flex flex-wrap gap-2.5">
          <button
            className="rounded-2xl border border-violet-500/20 bg-violet-600/10 px-4 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-600/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            disabled={busy}
            onClick={() => callFunction("startProposalsRegistering")}
          >
            Ouvrir les propositions
          </button>
          <button
            className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            disabled={busy}
            onClick={() => callFunction("endProposalsRegistering")}
          >
            Fermer les propositions
          </button>
          <button
            className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            disabled={busy}
            onClick={() => callFunction("startVotingSession")}
          >
            Démarrer le vote
          </button>
          <button
            className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            disabled={busy}
            onClick={() => callFunction("endVotingSession")}
          >
            Clôturer le vote
          </button>
          <button
            className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            disabled={busy}
            onClick={() => callFunction("tallyVotes")}
          >
            Dépouiller les votes
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Contrôle Manuel du Workflow (Mode Debug)</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-200 shadow-sm outline-none transition focus:border-violet-500 disabled:opacity-50"
              value={manualStatus}
              onChange={(e) => setManualStatus(Number(e.target.value))}
              disabled={busy}
            >
              <option value={0}>0 - Inscription des votants</option>
              <option value={1}>1 - Enregistrement des propositions</option>
              <option value={2}>2 - Propositions closes</option>
              <option value={3}>3 - Session de vote</option>
              <option value={4}>4 - Session close</option>
              <option value={5}>5 - Votes dépouillés</option>
            </select>
            <button
              className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-5 py-3 text-sm font-bold text-fuchsia-300 transition hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(217,70,239,0.1)] hover:shadow-[0_0_20px_rgba(217,70,239,0.2)]"
              disabled={busy}
              onClick={() => callFunction("setWorkflowStatus", [manualStatus])}
            >
              Forcer le statut
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
