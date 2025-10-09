/**
 * Application Configuration
 *
 * Centralized configuration system with environment-specific overrides and feature flags.
 * Enables easy localization, A/B testing, and environment-specific behavior.
 * All application settings should be defined here for consistency.
 *
 * @fileoverview Main application configuration with environment overrides
 */

/**
 * Default application configuration
 * This serves as the base configuration that can be overridden per environment
 */
const defaultConfig = {
  // Application metadata
  app: {
    name: 'Financial Progress Tracker',
    version: '1.0.0',
    description: 'Track your savings goals and debt payoff progress',
    environment: process.env.NODE_ENV || 'development'
  },

  // Currency configuration
  currency: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    precision: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    symbolPosition: 'before' // 'before' or 'after'
  },

  // Date and time configuration
  dateTime: {
    locale: 'en-US',
    dateFormat: {
      short: 'MM/dd/yyyy',
      medium: 'MMM dd, yyyy',
      long: 'MMMM dd, yyyy',
      full: 'EEEE, MMMM dd, yyyy'
    },
    timeFormat: {
      short: 'HH:mm',
      medium: 'HH:mm:ss',
      long: 'HH:mm:ss zzz'
    },
    relativeTime: true,
    timezone: 'America/New_York'
  },

  // Financial calculation configuration
  finance: {
    // Interest calculation settings
    interest: {
      compoundingFrequency: 'daily', // 'daily', 'monthly', 'yearly'
      autoApplyThresholdDays: 30,
      roundingMode: 'round', // 'round', 'floor', 'ceil'
      precision: 2
    },

    // Default values
    defaults: {
      savingsGoal: 10000,
      debtGoal: 5000,
      interestRate: 18.99,
      mode: 'savings'
    },

    // Application limits
    limits: {
      maxGoalAmount: 1000000, // $1 million
      minGoalAmount: 1, // $1
      maxInterestRate: 99.99, // 99.99%
      minInterestRate: 0, // 0%
      maxTransactions: 10000,
      maxTransactionAmount: 1000000
    },

    // Validation settings
    validation: {
      strictMode: false, // Enable strict validation in production
      allowNegativeAmounts: false,
      allowFutureTransactions: false,
      requireTransactionNotes: false
    }
  },

  // User interface configuration
  ui: {
    // Theme settings
    theme: {
      defaultMode: 'light', // 'light', 'dark', 'system'
      allowThemeToggle: true,
      colorScheme: {
        savings: {
          primary: 'green',
          secondary: 'emerald'
        },
        debt: {
          primary: 'red',
          secondary: 'rose'
        }
      }
    },

    // Animation settings
    animations: {
      enabled: true,
      duration: 300, // milliseconds
      easing: 'ease-in-out'
    },

    // Chart configuration
    charts: {
      enabled: true,
      animationDuration: 1000,
      defaultHeight: 300,
      responsive: true,
      theme: 'light' // 'light', 'dark'
    },

    // Data display preferences
    display: {
      defaultItemsPerPage: 10,
      showCurrency: true,
      showPercentages: true,
      abbreviateLargeNumbers: true,
      showProgressAnimations: true
    }
  },

  // Feature flags for gradual rollout and A/B testing
  features: {
    // Core features
    multipleGoals: false, // Support for multiple simultaneous goals
    goalCategories: false, // Categorize goals (emergency fund, vacation, etc.)
    recurringTransactions: false, // Automatic recurring deposits/payments

    // Data features
    dataExport: false, // Export data to CSV/JSON
    dataImport: false, // Import data from files
    dataBackup: false, // Cloud backup integration

    // Advanced features
    budgetTracking: false, // Full budget tracking beyond goals
    investmentTracking: false, // Track investment accounts
    netWorthCalculation: false, // Calculate total net worth

    // UI enhancements
    darkMode: false, // Dark theme support
    customThemes: false, // User-customizable themes
    dashboardWidgets: false, // Customizable dashboard

    // Social features
    goalSharing: false, // Share progress with others
    communityGoals: false, // Community challenges

    // Integrations
    bankAccountSync: false, // Sync with bank accounts
    calendarIntegration: false, // Calendar reminders
    notificationSystem: false, // Push notifications

    // Development features
    debugMode: process.env.NODE_ENV === 'development',
    errorReporting: process.env.NODE_ENV === 'production',
    analyticsTracking: false,
    performanceMonitoring: false
  },

  // Storage configuration
  storage: {
    engine: 'localStorage', // 'localStorage', 'sessionStorage', 'indexedDB'
    encryptData: false, // Encrypt sensitive data
    compressionEnabled: false, // Compress stored data
    maxStorageSize: 5 * 1024 * 1024, // 5MB limit
    autoCleanup: true, // Auto-cleanup old data
    backupToCloud: false // Backup to cloud storage
  },

  // Performance configuration
  performance: {
    enableServiceWorker: false, // PWA service worker
    lazyLoadComponents: false, // Lazy load heavy components
    virtualScrolling: false, // Virtual scrolling for large lists
    memoization: true, // Enable React memoization
    debounceInputs: true, // Debounce form inputs
    batchUpdates: true // Batch state updates
  },

  // Development configuration
  development: {
    showDevTools: process.env.NODE_ENV === 'development',
    enableHotReload: process.env.NODE_ENV === 'development',
    verboseLogging: process.env.NODE_ENV === 'development',
    mockApiCalls: false,
    bypassAuthentication: false,
    showPerformanceMetrics: process.env.NODE_ENV === 'development'
  }
};

