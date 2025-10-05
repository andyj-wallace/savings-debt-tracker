import React from 'react';
import { DollarSign } from 'lucide-react';

export default function ThermometerDisplay({ mode, percentage }) {
  return (
    <div className="relative">
      <div className="w-24 h-96 bg-slate-200 rounded-full overflow-hidden relative">
        <div
          className={`absolute bottom-0 w-full transition-all duration-500 ${
            mode === 'savings' ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ height: `${percentage}%` }}
        />
        {[100, 75, 50, 25].map((mark) => (
          <div
            key={mark}
            className="absolute w-full border-t-2 border-white"
            style={{ top: `${100 - mark}%` }}
          />
        ))}
      </div>
      <div
        className={`w-32 h-32 -ml-4 mt-2 rounded-full ${
          mode === 'savings' ? 'bg-green-500' : 'bg-red-500'
        } flex items-center justify-center`}
      >
        <DollarSign className="text-white" size={48} />
      </div>
    </div>
  );
}