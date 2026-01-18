/**
 * Input Styles Utility
 *
 * Centralized input styling system that provides consistent, reusable input styles
 * throughout the application. Supports different variants, sizes, and states while
 * eliminating Tailwind CSS class duplication.
 *
 * @fileoverview Input styling utility functions and style objects
 */

import { getModeColors } from './colorUtils';

/**
 * Base input styles that apply to all inputs
 */
export const baseInputStyles = 'border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Input size variations
 */
export const inputSizes = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
  xl: 'px-5 py-4 text-lg'
};

/**
 * Input variant styles
 */
export const inputVariants = {
  default: {
    base: 'border-slate-300 bg-white text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500',
    error: 'border-red-300 bg-red-50 text-red-700 placeholder-red-400 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-300 bg-green-50 text-green-700 placeholder-green-400 focus:border-green-500 focus:ring-green-500',
    disabled: 'border-slate-200 bg-slate-100 text-slate-500 placeholder-slate-400'
  },
  filled: {
    base: 'border-transparent bg-slate-100 text-slate-700 placeholder-slate-500 focus:bg-white focus:border-blue-500 focus:ring-blue-500',
    error: 'border-transparent bg-red-100 text-red-700 placeholder-red-500 focus:bg-red-50 focus:border-red-500 focus:ring-red-500',
    success: 'border-transparent bg-green-100 text-green-700 placeholder-green-500 focus:bg-green-50 focus:border-green-500 focus:ring-green-500',
    disabled: 'border-transparent bg-slate-50 text-slate-500 placeholder-slate-400'
  },
  minimal: {
    base: 'border-transparent border-b-2 border-b-slate-300 rounded-none bg-transparent text-slate-700 placeholder-slate-400 focus:border-b-blue-500 focus:ring-0',
    error: 'border-transparent border-b-2 border-b-red-300 rounded-none bg-transparent text-red-700 placeholder-red-400 focus:border-b-red-500 focus:ring-0',
    success: 'border-transparent border-b-2 border-b-green-300 rounded-none bg-transparent text-green-700 placeholder-green-400 focus:border-b-green-500 focus:ring-0',
    disabled: 'border-transparent border-b-2 border-b-slate-200 rounded-none bg-transparent text-slate-500 placeholder-slate-400'
  }
};

/**
 * Mode-specific input styles that adapt to savings/debt context
 */
export const modeInputVariants = {
  modeDefault: (mode) => {
    const colors = getModeColors(mode);
    const colorName = mode === 'savings' ? 'green' : 'red';
    return {
      base: `border-slate-300 bg-white text-slate-700 placeholder-slate-400 focus:border-${colorName}-500 focus:ring-${colorName}-500`,
      error: 'border-red-300 bg-red-50 text-red-700 placeholder-red-400 focus:border-red-500 focus:ring-red-500',
      success: `border-${colorName}-300 bg-${colorName}-50 text-${colorName}-700 placeholder-${colorName}-400 focus:border-${colorName}-500 focus:ring-${colorName}-500`,
      disabled: 'border-slate-200 bg-slate-100 text-slate-500 placeholder-slate-400'
    };
  },
  modeFilled: (mode) => {
    const colorName = mode === 'savings' ? 'green' : 'red';
    return {
      base: `border-transparent bg-slate-100 text-slate-700 placeholder-slate-500 focus:bg-white focus:border-${colorName}-500 focus:ring-${colorName}-500`,
      error: 'border-transparent bg-red-100 text-red-700 placeholder-red-500 focus:bg-red-50 focus:border-red-500 focus:ring-red-500',
      success: `border-transparent bg-${colorName}-100 text-${colorName}-700 placeholder-${colorName}-500 focus:bg-${colorName}-50 focus:border-${colorName}-500 focus:ring-${colorName}-500`,
      disabled: 'border-transparent bg-slate-50 text-slate-500 placeholder-slate-400'
    };
  }
};

/**
 * Input type-specific styles
 */
export const inputTypes = {
  text: '',
  number: 'font-mono tabular-nums',
  email: '',
  password: 'font-mono',
  search: 'pr-8', // Space for search icon
  tel: 'font-mono',
  url: 'font-mono'
};

/**
 * Get complete input classes for a given variant and size
 * @param {string} variant - Input variant (default, filled, minimal)
 * @param {string} size - Input size (xs, sm, md, lg, xl)
 * @param {string} state - Input state (base, error, success, disabled)
 * @param {string} type - Input type (text, number, email, etc.)
 * @param {string} mode - Current mode (for mode-specific variants)
 * @param {string} additionalClasses - Additional custom classes
 * @returns {string} Complete CSS class string
 */
export const getInputClasses = (
  variant = 'default',
  size = 'md',
  state = 'base',
  type = 'text',
  mode = null,
  additionalClasses = ''
) => {
  let classes = [baseInputStyles, inputSizes[size]];

  // Add type-specific classes
  if (inputTypes[type]) {
    classes.push(inputTypes[type]);
  }

  // Handle mode-specific variants
  if (variant.startsWith('mode') && mode) {
    const modeVariant = modeInputVariants[variant]?.(mode);
    if (modeVariant) {
      classes.push(modeVariant[state] || modeVariant.base);
    }
  } else {
    // Handle standard variants
    const variantStyles = inputVariants[variant];
    if (variantStyles) {
      classes.push(variantStyles[state] || variantStyles.base);
    }
  }

  // Add any additional classes
  if (additionalClasses) {
    classes.push(additionalClasses);
  }

  return classes.join(' ');
};

/**
 * Pre-built input style combinations for common use cases
 */
