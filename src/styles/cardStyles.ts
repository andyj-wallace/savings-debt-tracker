/**
 * Card Styles Utility
 *
 * Centralized card styling system that provides consistent, reusable card styles
 * throughout the application. Eliminates Tailwind CSS class duplication and
 * ensures consistent spacing, shadows, and layouts.
 *
 * @fileoverview Card styling utility functions and style objects
 */

/**
 * Base card styles that apply to all cards
 */
export const baseCardStyles = 'bg-white rounded-lg shadow-md';

/**
 * Card size variations
 */
export const cardSizes = {
  xs: 'p-2',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10'
};

/**
 * Card shadow variations
 */
export const cardShadows = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl'
};

/**
 * Card border variations
 */
export const cardBorders = {
  none: 'border-0',
  default: 'border border-slate-200',
  thick: 'border-2 border-slate-200',
  colored: 'border border-blue-200',
  success: 'border border-green-200',
  warning: 'border border-orange-200',
  error: 'border border-red-200'
};

/**
 * Card background variations
 */
export const cardBackgrounds = {
  white: 'bg-white',
  gray: 'bg-slate-50',
  light: 'bg-slate-25',
  success: 'bg-green-50',
  warning: 'bg-orange-50',
  error: 'bg-red-50',
  info: 'bg-blue-50'
};

/**
 * Card spacing variations for internal content
 */
export const cardSpacing = {
  none: 'space-y-0',
  tight: 'space-y-2',
  normal: 'space-y-4',
  relaxed: 'space-y-6',
  loose: 'space-y-8'
};

/**
 * Card variant styles for different use cases
 */
export const cardVariants = {
  default: {
    base: 'bg-white border border-slate-200 shadow-md',
    hover: 'hover:shadow-lg transition-shadow'
  },
  elevated: {
    base: 'bg-white shadow-lg',
    hover: 'hover:shadow-xl transition-shadow'
  },
  flat: {
    base: 'bg-white border border-slate-200',
    hover: 'hover:bg-slate-50 transition-colors'
  },
  success: {
    base: 'bg-green-50 border border-green-200',
    hover: 'hover:bg-green-100 transition-colors'
  },
  warning: {
    base: 'bg-orange-50 border border-orange-200',
    hover: 'hover:bg-orange-100 transition-colors'
  },
  error: {
    base: 'bg-red-50 border border-red-200',
    hover: 'hover:bg-red-100 transition-colors'
  },
  info: {
    base: 'bg-blue-50 border border-blue-200',
    hover: 'hover:bg-blue-100 transition-colors'
  },
  primary: {
    base: 'bg-blue-500 text-white shadow-md',
    hover: 'hover:bg-blue-600 transition-colors'
  },
  ghost: {
    base: 'bg-transparent border border-dashed border-slate-300',
    hover: 'hover:bg-slate-50 hover:border-solid transition-all'
  }
};

/**
 * Mode-specific card styles
 */
export const modeCardVariants = {
  savings: {
    primary: 'bg-green-500 text-white shadow-md',
    secondary: 'bg-green-50 border border-green-200',
    accent: 'border-l-4 border-l-green-500 bg-white shadow-md'
  },
  debt: {
    primary: 'bg-red-500 text-white shadow-md',
    secondary: 'bg-red-50 border border-red-200',
    accent: 'border-l-4 border-l-red-500 bg-white shadow-md'
  }
};

/**
 * Get complete card classes for a given variant and size
 * @param {string} variant - Card variant (default, elevated, etc.)
 * @param {string} size - Card padding size (xs, sm, md, lg, xl)
 * @param {boolean} hoverable - Whether the card should have hover effects
 * @param {string} mode - Current mode (for mode-specific variants)
 * @param {string} additionalClasses - Additional custom classes
 * @returns {string} Complete CSS class string
 */
export const getCardClasses = (
  variant = 'default',
  size = 'md',
  hoverable = false,
  mode = null,
  additionalClasses = ''
) => {
  let classes = ['rounded-lg'];

  // Add size classes
  classes.push(cardSizes[size] || cardSizes.md);

  // Handle mode-specific variants
  if (mode && modeCardVariants[mode] && modeCardVariants[mode][variant]) {
    classes.push(modeCardVariants[mode][variant]);
  } else {
    // Handle standard variants
    const variantStyles = cardVariants[variant] || cardVariants.default;
    classes.push(variantStyles.base);

    // Add hover effects if requested
    if (hoverable && variantStyles.hover) {
      classes.push(variantStyles.hover);
    }
  }

  // Add any additional classes
  if (additionalClasses) {
    classes.push(additionalClasses);
  }

  return classes.join(' ');
};

