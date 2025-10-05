import React, { useState } from 'react';
import { Settings, Info } from 'lucide-react';

export default function InterestSettings({ interestRate, onUpdateRate, mode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempRate, setTempRate] = useState('');

  if (mode !== 'debt') return null;

  // Ensure interestRate is a number
  const rate = typeof interestRate === 'number' ? interestRate : parseFloat(interestRate) || 18.99;


  const handleUpdate = () => {
    const newRate = parseFloat(tempRate);
    if (!isNaN(newRate) && newRate >= 0 && newRate <= 100) {
      onUpdateRate(newRate);
      setTempRate('');
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-700">Interest Settings</h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-500 hover:text-blue-700 underline"
          >
            Edit
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-4">
          <div>
            <div className="text-sm text-slate-600">Annual Interest Rate (APR)</div>
            <div className="text-2xl font-bold text-slate-800">{rate.toFixed(2)}%</div>
            <div className="text-xs text-slate-500 mt-1">
              Daily Rate: {(rate / 365).toFixed(4)}%
            </div>
          </div>
          <Info size={20} className="text-slate-400" />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-2">
              Enter Annual Interest Rate (APR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={tempRate}
              onChange={(e) => setTempRate(e.target.value)}
              placeholder={`${rate.toFixed(2)}%`}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setTempRate('');
              }}
              className="flex-1 px-6 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-800">
              <strong>Tip:</strong> Check your credit card statement for the APR. 
              Common rates range from 15% to 25%.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}