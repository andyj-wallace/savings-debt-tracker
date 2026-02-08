import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { signOutRedirect } from '../config/auth.config';

function AuthHeader() {
  const auth = useAuth();

  // Handle /logout redirect from Cognito
  useEffect(() => {
    if (window.location.pathname === '/logout') {
      auth.removeUser();
      window.history.replaceState({}, '', '/');
    }
  }, [auth]);

  if (auth.isLoading) {
    return (
      <div className="bg-gray-100 p-3 text-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="bg-red-100 p-3 text-center text-red-600">
        Auth error: {auth.error.message}
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <div className="bg-green-50 p-3 flex justify-between items-center border-b">
        <span className="text-green-700">
          Signed in as: <strong>{auth.user?.profile.email}</strong>
        </span>
        <button
          onClick={() => signOutRedirect()}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 p-3 flex justify-between items-center border-b">
      <span className="text-blue-700">Not signed in</span>
      <button
        onClick={() => auth.signinRedirect()}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
      >
        Sign in
      </button>
    </div>
  );
}

export default AuthHeader;
