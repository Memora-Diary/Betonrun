interface ActivityTypeStepProps {
  activityType: 'free' | 'run' | 'ride' | 'swim';
  isStravaConnected: boolean;
  onActivityTypeChange: (type: 'free' | 'run' | 'ride' | 'swim') => void;
  onStravaConnect: () => void;
  onNext: () => void;
  onClose: () => void;
}

export default function ActivityTypeStep({
  activityType,
  isStravaConnected,
  onActivityTypeChange,
  onStravaConnect,
  onNext,
  onClose
}: ActivityTypeStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-600 text-transparent bg-clip-text">
          Choose Activity Type
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-8">
        <button
          onClick={() => onActivityTypeChange('free')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activityType === 'free'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Free Form
        </button>
        <button
          onClick={() => {
            if (!isStravaConnected) {
              onStravaConnect();
            } else {
              onActivityTypeChange('run');
            }
          }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activityType === 'run'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Run 🏃‍♂️
        </button>
        {/* <button
          onClick={() => {
            if (!isStravaConnected) {
              onStravaConnect();
            } else {
              onActivityTypeChange('ride');
            }
          }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activityType === 'ride'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Ride 🚴‍♂️
        </button>
        <button
          onClick={() => {
            if (!isStravaConnected) {
              onStravaConnect();
            } else {
              onActivityTypeChange('swim');
            }
          }}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            activityType === 'swim'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Swim 🏊‍♂️
        </button> */}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {activityType === 'free' ? (
          <button
            onClick={onNext}
            className="relative overflow-hidden group bg-gradient-to-br from-orange-500 to-red-600 p-8 rounded-xl text-left text-white hover:shadow-lg transition-all duration-300"
          >
            <div className="relative z-10">
              <h3 className="text-2xl font-semibold mb-3">Daily Challenge 🎯</h3>
              <p className="text-white/80 text-lg">Set your own goals and track them manually</p>
            </div>
            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
          </button>
        ) : (
          <div className="space-y-4">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-semibold mb-2">
                {activityType === 'run' ? 'Running' : activityType === 'ride' ? 'Cycling' : 'Swimming'} Challenge
              </h3>
              <p className="text-gray-400 mb-4">
                Your activities will be automatically tracked and verified through Strava
              </p>
              <div className="flex items-center gap-2 text-green-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Strava Connected</span>
              </div>
              <button
                onClick={onNext}
                className="mt-4 w-full bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all duration-300"
              >
                Continue to Challenge Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 