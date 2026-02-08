import DebtSavingsThermometer from './components/DebtSavingsThermometer';
import { TrackerProvider } from './context/TrackerProvider';
import ErrorBoundary from './components/ErrorBoundary';
import AuthHeader from './components/AuthHeader';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * Top-level error handler for logging critical errors
 */
const handleCriticalError = (error: Error, errorInfo: React.ErrorInfo) => {
  // Log critical errors that crash the entire app
  console.error('Critical application error:', error);
  console.error('Component stack:', errorInfo.componentStack);

  // Future: Send to error monitoring service (e.g., Sentry, LogRocket)
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }
};

function App() {
  return (
    <ErrorBoundary
      onError={handleCriticalError}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      <ProtectedRoute>
        <AuthHeader />
        <TrackerProvider>
          <DebtSavingsThermometer />
        </TrackerProvider>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

export default App;