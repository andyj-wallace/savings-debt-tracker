import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, useAuth } from 'react-oidc-context';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import authConfig from './config/auth.config';
import { apiClient } from './services/apiClient';

/**
 * Configures the API client singleton with the current auth token getter.
 * Must be rendered inside AuthProvider.
 */
function ApiClientConfigurator({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    apiClient.configure(() => auth.user?.access_token);
  }, [auth.user]);

  return <>{children}</>;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider {...authConfig}>
      <ApiClientConfigurator>
        <App />
      </ApiClientConfigurator>
    </AuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
