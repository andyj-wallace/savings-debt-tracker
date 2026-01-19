import StatCard from './StatCard';
import { useGoalStats } from '../hooks/useGoalStats';
import { useInterest } from '../hooks/useInterest';
import { getModeColors } from '../constants';

export default function StatsPanel() {
  const {
    detailedStats,
    percentage,
    formattedGoal,
    formattedRemaining
  } = useGoalStats();

  const { pendingInterest, hasPendingInterest } = useInterest();

  const mode = detailedStats.mode;
  const stats = detailedStats as {
    mode: string;
    current: number;
    debtPaidOff?: number;
    progressLabel: string;
    remainingLabel: string;
    formattedCurrent?: string;
  };
  const paidOff = mode === 'debt' ? (stats.debtPaidOff ?? stats.current) : stats.current;
  const modeTextColor = getModeColors(mode).TEXT;

  return (
    <div className="flex flex-col gap-4">
      <StatCard label="Goal" value={formattedGoal} color="text-slate-800" />
      <StatCard
        label={stats.progressLabel}
        value={stats.formattedCurrent || `$${paidOff.toFixed(2)}`}
        color={modeTextColor}
      />
      {mode === 'debt' && hasPendingInterest && (
        <StatCard
          label="Pending Interest"
          value={`$${pendingInterest.toFixed(2)}`}
          color="text-orange-600"
        />
      )}
      <StatCard
        label={stats.remainingLabel}
        value={formattedRemaining}
        color="text-slate-800"
      />
      <StatCard label="Progress" value={`${percentage.toFixed(1)}%`} color="text-blue-600" />
    </div>
  );
}
