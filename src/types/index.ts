/**
 * TypeScript Type Definitions
 *
 * Comprehensive type definitions for the Financial Progress Tracker application.
 * These types provide compile-time safety and serve as documentation for the
 * application's data structures and interfaces.
 *
 * @fileoverview Main type definitions for the application
 */

/**
 * Application mode - either savings tracking or debt payoff
 */
export type Mode = 'savings' | 'debt';

/**
 * Financial transaction record
 */
export interface Transaction {
  /** Unique identifier for the transaction */
  id: string;
  /** Transaction amount (positive for deposits, negative for payments) */
  amount: number;
  /** Optional description or note about the transaction */
  note?: string;
  /** ISO 8601 date string when transaction was created */
  date: string;
  /** Type of transaction */
  type: 'transaction' | 'interest';
  /** Running total after this transaction */
  runningTotal: number;
  /** Number of days (for interest transactions) */
  days?: number;
}

/**
 * Goal configuration interface
 */
export interface Goal {
  /** Target amount to reach */
  amount: number;
  /** Goal description */
  description?: string;
  /** Target completion date */
  targetDate?: string;
  /** Goal category for future multi-goal support */
  category?: string;
}

/**
 * Interest calculation parameters
 */
export interface InterestCalculation {
  /** Current principal amount */
  principal: number;
  /** Annual interest rate as percentage */
  rate: number;
  /** Number of days for calculation */
  days: number;
  /** Calculated interest amount */
  interest: number;
  /** Compounding frequency used */
  compoundingFrequency: 'daily' | 'monthly' | 'yearly';
}

/**
 * Goal statistics and progress metrics
 */
export interface GoalStats {
  /** Current progress as percentage (0-100) */
  percentage: number;
  /** Remaining amount to reach goal */
  remaining: number;
  /** Amount achieved so far */
  current: number;
  /** Total number of transactions */
  transactionCount: number;
  /** Average transaction amount */
  averageTransaction: number;
  /** Largest single transaction */
  largestTransaction: number;
  /** Date of most recent transaction */
  lastTransactionDate?: string;
  /** Projected completion date based on current progress */
  projectedCompletion?: string;
  /** Monthly progress rate */
  monthlyProgress?: number;
}

/**
 * Detailed goal statistics with additional metrics
 */
export interface DetailedGoalStats extends GoalStats {
  /** Current mode */
  mode: Mode;
  /** Goal amount */
  goal: number;
  /** For debt mode: remaining debt */
  debtRemaining: number;
  /** For savings mode: current savings */
  savingsAmount: number;
  /** Recent transaction velocity */
  recentVelocity: number;
  /** Progress trend (positive = improving, negative = declining) */
  progressTrend: number;
}

/**
 * Validation result interface
 */
