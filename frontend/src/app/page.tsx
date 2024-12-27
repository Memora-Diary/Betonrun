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

export default function Home() {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const { isWalletConnected } = useWallet();

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
      const response = await contests.create(contest);
      router.push(`/dashboard?contest_id=${response.id}`);
    } catch (error) {
      console.error('Failed to create contest:', error);
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
