import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/dateUtils';

export default function TransactionHistory({ transactions, mode, onDeleteTransaction }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (transactions.length === 0) {
    return null;
  }

  const getTransactionIcon = (transaction) => {
    if (transaction.type === 'interest') {
      return <Percent size={16} />;
    }
    return transaction.amount > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

  const getTransactionColor = (transaction) => {
    if (transaction.type === 'interest') {
      return 'bg-orange-100 text-orange-600';
    }
    if (transaction.amount > 0) {
      return mode === 'savings' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
    }
    return 'bg-slate-200 text-slate-600';
  };

  const getTransactionLabel = (transaction) => {
    if (transaction.type === 'interest') {
      return `Interest Charge (${transaction.days} days)`;
    }
    return mode === 'savings' ? 'Deposit' : 'Payment';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-lg font-semibold text-slate-700 mb-4"
      >
        <span>Transaction History ({transactions.length})</span>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isExpanded && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${getTransactionColor(transaction)}`}>
                  {getTransactionIcon(transaction)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                    {transaction.type === 'interest' && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                        Interest
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    {getTransactionLabel(transaction)} • {formatDate(new Date(transaction.date))}
                  </div>
                  {transaction.note && (
                    <div className="text-sm text-slate-600 italic">
                      {transaction.note}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm text-slate-500">Balance</div>
                  <div className="font-medium text-slate-700">
                    {formatCurrency(transaction.runningTotal)}
                  </div>
                </div>
                {transaction.type !== 'interest' && (
                  <button
                    onClick={() => onDeleteTransaction(transaction.id)}
                    className="text-red-500 hover:text-red-700 text-sm underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}