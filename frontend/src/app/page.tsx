'use client';

import { useState, useEffect } from 'react';
import { contests } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { useWallet } from "@/components/ClientWrapper";
import CreateChallengeModal from '@/components/create-challenge/CreateChallengeModal';
import { Contest } from '@/types/contest';
import Logo from '@/components/Logo';
import SimpleMoneyFlow from '@/components/SimpleMoneyFlow';
import Footer from '@/components/Footer';
import { ContractService } from '@/services/contract';
import { BrowserProvider, formatEther } from 'ethers';

interface Challenge {
  id: number;
  creator: string;
  title: string;
  stakeAmount: string;
  startDate: Date;
  endDate: Date;
  scheduleType: string;
  scheduleDays: string[];
  targetDistance: number;
  ended: boolean;
  isParticipant?: boolean;
  completedDays: number;
  isStravaConnected?: boolean;
}

export default function Home() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const { isWalletConnected, primaryWallet } = useWallet();
  const [contractService, setContractService] = useState<ContractService | null>(null);
  const [challenges, setChallenges] = useState<{participating: Challenge[], available: Challenge[]}>({
    participating: [],
    available: []
  });
  const [loading, setLoading] = useState(true);
  const [joiningChallengeId, setJoiningChallengeId] = useState<number | null>(null);

  const [stats, setStats] = useState({
    totalStaked: 156890,
    activeRunners: 1234,
    successfulChallenges: 890
  });

  // Animate stats
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        totalStaked: prev.totalStaked + Math.floor(Math.random() * 100),
        activeRunners: prev.activeRunners + Math.floor(Math.random() * 2),
        successfulChallenges: prev.successfulChallenges + Math.floor(Math.random() * 1)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const initializeContract = async () => {
      if (window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        const service = new ContractService(provider);
        setContractService(service);
      }
    };

    initializeContract();
  }, []);

  useEffect(() => {
    if (contractService && primaryWallet?.address) {
      loadChallenges();
    }
  }, [contractService, primaryWallet]);

  const loadChallenges = async () => {
    if (!contractService || !primaryWallet?.address) return;
    
    try {
      setLoading(true);
      const count = await contractService.getChallengeCount();
      console.log({count})
      const allChallenges: Challenge[] = [];

      for (let i = 1; i <= count; i++) {
        const details = await contractService.getChallengeDetails(i);
        console.log(details);
        const isParticipant = await contractService.isParticipant(i, primaryWallet.address);
        const completedDays = isParticipant ? await contractService.getCompletedDays(i, primaryWallet.address) : 0;
        const isStravaConnected = isParticipant ? await contractService.isStravaConnected(i, primaryWallet.address) : false;

        allChallenges.push({
          id: i,
          ...details,
          stakeAmount: formatEther(details.stakeAmount),
          isParticipant,
          completedDays,
          isStravaConnected
        });
      }

      // Filter challenges based on participation and status
      setChallenges({
        participating: allChallenges.filter(c => c.isParticipant && !c.ended),
        available: allChallenges.filter(c => !c.isParticipant && !c.ended)
      });
    } catch (error) {
      console.error('Failed to load challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: number, stakeAmount: string) => {
    if (!contractService || !isWalletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setJoiningChallengeId(challengeId);
      await contractService.joinChallenge(challengeId, stakeAmount);
      await loadChallenges(); // Reload challenges after successful join
    } catch (error: any) {
      console.error('Failed to join challenge:', error);
      alert('Failed to join challenge: ' + (error.reason || error.message));
    } finally {
      setJoiningChallengeId(null);
    }
  };

  const handleStravaConnect = async () => {
    try {
      const response = await fetch('/api/auth/strava/login');
      const data = await response.json();
      
      if (data.authorize_url) {
        const width = 600;
        const height = 800;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        // Open popup
        const stravaWindow = window.open(
          data.authorize_url,
          'Strava Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for messages from the popup
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'strava_auth_success') {
            setIsStravaConnected(true);
            stravaWindow?.close();
            window.removeEventListener('message', handleMessage);
          } else if (event.data.type === 'strava_auth_error') {
            console.error('Strava authentication failed:', event.data.error);
            stravaWindow?.close();
            window.removeEventListener('message', handleMessage);
          }
        };

        window.addEventListener('message', handleMessage);

        // Cleanup if window is closed manually
        const checkClosed = setInterval(() => {
          if (stravaWindow?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to get Strava authorization URL:', error);
    }
  };

  const handleCreateContest = async (contest: Contest) => {
    try {
      if (!contractService) {
        throw new Error('Contract service not initialized');
      }

      // Calculate duration in seconds (7 days by default)
      const duration = 7 * 24 * 60 * 60;
      
      // Create the challenge on the blockchain
      const contractResponse = await contractService.createChallenge(
        contest.title,
        duration,
        contest.schedule.type,
        contest.schedule.days,
        contest.schedule.distance,
        contest.stake_amount.toString()
      );

      // Wait for the transaction to be mined
      await contractResponse;

      // Create the contest in the backend
      const response = await contests.create(contest);
      router.push(`/dashboard?contest_id=${response.id}`);
    } catch (error) {
      console.error('Failed to create contest:', error);
    }
  };

  const handleVerifyRun = async (challengeId: number) => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/strava/check-completion ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challengeId,
          address: primaryWallet?.address,
          targetDistance: challenges.participating.find(c => c.id === challengeId)?.targetDistance || 0,
          startDate: challenges.participating.find(c => c.id === challengeId)?.startDate.toISOString(),
          endDate: challenges.participating.find(c => c.id === challengeId)?.endDate.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to verify run');
      }

      const data = await response.json();
      if (data.completed) {
        alert('Congratulations! You have completed your running goal!');
      } else {
        alert('You have not yet completed your running goal. Keep going!');
      }

      // Refresh challenges to update progress
      await loadChallenges();
    } catch (error) {
      console.error('Failed to verify run:', error);
      alert('Failed to verify run progress. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 p-6 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo />
          <div className="flex items-center gap-4">
            {!isStravaConnected ? (
              <button
                onClick={handleStravaConnect}
                className="bg-[#FC4C02] text-white px-4 py-2 rounded-xl hover:bg-[#E34402] transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.01 13.828h4.172" />
                </svg>
                Connect Strava
              </button>
            ) : !isWalletConnected ? (
              <DynamicWidget />
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Create Challenge
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-500 to-red-600 text-transparent bg-clip-text">
            Run. Commit. Earn.
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join the Web3 fitness revolution. Stake ETH on your commitment to run and earn rewards for staying consistent.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-semibold px-8 py-4 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Create Challenge
          </button>
        </div>

        {/* Stats Section */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white/5 rounded-xl p-6 backdrop-blur-lg">
            <div className="text-3xl font-bold text-orange-500">${stats.totalStaked.toLocaleString()}</div>
            <div className="text-gray-400">Total ETH Staked</div>
          </div>
          <div className="bg-white/5 rounded-xl p-6 backdrop-blur-lg">
            <div className="text-3xl font-bold text-orange-500">{stats.activeRunners.toLocaleString()}</div>
            <div className="text-gray-400">Active Runners</div>
          </div>
          <div className="bg-white/5 rounded-xl p-6 backdrop-blur-lg">
            <div className="text-3xl font-bold text-orange-500">{stats.successfulChallenges.toLocaleString()}</div>
            <div className="text-gray-400">Successful Challenges</div>
          </div>
        </div>

        {/* Challenges Section */}
        <div className="max-w-7xl mx-auto mt-20">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading challenges...</p>
            </div>
          ) : (
            <>
              {challenges.participating.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-3xl font-bold mb-6">Your Active Challenges</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {challenges.participating.map((challenge) => (
                      <div key={challenge.id} className="bg-gray-800 rounded-xl p-6 shadow-lg">
                        <h3 className="text-xl font-bold mb-2">{challenge.title}</h3>
                        <div className="space-y-2 text-gray-300">
                          <p>Stake: {challenge.stakeAmount} ETH</p>
                          <p>Distance: {challenge.targetDistance}km</p>
                          <p>Schedule: {challenge.scheduleType}</p>
                          <p>Progress: {challenge.completedDays} days completed</p>
                          {!challenge.isStravaConnected && (
                            <button
                              onClick={handleStravaConnect}
                              className="mt-4 w-full bg-[#FC4C02] text-white px-4 py-2 rounded-lg hover:bg-[#E34402] transition-colors"
                            >
                              Connect Strava to Track Progress
                            </button>
                          )}
                          {challenge.isStravaConnected && (
                            <button
                              onClick={() => handleVerifyRun(challenge.id)}
                              className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Verify Run Progress
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-3xl font-bold mb-6">Available Challenges</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {challenges.available.map((challenge) => (
                    <div key={challenge.id} className="bg-gray-800 rounded-xl p-6 shadow-lg">
                      <h3 className="text-xl font-bold mb-2">{challenge.title}</h3>
                      <div className="space-y-2 text-gray-300">
                        <p>Stake: {challenge.stakeAmount} ETH</p>
                        <p>Distance: {challenge.targetDistance}km</p>
                        <p>Schedule: {challenge.scheduleType}</p>
                        <button
                          onClick={() => handleJoinChallenge(challenge.id, challenge.stakeAmount)}
                          disabled={joiningChallengeId === challenge.id}
                          className={`mt-4 w-full bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition-colors ${
                            joiningChallengeId === challenge.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {joiningChallengeId === challenge.id ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Joining...
                            </span>
                          ) : (
                            'Join Challenge'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  {challenges.available.length === 0 && (
                    <div className="col-span-full text-center text-gray-400">
                      <p>No available challenges at the moment.</p>
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="mt-4 bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-300"
                      >
                        Create a Challenge
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* How it Works */}
      <div className="relative py-20 px-4 bg-gradient-to-b from-transparent to-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How it Works</h2>
          <SimpleMoneyFlow />
        </div>
      </div>

      <Footer />

      <CreateChallengeModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleCreateContest}
        isStravaConnected={isStravaConnected}
        onStravaConnect={handleStravaConnect}
      />
    </div>
  );
}
