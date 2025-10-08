import React, { useState } from 'react';
import { formatCurrency } from '../utils/formatCurrency';
import { useFieldValidation } from '../hooks/useValidation';
import { CSS_CLASSES, getModeLabels } from '../constants';

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
              goalValidation.hasError
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
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
          disabled={!tempGoal.trim() || goalValidation.hasError}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            !tempGoal.trim() || goalValidation.hasError
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          Update
        </button>
      </div>
    </div>
  );
}