import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatCurrency';
import { formatShortDate } from '../utils/dateUtils';
import { cardPresets } from '../styles/cardStyles';
import { COLORS } from '../constants';

export default function Chart({ transactions, mode }: any) {
  if (transactions.length === 0) {
    return null;
  }

  // Prepare data for chart
  const chartData = transactions.map((transaction) => ({
    date: formatShortDate(new Date(transaction.date)),
    amount: transaction.runningTotal,
    fullDate: transaction.date,
  }));

  // Get chart colors based on mode
  const chartColor = mode === 'savings' ? COLORS.SAVINGS.CHART_STROKE : COLORS.DEBT.CHART_STROKE;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="text-slate-600 text-sm">{payload[0].payload.date}</p>
          <p className="text-slate-800 font-semibold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`${cardPresets.primary()} mb-6`}>
      <h2 className="text-lg font-semibold text-slate-700 mb-4">Progress Over Time</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="amount"
            stroke={chartColor}
            strokeWidth={3}
            dot={{ fill: chartColor, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
