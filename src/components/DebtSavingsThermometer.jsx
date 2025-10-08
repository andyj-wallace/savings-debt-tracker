import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  STORAGE_KEYS,
  DEFAULTS,
  MODES,
  INTEREST,
  LABELS,
  CSS_CLASSES
} from '../constants';
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
  const [mode, setMode] = useLocalStorage(STORAGE_KEYS.MODE, DEFAULTS.MODE);
  const [goal, setGoal] = useLocalStorage(STORAGE_KEYS.GOAL, DEFAULTS.GOAL);
  const [transactionsRaw, setTransactions] = useLocalStorage(STORAGE_KEYS.TRANSACTIONS, []);
  const [interestRate, setInterestRate] = useLocalStorage(STORAGE_KEYS.INTEREST_RATE, DEFAULTS.INTEREST_RATE);
  const [lastInterestDate, setLastInterestDate] = useLocalStorage(STORAGE_KEYS.LAST_INTEREST_DATE, null);
  
  const [pendingInterest, setPendingInterest] = useState(0);
  const [daysPending, setDaysPending] = useState(0);

  // Ensure transactions is always an array
  const transactions = useMemo(() => Array.isArray(transactionsRaw) ? transactionsRaw : [], [transactionsRaw]);

  // Calculate current total from transactions
  const current = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate percentage based on mode
  let percentage;
  let remaining;
  
  if (mode === MODES.SAVINGS) {
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
    if (mode === MODES.DEBT && remaining > 0) {
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
    if (mode !== MODES.DEBT || remaining <= 0) return;

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
        note: LABELS.COMMON.MONTHLY_INTEREST_CHARGE,
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
    if (mode === MODES.DEBT && remaining > 0) {
      const lastDate = lastInterestDate || (transactions.length > 0 ? transactions[transactions.length - 1].date : null);

      if (shouldApplyInterest(lastDate, INTEREST.AUTO_APPLY_THRESHOLD_DAYS)) {
        applyInterestCharge();
      }
    }
  }, [applyInterestCharge, lastInterestDate, mode, remaining, transactions]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setTransactions([]);
    setGoal(DEFAULTS.GOAL);
    setLastInterestDate(null);
  };

  const handleAddTransaction = (amount, note) => {
    let newTransactions = [...transactions];
    
    // For debt mode, add any pending interest first
    if (mode === MODES.DEBT && remaining > 0 && pendingInterest > 0) {
      const interestTransaction = {
        id: Date.now(),
        amount: pendingInterest,
        date: new Date().toISOString(),
        note: LABELS.COMMON.INTEREST_CHARGE,
        type: 'interest',
        days: daysPending,
        runningTotal: current + pendingInterest,
      };
      newTransactions.push(interestTransaction);
      setLastInterestDate(new Date().toISOString());
    }
    
    // Add the payment/deposit transaction
    const newRunningTotal = newTransactions.length > 0 
      ? newTransactions[newTransactions.length - 1].runningTotal + (mode === MODES.DEBT ? -amount : amount)
      : current + (mode === MODES.DEBT ? -amount : amount);
    
    const paymentTransaction = {
      id: Date.now() + 1,
      amount: mode === MODES.DEBT ? -amount : amount,
      date: new Date().toISOString(),
      note: note,
      type: 'transaction',
      runningTotal: newRunningTotal,
    };
    
    newTransactions.push(paymentTransaction);
    setTransactions(newTransactions);
    
    // Reset pending interest after adding transaction
    if (mode === MODES.DEBT) {
      setPendingInterest(0);
      setDaysPending(0);
    }
  };

  const handleDeleteTransaction = (id) => {
    if (window.confirm(LABELS.COMMON.DELETE_CONFIRMATION)) {
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
    if (window.confirm(LABELS.COMMON.RESET_CONFIRMATION)) {
      localStorage.removeItem(STORAGE_KEYS.MODE);
      localStorage.removeItem(STORAGE_KEYS.GOAL);
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEYS.INTEREST_RATE);
      localStorage.removeItem(STORAGE_KEYS.LAST_INTEREST_DATE);
      setMode(DEFAULTS.MODE);
      setGoal(DEFAULTS.GOAL);
      setTransactions([]);
      setInterestRate(DEFAULTS.INTEREST_RATE);
      setLastInterestDate(null);
      setPendingInterest(0);
      setDaysPending(0);
    }
  };

  return (
    <div className={CSS_CLASSES.CONTAINERS.MAIN}>
      <div className={CSS_CLASSES.CONTAINERS.CONTENT}>
        <div className={CSS_CLASSES.CONTAINERS.HEADER}>
          <h1 className={CSS_CLASSES.TEXT.TITLE}>
            {LABELS.COMMON.FINANCIAL_PROGRESS_TRACKER}
          </h1>
          <p className={CSS_CLASSES.TEXT.SUBTITLE}>{LABELS.COMMON.TRACK_SAVINGS_DEBT}</p>
        </div>

        <ModeSelector mode={mode} onModeChange={handleModeChange} />
        
        <GoalInput mode={mode} goal={goal} onUpdateGoal={setGoal} />

        <InterestSettings 
          mode={mode}
          interestRate={interestRate}
          onUpdateRate={setInterestRate}
        />

        {mode === MODES.DEBT && (
          <PendingInterestBanner
            pendingInterest={pendingInterest}
            daysPending={daysPending}
            interestRate={interestRate}
            onApplyNow={applyInterestCharge}
          />
        )}

        <div className={CSS_CLASSES.CARDS.PRIMARY}>
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
          currentBalance={mode === MODES.SAVINGS ? current : remaining}
        />

        <Chart transactions={transactions} mode={mode} />

        <TransactionHistory 
          transactions={[...transactions].reverse()} 
          mode={mode}
          onDeleteTransaction={handleDeleteTransaction}
        />

        <div className={CSS_CLASSES.CONTAINERS.CENTER}>
          <button
            onClick={handleReset}
            className={CSS_CLASSES.BUTTONS.RESET}
          >
            {LABELS.COMMON.RESET_ALL_DATA}
          </button>
        </div>
      </div>
    </div>
  );
}