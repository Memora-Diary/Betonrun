import { Contest } from '@/types/contest';

interface DetailsStepProps {
  contest: Contest;
  activityType: 'free' | 'run' | 'ride' | 'swim';
  onContestChange: (contest: Contest) => void;
  onBack: () => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function DetailsStep({
  contest,
  activityType,
  onContestChange,
  onBack,
  onClose,
  onSubmit
}: DetailsStepProps) {
  return (
    <form className="space-y-8" onSubmit={onSubmit}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-600 text-transparent bg-clip-text">
          Challenge Details
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Challenge Title</label>
          <input
            type="text"
            value={contest.title}
            onChange={(e) => onContestChange({ ...contest, title: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder={`e.g., '30 Days ${
              activityType === 'free' 
                ? 'Fitness' 
                : activityType === 'run' 
                  ? 'Running' 
                  : activityType === 'ride' 
                    ? 'Cycling' 
                    : 'Swimming'
            } Challenge'`}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {activityType === 'free' ? 'Daily Goal Distance' : 'Minimum Distance'} (kilometers)
          </label>
          <input
            type="number"
            value={contest.schedule.distance}
            onChange={(e) => onContestChange({
              ...contest,
              schedule: { ...contest.schedule, distance: Number(e.target.value) }
            })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            min="0.1"
            step="0.1"
            required
          />
          {activityType !== 'free' && (
            <p className="mt-2 text-sm text-gray-400">
              Your Strava activities must meet or exceed this distance to count for the challenge
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Schedule Type</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => onContestChange({
                ...contest,
                schedule: { ...contest.schedule, type: 'daily' }
              })}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                contest.schedule.type === 'daily'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => onContestChange({
                ...contest,
                schedule: { ...contest.schedule, type: 'weekly' }
              })}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                contest.schedule.type === 'weekly'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {contest.schedule.type === 'weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Active Days</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <label key={day} className="flex items-center space-x-2 bg-white/5 rounded-lg px-4 py-3">
                  <input
                    type="checkbox"
                    checked={contest.schedule.days.includes(day.toLowerCase())}
                    onChange={(e) => {
                      const days = e.target.checked
                        ? [...contest.schedule.days, day.toLowerCase()]
                        : contest.schedule.days.filter(d => d !== day.toLowerCase());
                      onContestChange({
                        ...contest,
                        schedule: { ...contest.schedule, days }
                      });
                    }}
                    className="rounded text-orange-500 focus:ring-orange-500 bg-white/10 border-white/20"
                  />
                  <span className="text-white text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Stake Amount (ETH)</label>
          <input
            type="number"
            value={contest.stake_amount}
            onChange={(e) => onContestChange({ ...contest, stake_amount: Number(e.target.value) })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            min="0.01"
            step="0.01"
            required
          />
          <p className="mt-2 text-sm text-gray-400">
            This amount will be staked for the duration of the challenge
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 px-6 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 transition-all duration-300"
          >
            Create Challenge
          </button>
        </div>
      </div>
    </form>
  );
} 