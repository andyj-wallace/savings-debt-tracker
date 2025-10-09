import { AlertCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';

export default function PendingInterestBanner({ 
  pendingInterest, 
  daysPending, 
  interestRate, 
  onApplyNow 
}) {
  if (pendingInterest <= 0) return null;

  return (
    <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-orange-900">Interest Accruing</h3>
            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded">
              {daysPending} days
            </span>
          </div>
          <p className="text-sm text-orange-800 mb-2">
            You have <strong>{formatCurrency(pendingInterest)}</strong> in pending interest charges 
            at {interestRate.toFixed(2)}% APR.
          </p>
          <div className="flex items-center gap-4 text-xs text-orange-700">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>Interest will auto-apply at 30 days</span>
            </div>
            <button
              onClick={onApplyNow}
              className="text-orange-900 underline hover:text-orange-950 font-medium"
            >
              Apply Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}