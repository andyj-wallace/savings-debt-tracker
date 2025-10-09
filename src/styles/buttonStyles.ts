/**
 * Button Styles Utility
 *
 * Centralized button styling system that eliminates Tailwind CSS class duplication
 * and provides consistent, reusable button styles throughout the application.
 * Supports different variants, sizes, and states.
 *
 * @fileoverview Button styling utility functions and style objects
 */

import { getModeColors } from '../constants';

/**
 * Base button styles that apply to all buttons
 */
export const baseButtonStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Button size variations
 */
export const buttonSizes = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg'
};

/**
 * Button variant styles
 */
export const buttonVariants = {
  primary: {
    base: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
    disabled: 'bg-slate-300 text-slate-500'
  },
  secondary: {
    base: 'bg-slate-200 text-slate-700 hover:bg-slate-300 focus:ring-slate-500',
    disabled: 'bg-slate-100 text-slate-400'
  },
  success: {
    base: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500',
    disabled: 'bg-slate-300 text-slate-500'
  },
  danger: {
    base: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    disabled: 'bg-slate-300 text-slate-500'
  },
  warning: {
    base: 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500',
    disabled: 'bg-slate-300 text-slate-500'
  },
  outline: {
    base: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500',
    disabled: 'border-slate-200 bg-slate-50 text-slate-400'
  },
  ghost: {
    base: 'text-slate-700 hover:bg-slate-100 focus:ring-slate-500',
    disabled: 'text-slate-400'
  },
  link: {
    base: 'text-blue-500 hover:text-blue-700 underline focus:ring-blue-500',
    disabled: 'text-slate-400'
  }
};

/**
 * Mode-specific button styles that adapt to savings/debt context
 */
export const modeButtonVariants = {
  modePrimary: (mode) => {
    const colors = getModeColors(mode);
    return {
      base: `${colors.PRIMARY} text-white hover:${colors.PRIMARY_HOVER} focus:ring-${mode === 'savings' ? 'green' : 'red'}-500`,
      disabled: 'bg-slate-300 text-slate-500'
    };
  },
  modeSecondary: (mode) => {
    const colors = getModeColors(mode);
    return {
      base: `border ${colors.BORDER} ${colors.TEXT} hover:${colors.BG_LIGHT} focus:ring-${mode === 'savings' ? 'green' : 'red'}-500`,
      disabled: 'border-slate-200 bg-slate-50 text-slate-400'
    };
  },
  modeOutline: (mode) => {
    const colors = getModeColors(mode);
    return {
      base: `border-2 ${colors.BORDER} ${colors.TEXT} hover:${colors.PRIMARY} hover:text-white focus:ring-${mode === 'savings' ? 'green' : 'red'}-500`,
      disabled: 'border-slate-200 text-slate-400'
    };
  }
};

/**
 * Get complete button classes for a given variant and size
 * @param {string} variant - Button variant (primary, secondary, etc.)
 * @param {string} size - Button size (xs, sm, md, lg, xl)
 * @param {boolean} disabled - Whether the button is disabled
 * @param {string} mode - Current mode (for mode-specific variants)
 * @param {string} additionalClasses - Additional custom classes
 * @returns {string} Complete CSS class string
 */
export const getButtonClasses = (
  variant = 'primary',
  size = 'md',
  disabled = false,
  mode = null,
  additionalClasses = ''
) => {
  let classes = [baseButtonStyles, buttonSizes[size]];

  // Handle mode-specific variants
  if (variant.startsWith('mode') && mode) {
    const modeVariant = modeButtonVariants[variant]?.(mode);
    if (modeVariant) {
      classes.push(disabled ? modeVariant.disabled : modeVariant.base);
    }
  } else {
    // Handle standard variants
    const variantStyles = buttonVariants[variant];
    if (variantStyles) {
      classes.push(disabled ? variantStyles.disabled : variantStyles.base);
    }
  }

  // Add any additional classes
  if (additionalClasses) {
    classes.push(additionalClasses);
  }

  return classes.join(' ');
};

/**
 * Pre-built button style combinations for common use cases
 */
export const buttonPresets = {
  // Form buttons
  formSubmit: (disabled = false) => getButtonClasses('primary', 'md', disabled),
  formCancel: (disabled = false) => getButtonClasses('secondary', 'md', disabled),
  formReset: (disabled = false) => getButtonClasses('outline', 'md', disabled),

  // Action buttons
  actionPrimary: (disabled = false) => getButtonClasses('primary', 'lg', disabled),
  actionSecondary: (disabled = false) => getButtonClasses('secondary', 'lg', disabled),
  actionDanger: (disabled = false) => getButtonClasses('danger', 'md', disabled),

  // Navigation buttons
  navLink: (disabled = false) => getButtonClasses('ghost', 'sm', disabled),
  navButton: (disabled = false) => getButtonClasses('outline', 'sm', disabled),

  // Mode-specific buttons
  modeAction: (mode, disabled = false) => getButtonClasses('modePrimary', 'lg', disabled, mode),
  modeSecondary: (mode, disabled = false) => getButtonClasses('modeSecondary', 'md', disabled, mode),

  // Icon buttons
  iconButton: (disabled = false) => getButtonClasses('ghost', 'sm', disabled, null, 'p-2'),
  iconButtonPrimary: (disabled = false) => getButtonClasses('primary', 'sm', disabled, null, 'p-2'),

  // Utility buttons
  deleteButton: (disabled = false) => getButtonClasses('danger', 'sm', disabled),
  editButton: (disabled = false) => getButtonClasses('outline', 'sm', disabled),
  saveButton: (disabled = false) => getButtonClasses('success', 'md', disabled),

  // Link-style buttons
  textLink: (disabled = false) => getButtonClasses('link', 'sm', disabled),
  underlineLink: (disabled = false) => getButtonClasses('link', 'sm', disabled, null, 'underline')
};

/**
 * Button component wrapper that applies styles
 * This is a utility function for creating styled button components
 * @param {Object} props - Button props
 * @returns {string} CSS classes for the button
 */
export const createButtonStyles = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  mode = null,
  className = '',
  preset = null
}) => {
  // Use preset if provided
  if (preset && buttonPresets[preset]) {
    return `${buttonPresets[preset](disabled)} ${className}`.trim();
  }

  // Use custom variant/size combination
  return getButtonClasses(variant, size, disabled, mode, className);
};

/**
 * Utility function to get hover states for buttons
 * @param {string} variant - Button variant
 * @param {string} mode - Current mode (for mode-specific variants)
 * @returns {string} Hover state classes
 */
export const getButtonHoverStates = (variant, mode = null) => {
  if (variant.startsWith('mode') && mode) {
    const colors = getModeColors(mode);
    return `hover:${colors.PRIMARY_HOVER}`;
  }

  const hoverStates = {
    primary: 'hover:bg-blue-600',
    secondary: 'hover:bg-slate-300',
    success: 'hover:bg-green-600',
    danger: 'hover:bg-red-600',
    warning: 'hover:bg-orange-600',
    outline: 'hover:bg-slate-50',
    ghost: 'hover:bg-slate-100',
    link: 'hover:text-blue-700'
  };

  return hoverStates[variant] || '';
};

export default {
  getButtonClasses,
  buttonPresets,
  createButtonStyles,
  getButtonHoverStates,
  baseButtonStyles,
  buttonSizes,
  buttonVariants,
  modeButtonVariants
};