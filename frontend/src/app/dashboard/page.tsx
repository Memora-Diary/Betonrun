'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/api';
import { ContractService } from '@/services/contract';
import { useProvider } from '@/hooks/useProvider';
import { ethers } from 'ethers';

interface Schedule {
  type: 'daily' | 'weekly';
  days: string[];
  distance: number;
  time?: string;
}

interface Contest {
  id: number;
  title: string;
  stake_amount: number;
  start_date: string;
  end_date: string;
  schedule: Schedule;
  participants: {
    id: number;
    name: string;
    paid: boolean;
    completed_days: number;
    strava_connected: boolean;
  }[];
  status: string;
}

interface ContestList {
  participating: Contest[];
  available: Contest[];
}

export default function Dashboard() {
  const [step, setStep] = useState(1);
  const [contestList, setContestList] = useState<ContestList>({ participating: [], available: [] });
  const [newContest, setNewContest] = useState({
    title: '',
    stake_amount: 0,
    schedule: {
      type: 'daily',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      distance: 3,
      time: ''
    }
  });
  const [showStravaPrompt, setShowStravaPrompt] = useState(false);
  const [createdContestId, setCreatedContestId] = useState<number | null>(null);
  const provider = useProvider();
  const [contractService, setContractService] = useState<ContractService | null>(null);

  useEffect(() => {
    if (provider) {
      setContractService(new ContractService(provider));
    }
  }, [provider]);

  useEffect(() => {
    loadContests();
  }, []);

  const loadContests = async () => {
    if (!contractService) return;

    try {
      // Get all challenges from the contract
      const challengeCount = await contractService.getChallengeCount();
      const challenges = [];
      
      for (let i = 1; i <= challengeCount; i++) {
        const challenge = await contractService.getChallengeDetails(i);
        challenges.push({
          id: i,
          title: challenge.title,
          stake_amount: Number(ethers.utils.formatEther(challenge.stakeAmount)),
          schedule: {
            type: challenge.scheduleType,
            days: challenge.scheduleDays,
            distance: challenge.targetDistance,
            time: '' // If you want to keep this, you'll need to add it to your contract
          },
          participants: challenge.participants.map(p => ({
            id: p.id,
            name: p.name || p.address.slice(0, 6) + '...' + p.address.slice(-4),
            paid: true,
            completed_days: p.completedDays,
            strava_connected: p.stravaConnected
          })),
          status: challenge.ended ? 'ended' : 'active'
        });
      }

      // Split into participating and available challenges
      const participating = challenges.filter(c => 
        c.participants.some(p => p.address === contractService.signer.getAddress())
      );
      const available = challenges.filter(c => 
        !c.participants.some(p => p.address === contractService.signer.getAddress())
      );

      setContestList({ participating, available });
    } catch (error) {
      console.error('Failed to load challenges:', error);
    }
  };

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractService) {
      console.error('Contract service not initialized');
      return;
    }

    try {
      // Convert schedule days to proper format
      const scheduleDays = newContest.schedule.type === 'daily' 
        ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        : newContest.schedule.days;

      // Create transaction
      const tx = await contractService.createChallenge(
        newContest.title,
        30, // duration in days - you might want to make this configurable
        newContest.schedule.type,
        scheduleDays,
        newContest.schedule.distance,
        newContest.stake_amount.toString()
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Get the challenge ID from the event
      const event = receipt.events?.find(e => e.event === 'ChallengeCreated');
      if (event && event.args) {
        const challengeId = event.args.challengeId.toNumber();
        setCreatedContestId(challengeId);
      }

      // Reset form
      setNewContest({
        title: '',
        stake_amount: 0,
        schedule: {
          type: 'daily',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          distance: 3,
          time: ''
        }
      });
      
      setShowStravaPrompt(true);
      
    } catch (error) {
      console.error('Failed to create challenge:', error);
      // Add proper error handling here - you might want to show a notification
    }
  };

  const handleStravaConnect = async () => {
    try {
      const url = await auth.getStravaLoginUrl(createdContestId);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to get Strava login URL:', error);
    }
  };

  const handleJoinContest = async (contestId: number) => {
    try {
      await contests.join(contestId);
      setCreatedContestId(contestId);
      setShowStravaPrompt(true);
    } catch (error) {
      console.error('Failed to join contest:', error);
    }
  };

  const handleVerifyRun = async (contestId: number) => {
    try {
      await contests.verifyRun(contestId);
      loadContests();
    } catch (error) {
      console.error('Failed to verify run:', error);
    }
  };

  const renderStravaPrompt = () => {
    if (!showStravaPrompt) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Connect with Strava</h2>
          <p className="text-gray-600 mb-6">
            To track your runs and verify your progress, you need to connect your Strava account.
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleStravaConnect}
              className="flex-1 bg-[#FC4C02] text-white px-4 py-2 rounded-lg hover:bg-[#E34402]"
            >
              Connect with Strava
            </button>
            <button
              onClick={() => {
                setShowStravaPrompt(false);
                setStep(1);
                loadContests();
              }}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateSteps = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Create Your Running Challenge</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setNewContest(prev => ({ ...prev, schedule: { ...prev.schedule, type: 'daily' } }));
                  setStep(2);
                }}
                className="w-full p-6 text-left bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-900">Daily Challenge 🏃‍♂️</h3>
                <p className="text-gray-600 mt-2">Run every day at your preferred time</p>
              </button>
              
              <button
                onClick={() => {
                  setNewContest(prev => ({ ...prev, schedule: { ...prev.schedule, type: 'weekly' } }));
                  setStep(2);
                }}
                className="w-full p-6 text-left bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold text-gray-900">Weekly Schedule 📅</h3>
                <p className="text-gray-600 mt-2">Choose specific days of the week to run</p>
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Set Your Goals</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Challenge Title</label>
                <input
                  type="text"
                  value={newContest.title}
                  onChange={(e) => setNewContest(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  placeholder="e.g., '30 Days Running Challenge'"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Distance (kilometers)</label>
                <input
                  type="number"
                  value={newContest.schedule.distance}
                  onChange={(e) => setNewContest(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, distance: Number(e.target.value) }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>

              {newContest.schedule.type === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Running Days</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <label key={day} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newContest.schedule.days.includes(day.toLowerCase())}
                          onChange={(e) => {
                            const days = e.target.checked
                              ? [...newContest.schedule.days, day.toLowerCase()]
                              : newContest.schedule.days.filter(d => d !== day.toLowerCase());
                            setNewContest(prev => ({
                              ...prev,
                              schedule: { ...prev.schedule, days }
                            }));
                          }}
                          className="rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span>{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Preferred Time (optional)</label>
                <input
                  type="time"
                  value={newContest.schedule.time}
                  onChange={(e) => setNewContest(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, time: e.target.value }
                  }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Stake Amount ($)</label>
                <input
                  type="number"
                  value={newContest.stake_amount}
                  onChange={(e) => setNewContest(prev => ({ ...prev, stake_amount: Number(e.target.value) }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  min="0"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Review Your Challenge</h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">{newContest.title}</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-gray-600">Schedule Type</dt>
                  <dd className="font-medium">{newContest.schedule.type === 'daily' ? 'Every day' : 'Selected days'}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Distance</dt>
                  <dd className="font-medium">{newContest.schedule.distance}km</dd>
                </div>
                {newContest.schedule.type === 'weekly' && (
                  <div>
                    <dt className="text-gray-600">Running Days</dt>
                    <dd className="font-medium capitalize">{newContest.schedule.days.join(', ')}</dd>
                  </div>
                )}
                {newContest.schedule.time && (
                  <div>
                    <dt className="text-gray-600">Preferred Time</dt>
                    <dd className="font-medium">{newContest.schedule.time}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-600">Stake Amount</dt>
                  <dd className="font-medium">${newContest.stake_amount}</dd>
                </div>
              </dl>

              <div className="mt-6 flex gap-4">
                <button
                  onClick={handleCreateContest}
                  className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
                >
                  Create Challenge
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {renderCreateSteps()}
        {renderStravaPrompt()}

        {step === 1 && (
          <div className="mt-12 space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Your Active Challenges</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contestList.participating.map((contest) => (
                  <div key={contest.id} className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold mb-2">{contest.title}</h3>
                    <div className="space-y-2">
                      <p className="text-gray-600">Stake: ${contest.stake_amount}</p>
                      <p className="text-gray-600">
                        Distance: {contest.schedule?.distance}km
                        {contest.schedule?.time && ` at ${contest.schedule.time}`}
                      </p>
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{
                              width: `${(contest.participants.find(p => p.id === contest.id)?.completed_days || 0) / 30 * 100}%`
                            }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {contest.participants.find(p => p.id === contest.id)?.completed_days || 0} / 30 days completed
                        </p>
                      </div>
                      {!contest.participants.find(p => p.id === contest.id)?.strava_connected && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded-md">
                          <p className="text-sm text-yellow-800">
                            Connect Strava to track your runs
                          </p>
                          <button
                            onClick={() => {
                              setCreatedContestId(contest.id);
                              setShowStravaPrompt(true);
                            }}
                            className="mt-2 text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md hover:bg-yellow-200"
                          >
                            Connect Now
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleVerifyRun(contest.id)}
                      className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 w-full"
                      disabled={!contest.participants.find(p => p.id === contest.id)?.strava_connected}
                    >
                      Verify Today's Run
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Available Challenges</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contestList.available.map((contest) => (
                  <div key={contest.id} className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold mb-2">{contest.title}</h3>
                    <div className="space-y-2">
                      <p className="text-gray-600">Stake: ${contest.stake_amount}</p>
                      <p className="text-gray-600">
                        Distance: {contest.schedule?.distance}km
                        {contest.schedule?.time && ` at ${contest.schedule.time}`}
                      </p>
                      <p className="text-gray-600">Participants: {contest.participants.length}</p>
                    </div>
                    <button
                      onClick={() => handleJoinContest(contest.id)}
                      className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 w-full"
                    >
                      Join Challenge
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
} 