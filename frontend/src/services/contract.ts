import { ethers } from 'ethers';
import { BetOnRunContract } from '../contracts/types';
import BetOnRunABI from '../contracts/BetOnRun.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;

export class ContractService {
  private contract: BetOnRunContract;
  private provider: ethers.providers.Web3Provider;

  constructor(provider: ethers.providers.Web3Provider) {
    this.provider = provider;
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      BetOnRunABI,
      provider.getSigner()
    ) as BetOnRunContract;
  }

  async createChallenge(
    title: string,
    duration: number,
    scheduleType: string,
    scheduleDays: string[],
    targetDistance: number,
    stakeAmount: string
  ) {
    const tx = await this.contract.createChallenge(
      title,
      duration,
      scheduleType,
      scheduleDays,
      targetDistance,
      {
        value: ethers.utils.parseEther(stakeAmount)
      }
    );
    return tx.wait();
  }

  async joinChallenge(challengeId: number, stakeAmount: string) {
    const tx = await this.contract.joinChallenge(challengeId, {
      value: ethers.utils.parseEther(stakeAmount)
    });
    return tx.wait();
  }

  async verifyRun(challengeId: number, participant: string) {
    const tx = await this.contract.verifyRun(challengeId, participant);
    return tx.wait();
  }

  async distributeRewards(challengeId: number, winners: string[]) {
    const tx = await this.contract.distributeRewards(challengeId, winners);
    return tx.wait();
  }

  async setStravaConnected(challengeId: number, participant: string) {
    const tx = await this.contract.setStravaConnected(challengeId, participant);
    return tx.wait();
  }

  async getChallengeDetails(challengeId: number) {
    return this.contract.getChallengeDetails(challengeId);
  }

  async isParticipant(challengeId: number, participant: string) {
    return this.contract.isParticipant(challengeId, participant);
  }

  async getCompletedDays(challengeId: number, participant: string) {
    const days = await this.contract.getCompletedDays(challengeId, participant);
    return days.toNumber();
  }

  async isStravaConnected(challengeId: number, participant: string) {
    return this.contract.isStravaConnected(challengeId, participant);
  }

  onChallengeCreated(callback: (event: any) => void) {
    this.contract.on('ChallengeCreated', callback);
  }

  onChallengeJoined(callback: (event: any) => void) {
    this.contract.on('ChallengeJoined', callback);
  }

  onRunVerified(callback: (event: any) => void) {
    this.contract.on('RunVerified', callback);
  }

  onRewardsDistributed(callback: (event: any) => void) {
    this.contract.on('RewardsDistributed', callback);
  }
} 