export interface ValidationResult<T = unknown> {
  /** Whether the validation passed */
  isValid: boolean;
  /** Validated and potentially transformed value */
  value?: T;
  /** Error message if validation failed */
  error?: string;
  /** Field name that was validated */
  field?: string;
  /** Error severity level */
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Multi-field validation result
 */
export interface MultiFieldValidationResult {
  /** Overall validation status */
  isValid: boolean;
  /** Individual field results */
  results: Record<string, ValidationResult>;
  /** Combined error messages */
  errors: Record<string, string>;
  /** All validated values */
  values: Record<string, unknown>;
}

/**
 * Storage service operation result
 */
export interface StorageResult<T = unknown> {
  /** Operation success status */
  success: boolean;
  /** Retrieved or stored data */
  data?: T;
  /** Error message if operation failed */
  error?: string;
  /** Error type for categorization */
  errorType?: 'quota_exceeded' | 'parse_error' | 'not_found' | 'unknown';
}

/**
 * Tracker application state
 */
export interface TrackerState {
  /** Current application mode */
  mode: Mode;
  /** Financial goal amount */
  goal: number;
  /** Current balance or progress */
  current: number;
  /** Amount remaining to reach goal */
  remaining: number;
  /** Progress percentage */
  percentage: number;
  /** List of all transactions */
  transactions: Transaction[];
  /** Annual interest rate for debt calculations */
  interestRate: number;
  /** Pending interest amount */
  pendingInterest: number;
  /** Days since last interest application */
  daysPending: number;
  /** Date of last interest charge */
  lastInterestDate?: string;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Current error state */
  error?: string;
}

/**
 * Color scheme configuration
 */
export interface ColorScheme {
  /** Primary brand color */
  primary: string;
  /** Secondary accent color */
  secondary: string;
  /** Success state color */
  success: string;
  /** Warning state color */
  warning: string;
  /** Error state color */
  error: string;
  /** Info state color */
  info: string;
  /** Neutral/text colors */
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

/**
 * Mode-specific color configuration
 */
export interface ModeColorScheme {
  /** Savings mode colors */
  savings: {
    primary: string;
    secondary: string;
  };
  /** Debt mode colors */
  debt: {
    primary: string;
    secondary: string;
  };
}

/**
 * Currency formatting options
 */
export interface CurrencyOptions {
  /** Currency code (e.g., 'USD', 'EUR') */
  currency?: string;
  /** Locale for formatting (e.g., 'en-US', 'de-DE') */
  locale?: string;
  /** Minimum decimal places */
  minimumFractionDigits?: number;
  /** Maximum decimal places */
  maximumFractionDigits?: number;
  /** Whether to show currency symbol */
  showSymbol?: boolean;
}

/**
 * Date formatting options
 */
export interface DateOptions {
  /** Locale for date formatting */
  locale?: string;
  /** Whether to include time component */
  includeTime?: boolean;
  /** Date style preference */
  dateStyle?: 'short' | 'medium' | 'long' | 'full';
}

/**
 * Service layer operation result
 */
export interface ServiceResult<T = unknown> {
  /** Operation success status */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error message */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Hook return type for transactions
 */
export interface UseTransactionsReturn {
  /** Add a new transaction */
  addTransaction: (amount: number, note?: string) => Promise<ServiceResult>;
  /** Delete a transaction by ID */
  deleteTransaction: (id: string) => Promise<ServiceResult>;
  /** Get all transactions */
  getTransactions: () => Transaction[];
  /** Get filtered transactions */
  getFilteredTransactions: (filter: (t: Transaction) => boolean) => Transaction[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error?: string;
}

/**
 * Hook return type for interest calculations
 */
export interface UseInterestReturn {
  /** Current pending interest amount */
  pendingInterest: number;
  /** Days since last interest application */
  daysPending: number;
  /** Whether interest is applicable in current mode */
  isInterestApplicable: boolean;
  /** Whether there is pending interest to apply */
  hasPendingInterest: boolean;
  /** Current interest rate */
  interestRate: number;
  /** Apply pending interest */
  applyInterestCharge: () => Promise<ServiceResult>;
  /** Calculate interest for given parameters */
  calculateInterest: (principal: number, days?: number) => InterestCalculation;
}

/**
 * Hook return type for goal statistics
 */
export interface UseGoalStatsReturn {
  /** Basic goal statistics */
  stats: GoalStats;
  /** Detailed statistics with mode-specific data */
  detailedStats: DetailedGoalStats;
  /** Refresh statistics */
  refresh: () => void;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Component prop interfaces
 */

/**
 * Props for mode selector component
 */
export interface ModeSelectorProps {
  /** Current mode */
  mode: Mode;
  /** Mode change handler */
  onModeChange: (mode: Mode) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Props for goal input component
 */
export interface GoalInputProps {
  /** Current mode */
  mode: Mode;
  /** Current goal amount */
  goal: number;
  /** Goal update handler */
  onUpdateGoal: (goal: number) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
}

/**
 * Props for interest settings component
 */
export interface InterestSettingsProps {
  /** Current mode */
  mode: Mode;
  /** Current interest rate */
  interestRate: number;
  /** Interest rate update handler */
  onUpdateRate: (rate: number) => void;
  /** Whether the settings are disabled */
  disabled?: boolean;
}

/**
 * Props for thermometer display component
 */
export interface ThermometerDisplayProps {
  /** Current mode */
  mode: Mode;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Custom height in pixels */
  height?: number;
  /** Whether to show percentage label */
  showPercentage?: boolean;
}

/**
 * Props for transaction history component
 */
export interface TransactionHistoryProps {
  /** Maximum number of transactions to display */
  limit?: number;
  /** Whether to show delete buttons */
  allowDelete?: boolean;
  /** Custom transaction filter */
  filter?: (transaction: Transaction) => boolean;
}

/**
 * Props for chart component
 */
export interface ChartProps {
  /** Transaction data */
  transactions: Transaction[];
  /** Current mode */
  mode: Mode;
  /** Chart height in pixels */
  height?: number;
  /** Whether to show grid lines */
  showGrid?: boolean;
  /** Custom date range */
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Props for stats panel component
 */
export interface StatsPanelProps {
  /** Whether to show detailed statistics */
  detailed?: boolean;
  /** Custom statistics to highlight */
  highlight?: Array<keyof GoalStats>;
}

/**
 * Props for error boundary components
 */
export interface ErrorBoundaryProps {
  /** Child components */
  children: React.ReactNode;
  /** Custom fallback component */
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  /** Whether to show error details in development */
  showErrorDetails?: boolean;
}

/**
 * Props for error fallback component
 */
export interface ErrorFallbackProps {
  /** The error that occurred */
  error: Error;
  /** Function to reset the error boundary */
  resetError: () => void;
  /** Function to refresh the page */
  refreshPage: () => void;
}

/**
 * Props for chart error boundary
 */
export interface ChartErrorBoundaryProps extends ErrorBoundaryProps {
  /** Type of chart for error messages */
  chartType?: string;
  /** Chart data for debugging */
  data?: unknown[];
  /** Chart title for display */
  title?: string;
  /** Whether to show fallback chart */
  showFallbackChart?: boolean;
}

/**
 * Application configuration types
 */
export interface AppConfig {
  /** Application metadata */
  app: {
    name: string;
    version: string;
    description: string;
    environment: string;
  };
  /** Currency configuration */
  currency: {
    code: string;
    symbol: string;
    locale: string;
    precision: number;
    thousandsSeparator: string;
    decimalSeparator: string;
    symbolPosition: 'before' | 'after';
  };
  /** Date and time configuration */
  dateTime: {
    locale: string;
    dateFormat: Record<string, string>;
    timeFormat: Record<string, string>;
    relativeTime: boolean;
    timezone: string;
  };
  /** Financial calculation configuration */
  finance: {
    interest: {
      compoundingFrequency: 'daily' | 'monthly' | 'yearly';
      autoApplyThresholdDays: number;
      roundingMode: 'round' | 'floor' | 'ceil';
      precision: number;
    };
    defaults: {
      savingsGoal: number;
      debtGoal: number;
      interestRate: number;
      mode: Mode;
    };
    limits: {
      maxGoalAmount: number;
      minGoalAmount: number;
      maxInterestRate: number;
      minInterestRate: number;
      maxTransactions: number;
      maxTransactionAmount: number;
    };
    validation: {
      strictMode: boolean;
      allowNegativeAmounts: boolean;
      allowFutureTransactions: boolean;
      requireTransactionNotes: boolean;
    };
  };
  /** UI configuration */
  ui: {
    theme: {
      defaultMode: 'light' | 'dark' | 'system';
      allowThemeToggle: boolean;
      colorScheme: ModeColorScheme;
    };
    animations: {
      enabled: boolean;
      duration: number;
      easing: string;
    };
    charts: {
      enabled: boolean;
      animationDuration: number;
      defaultHeight: number;
      responsive: boolean;
      theme: 'light' | 'dark';
    };
    display: {
      defaultItemsPerPage: number;
      showCurrency: boolean;
      showPercentages: boolean;
      abbreviateLargeNumbers: boolean;
      showProgressAnimations: boolean;
    };
  };
  /** Feature flags */
  features: Record<string, boolean>;
  /** Storage configuration */
  storage: {
    engine: 'localStorage' | 'sessionStorage' | 'indexedDB';
    encryptData: boolean;
    compressionEnabled: boolean;
    maxStorageSize: number;
    autoCleanup: boolean;
    backupToCloud: boolean;
  };
  /** Performance configuration */
  performance: {
    enableServiceWorker: boolean;
    lazyLoadComponents: boolean;
    virtualScrolling: boolean;
    memoization: boolean;
    debounceInputs: boolean;
    batchUpdates: boolean;
  };
  /** Development configuration */
  development: {
    showDevTools: boolean;
    enableHotReload: boolean;
    verboseLogging: boolean;
    mockApiCalls: boolean;
    bypassAuthentication: boolean;
    showPerformanceMetrics: boolean;
  };
}

/**
 * Export commonly used type unions and utility types
 */
export type TransactionType = Transaction['type'];
export type ValidationSeverity = NonNullable<ValidationResult['severity']>;
export type StorageEngine = AppConfig['storage']['engine'];
export type CompoundingFrequency = AppConfig['finance']['interest']['compoundingFrequency'];
export type RoundingMode = AppConfig['finance']['interest']['roundingMode'];

/**
 * Utility type for making all properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type for making specific properties required
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Utility type for creating update objects
 */
export type UpdatePayload<T> = Partial<T> & { id?: string };

/**
 * API response types
 * Values align with Lambda response shapes. All monetary values are in cents.
 */

export interface ApiTracker {
  trackerId: string;
  userId: string;
  name: string;
  mode: Mode;
  goalAmount: number;
  currentAmount: number;
  interestRate?: number;
  lastInterestDate?: string;
  percentage: number;
  remaining: number;
  createdAt: string;
  updatedAt: string;
  summary?: ApiSummary;
}

export interface ApiTrackerDetail extends ApiTracker {
  recentEntries: ApiEntry[];
}

export interface ApiEntry {
  entryId: string;
  trackerId: string;
  userId: string;
  amount: number;
  type: 'transaction' | 'interest';
  note?: string;
  runningTotal: number;
  days?: number;
  createdAt: string;
}

export interface ApiSummary {
  trackerId: string;
  userId: string;
  transactionCount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalInterest: number;
  averageTransaction: number;
  largestTransaction: number;
  lastTransactionDate?: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  nextToken?: string;
}

export interface CreateTrackerRequest {
  name: string;
  mode: Mode;
  goalAmount: number;
  currentAmount?: number;
  interestRate?: number;
}

export interface UpdateTrackerRequest {
  name?: string;
  goalAmount?: number;
  interestRate?: number;
}

export interface CreateEntryRequest {
  amount: number;
  type: 'transaction' | 'interest';
  note?: string;
  days?: number;
}