import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatCurrency';

export default function GoalInput({ mode, goal, onUpdateGoal }) {
  const [tempGoal, setTempGoal] = useState('');

  const handleUpdate = () => {
    const newGoal = parseFloat(tempGoal);
    if (!isNaN(newGoal) && newGoal > 0) {
      onUpdateGoal(newGoal);
      setTempGoal('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-700 mb-4">
        {mode === 'savings' ? 'Savings Goal' : 'Total Debt'}
      </h2>
      <div className="flex gap-2">
        <input
          type="number"
          value={tempGoal}
          onChange={(e) => setTempGoal(e.target.value)}
          placeholder={formatCurrency(goal)}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleUpdate}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Update
        </button>
      </div>
    </div>
  );
}