export const inputPresets = {
  // Form inputs
  formInput: (state = 'base') => getInputClasses('default', 'md', state),
  formInputLarge: (state = 'base') => getInputClasses('default', 'lg', state),
  formInputSmall: (state = 'base') => getInputClasses('default', 'sm', state),

  // Number inputs
  currencyInput: (state = 'base') => getInputClasses('default', 'lg', state, 'number', null, 'text-right'),
  percentageInput: (state = 'base') => getInputClasses('default', 'md', state, 'number', null, 'text-right'),
  numberInput: (state = 'base') => getInputClasses('default', 'md', state, 'number'),

  // Search inputs
  searchInput: (state = 'base') => getInputClasses('filled', 'md', state, 'search'),
  searchInputLarge: (state = 'base') => getInputClasses('filled', 'lg', state, 'search'),

  // Mode-specific inputs
  modeInput: (mode, state = 'base') => getInputClasses('modeDefault', 'md', state, 'text', mode),
  modeCurrencyInput: (mode, state = 'base') => getInputClasses('modeDefault', 'lg', state, 'number', mode, 'text-right'),
  modeFilledInput: (mode, state = 'base') => getInputClasses('modeFilled', 'md', state, 'text', mode),

  // Specialized inputs
  goalInput: (mode, state = 'base') => getInputClasses('modeDefault', 'xl', state, 'number', mode, 'text-center font-bold text-lg'),
  interestInput: (state = 'base') => getInputClasses('default', 'md', state, 'number', null, 'text-right'),
  noteInput: (state = 'base') => getInputClasses('filled', 'sm', state, 'text'),

  // Minimal style inputs
  minimalInput: (state = 'base') => getInputClasses('minimal', 'md', state),
  minimalCurrency: (state = 'base') => getInputClasses('minimal', 'lg', state, 'number', null, 'text-right'),

  // Compact inputs for tight spaces
  compactInput: (state = 'base') => getInputClasses('filled', 'sm', state),
  inlineInput: (state = 'base') => getInputClasses('minimal', 'sm', state)
};

/**
 * Input wrapper and label styles
 */
export const inputWrapper = {
  base: 'space-y-1',
  inline: 'flex items-center space-x-3',
  stacked: 'space-y-2'
};

export const inputLabel = {
  base: 'block text-sm font-medium text-slate-700',
  required: 'block text-sm font-medium text-slate-700 after:content-["*"] after:ml-0.5 after:text-red-500',
  optional: 'block text-sm font-medium text-slate-700 after:content-["(optional)"] after:ml-1 after:text-slate-500 after:text-xs',
  inline: 'text-sm font-medium text-slate-700',
  sr: 'sr-only' // Screen reader only
};

export const inputHelperText = {
  base: 'text-xs text-slate-500',
  error: 'text-xs text-red-600',
  success: 'text-xs text-green-600',
  warning: 'text-xs text-orange-600'
};

/**
 * Input icon styles for inputs with icons
 */
export const inputIcons = {
  left: {
    wrapper: 'relative',
    input: 'pl-10',
    icon: 'absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400'
  },
  right: {
    wrapper: 'relative',
    input: 'pr-10',
    icon: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400'
  }
};

/**
 * Create a complete input layout with label, input, and helper text
 * @param {Object} options - Input configuration options
 * @returns {Object} CSS classes for different input parts
 */
export const createInputLayout = ({
  variant = 'default',
  size = 'md',
  state = 'base',
  type = 'text',
  mode = null,
  wrapperStyle = 'base',
  labelStyle = 'base',
  helperTextStyle = 'base',
  hasIcon = null,
  required = false,
  optional = false
}) => {
  // Determine label style based on required/optional flags
  let finalLabelStyle = labelStyle;
  if (required && labelStyle === 'base') {
    finalLabelStyle = 'required';
  } else if (optional && labelStyle === 'base') {
    finalLabelStyle = 'optional';
  }

  const layout: {
    wrapper: string;
    label: string;
    input: string;
    helperText: string;
    inputWrapper?: string;
    icon?: string;
  } = {
    wrapper: inputWrapper[wrapperStyle] || inputWrapper.base,
    label: inputLabel[finalLabelStyle] || inputLabel.base,
    input: getInputClasses(variant, size, state, type, mode),
    helperText: inputHelperText[helperTextStyle] || inputHelperText.base
  };

  // Add icon styling if specified
  if (hasIcon) {
    const iconConfig = inputIcons[hasIcon];
    if (iconConfig) {
      layout.inputWrapper = iconConfig.wrapper;
      layout.input += ` ${iconConfig.input}`;
      layout.icon = iconConfig.icon;
    }
  }

  return layout;
};

/**
 * Input state management utilities
 */
export const inputStates = {
  /**
   * Get classes for input validation state
   */
  getValidationClasses: (isValid, hasError, hasSuccess) => {
    if (hasError) return 'error';
    if (hasSuccess) return 'success';
    if (isValid === false) return 'error';
    if (isValid === true) return 'success';
    return 'base';
  },

  /**
   * Get helper text based on validation state
   */
  getHelperTextStyle: (isValid, hasError, hasSuccess) => {
    if (hasError) return 'error';
    if (hasSuccess) return 'success';
    if (isValid === false) return 'error';
    if (isValid === true) return 'success';
    return 'base';
  }
};

export default {
  getInputClasses,
  inputPresets,
  createInputLayout,
  inputStates,
  baseInputStyles,
  inputSizes,
  inputVariants,
  modeInputVariants,
  inputWrapper,
  inputLabel,
  inputHelperText,
  inputIcons
};