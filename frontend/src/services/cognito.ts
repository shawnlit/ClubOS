import { config } from '../lib/config';
import type { Session } from '../types';

interface InitiateAuthResponse {
  AuthenticationResult?: { IdToken: string; ExpiresIn: number };
  ChallengeName?: string;
  __type?: string;
  message?: string;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const response = await fetch(`https://cognito-idp.${config.cognitoRegion}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: config.cognitoClientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as InitiateAuthResponse;

  if (!response.ok) {
    if (data.__type === 'NotAuthorizedException' || data.__type === 'UserNotFoundException') {
      throw new Error('Incorrect email or password');
    }
    throw new Error(data.message ?? 'Login failed');
  }
  if (data.ChallengeName) {
    throw new Error('This account needs a password change, which is not supported yet');
  }
  const result = data.AuthenticationResult;
  if (!result?.IdToken) {
    throw new Error('Login failed');
  }
  return {
    idToken: result.IdToken,
    expiresAt: Date.now() + result.ExpiresIn * 1000 - 30_000,
  };
}