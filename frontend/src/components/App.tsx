import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useAccount } from "wagmi";
import Footer from "./Footer";
import { OwnerPanel } from "./OwnerPanel";
import { ProposalsList } from "./ProposalsList";
import { StatsDashboard } from "./StatsDashboard";
import { Winner } from "./Winner";
import { WorkflowStatus } from "./WorkflowStatus";

function formatAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function App() {
  const { address, isConnected } = useAccount();
  const [demoMode, setDemoMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("voting-demo-mode") === "true";
  });

  const toggleDemoMode = () => {
    const nextValue = !demoMode;
    setDemoMode(nextValue);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("voting-demo-mode", String(nextValue));
    }
  };

  const canUseApp = isConnected || demoMode;

  return (
    <div className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="relative overflow-hidden rounded-[32px] border border-white/5 bg-slate-950/45 p-6 backdrop-blur-xl shadow-2xl sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.15),_transparent_40%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-violet-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400" />
                Gouvernance On-Chain
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300">
                Tableau de bord de vote transparent
              </h1>
              <p className="max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                Suivez chaque étape du processus, gérez les inscriptions et laissez les participants proposer
                puis voter depuis une seule interface fluide.
              </p>
              <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1">⚡ Temps réel</span>
                <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1">🔐 Wallet connecté</span>
                <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1">📊 Statistiques live</span>
              </div>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
              <ConnectButton />
              <button
                type="button"
                onClick={toggleDemoMode}
                className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-sm font-semibold text-fuchsia-300 transition hover:bg-fuchsia-500/20"
              >
                {demoMode ? "Mode local activé • tester sans frais" : "Tester sans frais sur la chaîne locale"}
              </button>
            </div>
          </div>
        </header>

        {!canUseApp ? (
          <>
            <section className="glass-panel p-6 sm:p-8">
              <h2 className="panel-title">Connectez votre wallet</h2>
              <p className="soft-text mt-2">
                Branchez votre portefeuille pour consulter le statut du vote, soumettre une proposition ou
                participer à la session de vote — ou activez le mode local pour tester sans frais.
              </p>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="glass-panel p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-400">Connexion</p>
                <h2 className="panel-title mt-2">Un flux simple pour chaque participant</h2>
                <p className="soft-text mt-2">
                  Connectez votre wallet, suivez la phase actuelle et interagissez avec les propositions depuis un
                  tableau d’accueil pensé pour mobile et bureau.
                </p>
              </div>
              <div className="glass-panel p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-fuchsia-400">Mode local</p>
                <h2 className="panel-title mt-2">Chaîne Hardhat locale</h2>
                <p className="soft-text mt-2">
                  La DApp est branchée à la chaîne locale de développement pour tester rapidement les étapes du vote.
                </p>
              </div>
            </section>
          </>
        ) : (
          <div className="grid gap-5 sm:gap-6">
            <section className="glass-panel p-5 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-400">Votre session</p>
                  <h2 className="panel-title mt-2">Portefeuille connecté</h2>
                </div>
                <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-300">
                  {address ? formatAddress(address) : "Connecté"}
                </span>
              </div>
              <p className="soft-text mt-3">
                {demoMode
                  ? "Mode de test local activé : les actions sont envoyées via un compte de test financé sur la chaîne Hardhat locale, sans frais réels."
                  : "Vous pouvez maintenant interagir avec le contrat de vote depuis une interface dédiée, claire et responsive."}
              </p>
            </section>

            <StatsDashboard demoMode={demoMode} />
            <WorkflowStatus />
            <Winner demoMode={demoMode} />
            <OwnerPanel demoMode={demoMode} />
            <ProposalsList demoMode={demoMode} />
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}

export default App;
