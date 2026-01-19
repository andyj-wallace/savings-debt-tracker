/**
 * Color Utilities
 *
 * Centralized color management system that provides dynamic color generation,
 * mode-specific theming, and accessibility-compliant color combinations.
 * Eliminates hardcoded color classes and enables consistent theming.
 *
 * @fileoverview Color utility functions and theme management
 */

import { config } from '../config/app.config';

/**
 * Base color palette with semantic meanings
 */
export const colorPalette = {
  // Primary colors
  blue: {
    50: 'bg-blue-50',
    100: 'bg-blue-100',
    200: 'bg-blue-200',
    300: 'bg-blue-300',
    400: 'bg-blue-400',
    500: 'bg-blue-500',
    600: 'bg-blue-600',
    700: 'bg-blue-700',
    800: 'bg-blue-800',
    900: 'bg-blue-900'
  },
  green: {
    50: 'bg-green-50',
    100: 'bg-green-100',
    200: 'bg-green-200',
    300: 'bg-green-300',
    400: 'bg-green-400',
    500: 'bg-green-500',
    600: 'bg-green-600',
    700: 'bg-green-700',
    800: 'bg-green-800',
    900: 'bg-green-900'
  },
  red: {
    50: 'bg-red-50',
    100: 'bg-red-100',
    200: 'bg-red-200',
    300: 'bg-red-300',
    400: 'bg-red-400',
    500: 'bg-red-500',
    600: 'bg-red-600',
    700: 'bg-red-700',
    800: 'bg-red-800',
    900: 'bg-red-900'
  },
  orange: {
    50: 'bg-orange-50',
    100: 'bg-orange-100',
    200: 'bg-orange-200',
    300: 'bg-orange-300',
    400: 'bg-orange-400',
    500: 'bg-orange-500',
    600: 'bg-orange-600',
    700: 'bg-orange-700',
    800: 'bg-orange-800',
    900: 'bg-orange-900'
  },
  slate: {
    50: 'bg-slate-50',
    100: 'bg-slate-100',
    200: 'bg-slate-200',
    300: 'bg-slate-300',
    400: 'bg-slate-400',
    500: 'bg-slate-500',
    600: 'bg-slate-600',
    700: 'bg-slate-700',
    800: 'bg-slate-800',
    900: 'bg-slate-900'
  }
};

/**
 * Text color variants for each color
 */
export const textColorPalette = {
  blue: {
    50: 'text-blue-50',
    100: 'text-blue-100',
    200: 'text-blue-200',
    300: 'text-blue-300',
    400: 'text-blue-400',
    500: 'text-blue-500',
    600: 'text-blue-600',
    700: 'text-blue-700',
    800: 'text-blue-800',
    900: 'text-blue-900'
  },
  green: {
    50: 'text-green-50',
    100: 'text-green-100',
    200: 'text-green-200',
    300: 'text-green-300',
    400: 'text-green-400',
    500: 'text-green-500',
    600: 'text-green-600',
    700: 'text-green-700',
    800: 'text-green-800',
    900: 'text-green-900'
  },
  red: {
    50: 'text-red-50',
    100: 'text-red-100',
    200: 'text-red-200',
    300: 'text-red-300',
    400: 'text-red-400',
    500: 'text-red-500',
    600: 'text-red-600',
    700: 'text-red-700',
    800: 'text-red-800',
    900: 'text-red-900'
  },
  orange: {
    50: 'text-orange-50',
    100: 'text-orange-100',
    200: 'text-orange-200',
    300: 'text-orange-300',
    400: 'text-orange-400',
    500: 'text-orange-500',
    600: 'text-orange-600',
    700: 'text-orange-700',
    800: 'text-orange-800',
    900: 'text-orange-900'
  },
  slate: {
    50: 'text-slate-50',
    100: 'text-slate-100',
    200: 'text-slate-200',
    300: 'text-slate-300',
    400: 'text-slate-400',
    500: 'text-slate-500',
    600: 'text-slate-600',
    700: 'text-slate-700',
    800: 'text-slate-800',
    900: 'text-slate-900'
  }
};

/**
 * Border color variants for each color
 */
