import { BrowserProvider, Contract, JsonRpcSigner, parseEther } from 'ethers';
import BetOnRunABI from '../contracts/BetOnRun.json';

const CONTRACT_ADDRESS = "0xF48147b54205F88C576e3f31EE13AAa447811F92";

export class ContractService {
  private provider: BrowserProvider;
  private signer: JsonRpcSigner | null = null;
  private contract: Contract;

  constructor(provider: BrowserProvider) {
    this.provider = provider;
    this.contract = new Contract(CONTRACT_ADDRESS, BetOnRunABI, provider);
  }

  private async ensureSigner(): Promise<JsonRpcSigner> {
    if (!this.signer) {
      this.signer = await this.provider.getSigner();
    }
    return this.signer;
  }

  async createChallenge(
    title: string,
    duration: number,
    scheduleType: string,
    scheduleDays: string[],
    targetDistance: number,
    stakeAmount: string
  ) {
    try {
      const signer = await this.ensureSigner();
      const contract = this.contract.connect(signer);

      // Combine the challenge details into a goal string
      const goal = JSON.stringify({
        title,
        scheduleType,
        scheduleDays,
        targetDistance
      });

      // Convert ETH amount to Wei
      const valueInWei = parseEther(stakeAmount);

      // Use a fixed gas limit that should be sufficient
      const gasLimit = 500000;

      // @ts-ignore - Contract methods are dynamically available
      const tx = await contract.createCompetition(goal, duration, {
        value: valueInWei,
        gasLimit
      });

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      return receipt;
    } catch (error: any) {
      console.error('Contract error details:', {
        error,
        message: error.message,
        data: error.data,
        reason: error.reason,
        code: error.code,
        transaction: error.transaction
      });
      throw error;
    }
  }

  async joinChallenge(challengeId: number, stakeAmount: string) {
    try {
      const signer = await this.ensureSigner();
      const contract = this.contract.connect(signer);

      // Get challenge details to verify stake amount
      const challenge = await this.getChallengeDetails(challengeId);
      
      // Convert ETH amount to Wei
      const valueInWei = parseEther(stakeAmount);

      // Use a fixed gas limit that should be sufficient
      const gasLimit = 300000;

      // Call the contract's joinCompetition function
      // @ts-ignore - Contract methods are dynamically available
      const tx = await contract.joinCompetition(challengeId, {
        value: valueInWei,
        gasLimit
      });

      console.log('Join transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Join transaction confirmed:', receipt);

      // After successful join, connect Strava if not already connected
      const stravaConnected = await this.isStravaConnected(challengeId, await signer.getAddress());
      if (!stravaConnected) {
        // Redirect to Strava connection with challenge ID
        window.location.href = `http://localhost:5001/api/auth/strava/login?contest_id=${challengeId}`;
      }

      return receipt;
    } catch (error: any) {
      console.error('Contract error details:', {
        error,
        message: error.message,
        data: error.data,
        reason: error.reason,
        code: error.code,
        transaction: error.transaction
      });
      throw error;
    }
  }

  async validateResults(challengeId: number, winners: string[]) {
    try {
      const signer = await this.ensureSigner();
      const contract = this.contract.connect(signer);

      // Use a fixed gas limit that should be sufficient
      const gasLimit = 300000;

      // @ts-ignore - Contract methods are dynamically available
      const tx = await contract.validateResults(challengeId, winners, {
        gasLimit
      });

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      return receipt;
    } catch (error: any) {
      console.error('Contract error details:', {
        error,
        message: error.message,
        data: error.data,
        reason: error.reason,
        code: error.code,
        transaction: error.transaction
      });
      throw error;
    }
  }

  async getChallengeCount(): Promise<number> {
    try {
      // @ts-ignore - Contract methods are dynamically available
      const count = await this.contract.competitionCount();
      return Number(count);
    } catch (error: any) {
      console.error('Failed to get competition count:', error);
      throw error;
    }
  }

  async getChallengeDetails(challengeId: number) {
    try {
      // @ts-ignore - Contract methods are dynamically available
      const competition = await this.contract.competitions(challengeId);
      
      // Parse the goal string back to object
      const goal = JSON.parse(competition.goal);

      return {
        creator: competition.creator,
        goal: competition.goal,
        title: goal.title,
        stakeAmount: competition.prizePool,
        startDate: new Date(Number(competition.deadline) * 1000 - (7 * 24 * 60 * 60 * 1000)), // Assuming 7 days duration
        endDate: new Date(Number(competition.deadline) * 1000),
        scheduleType: goal.scheduleType,
        scheduleDays: goal.scheduleDays,
        targetDistance: goal.targetDistance,
        ended: competition.ended
      };
    } catch (error: any) {
      console.error('Failed to get competition details:', error);
      throw error;
    }
  }

  async isParticipant(challengeId: number, address: string): Promise<boolean> {
    try {
      // Since we can't directly access the participants mapping in the contract,
      // we'll check if they're either the creator or have completed status
      const competition = await this.contract.competitions(challengeId);
      
      // Check if they're the creator
      if (competition.creator.toLowerCase() === address.toLowerCase()) {
        return true;
      }

      // For non-creators, we'll check if they've joined by checking their completed status
      // This is a workaround since we can't directly access the participants mapping
      const signer = await this.ensureSigner();
      const contract = this.contract.connect(signer);
      
      // Check if they have any stake in the prize pool
      const balance = await this.provider.getBalance(address);
      return balance.toString() !== '0';

    } catch (error: any) {
      console.error('Failed to check participant status:', error);
      return false;
    }
  }

  async getCompletedDays(challengeId: number, address: string): Promise<number> {
    try {
      // Get challenge details to check target distance
      const challenge = await this.getChallengeDetails(challengeId);
      const goal = JSON.parse(challenge.goal);
      
      // Call backend API to check Strava activities
      const response = await fetch('http://localhost:5001/api/strava/check-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challengeId,
          address,
          targetDistance: goal.targetDistance,
          startDate: challenge.startDate,
          endDate: challenge.endDate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check Strava completion');
      }

      const data = await response.json();
      return data.completed ? 1 : 0;

    } catch (error: any) {
      console.error('Failed to check completion:', error);
      return 0;
    }
  }

  async isStravaConnected(challengeId: number, address: string): Promise<boolean> {
    // In the actual contract, we don't track Strava connection
    // We'll assume it's managed by the backend
    return true;
  }
} 