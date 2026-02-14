import { useState } from 'react';
import DebtSavingsThermometer from './components/DebtSavingsThermometer';
import TrackerList from './components/TrackerList';
import CreateTrackerForm from './components/CreateTrackerForm';
import TrackerDetail from './components/TrackerDetail';
import { TrackerProvider } from './context/TrackerProvider';
import ErrorBoundary from './components/ErrorBoundary';
import AuthHeader from './components/AuthHeader';
import OfflineBanner from './components/OfflineBanner';
import ProtectedRoute from './components/ProtectedRoute';
import { useDataSource } from './hooks/useDataSource';

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

type ApiView = 'list' | 'create' | 'detail';

function App() {
  const dataSource = useDataSource();
  const [view, setView] = useState<ApiView>('list');
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);

  const navigateToDetail = (trackerId: string) => {
    setSelectedTrackerId(trackerId);
    setView('detail');
  };

  const navigateToList = () => {
    setSelectedTrackerId(null);
    setView('list');
  };

  return (
    <ErrorBoundary
      onError={handleCriticalError}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      <ProtectedRoute>
        <AuthHeader />
        {dataSource === 'api' && <OfflineBanner />}
        {dataSource === 'api' ? (
          <>
            {view === 'list' && (
              <TrackerList
                onSelectTracker={navigateToDetail}
                onCreateTracker={() => setView('create')}
              />
            )}
            {view === 'create' && (
              <CreateTrackerForm
                onCreated={navigateToDetail}
                onCancel={navigateToList}
              />
            )}
            {view === 'detail' && selectedTrackerId && (
              <TrackerDetail
                trackerId={selectedTrackerId}
                onBack={navigateToList}
              />
            )}
          </>
        ) : (
          <TrackerProvider>
            <DebtSavingsThermometer />
          </TrackerProvider>
        )}
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

export default App;