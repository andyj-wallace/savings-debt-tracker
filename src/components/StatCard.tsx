import { cardPresets } from '../styles/cardStyles';

export default function StatCard({ label, value, color }) {
  return (
    <div className={cardPresets.statsCard()}>
      <div className="text-sm text-slate-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
