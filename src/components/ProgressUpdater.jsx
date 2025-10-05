import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function ProgressUpdater({ mode, onAddTransaction, interestRate, currentBalance }) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleUpdate = () => {
    const newAmount = parseFloat(amount);
    if (!isNaN(newAmount) && newAmount > 0) {
      onAddTransaction(newAmount, note);
      setAmount('');
      setNote('');
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-700 mb-4">
        Add {mode === 'savings' ? 'Deposit' : 'Payment'}
      </h2>
      
      {mode === 'debt' && currentBalance > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Note:</strong> Interest will be calculated and added based on your current balance 
            of ${currentBalance.toFixed(2)} at {interestRate.toFixed(2)}% APR.
          </div>
        </div>
      )}

      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            mode === 'savings'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          Add Transaction
        </button>
      ) : (
        <div className="space-y-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add note (optional)"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className={`flex-1 px-6 py-2 rounded-lg text-white transition-colors ${
                mode === 'savings'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setAmount('');
                setNote('');
              }}
              className="flex-1 px-6 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}