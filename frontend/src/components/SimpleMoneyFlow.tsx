export default function SimpleMoneyFlow() {
  const steps = [
    {
      title: "1. Create Challenge",
      description: "Set your running goals and stake ETH",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      title: "2. Run & Track",
      description: "Complete your runs and sync with Strava",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: "3. Earn Rewards",
      description: "Get your stake back plus rewards for consistency",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {steps.map((step, index) => (
        <div
          key={index}
          className="flex flex-col items-center text-center p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-orange-500/50 transition-colors"
        >
          <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-white">
            {step.icon}
          </div>
          <h3 className="text-xl font-bold mb-2 text-white">{step.title}</h3>
          <p className="text-gray-400">{step.description}</p>
        </div>
      ))}
    </div>
  );
} 