import React from 'react';
import StatCard from './StatCard';
import { useGoalStats } from '../hooks/useGoalStats';
import { useInterest } from '../hooks/useInterest';

export default function StatsPanel() {
  const {
    detailedStats,
    percentage,
    formattedGoal,
    formattedRemaining
  } = useGoalStats();

  const { pendingInterest, hasPendingInterest } = useInterest();

  const mode = detailedStats.mode;
  const paidOff = mode === 'debt' ? detailedStats.debtPaidOff : detailedStats.current;
  
  return (
    <div className="flex flex-col gap-4">
      <StatCard label="Goal" value={formattedGoal} color="text-slate-800" />
      <StatCard
        label={detailedStats.progressLabel}
        value={detailedStats.formattedCurrent || `$${paidOff.toFixed(2)}`}
        color={mode === 'savings' ? 'text-green-600' : 'text-red-600'}
      />
      {mode === 'debt' && hasPendingInterest && (
        <StatCard
          label="Pending Interest"
          value={`$${pendingInterest.toFixed(2)}`}
          color="text-orange-600"
        />
      )}
      <StatCard
        label={detailedStats.remainingLabel}
        value={formattedRemaining}
        color="text-slate-800"
      />
      <StatCard label="Progress" value={`${percentage.toFixed(1)}%`} color="text-blue-600" />
    </div>
  );
}