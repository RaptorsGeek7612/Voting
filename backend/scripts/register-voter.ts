import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { network } from "hardhat";

// Adresse du votant à inscrire : passez-la en argument
// (`npx hardhat run scripts/register-voter.ts -- 0xVotreAdresse`),
// sinon une adresse d'exemple est utilisée.
const DEFAULT_VOTER_ADDRESS = "0x51F6eBAfD2023B8B095e434ECA287539B69c9bc7";

// Lit l'adresse déployée directement depuis le journal Ignition plutôt que
// de la recopier à la main : elle reste toujours synchronisée avec le
// dernier déploiement local, même après un `hardhat ignition deploy`.
function getDeployedVotingAddress(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const deploymentPath = path.join(
    here,
    "..",
    "ignition",
    "deployments",
    "chain-31337",
    "deployed_addresses.json",
  );
  const deployed = JSON.parse(readFileSync(deploymentPath, "utf-8"));
  const contractAddress = deployed["VotingModule#Voting"];
  if (!contractAddress) {
    throw new Error(
      `Aucune adresse déployée trouvée dans ${deploymentPath}. Avez-vous lancé "npx hardhat ignition deploy ignition/modules/Voting.ts --network localhost" ?`,
    );
  }
  return contractAddress;
}

async function main() {
  const address = process.argv[2] ?? DEFAULT_VOTER_ADDRESS;
  const contractAddress = getDeployedVotingAddress();

  const { ethers } = await network.create({
    network: "localhost",
    chainType: "l1",
  });

  console.log("Contrat Voting :", contractAddress);

  const [deployer] = await ethers.getSigners();
  const voting = await ethers.getContractAt("Voting", contractAddress);

  try {
    const tx = await voting.connect(deployer).addVoter(address);
    await tx.wait();
    console.log("Registered:", address);
  } catch (error: any) {
    if (error?.message?.includes("Already registered")) {
      console.log("Address already registered:", address);
    } else {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
