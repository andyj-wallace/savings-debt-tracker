import React, { useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { useFieldValidation } from '../hooks/useValidation';
import { MODES, LABELS, CSS_CLASSES, DEFAULTS } from '../constants';

export default function InterestSettings({ interestRate, onUpdateRate, mode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempRate, setTempRate] = useState('');

  // Validation hook for interest rate input
  const rateValidation = useFieldValidation('interestRate', {
    mode,
    validateOnChange: false,
    validateOnBlur: true
  });

  if (mode !== MODES.DEBT) return null;

  // Ensure interestRate is a number
  const rate = typeof interestRate === 'number' ? interestRate : parseFloat(interestRate) || DEFAULTS.INTEREST_RATE;


  const handleUpdate = async () => {
    if (!tempRate.trim()) {
      return;
    }

    // Validate the interest rate
    const validation = await rateValidation.validate(tempRate);

    if (validation.isValid) {
      onUpdateRate(validation.value);
      setTempRate('');
      setIsEditing(false);
      rateValidation.clear();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setTempRate(value);

    // Clear previous validation error when user starts typing
    if (rateValidation.hasError) {
      rateValidation.clear();
    }
  };

  const handleInputBlur = async () => {
    if (tempRate.trim()) {
      await rateValidation.validate(tempRate);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempRate('');
    rateValidation.clear();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-slate-700" />
          <h2 className={CSS_CLASSES.TEXT.SECTION_TITLE}>{LABELS.COMMON.INTEREST_SETTINGS}</h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-500 hover:text-blue-700 underline"
          >
            Edit
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="flex items-center justify-between bg-slate-50 rounded-lg p-4">
          <div>
            <div className={CSS_CLASSES.TEXT.LABEL}>{LABELS.COMMON.ANNUAL_INTEREST_RATE}</div>
            <div className={CSS_CLASSES.TEXT.VALUE}>{rate.toFixed(2)}%</div>
            <div className={CSS_CLASSES.TEXT.SMALL_TEXT}>
              Daily Rate: {(rate / 365).toFixed(4)}%
            </div>
          </div>
          <Info size={20} className="text-slate-400" />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className={`block ${CSS_CLASSES.TEXT.LABEL} mb-2`}>
              Enter {LABELS.COMMON.ANNUAL_INTEREST_RATE}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="99.99"
              value={tempRate}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder={`${rate.toFixed(2)}%`}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                rateValidation.hasError
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              autoFocus
            />
            {rateValidation.showError && (
              <div className="mt-1 text-sm text-red-600">
                {rateValidation.error}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              disabled={!tempRate.trim() || rateValidation.hasError}
              className={`flex-1 px-6 py-2 rounded-lg font-medium transition-colors ${
                !tempRate.trim() || rateValidation.hasError
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-800">
              <strong>Tip:</strong> Check your credit card statement for the APR. 
              Common rates range from 15% to 25%.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}