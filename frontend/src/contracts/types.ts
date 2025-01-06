import { Contract } from 'ethers';

export interface BetOnRunContract extends Contract {
  createCompetition(goal: string, duration: number): Promise<any>;
  joinCompetition(compId: number): Promise<any>;
  validateResults(compId: number, winners: string[]): Promise<any>;
  changeAdmin(newAdmin: string): Promise<any>;
} 