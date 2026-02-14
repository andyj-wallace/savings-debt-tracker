import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { LABELS } from '../constants';

/**
 * Displays a warning banner when the browser is offline.
 * Automatically hides when connectivity is restored.
 *
 * Story 7.8: Offline Handling
 */
export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-100 p-3 text-center text-amber-800 border-b border-amber-200">
      {LABELS.OFFLINE.BANNER}
    </div>
  );
}
