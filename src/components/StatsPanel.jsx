import React from 'react';
import StatCard from './StatCard';
import { formatCurrency } from '../utils/formatCurrency';

export default function StatsPanel({ 
  mode, 
  goal, 
  current, 
  remaining, 
  percentage,
  pendingInterest 
}) {
  // Calculate paid off amount for debt mode
  const paidOff = mode === 'debt' ? goal - remaining : current;
  
  return (
    <div className="flex flex-col gap-4">
      <StatCard label="Goal" value={formatCurrency(goal)} color="text-slate-800" />
      <StatCard 
        label={mode === 'savings' ? 'Saved' : 'Paid Off'} 
        value={formatCurrency(paidOff)} 
        color={mode === 'savings' ? 'text-green-600' : 'text-red-600'} 
      />
      {mode === 'debt' && pendingInterest > 0 && (
        <StatCard 
          label="Pending Interest" 
          value={formatCurrency(pendingInterest)} 
          color="text-orange-600" 
        />
      )}
      <StatCard 
        label={mode === 'savings' ? 'Remaining' : 'Balance'} 
        value={formatCurrency(remaining)} 
        color="text-slate-800" 
      />
      <StatCard label="Progress" value={`${percentage.toFixed(1)}%`} color="text-blue-600" />
    </div>
  );
}