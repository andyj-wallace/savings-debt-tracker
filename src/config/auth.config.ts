/**
 * Authentication Configuration
 *
 * Cognito OIDC configuration for react-oidc-context.
 * Uses environment variables for sensitive values, with development defaults.
 */

const isProduction = process.env.NODE_ENV === 'production';

// Cognito User Pool configuration
const userPoolId = process.env.REACT_APP_COGNITO_USER_POOL_ID || 'us-east-2_MF6XS4BiK';
const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID || '4v31bn4r0vudooroapqt3k86si';
const cognitoDomain = process.env.REACT_APP_COGNITO_DOMAIN || 'us-east-2mf6xs4bik.auth.us-east-2.amazoncognito.com';
const region = 'us-east-2';

// Redirect URIs based on environment
// Note: Must match callback URLs configured in Cognito App Client
const redirectUri = isProduction
  ? 'https://d2w2q49vvlxbof.cloudfront.net/'
  : 'http://localhost:3000/callback';

const logoutUri = isProduction
  ? 'https://d2w2q49vvlxbof.cloudfront.net/logout'
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
