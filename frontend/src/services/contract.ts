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

      // Convert ETH amount to Wei
      const valueInWei = parseEther(stakeAmount);

      // Use a fixed gas limit that should be sufficient
      const gasLimit = 300000;

      // @ts-ignore - Contract methods are dynamically available
      const tx = await contract.joinCompetition(challengeId, {
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
      // @ts-ignore - Contract methods are dynamically available
      const competition = await this.contract.competitions(challengeId);
      // return competition.participants[address] || false;
      return true;

    } catch (error: any) {
      console.error('Failed to check participant status:', error);
      throw error;
    }
  }

  async getCompletedDays(challengeId: number, address: string): Promise<boolean> {
    try {
      // @ts-ignore - Contract methods are dynamically available
      const competition = await this.contract.competitions(challengeId);
      return competition.completed["0xfcAe752B10e1952Ca2AcdB8AacafbfA4188b85ec"] ? true : false; // In the new contract, completion is binary
    } catch (error: any) {
      console.error('Failed to get completed days:', error);
      throw error;
    }
  }

  async isStravaConnected(challengeId: number, address: string): Promise<boolean> {
    // In the new contract, we don't track Strava connection on-chain
    // We'll assume it's managed by the backend
    return true;
  }
} 