import { useState } from 'react';
import { Contest } from '@/types/contest';
import ConnectionStep from './ConnectionStep';
import ActivityTypeStep from './ActivityTypeStep';
import DetailsStep from './DetailsStep';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contest: Contest) => void;
  isStravaConnected: boolean;
  onStravaConnect: () => void;
}

export default function CreateChallengeModal({
  isOpen,
  onClose,
  onSubmit,
  isStravaConnected,
  onStravaConnect
}: CreateChallengeModalProps) {
  const [formStep, setFormStep] = useState<'connect' | 'type' | 'details'>('connect');
  const [activityType, setActivityType] = useState<'free' | 'run' | 'ride' | 'swim'>('free');
  const [contest, setContest] = useState<Contest>({
    title: '',
    stake_amount: 0.1,
    schedule: {
      type: 'daily',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      distance: 3,
      timezone: '',
      activity: 'free'
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(contest);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-2xl p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
        <div className="relative z-10">
          {formStep === 'connect' && (
            <ConnectionStep
              isStravaConnected={isStravaConnected}
              onStravaConnect={onStravaConnect}
              onNext={() => setFormStep('type')}
              onClose={onClose}
            />
          )}
          {formStep === 'type' && (
            <ActivityTypeStep
              activityType={activityType}
              isStravaConnected={isStravaConnected}
              onActivityTypeChange={(type) => {
                setActivityType(type);
                setContest(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule, activity: type }
                }));
              }}
              onStravaConnect={onStravaConnect}
              onNext={() => setFormStep('details')}
              onClose={onClose}
            />
          )}
          {formStep === 'details' && (
            <DetailsStep
              contest={contest}
              activityType={activityType}
              onContestChange={setContest}
              onBack={() => setFormStep('type')}
              onClose={onClose}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
} 