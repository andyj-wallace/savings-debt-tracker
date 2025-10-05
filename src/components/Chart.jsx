import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../utils/formatCurrency';
import { formatShortDate } from '../utils/dateUtils';

export default function Chart({ transactions, mode }) {
  if (transactions.length === 0) {
    return null;
  }

  // Prepare data for chart
  const chartData = transactions.map((transaction) => ({
    date: formatShortDate(new Date(transaction.date)),
    amount: transaction.runningTotal,
    fullDate: transaction.date,
  }));

  const CustomTooltip = ({ active, payload }) => {
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
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
            stroke={mode === 'savings' ? '#22c55e' : '#ef4444'}
            strokeWidth={3}
            dot={{ fill: mode === 'savings' ? '#22c55e' : '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}