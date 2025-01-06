export interface Schedule {
  type: 'daily' | 'weekly';
  days: string[];
  distance: number;
  timezone?: string;
  activity?: 'free' | 'run' | 'ride' | 'swim';
}

export interface Contest {
  title: string;
  stake_amount: number;
  schedule: Schedule;
}

export interface Competition {
  id: number;
  creator: string;
  goal: string;
  deadline: Date;
  prizePool: string;
  ended: boolean;
} 