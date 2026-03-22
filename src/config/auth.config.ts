/**
 * Authentication Configuration
 *
 * Cognito OIDC configuration for react-oidc-context.
 * All sensitive values must be set via environment variables.
 * Copy .env.local.example to .env.local and fill in your values.
 */

const isProduction = process.env.NODE_ENV === 'production';

// Cognito User Pool configuration — required env vars
const userPoolId = process.env.REACT_APP_COGNITO_USER_POOL_ID as string;
const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID as string;
const cognitoDomain = process.env.REACT_APP_COGNITO_DOMAIN as string;
const region = process.env.REACT_APP_AWS_REGION || 'us-east-2';
const cloudfrontUrl = process.env.REACT_APP_CLOUDFRONT_URL as string;

// Redirect URIs based on environment
// Note: Must match callback URLs configured in Cognito App Client
const redirectUri = isProduction
  ? `${cloudfrontUrl}/`
  : 'http://localhost:3000/callback';

const logoutUri = isProduction
  ? `${cloudfrontUrl}/logout`
  : 'http://localhost:3000/logout';

/**
 * OIDC configuration for AuthProvider
 */
export const authConfig = {
  authority: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'email openid phone',
};

/**
 * Cognito domain for logout redirect
 */
export const cognitoLogoutUrl = `https://${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;

/**
 * Helper to redirect to Cognito logout
 */
export const signOutRedirect = () => {
  window.location.href = cognitoLogoutUrl;
};

export default authConfig;
