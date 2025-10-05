import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function ModeSelector({ mode, onModeChange }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-700 mb-4">Tracking Mode</h2>
      <div className="flex gap-4">
        <button
          onClick={() => onModeChange('savings')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            mode === 'savings'
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="inline mr-2" size={20} />
          Savings Goal
        </button>
        <button
          onClick={() => onModeChange('debt')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            mode === 'debt'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingDown className="inline mr-2" size={20} />
          Debt Payoff
        </button>
      </div>
    </div>
  );
}