import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useValidation } from '../hooks/useValidation';
import { useTransactions } from '../hooks/useTransactions';
import { useInterest } from '../hooks/useInterest';
import { useGoalStats } from '../hooks/useGoalStats';
import { MODES, getModeLabels, CSS_CLASSES } from '../constants';
import { cardPresets } from '../styles/cardStyles';
import { inputPresets, inputStates } from '../styles/inputStyles';
import { buttonPresets } from '../styles/buttonStyles';

export default function ProgressUpdater() {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Custom hooks
  const { addTransaction } = useTransactions();
  const {
    isInterestApplicable,
    pendingInterest,
    interestRate,
    hasPendingInterest
  } = useInterest();
  const { detailedStats } = useGoalStats();

  const mode = detailedStats.mode;
  const currentBalance = mode === MODES.DEBT ? detailedStats.debtRemaining : detailedStats.current;

  // Validation hook for transaction form
  const validation = useValidation({
    mode,
    validateOnChange: false,
    validateOnBlur: true
  });

  const modeLabels = getModeLabels(mode);

  const handleUpdate = async () => {
    if (!amount.trim()) {
      return;
    }

    // Validate the transaction using preset
    const validationResult = validation.presets.newTransaction(amount, note);

    if (validationResult.isValid) {
      const result = await addTransaction(
        validationResult.results.amount.value,
        validationResult.results.note.value
      );

      if (result.success) {
        setAmount('');
        setNote('');
        setIsEditing(false);
        validation.clearErrors();
      }
      // Error handling is done by the hook
    } else {
      // Set errors from validation result
      Object.entries(validationResult.errors).forEach(([field, error]) => {
        validation.setFieldError(field, error);
      });
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);

    // Clear error when user starts typing
    if (validation.errors.amount) {
      validation.clearFieldError('amount');
    }
  };

  const handleNoteChange = (e) => {
    const value = e.target.value;
    setNote(value);

    // Clear error when user starts typing
    if (validation.errors.note) {
      validation.clearFieldError('note');
    }
  };

  const handleAmountBlur = async () => {
    if (amount.trim()) {
      await validation.validateField('amount', amount);
    }
  };

  const handleNoteBlur = async () => {
    if (note.trim()) {
      await validation.validateField('note', note);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAmount('');
    setNote('');
    validation.clearErrors();
  };

  const hasErrors = validation.errors.amount || validation.errors.note;
  const amountFieldState = validation.getFieldState('amount');
  const noteFieldState = validation.getFieldState('note');

  const amountInputState = inputStates.getValidationClasses(undefined, amountFieldState.hasError, false);
  const noteInputState = inputStates.getValidationClasses(undefined, noteFieldState.hasError, false);
  const isDisabled = !amount.trim() || hasErrors;

  return (
    <div className={`${cardPresets.formCard()} mb-6`}>
      <h2 className={CSS_CLASSES.TEXT.SECTION_TITLE}>
        {modeLabels.ACTION}
      </h2>
      
      {isInterestApplicable && currentBalance > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Note:</strong> Interest will be calculated and added based on your current balance
            of ${currentBalance.toFixed(2)} at {interestRate.toFixed(2)}% APR.
            {hasPendingInterest && (
              <div className="mt-1">
                <strong>Pending Interest:</strong> ${pendingInterest.toFixed(2)} will be added automatically.
              </div>
            )}
          </div>
        </div>
      )}

      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className={`w-full ${buttonPresets.modeAction(mode)}`}
        >
          Add Transaction
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              placeholder="Enter amount"
              className={`w-full ${inputPresets.modeCurrencyInput(mode, amountInputState)}`}
              min="0"
              step="0.01"
              autoFocus
            />
            {amountFieldState.showError && (
              <div className="mt-1 text-sm text-red-600">
                {amountFieldState.error}
              </div>
            )}
          </div>
          <div>
            <input
              type="text"
              value={note}
              onChange={handleNoteChange}
              onBlur={handleNoteBlur}
              placeholder="Add note (optional)"
              className={`w-full ${inputPresets.noteInput(noteInputState)}`}
              maxLength="200"
            />
            {noteFieldState.showError && (
              <div className="mt-1 text-sm text-red-600">
                {noteFieldState.error}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              disabled={isDisabled}
              className={`flex-1 ${buttonPresets.modeAction(mode, isDisabled)}`}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className={buttonPresets.formCancel()}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}