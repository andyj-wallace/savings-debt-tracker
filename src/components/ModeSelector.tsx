import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MODES, LABELS, CSS_CLASSES, getModeColors } from '../constants';

export default function ModeSelector({ mode, onModeChange }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className={CSS_CLASSES.TEXT.SECTION_TITLE}>{LABELS.COMMON.TRACKING_MODE}</h2>
      <div className="flex gap-4">
        <button
          onClick={() => onModeChange(MODES.SAVINGS)}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            mode === MODES.SAVINGS
              ? `${getModeColors(MODES.SAVINGS).PRIMARY} text-white shadow-md`
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="inline mr-2" size={20} />
          {LABELS.MODES.SAVINGS.TITLE}
        </button>
        <button
          onClick={() => onModeChange(MODES.DEBT)}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            mode === MODES.DEBT
              ? `${getModeColors(MODES.DEBT).PRIMARY} text-white shadow-md`
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingDown className="inline mr-2" size={20} />
          {LABELS.MODES.DEBT.TITLE}
        </button>
      </div>
    </div>
  );
}