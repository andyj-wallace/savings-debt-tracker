import { MODES, LABELS, CSS_CLASSES, getModeColors } from '../constants';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cardPresets } from '../styles/cardStyles';

const getModeButtonClasses = (isActive: boolean, activeMode: string) => {
  if (isActive) {
    return `${getModeColors(activeMode).PRIMARY} text-white shadow-md`;
  }
  return 'bg-slate-100 text-slate-600 hover:bg-slate-200';
};

export default function ModeSelector({ mode, onModeChange }) {
  return (
    <div className={`${cardPresets.primary()} mb-6`}>
      <h2 className={CSS_CLASSES.TEXT.SECTION_TITLE}>{LABELS.COMMON.TRACKING_MODE}</h2>
      <div className="flex gap-4">
        <button
          onClick={() => onModeChange(MODES.SAVINGS)}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${getModeButtonClasses(mode === MODES.SAVINGS, MODES.SAVINGS)}`}
        >
          <TrendingUp className="inline mr-2" size={20} />
          {LABELS.MODES.SAVINGS.TITLE}
        </button>
        <button
          onClick={() => onModeChange(MODES.DEBT)}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${getModeButtonClasses(mode === MODES.DEBT, MODES.DEBT)}`}
        >
          <TrendingDown className="inline mr-2" size={20} />
          {LABELS.MODES.DEBT.TITLE}
        </button>
      </div>
    </div>
  );
}