/**
 * Environment-specific configuration overrides
 */
const environmentConfigs = {
  development: {
    features: {
      debugMode: true,
      errorReporting: false,
      performanceMonitoring: true,
      // Enable more features in development
      dataExport: true,
      darkMode: true,
      customThemes: true
    },
    ui: {
      animations: {
        enabled: true,
        duration: 100 // Faster animations in dev
      }
    },
    development: {
      showDevTools: true,
      verboseLogging: true,
      showPerformanceMetrics: true
    }
  },

  production: {
    features: {
      debugMode: false,
      errorReporting: true,
      performanceMonitoring: true,
      analyticsTracking: true
    },
    finance: {
      validation: {
        strictMode: true // Enable strict validation in production
      }
    },
    storage: {
      encryptData: true, // Encrypt data in production
      compressionEnabled: true
    },
    performance: {
      enableServiceWorker: true,
      lazyLoadComponents: true
    }
  },

  test: {
    features: {
      debugMode: false,
      errorReporting: false,
      analyticsTracking: false
    },
    development: {
      mockApiCalls: true,
      bypassAuthentication: true
    },
    ui: {
      animations: {
        enabled: false // Disable animations in tests
      }
    }
  }
};

/**
 * Merge configuration objects deeply
 * @param {Object} target - Target configuration object
 * @param {Object} source - Source configuration object to merge
 * @returns {Object} Merged configuration
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Get the current environment
 * @returns {string} Current environment (development, production, test)
 */
function getCurrentEnvironment() {
  return process.env.NODE_ENV || 'development';
}

/**
 * Create the final configuration by merging default config with environment overrides
 * @returns {Object} Final application configuration
 */
function createConfig() {
  const environment = getCurrentEnvironment();
  const envConfig = environmentConfigs[environment] || {};

  return deepMerge(defaultConfig, envConfig);
}

/**
 * Main application configuration object
 * This is the configuration that should be imported and used throughout the app
 */
export const appConfig = createConfig();

/**
 * Utility functions for accessing configuration
 */
export const config = {
  /**
   * Get a configuration value by path
   * @param {string} path - Dot-separated path to config value (e.g., 'features.darkMode')
   * @param {*} defaultValue - Default value if path doesn't exist
   * @returns {*} Configuration value
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = appConfig;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  },

  /**
   * Check if a feature flag is enabled
   * @param {string} featureName - Name of the feature flag
   * @returns {boolean} Whether the feature is enabled
   */
  isFeatureEnabled(featureName) {
    return this.get(`features.${featureName}`, false);
  },

  /**
   * Get currency configuration
   * @returns {Object} Currency configuration object
   */
  getCurrency() {
    return this.get('currency');
  },

  /**
   * Get date/time configuration
   * @returns {Object} Date/time configuration object
   */
  getDateTime() {
    return this.get('dateTime');
  },

  /**
   * Get financial configuration
   * @returns {Object} Financial configuration object
   */
  getFinance() {
    return this.get('finance');
  },

  /**
   * Get UI configuration
   * @returns {Object} UI configuration object
   */
  getUI() {
    return this.get('ui');
  },

  /**
   * Get current environment
   * @returns {string} Current environment name
   */
  getEnvironment() {
    return this.get('app.environment');
  },

  /**
   * Check if running in development mode
   * @returns {boolean} Whether in development mode
   */
  isDevelopment() {
    return this.getEnvironment() === 'development';
  },

  /**
   * Check if running in production mode
   * @returns {boolean} Whether in production mode
   */
  isProduction() {
    return this.getEnvironment() === 'production';
  }
};

export default appConfig;