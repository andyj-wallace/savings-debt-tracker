import { useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { useFieldValidation } from '../hooks/useValidation';
import { MODES, LABELS, CSS_CLASSES, DEFAULTS } from '../constants';
import { cardPresets } from '../styles/cardStyles';
import { buttonPresets } from '../styles/buttonStyles';
import { inputPresets, inputStates, inputHelperText } from '../styles/inputStyles';

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

  // Get input validation state
  const inputState = inputStates.getValidationClasses(null, rateValidation.hasError, false);
  const isDisabled = !tempRate.trim() || rateValidation.hasError;

  return (
    <div className={`${cardPresets.primary()} mb-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings size={20} className="text-slate-700" />
          <h2 className={CSS_CLASSES.TEXT.SECTION_TITLE}>{LABELS.COMMON.INTEREST_SETTINGS}</h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className={buttonPresets.textLink()}
          >
            Edit
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className={`${cardPresets.compact()} flex items-center justify-between`}>
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
              className={`w-full ${inputPresets.interestInput(inputState)}`}
              autoFocus
            />
            {rateValidation.showError && (
              <div className={`mt-1 ${inputHelperText.error}`}>
                {rateValidation.error}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              disabled={isDisabled}
              className={`flex-1 ${buttonPresets.formSubmit(isDisabled)}`}
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
          <div className={cardPresets.info()}>
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
