const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
const cognitoRegion = import.meta.env.VITE_COGNITO_REGION as string | undefined;
const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;

if (!apiUrl || !cognitoRegion || !cognitoClientId) {
  throw new Error(
    'Missing env vars. Copy .env.example to .env.local (VITE_API_URL, VITE_COGNITO_REGION, VITE_COGNITO_CLIENT_ID).',
  );
}

export const config = {
  apiUrl: apiUrl.replace(/\/+$/, ''),
  cognitoRegion,
  cognitoClientId,
};