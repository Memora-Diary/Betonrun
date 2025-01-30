import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useWallet } from "../ClientWrapper";
import { useEffect } from "react";

interface ConnectionStepProps {
  isStravaConnected: boolean;
  onStravaConnect: () => void;
  onNext: () => void;
  onClose: () => void;
}

export default function ConnectionStep({
  isStravaConnected,
  onStravaConnect,
  onNext,
  onClose
}: ConnectionStepProps) {
  const { isWalletConnected } = useWallet();
  const { setShowAuthFlow } = useDynamicContext();

  useEffect(() => {
    if (isStravaConnected && isWalletConnected) {
      onNext();
    }
  }, [isStravaConnected, isWalletConnected, onNext]);

  return (
    <div className="space-y-8 text-center py-8">
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-white">Connect Your Accounts</h3>
        <p className="text-gray-300">Connect your accounts to start creating challenges</p>
      </div>
      
      <div className="space-y-6">
        <div className="p-6 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-white">Strava</h4>
              <p className="text-sm text-gray-400">Connect to verify your runs</p>
            </div>
            {!isStravaConnected ? (
              <button
                onClick={onStravaConnect}
                className="bg-[#FC4C02] text-white px-4 py-2 rounded-xl hover:bg-[#E34402] transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.01 13.828h4.172" />
                </svg>
                Connect
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Connected
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-white">Wallet</h4>
              <p className="text-sm text-gray-400">Connect to stake ETH</p>
            </div>
            {!isWalletConnected ? (
              <button
                onClick={() => setShowAuthFlow(true)}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Connected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}