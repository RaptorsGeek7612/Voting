import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

// Enum WorkflowStatus mirroring the contract, for readability in tests.
const Status = {
  RegisteringVoters: 0n,
  ProposalsRegistrationStarted: 1n,
  ProposalsRegistrationEnded: 2n,
  VotingSessionStarted: 3n,
  VotingSessionEnded: 4n,
  VotesTallied: 5n,
};

async function deployVoting() {
  const [owner, voter1, voter2, voter3, stranger] =
    await ethers.getSigners();
  const voting = await ethers.deployContract("Voting");
  return { voting, owner, voter1, voter2, voter3, stranger };
}

// Helper: brings the contract to VotingSessionStarted with two proposals
// registered by voter1, and voter1/voter2 registered as voters.
async function setupToVotingSession(voting: any, owner: any, voter1: any, voter2: any) {
  await voting.connect(owner).addVoter(voter1.address);
  await voting.connect(owner).addVoter(voter2.address);
  await voting.connect(owner).startProposalsRegistering();
  await voting.connect(voter1).addProposal("Proposal A");
  await voting.connect(voter2).addProposal("Proposal B");
  await voting.connect(owner).endProposalsRegistering();
  await voting.connect(owner).startVotingSession();
}

describe("Voting", function () {
  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      const { voting, owner } = await deployVoting();
      expect(await voting.owner()).to.equal(owner.address);
    });

    it("starts in RegisteringVoters status", async function () {
      const { voting } = await deployVoting();
      expect(await voting.workflowStatus()).to.equal(
        Status.RegisteringVoters,
      );
    });
  });

  describe("Access control", function () {
    it("prevents a non-owner from adding a voter", async function () {
      const { voting, voter1, stranger } = await deployVoting();
      await expect(
        voting.connect(stranger).addVoter(voter1.address),
      ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
    });

    it("prevents a non-owner from changing workflow status", async function () {
      const { voting, stranger } = await deployVoting();
      await expect(
        voting.connect(stranger).startProposalsRegistering(),
      ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
      await expect(
        voting.connect(stranger).endProposalsRegistering(),
      ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
      await expect(
        voting.connect(stranger).startVotingSession(),
      ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
      await expect(
        voting.connect(stranger).endVotingSession(),
      ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
      await expect(
        voting.connect(stranger).tallyVotes(),
      ).to.be.revertedWithCustomError(voting, "OwnableUnauthorizedAccount");
    });

    it("prevents a non-registered address from reading voter/proposal data", async function () {
      const { voting, stranger } = await deployVoting();
      await expect(
        voting.connect(stranger).getVoter(stranger.address),
      ).to.be.revertedWith("You're not a voter");
      await expect(
        voting.connect(stranger).getOneProposal(0),
      ).to.be.revertedWith("You're not a voter");
    });

    it("prevents a non-registered address from proposing or voting", async function () {
      const { voting, owner, stranger } = await deployVoting();
      await voting.connect(owner).startProposalsRegistering();
      await expect(
        voting.connect(stranger).addProposal("hack"),
      ).to.be.revertedWith("You're not a voter");

      await voting.connect(owner).endProposalsRegistering();
      await voting.connect(owner).startVotingSession();
      await expect(
        voting.connect(stranger).setVote(0),
      ).to.be.revertedWith("You're not a voter");
    });
  });

  describe("Voter registration", function () {
    it("registers a voter and emits VoterRegistered", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await expect(voting.connect(owner).addVoter(voter1.address))
        .to.emit(voting, "VoterRegistered")
        .withArgs(voter1.address);

      const voter = await voting.connect(voter1).getVoter(voter1.address);
      expect(voter.isRegistered).to.equal(true);
    });

    it("rejects double registration of the same voter", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await expect(
        voting.connect(owner).addVoter(voter1.address),
      ).to.be.revertedWith("Already registered");
    });

    it("rejects registration once the registering phase is over", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).startProposalsRegistering();
      await expect(
        voting.connect(owner).addVoter(voter1.address),
      ).to.be.revertedWith("Voters registration is not open yet");
    });
  });

  describe("Proposal registration", function () {
    it("rejects proposals before the phase starts", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await expect(
        voting.connect(voter1).addProposal("too early"),
      ).to.be.revertedWith("Proposals are not allowed yet");
    });

    it("rejects an empty proposal description", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).startProposalsRegistering();
      await expect(
        voting.connect(voter1).addProposal(""),
      ).to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
    });

    it("stores the GENESIS proposal at index 0 when the phase starts", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).startProposalsRegistering();
      const genesis = await voting.connect(voter1).getOneProposal(0);
      expect(genesis.description).to.equal("GENESIS");
    });

    it("registers a proposal and emits ProposalRegistered with the right id", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).startProposalsRegistering();
      // index 0 is GENESIS, so the first real proposal is index 1
      await expect(voting.connect(voter1).addProposal("Build a bridge"))
        .to.emit(voting, "ProposalRegistered")
        .withArgs(1n);
    });

    it("rejects proposals once the phase has ended", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).startProposalsRegistering();
      await voting.connect(owner).endProposalsRegistering();
      await expect(
        voting.connect(voter1).addProposal("too late"),
      ).to.be.revertedWith("Proposals are not allowed yet");
    });
  });

  describe("Voting", function () {
    it("rejects votes before the voting session starts", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).startProposalsRegistering();
      await voting.connect(voter1).addProposal("A");
      await voting.connect(owner).endProposalsRegistering();
      await expect(
        voting.connect(voter1).setVote(1),
      ).to.be.revertedWith("Voting session havent started yet");
    });

    it("records a vote, increments the vote count and emits Voted", async function () {
      const { voting, owner, voter1, voter2 } = await deployVoting();
      await setupToVotingSession(voting, owner, voter1, voter2);

      await expect(voting.connect(voter1).setVote(1))
        .to.emit(voting, "Voted")
        .withArgs(voter1.address, 1n);

      const proposal = await voting.connect(voter1).getOneProposal(1);
      expect(proposal.voteCount).to.equal(1n);

      const voterState = await voting.connect(voter1).getVoter(voter1.address);
      expect(voterState.hasVoted).to.equal(true);
      expect(voterState.votedProposalId).to.equal(1n);
    });

    it("rejects a second vote from the same voter (double-voting)", async function () {
      const { voting, owner, voter1, voter2 } = await deployVoting();
      await setupToVotingSession(voting, owner, voter1, voter2);

      await voting.connect(voter1).setVote(1);
      await expect(
        voting.connect(voter1).setVote(2),
      ).to.be.revertedWith("You have already voted");
    });

    it("rejects a vote for a proposal id that does not exist", async function () {
      const { voting, owner, voter1, voter2 } = await deployVoting();
      await setupToVotingSession(voting, owner, voter1, voter2);

      await expect(
        voting.connect(voter1).setVote(999),
      ).to.be.revertedWith("Proposal not found");
    });

    it("rejects votes once the voting session has ended", async function () {
      const { voting, owner, voter1, voter2 } = await deployVoting();
      await setupToVotingSession(voting, owner, voter1, voter2);
      await voting.connect(owner).endVotingSession();

      await expect(
        voting.connect(voter1).setVote(1),
      ).to.be.revertedWith("Voting session havent started yet");
    });
  });

  describe("Workflow status transitions", function () {
    it("only allows the documented state sequence, in order", async function () {
      const { voting, owner, voter1, voter2 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).addVoter(voter2.address);

      // Can't skip ahead
      await expect(
        voting.connect(owner).endProposalsRegistering(),
      ).to.be.revertedWith("Registering proposals havent started yet");
      await expect(
        voting.connect(owner).startVotingSession(),
      ).to.be.revertedWith("Registering proposals phase is not finished");
      await expect(
        voting.connect(owner).endVotingSession(),
      ).to.be.revertedWith("Voting session havent started yet");
      await expect(
        voting.connect(owner).tallyVotes(),
      ).to.be.revertedWith("Current status is not voting session ended");

      // Walk the happy path once, checking events at each step
      await expect(voting.connect(owner).startProposalsRegistering())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(Status.RegisteringVoters, Status.ProposalsRegistrationStarted);

      // Can't go backwards or restart a phase already passed
      await expect(
        voting.connect(owner).startProposalsRegistering(),
      ).to.be.revertedWith("Registering proposals cant be started now");

      await expect(voting.connect(owner).endProposalsRegistering())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(
          Status.ProposalsRegistrationStarted,
          Status.ProposalsRegistrationEnded,
        );

      await expect(voting.connect(owner).startVotingSession())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(Status.ProposalsRegistrationEnded, Status.VotingSessionStarted);

      await expect(voting.connect(owner).endVotingSession())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(Status.VotingSessionStarted, Status.VotingSessionEnded);

      await expect(voting.connect(owner).tallyVotes())
        .to.emit(voting, "WorkflowStatusChange")
        .withArgs(Status.VotingSessionEnded, Status.VotesTallied);
    });

    it("also blocks voter registration once voting has moved on", async function () {
      const { voting, owner, voter1, voter2 } = await deployVoting();
      await setupToVotingSession(voting, owner, voter1, voter2);
      await expect(
        voting.connect(owner).addVoter(voter1.address),
      ).to.be.revertedWith("Voters registration is not open yet");
    });
  });

  describe("Proposal cancellation", function () {
    it("lets the owner cancel any proposal and emits ProposalCancelled", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).startProposalsRegistering();
      await voting.connect(voter1).addProposal("Cancel me"); // id 1

      await expect(voting.connect(owner).cancelProposal(1))
        .to.emit(voting, "ProposalCancelled")
        .withArgs(1n);

      const proposal = await voting.connect(voter1).getOneProposal(1);
      expect(proposal.isCancelled).to.equal(true);
    });

    it("lets the proposer cancel their own proposal", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).startProposalsRegistering();
      await voting.connect(voter1).addProposal("Mine"); // id 1

      await voting.connect(voter1).cancelProposal(1);
      const proposal = await voting.connect(voter1).getOneProposal(1);
      expect(proposal.isCancelled).to.equal(true);
    });

    it("rejects cancellation from someone who is neither the owner nor the proposer", async function () {
      const { voting, owner, voter1, voter2 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).addVoter(voter2.address);
      await voting.connect(owner).startProposalsRegistering();
      await voting.connect(voter1).addProposal("Mine"); // id 1

      await expect(
        voting.connect(voter2).cancelProposal(1),
      ).to.be.revertedWith("Not authorized");
    });

    it("rejects cancelling an already cancelled proposal", async function () {
      const { voting, owner, voter1 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).startProposalsRegistering();
      await voting.connect(voter1).addProposal("Mine"); // id 1
      await voting.connect(owner).cancelProposal(1);

      await expect(
        voting.connect(owner).cancelProposal(1),
      ).to.be.revertedWith("Already cancelled");
    });

    it("rejects cancelling a proposal id that does not exist", async function () {
      const { voting, owner } = await deployVoting();
      await expect(
        voting.connect(owner).cancelProposal(999),
      ).to.be.revertedWith("Proposal not found");
    });

    it("blocks votes on a cancelled proposal", async function () {
      const { voting, owner, voter1, voter2 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).addVoter(voter2.address);
      await voting.connect(owner).startProposalsRegistering();
      await voting.connect(voter1).addProposal("Will be cancelled"); // id 1
      await voting.connect(owner).cancelProposal(1);
      await voting.connect(owner).endProposalsRegistering();
      await voting.connect(owner).startVotingSession();

      await expect(
        voting.connect(voter2).setVote(1),
      ).to.be.revertedWith("Proposal has been cancelled");
    });
  });

  describe("Vote tallying", function () {
    it("selects the proposal with the most votes as the winner", async function () {
      const { voting, owner, voter1, voter2, voter3 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).addVoter(voter2.address);
      await voting.connect(owner).addVoter(voter3.address);
      await voting.connect(owner).startProposalsRegistering();
      await voting.connect(voter1).addProposal("A"); // id 1
      await voting.connect(voter1).addProposal("B"); // id 2
      await voting.connect(owner).endProposalsRegistering();
      await voting.connect(owner).startVotingSession();

      await voting.connect(voter1).setVote(2);
      await voting.connect(voter2).setVote(2);
      await voting.connect(voter3).setVote(1);

      await voting.connect(owner).endVotingSession();
      await voting.connect(owner).tallyVotes();

      expect(await voting.winningProposalID()).to.equal(2n);
    });

    it("defaults to GENESIS (id 0) as the winner if nobody voted", async function () {
      const { voting, owner, voter1, voter2 } = await deployVoting();
      await setupToVotingSession(voting, owner, voter1, voter2);
      await voting.connect(owner).endVotingSession();
      await voting.connect(owner).tallyVotes();
      expect(await voting.winningProposalID()).to.equal(0n);
    });

    it("never lets a cancelled proposal win, even if it has the most votes among cast ballots", async function () {
      const { voting, owner, voter1, voter2, voter3 } = await deployVoting();
      await voting.connect(owner).addVoter(voter1.address);
      await voting.connect(owner).addVoter(voter2.address);
      await voting.connect(owner).addVoter(voter3.address);
      await voting.connect(owner).startProposalsRegistering(); // GENESIS at id 0
      await voting.connect(voter1).addProposal("Real proposal"); // id 1
      await voting.connect(owner).endProposalsRegistering();
      await voting.connect(owner).startVotingSession();

      // GENESIS (id 0) gets 2 votes, the real proposal (id 1) gets 1.
      await voting.connect(voter1).setVote(0);
      await voting.connect(voter2).setVote(0);
      await voting.connect(voter3).setVote(1);

      await voting.connect(owner).endVotingSession();
      // GENESIS is cancelled after voting closes but before tallying;
      // it still has more raw votes (2) than proposal 1 (1).
      await voting.connect(owner).cancelProposal(0);
      await voting.connect(owner).tallyVotes();

      // The winner must be the best *non-cancelled* proposal, not id 0.
      expect(await voting.winningProposalID()).to.equal(1n);
    });

    it("cannot be called twice", async function () {
      const { voting, owner, voter1, voter2 } = await deployVoting();
      await setupToVotingSession(voting, owner, voter1, voter2);
      await voting.connect(owner).endVotingSession();
      await voting.connect(owner).tallyVotes();
      await expect(
        voting.connect(owner).tallyVotes(),
      ).to.be.revertedWith("Current status is not voting session ended");
    });
  });
});