/**
 * Pre-built card style combinations for common use cases
 */
export const cardPresets = {
  // Main content cards
  primary: (hoverable = false) => getCardClasses('default', 'md', hoverable),
  elevated: (hoverable = true) => getCardClasses('elevated', 'md', hoverable),

  // Status cards
  success: (hoverable = false) => getCardClasses('success', 'md', hoverable),
  warning: (hoverable = false) => getCardClasses('warning', 'md', hoverable),
  error: (hoverable = false) => getCardClasses('error', 'md', hoverable),
  info: (hoverable = false) => getCardClasses('info', 'md', hoverable),

  // Interactive cards
  clickable: (hoverable = true) => getCardClasses('default', 'md', hoverable, null, 'cursor-pointer'),
  selectable: (selected = false) => getCardClasses('default', 'md', true, null,
    selected ? 'ring-2 ring-blue-500 border-blue-200' : ''),

  // Layout cards
  section: () => getCardClasses('default', 'lg', false),
  compact: () => getCardClasses('flat', 'sm', false),
  spacious: () => getCardClasses('elevated', 'xl', false),

  // Mode-specific cards
  savingsCard: (variant = 'secondary') => getCardClasses(variant, 'md', false, 'savings'),
  debtCard: (variant = 'secondary') => getCardClasses(variant, 'md', false, 'debt'),

  // Special purpose cards
  statsCard: () => getCardClasses('flat', 'sm', false, null, 'text-center'),
  dashboardCard: () => getCardClasses('default', 'md', true),
  formCard: () => getCardClasses('default', 'lg', false),
  listItem: (hoverable = true) => getCardClasses('flat', 'sm', hoverable),

  // Content cards
  contentCard: () => getCardClasses('default', 'md', false, null, 'prose prose-slate max-w-none'),
  imageCard: () => getCardClasses('default', 'none', true, null, 'overflow-hidden'),

  // Placeholder cards
  skeleton: () => getCardClasses('ghost', 'md', false, null, 'animate-pulse'),
  empty: () => getCardClasses('ghost', 'lg', false, null, 'text-center text-slate-500')
};

/**
 * Card header utility classes
 */
export const cardHeader = {
  base: 'flex items-center justify-between mb-4 pb-2 border-b border-slate-200',
  simple: 'mb-4',
  withIcon: 'flex items-center gap-3 mb-4',
  centered: 'text-center mb-4'
};

/**
 * Card footer utility classes
 */
export const cardFooter = {
  base: 'flex items-center justify-between mt-4 pt-4 border-t border-slate-200',
  simple: 'mt-4 pt-4',
  actions: 'flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-200',
  centered: 'text-center mt-4 pt-4 border-t border-slate-200'
};

/**
 * Card content utility classes
 */
export const cardContent = {
  base: 'space-y-4',
  tight: 'space-y-2',
  relaxed: 'space-y-6',
  grid: 'grid gap-4',
  flex: 'flex flex-col space-y-4'
};

/**
 * Create a complete card component with header, content, and footer
 * @param {Object} options - Card configuration options
 * @returns {Object} CSS classes for different card parts
 */
export const createCardLayout = ({
  variant = 'default',
  size = 'md',
  hoverable = false,
  mode = null,
  hasHeader = false,
  hasFooter = false,
  contentSpacing = 'base'
}) => {
  return {
    card: getCardClasses(variant, size, hoverable, mode),
    header: hasHeader ? cardHeader.base : '',
    content: cardContent[contentSpacing] || cardContent.base,
    footer: hasFooter ? cardFooter.base : ''
  };
};

export const cardStyles = {
  getCardClasses,
  cardPresets,
  cardHeader,
  cardFooter,
  cardContent,
  createCardLayout,
  baseCardStyles,
  cardSizes,
  cardShadows,
  cardBorders,
  cardBackgrounds,
  cardVariants,
  modeCardVariants
};