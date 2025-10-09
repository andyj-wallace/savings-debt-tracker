import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatCurrency';
import { useFieldValidation } from '../hooks/useValidation';
import { CSS_CLASSES, getModeLabels } from '../constants';
import { cardPresets } from '../styles/cardStyles';
import { inputPresets, inputStates } from '../styles/inputStyles';
import { buttonPresets } from '../styles/buttonStyles';

export default function GoalInput({ mode, goal, onUpdateGoal }) {
  const [tempGoal, setTempGoal] = useState('');

  // Validation hook for goal input
  const goalValidation = useFieldValidation('goal', {
    mode,
    validateOnChange: false,
    validateOnBlur: true
  });

  const handleUpdate = async () => {
    if (!tempGoal.trim()) {
      return;
    }

    // Validate the goal
    const validation = await goalValidation.validate(tempGoal);

    if (validation.isValid) {
      onUpdateGoal(validation.value);
      setTempGoal('');
      goalValidation.clear();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setTempGoal(value);

    // Clear previous validation error when user starts typing
    if (goalValidation.hasError) {
      goalValidation.clear();
    }
  };

  const handleInputBlur = async () => {
    if (tempGoal.trim()) {
      await goalValidation.validate(tempGoal);
    }
  };

  const modeLabels = getModeLabels(mode);
  const inputState = inputStates.getValidationClasses(undefined, goalValidation.hasError, false);
  const isDisabled = !tempGoal.trim() || goalValidation.hasError;

  return (
    <div className={`${cardPresets.formCard()} mb-6`}>
      <h2 className={CSS_CLASSES.TEXT.SECTION_TITLE}>
        {modeLabels.TITLE}
      </h2>
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            value={tempGoal}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={formatCurrency(goal)}
            className={`w-full ${inputPresets.goalInput(mode, inputState)}`}
            min="0"
            step="0.01"
          />
          {goalValidation.showError && (
            <div className="mt-1 text-sm text-red-600">
              {goalValidation.error}
            </div>
          )}
        </div>
        <button
          onClick={handleUpdate}
          disabled={isDisabled}
          className={buttonPresets.formSubmit(isDisabled)}
        >
          Update
        </button>
      </div>
    </div>
  );
}