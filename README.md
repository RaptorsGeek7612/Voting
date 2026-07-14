# Voting DApp

Application décentralisée de vote sur Ethereum : contrat Solidity (Hardhat 3) + interface React (Vite, wagmi v2, RainbowKit, Tailwind CSS v4).

## Structure

```
backend/    Contrat Voting.sol, tests (31), déploiement Ignition, scripts
frontend/   Interface React 19 + TypeScript, connectée à la chaîne locale
```

## Prérequis

- Node.js ≥ 22 (`nvm use 22`)
- npm (ou pnpm)

## Lancement en local (3 terminaux)

### 1. Nœud Hardhat local

```bash
cd backend
npm install
npx hardhat node
```

Laisser tourner. Les comptes de test (10 000 ETH chacun) s'affichent au démarrage.

### 2. Déploiement du contrat

```bash
cd backend
npx hardhat ignition deploy ignition/modules/Voting.ts --network localhost
```

Noter l'adresse déployée. Si elle diffère de celle inscrite dans
`frontend/src/contracts/address.ts`, mettre ce fichier à jour.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173. Deux façons d'interagir :

- **Wallet** : connecter MetaMask (ou autre) sur le réseau « Hardhat Local »
  (RPC `http://127.0.0.1:8545`, chainId `31337`) avec une clé privée de test du nœud.
- **Mode local sans frais** : bouton « Tester sans frais » dans l'en-tête — utilise
  automatiquement le compte de test n°0 du nœud Hardhat.

## Tests du contrat

```bash
cd backend
npx hardhat test        # 31 tests
```

## Scripts utiles

```bash
# Inscrire un votant (owner requis) sur le déploiement local
cd backend
npx hardhat run scripts/register-voter.ts -- 0xAdresseDuVotant
```

## Configuration

| Variable | Où | Rôle |
|---|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | `frontend/.env.local` | Project ID WalletConnect (cloud.reown.com) |
| `SEPOLIA_RPC_URL` | `npx hardhat keystore set SEPOLIA_RPC_URL` | RPC pour déployer sur Sepolia |
| `SEPOLIA_PRIVATE_KEY` | `npx hardhat keystore set SEPOLIA_PRIVATE_KEY` | Clé du compte déployeur Sepolia |

## Workflow du vote (6 phases)

1. **RegisteringVoters** — l'owner inscrit les votants (`addVoter`)
2. **ProposalsRegistrationStarted** — les votants soumettent des propositions ; une proposition peut être annulée par son auteur ou l'owner (`cancelProposal`)
3. **ProposalsRegistrationEnded**
4. **VotingSessionStarted** — un vote par votant (`setVote`), impossible sur une proposition annulée
5. **VotingSessionEnded**
6. **VotesTallied** — `tallyVotes` désigne la proposition gagnante (les propositions annulées sont exclues du décompte)
