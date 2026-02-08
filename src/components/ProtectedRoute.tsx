import { ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Protects routes by requiring authentication.
 * - Shows loading state while auth is being determined
 * - Redirects to Cognito login if not authenticated
 * - Renders children only when authenticated
 */
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const auth = useAuth();

  // Show loading state while determining auth status
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if auth failed
  if (auth.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
          <p className="text-red-600 mb-4">Authentication error: {auth.error.message}</p>
          <button
            onClick={() => auth.signinRedirect()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-semibold mb-4">Sign in required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access this application.</p>
          <button
            onClick={() => auth.signinRedirect()}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated - render children
  return <>{children}</>;
}

export default ProtectedRoute;