export const borderColorPalette = {
  blue: {
    50: 'border-blue-50',
    100: 'border-blue-100',
    200: 'border-blue-200',
    300: 'border-blue-300',
    400: 'border-blue-400',
    500: 'border-blue-500',
    600: 'border-blue-600',
    700: 'border-blue-700',
    800: 'border-blue-800',
    900: 'border-blue-900'
  },
  green: {
    50: 'border-green-50',
    100: 'border-green-100',
    200: 'border-green-200',
    300: 'border-green-300',
    400: 'border-green-400',
    500: 'border-green-500',
    600: 'border-green-600',
    700: 'border-green-700',
    800: 'border-green-800',
    900: 'border-green-900'
  },
  red: {
    50: 'border-red-50',
    100: 'border-red-100',
    200: 'border-red-200',
    300: 'border-red-300',
    400: 'border-red-400',
    500: 'border-red-500',
    600: 'border-red-600',
    700: 'border-red-700',
    800: 'border-red-800',
    900: 'border-red-900'
  },
  orange: {
    50: 'border-orange-50',
    100: 'border-orange-100',
    200: 'border-orange-200',
    300: 'border-orange-300',
    400: 'border-orange-400',
    500: 'border-orange-500',
    600: 'border-orange-600',
    700: 'border-orange-700',
    800: 'border-orange-800',
    900: 'border-orange-900'
  },
  slate: {
    50: 'border-slate-50',
    100: 'border-slate-100',
    200: 'border-slate-200',
    300: 'border-slate-300',
    400: 'border-slate-400',
    500: 'border-slate-500',
    600: 'border-slate-600',
    700: 'border-slate-700',
    800: 'border-slate-800',
    900: 'border-slate-900'
  }
};

/**
 * Get mode-specific color scheme from configuration
 * @param {string} mode - Current mode ('savings' or 'debt')
 * @returns {Object} Color scheme object
 */
export const getModeColorScheme = (mode) => {
  const colorScheme = config.get('ui.theme.colorScheme', {
    savings: { primary: 'green', secondary: 'emerald' },
    debt: { primary: 'red', secondary: 'rose' }
  });

  return colorScheme[mode] || colorScheme.savings;
};

/**
 * Get mode-specific colors with different intensities
 * @param {string} mode - Current mode ('savings' or 'debt')
 * @returns {Object} Color classes for different use cases
 */
export const getModeColors = (mode) => {
  const scheme = getModeColorScheme(mode);
  const primaryColor = scheme.primary;

  return {
    // Background colors
    bg: {
      light: colorPalette[primaryColor]?.[50] || colorPalette.slate[50],
      medium: colorPalette[primaryColor]?.[100] || colorPalette.slate[100],
      strong: colorPalette[primaryColor]?.[500] || colorPalette.slate[500],
      dark: colorPalette[primaryColor]?.[700] || colorPalette.slate[700]
    },
    // Text colors
    text: {
      light: textColorPalette[primaryColor]?.[400] || textColorPalette.slate[400],
      medium: textColorPalette[primaryColor]?.[600] || textColorPalette.slate[600],
      strong: textColorPalette[primaryColor]?.[700] || textColorPalette.slate[700],
      contrast: 'text-white'
    },
    // Border colors
    border: {
      light: borderColorPalette[primaryColor]?.[200] || borderColorPalette.slate[200],
      medium: borderColorPalette[primaryColor]?.[300] || borderColorPalette.slate[300],
      strong: borderColorPalette[primaryColor]?.[500] || borderColorPalette.slate[500]
    },
    // Hover states
    hover: {
      bg: colorPalette[primaryColor]?.[600] || colorPalette.slate[600],
      border: borderColorPalette[primaryColor]?.[400] || borderColorPalette.slate[400]
    }
  };
};

/**
 * Get status-based colors for different states
 * @param {string} status - Status type ('success', 'warning', 'error', 'info')
 * @returns {Object} Color classes for the status
 */
export const getStatusColors = (status) => {
  const statusColorMap = {
    success: 'green',
    warning: 'orange',
    error: 'red',
    info: 'blue'
  };

  const color = statusColorMap[status] || 'slate';

  return {
    bg: {
      light: colorPalette[color][50],
      medium: colorPalette[color][100],
      strong: colorPalette[color][500]
    },
    text: {
      light: textColorPalette[color][600],
      strong: textColorPalette[color][700],
      contrast: 'text-white'
    },
    border: {
      light: borderColorPalette[color][200],
      strong: borderColorPalette[color][500]
    }
  };
};

/**
 * Get progress-based colors for completion percentages
 * @param {number} percentage - Completion percentage (0-100)
 * @param {string} mode - Current mode for color scheme
 * @returns {Object} Color classes based on progress
 */
export const getProgressColors = (percentage, mode) => {
  const modeColors = getModeColors(mode);

  // Different color intensities based on progress
  if (percentage >= 100) {
    return {
      bg: modeColors.bg.strong,
      text: modeColors.text.contrast,
      border: modeColors.border.strong
    };
  } else if (percentage >= 75) {
    return {
      bg: modeColors.bg.medium,
      text: modeColors.text.strong,
      border: modeColors.border.medium
    };
  } else if (percentage >= 25) {
    return {
      bg: modeColors.bg.light,
      text: modeColors.text.medium,
      border: modeColors.border.light
    };
  } else {
    return {
      bg: colorPalette.slate[50],
      text: textColorPalette.slate[600],
      border: borderColorPalette.slate[200]
    };
  }
};

