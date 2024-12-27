import { ethers } from 'ethers';

export interface Challenge {
  creator: string;
  title: string;
  stakeAmount: ethers.BigNumber;
  startDate: ethers.BigNumber;
  endDate: ethers.BigNumber;
  scheduleType: string;
  scheduleDays: string[];
  targetDistance: ethers.BigNumber;
  ended: boolean;
}

export interface ChallengeCreatedEvent {
  challengeId: ethers.BigNumber;
  creator: string;
  title: string;
  stakeAmount: ethers.BigNumber;
}

export interface ChallengeJoinedEvent {
  challengeId: ethers.BigNumber;
  participant: string;
}

export interface RunVerifiedEvent {
  challengeId: ethers.BigNumber;
  participant: string;
  completedDays: ethers.BigNumber;
}

export interface RewardsDistributedEvent {
  challengeId: ethers.BigNumber;
  winners: string[];
  reward: ethers.BigNumber;
}

export interface BetOnRunContract extends ethers.Contract {
  createChallenge(
    title: string,
    duration: number,
    scheduleType: string,
    scheduleDays: string[],
    targetDistance: number,
    overrides?: ethers.PayableOverrides
  ): Promise<ethers.ContractTransaction>;

  joinChallenge(
    challengeId: ethers.BigNumberish,
    overrides?: ethers.PayableOverrides
  ): Promise<ethers.ContractTransaction>;

  verifyRun(
    challengeId: ethers.BigNumberish,
    participant: string
  ): Promise<ethers.ContractTransaction>;

  distributeRewards(
    challengeId: ethers.BigNumberish,
    winners: string[]
  ): Promise<ethers.ContractTransaction>;

  setStravaConnected(
    challengeId: ethers.BigNumberish,
    participant: string
  ): Promise<ethers.ContractTransaction>;

  getChallengeDetails(
    challengeId: ethers.BigNumberish
  ): Promise<Challenge>;

  isParticipant(
    challengeId: ethers.BigNumberish,
    participant: string
  ): Promise<boolean>;

  getCompletedDays(
    challengeId: ethers.BigNumberish,
    participant: string
  ): Promise<ethers.BigNumber>;

  isStravaConnected(
    challengeId: ethers.BigNumberish,
    participant: string
  ): Promise<boolean>;
} 