import React from 'react';
import { useTrackerContext } from '../context/TrackerContext';
import {
  MODES,
  LABELS,
  CSS_CLASSES
} from '../constants';
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
  const {
    mode,
    goal,
    transactions,
    interestRate,
    current,
    remaining,
    percentage,
    pendingInterest,
    daysPending,
    handleModeChange,
    handleAddTransaction,
    handleDeleteTransaction,
    handleReset,
    applyInterestCharge,
    setGoal,
    setInterestRate
  } = useTrackerContext();

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