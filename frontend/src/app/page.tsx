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
  completedDays?: number;
  isStravaConnected?: boolean;
}

interface StravaBike {
  id: string;
  primary: boolean;
  name: string;
  resource_state: number;
  distance: number;
}

interface StravaShoe {
  id: string;
  primary: boolean;
  name: string;
  resource_state: number;
  distance: number;
}

interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  premium: boolean;
  created_at: string;
  profile_medium: string;
  profile: string;
  follower_count: number;
  friend_count: number;
  measurement_preference: string;
  bikes: StravaBike[];
  shoes: StravaShoe[];
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
  const [athleteData, setAthleteData] = useState<StravaAthlete | null>(null);
  const [showProfile, setShowProfile] = useState(false);

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
        // const completedDays = isParticipant ? await contractService.getCompletedDays(i, primaryWallet.address) : false;
        const isStravaConnected = isParticipant ? await contractService.isStravaConnected(i, primaryWallet.address) : false;

        allChallenges.push({
          id: i,
          ...details,
          stakeAmount: formatEther(details.stakeAmount),
          isParticipant,
          isStravaConnected
        });
      }

      setChallenges({
        participating: allChallenges.filter(c => c.isParticipant),
        available: allChallenges.filter(c => !c.isParticipant && !c.ended)
      });
    } catch (error) {
      console.error('Failed to load challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: number, stakeAmount: string) => {
    if (!contractService) return;

    try {
      await contractService.joinChallenge(challengeId, stakeAmount);
      await loadChallenges();
    } catch (error) {
      console.error('Failed to join challenge:', error);
    }
  };

  const checkStravaStatus = async () => {
    try {
      const response = await fetch('/api/auth/strava/status');
      const data = await response.json();
      setIsStravaConnected(data.isConnected);
    } catch (error) {
      console.error('Failed to check Strava status:', error);
    }
  };

  const fetchAthleteData = async () => {
    try {
      const response = await fetch('/api/auth/strava/athlete');
      if (!response.ok) {
        throw new Error('Failed to fetch athlete data');
      }
      const data = await response.json();
      setAthleteData(data);
    } catch (error) {
      console.error('Error fetching athlete data:', error);
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

        const stravaWindow = window.open(
          data.authorize_url,
          'Strava Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        const handleMessage = async (event: MessageEvent) => {
          if (event.data.type === 'strava_auth_success') {
            setIsStravaConnected(true);
            await checkStravaStatus();
            await fetchAthleteData();
            stravaWindow?.close();
            window.removeEventListener('message', handleMessage);
          } else if (event.data.type === 'strava_auth_error') {
            console.error('Strava authentication failed:', event.data.error);
            stravaWindow?.close();
            window.removeEventListener('message', handleMessage);
          }
        };

        window.addEventListener('message', handleMessage);

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

  useEffect(() => {
    checkStravaStatus();
  }, []);

  useEffect(() => {
    if (isStravaConnected) {
      fetchAthleteData();
    }
  }, [isStravaConnected]);

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

  const AthleteProfileModal = () => {
    if (!athleteData || !showProfile) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4 relative overflow-y-auto max-h-[90vh]">
          {/* Close button */}
          <button 
            onClick={() => setShowProfile(false)}
            className="absolute top-6 right-6 text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Profile Header */}
          <div className="flex items-center gap-6 mb-8 border-b border-gray-700 pb-6">
            <img 
              src={athleteData.profile} 
              alt={`${athleteData.firstname} ${athleteData.lastname}`}
              className="w-24 h-24 rounded-full object-cover"
            />
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {athleteData.firstname} {athleteData.lastname}
              </h2>
              <p className="text-gray-400 text-lg">@{athleteData.username}</p>
              {athleteData.premium && (
                <span className="inline-block mt-2 bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm px-3 py-1 rounded-full">
                  Premium Member
                </span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-700/50 rounded-xl p-5">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Location</h3>
              <p className="text-white text-lg">
                {[athleteData.city, athleteData.state, athleteData.country]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-5">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Member Since</h3>
              <p className="text-white text-lg">
                {new Date(athleteData.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-5">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Social</h3>
              <div className="flex gap-6">
                <div>
                  <p className="text-white text-lg font-semibold">{athleteData.friend_count}</p>
                  <p className="text-gray-400 text-sm">Following</p>
                </div>
                <div>
                  <p className="text-white text-lg font-semibold">{athleteData.follower_count}</p>
                  <p className="text-gray-400 text-sm">Followers</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-5">
              <h3 className="text-gray-400 text-sm font-medium mb-2">Preferences</h3>
              <div className="space-y-1">
                <p className="text-white">
                  <span className="text-gray-400">Measurement: </span>
                  {athleteData.measurement_preference}
                </p>
                {athleteData.sex && (
                  <p className="text-white">
                    <span className="text-gray-400">Gender: </span>
                    {athleteData.sex === 'M' ? 'Male' : 'Female'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Equipment Section */}
          <div className="space-y-6">
            {/* Bikes */}
            {athleteData.bikes && athleteData.bikes.length > 0 && (
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Bikes</h3>
                <div className="space-y-3">
                  {athleteData.bikes.map(bike => (
                    <div key={bike.id} className="bg-gray-700/50 rounded-xl p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z" />
                        </svg>
                        <div>
                          <span className="text-white font-medium">{bike.name}</span>
                          {bike.primary && (
                            <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-300">{(bike.distance / 1000).toFixed(1)}km</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shoes */}
            {athleteData.shoes && athleteData.shoes.length > 0 && (
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Running Shoes</h3>
                <div className="space-y-3">
                  {athleteData.shoes.map(shoe => (
                    <div key={shoe.id} className="bg-gray-700/50 rounded-xl p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21.5 6.5c-.3-.3-.7-.5-1.1-.5h-3.3l-1.4-3.1c-.3-.7-1-1.2-1.8-1.2h-4.7c-.8 0-1.5.4-1.8 1.2l-1.4 3.1h-3.3c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h17c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1v-12.8c0-.4-.2-.8-.5-1.1zm-9.5 0h-4l1.4-3.1h1.2l1.4 3.1z" />
                        </svg>
                        <div>
                          <span className="text-white font-medium">{shoe.name}</span>
                          {shoe.primary && (
                            <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-300">{(shoe.distance / 1000).toFixed(1)}km</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAthleteInfo = () => {
    if (!athleteData) return null;

    return (
      <div 
        onClick={() => setShowProfile(true)}
        className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-700 transition-colors"
      >
        <img 
          src={athleteData.profile_medium} 
          alt={`${athleteData.firstname} ${athleteData.lastname}`}
          className="w-8 h-8 rounded-full"
        />
        <span className="text-gray-200">
          {athleteData.firstname} {athleteData.lastname}
        </span>
      </div>
    );
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
            ) : (
              <div className="flex items-center gap-4">
                {renderAthleteInfo()}
                {!isWalletConnected ? (
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
                        <p>Participants: {/* Add participant count */}</p>
                        <button
                          onClick={() => handleJoinChallenge(challenge.id, challenge.stakeAmount)}
                          className="mt-4 w-full bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition-colors"
                        >
                          Join Challenge
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

      <AthleteProfileModal />
    </div>
  );
}