/**
 * Create gradient classes for mode-specific backgrounds
 * @param {string} mode - Current mode ('savings' or 'debt')
 * @param {string} direction - Gradient direction ('to-r', 'to-b', etc.)
 * @returns {string} Gradient CSS classes
 */
export const getModeGradient = (mode, direction = 'to-r') => {
  const colors = getModeColors(mode);
  const scheme = getModeColorScheme(mode);
  const primaryColor = scheme.primary;

  return `bg-gradient-${direction} from-${primaryColor}-400 to-${primaryColor}-600`;
};

/**
 * Get accessible color combinations that meet WCAG guidelines
 * @param {string} backgroundColor - Background color name
 * @param {number} backgroundShade - Background color shade (50-900)
 * @returns {Object} Accessible text and border colors
 */
export const getAccessibleColors = (backgroundColor, backgroundShade) => {
  // Light backgrounds need dark text
  if (backgroundShade <= 300) {
    return {
      text: textColorPalette.slate[700],
      textSecondary: textColorPalette.slate[600],
      border: borderColorPalette.slate[300]
    };
  }
  // Dark backgrounds need light text
  else if (backgroundShade >= 600) {
    return {
      text: textColorPalette.slate[100],
      textSecondary: textColorPalette.slate[200],
      border: borderColorPalette.slate[500]
    };
  }
  // Medium backgrounds
  else {
    return {
      text: textColorPalette.slate[800],
      textSecondary: textColorPalette.slate[700],
      border: borderColorPalette.slate[400]
    };
  }
};

/**
 * Create dynamic color variations for components
 * @param {string} baseColor - Base color name
 * @param {Object} options - Customization options
 * @returns {Object} Complete color scheme for component
 */
interface ColorSchemeOptions {
  intensity?: number;
  includeHover?: boolean;
  includeFocus?: boolean;
  includeDisabled?: boolean;
}

interface ColorSet {
  bg: string;
  text: string;
  border: string;
}

interface ColorScheme {
  bg: string;
  text: string;
  border: string;
  hover?: ColorSet;
  focus?: {
    ring: string;
    border: string;
  };
  disabled?: ColorSet;
}

export const createColorScheme = (baseColor: string, options: ColorSchemeOptions = {}): ColorScheme => {
  const {
    intensity = 500,
    includeHover = true,
    includeFocus = true,
    includeDisabled = true
  } = options;

  const scheme: ColorScheme = {
    bg: colorPalette[baseColor]?.[intensity] || colorPalette.slate[intensity],
    text: textColorPalette[baseColor]?.[intensity] || textColorPalette.slate[intensity],
    border: borderColorPalette[baseColor]?.[intensity] || borderColorPalette.slate[intensity]
  };

  if (includeHover) {
    const hoverIntensity = Math.min(intensity + 100, 900);
    scheme.hover = {
      bg: colorPalette[baseColor]?.[hoverIntensity] || colorPalette.slate[hoverIntensity],
      text: textColorPalette[baseColor]?.[hoverIntensity] || textColorPalette.slate[hoverIntensity],
      border: borderColorPalette[baseColor]?.[hoverIntensity] || borderColorPalette.slate[hoverIntensity]
    };
  }

  if (includeFocus) {
    scheme.focus = {
      ring: `focus:ring-${baseColor}-500`,
      border: borderColorPalette[baseColor]?.[500] || borderColorPalette.slate[500]
    };
  }

  if (includeDisabled) {
    scheme.disabled = {
      bg: colorPalette.slate[100],
      text: textColorPalette.slate[400],
      border: borderColorPalette.slate[200]
    };
  }

  return scheme;
};

/**
 * Utility functions for color manipulation
 */
export const colorUtils = {
  /**
   * Get mode colors with backward compatibility
   */
  getModeColors,

  /**
   * Get status colors for alerts and notifications
   */
  getStatusColors,

  /**
   * Get progress-based colors
   */
  getProgressColors,

  /**
   * Get mode-specific gradient
   */
  getModeGradient,

  /**
   * Create complete color scheme
   */
  createColorScheme,

  /**
   * Get accessible color combinations
   */
  getAccessibleColors,

  /**
   * Get raw color palettes
   */
  getPalette: (type = 'bg') => {
    switch (type) {
      case 'text': return textColorPalette;
      case 'border': return borderColorPalette;
      default: return colorPalette;
    }
  }
};

export default colorUtils;