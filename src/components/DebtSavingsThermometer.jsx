import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  calculatePendingInterest,
  shouldApplyInterest
} from '../utils/interestCalculator';
import ModeSelector from './ModeSelector';
import GoalInput from './GoalInput';
import InterestSettings from './InterestSettings';
import ThermometerDisplay from './ThermometerDisplay';
import StatsPanel from './StatsPanel';
import ProgressUpdater from './ProgressUpdater';
import TransactionHistory from './TransactionHistory';
import Chart from './Chart';
import PendingInterestBanner from './PendingInterestBanner';

export default function DebtSavingsThermometer() {
  const [mode, setMode] = useLocalStorage('trackerMode', 'savings');
  const [goal, setGoal] = useLocalStorage('trackerGoal', 10000);
  const [transactionsRaw, setTransactions] = useLocalStorage('trackerTransactions', []);
  const [interestRate, setInterestRate] = useLocalStorage('trackerInterestRate', 18.99);
  const [lastInterestDate, setLastInterestDate] = useLocalStorage('trackerLastInterestDate', null);
  
  const [pendingInterest, setPendingInterest] = useState(0);
  const [daysPending, setDaysPending] = useState(0);

  // Ensure transactions is always an array
  const transactions = useMemo(() => Array.isArray(transactionsRaw) ? transactionsRaw : [], [transactionsRaw]);

  // Calculate current total from transactions
  const current = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate percentage based on mode
  let percentage;
  let remaining;
  
  if (mode === 'savings') {
    // For savings: percentage of goal reached
    percentage = Math.min((current / goal) * 100, 100);
    remaining = goal - current;
  } else {
    // For debt: percentage of debt paid off
    // current is negative (we subtract payments), so debt remaining is goal + current
    const debtRemaining = goal + current; // current is negative, so this subtracts
    const amountPaidOff = goal - debtRemaining;
    percentage = Math.min((amountPaidOff / goal) * 100, 100);
    remaining = debtRemaining;
  }

  // Calculate and display pending interest
  useEffect(() => {
    if (mode === 'debt' && remaining > 0) {
      const lastDate = lastInterestDate || (transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString());
      const { pendingInterest: pending, daysPending: days } = calculatePendingInterest(
        remaining, // Use remaining debt, not current
        interestRate,
        lastDate
      );
      setPendingInterest(pending);
      setDaysPending(days);
    } else {
      setPendingInterest(0);
      setDaysPending(0);
    }
  }, [current, interestRate, lastInterestDate, mode, transactions, remaining]);

  const applyInterestCharge = useCallback(() => {
    if (mode !== 'debt' || remaining <= 0) return;

    const lastDate = lastInterestDate || (transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString());
    const { pendingInterest: interest, daysPending: days } = calculatePendingInterest(
      remaining,
      interestRate,
      lastDate
    );

    if (interest > 0) {
      const interestTransaction = {
        id: Date.now(),
        amount: interest,
        date: new Date().toISOString(),
        note: 'Monthly interest charge',
        type: 'interest',
        days: days,
        runningTotal: current + interest,
      };

      setTransactions([...transactions, interestTransaction]);
      setLastInterestDate(new Date().toISOString());
      setPendingInterest(0);
      setDaysPending(0);
    }
  }, [current, interestRate, lastInterestDate, mode, remaining, setLastInterestDate, setPendingInterest, setDaysPending, setTransactions, transactions]);

  // Auto-apply interest on app load if 30+ days have passed
  useEffect(() => {
    if (mode === 'debt' && remaining > 0) {
      const lastDate = lastInterestDate || (transactions.length > 0 ? transactions[transactions.length - 1].date : null);

      if (shouldApplyInterest(lastDate, 30)) {
        applyInterestCharge();
      }
    }
  }, [applyInterestCharge, lastInterestDate, mode, remaining, transactions]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setTransactions([]);
    setGoal(10000);
    setLastInterestDate(null);
  };

  const handleAddTransaction = (amount, note) => {
    let newTransactions = [...transactions];
    
    // For debt mode, add any pending interest first
    if (mode === 'debt' && remaining > 0 && pendingInterest > 0) {
      const interestTransaction = {
        id: Date.now(),
        amount: pendingInterest,
        date: new Date().toISOString(),
        note: 'Interest charge',
        type: 'interest',
        days: daysPending,
        runningTotal: current + pendingInterest,
      };
      newTransactions.push(interestTransaction);
      setLastInterestDate(new Date().toISOString());
    }
    
    // Add the payment/deposit transaction
    const newRunningTotal = newTransactions.length > 0 
      ? newTransactions[newTransactions.length - 1].runningTotal + (mode === 'debt' ? -amount : amount)
      : current + (mode === 'debt' ? -amount : amount);
    
    const paymentTransaction = {
      id: Date.now() + 1,
      amount: mode === 'debt' ? -amount : amount,
      date: new Date().toISOString(),
      note: note,
      type: 'transaction',
      runningTotal: newRunningTotal,
    };
    
    newTransactions.push(paymentTransaction);
    setTransactions(newTransactions);
    
    // Reset pending interest after adding transaction
    if (mode === 'debt') {
      setPendingInterest(0);
      setDaysPending(0);
    }
  };

  const handleDeleteTransaction = (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      const updatedTransactions = transactions.filter((t) => t.id !== id);
      
      // Recalculate running totals
      let runningTotal = 0;
      const recalculatedTransactions = updatedTransactions.map((t) => {
        runningTotal += t.amount;
        return { ...t, runningTotal };
      });
      
      setTransactions(recalculatedTransactions);
      
      // Reset last interest date if no transactions remain
      if (recalculatedTransactions.length === 0) {
        setLastInterestDate(null);
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all data?')) {
      localStorage.removeItem('trackerMode');
      localStorage.removeItem('trackerGoal');
      localStorage.removeItem('trackerTransactions');
      localStorage.removeItem('trackerInterestRate');
      localStorage.removeItem('trackerLastInterestDate');
      setMode('savings');
      setGoal(10000);
      setTransactions([]);
      setInterestRate(18.99);
      setLastInterestDate(null);
      setPendingInterest(0);
      setDaysPending(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Financial Progress Tracker
          </h1>
          <p className="text-slate-600">Track your savings goals or debt payoff</p>
        </div>

        <ModeSelector mode={mode} onModeChange={handleModeChange} />
        
        <GoalInput mode={mode} goal={goal} onUpdateGoal={setGoal} />

        <InterestSettings 
          mode={mode}
          interestRate={interestRate}
          onUpdateRate={setInterestRate}
        />

        {mode === 'debt' && (
          <PendingInterestBanner
            pendingInterest={pendingInterest}
            daysPending={daysPending}
            interestRate={interestRate}
            onApplyNow={applyInterestCharge}
          />
        )}

        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex items-end justify-center gap-8">
            <ThermometerDisplay mode={mode} percentage={percentage} />
            <StatsPanel 
              mode={mode} 
              goal={goal} 
              current={current} 
              remaining={remaining} 
              percentage={percentage}
              pendingInterest={pendingInterest}
            />
          </div>
        </div>

        <ProgressUpdater 
          mode={mode} 
          onAddTransaction={handleAddTransaction}
          interestRate={interestRate}
          currentBalance={mode === 'savings' ? current : remaining}
        />

        <Chart transactions={transactions} mode={mode} />

        <TransactionHistory 
          transactions={[...transactions].reverse()} 
          mode={mode}
          onDeleteTransaction={handleDeleteTransaction}
        />

        <div className="text-center">
          <button
            onClick={handleReset}
            className="px-6 py-2 text-sm text-slate-600 hover:text-slate-800 underline"
          >
            Reset All Data
          </button>
        </div>
      </div>
    </div>
  );
}