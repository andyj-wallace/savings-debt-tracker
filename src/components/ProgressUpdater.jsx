import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useValidation } from '../hooks/useValidation';
import { MODES, getModeLabels, getModeColors, CSS_CLASSES } from '../constants';

export default function ProgressUpdater({ mode, onAddTransaction, interestRate, currentBalance }) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // Validation hook for transaction form
  const validation = useValidation({
    mode,
    validateOnChange: false,
    validateOnBlur: true
  });

  const modeLabels = getModeLabels(mode);
  const modeColors = getModeColors(mode);

  const handleUpdate = async () => {
    if (!amount.trim()) {
      return;
    }

    // Validate the transaction using preset
    const validationResult = validation.presets.newTransaction(amount, note);

    if (validationResult.isValid) {
      onAddTransaction(validationResult.results.amount.value, validationResult.results.note.value);
      setAmount('');
      setNote('');
      setIsEditing(false);
      validation.clearErrors();
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className={CSS_CLASSES.TEXT.SECTION_TITLE}>
        {modeLabels.ACTION}
      </h2>
      
      {mode === MODES.DEBT && currentBalance > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Note:</strong> Interest will be calculated and added based on your current balance 
            of ${currentBalance.toFixed(2)} at {interestRate.toFixed(2)}% APR.
          </div>
        </div>
      )}

      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            modeColors.PRIMARY
          } hover:${modeColors.PRIMARY_HOVER} text-white`}
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
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                amountFieldState.hasError
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
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
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                noteFieldState.hasError
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
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
              disabled={!amount.trim() || hasErrors}
              className={`flex-1 px-6 py-2 rounded-lg font-medium transition-colors ${
                !amount.trim() || hasErrors
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : `${modeColors.PRIMARY} hover:${modeColors.PRIMARY_HOVER} text-white`
              }`}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className={CSS_CLASSES.BUTTONS.SECONDARY}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}