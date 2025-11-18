import { createServerFn } from '@tanstack/react-start';
import { deleteCookie } from '@tanstack/react-start/server';
import { getConfig } from './ssr/config';
import { saveSession, terminateSession, withAuth } from './ssr/session';
import { getWorkOS } from './ssr/workos';
import type { GetAuthURLOptions, NoUserInfo, UserInfo } from './ssr/interfaces';
import type { AuthenticationResponse } from '@workos-inc/node';

export const getAuthorizationUrl = createServerFn({ method: 'GET' })
  .inputValidator((options?: GetAuthURLOptions) => options)
  .handler(({ data: options = {} }) => {
    const { returnPathname, screenHint, redirectUri } = options;

    return getWorkOS().userManagement.getAuthorizationUrl({
      provider: 'authkit',
      clientId: getConfig('clientId'),
      redirectUri: redirectUri || getConfig('redirectUri'),
      state: returnPathname ? btoa(JSON.stringify({ returnPathname })) : undefined,
      screenHint,
    });
  });

export const getSignInUrl = createServerFn({ method: 'GET' })
  .inputValidator((data?: string) => data)
  .handler(async ({ data: returnPathname }) => {
    return await getAuthorizationUrl({ data: { returnPathname, screenHint: 'sign-in' } });
  });

export const getSignUpUrl = createServerFn({ method: 'GET' })
  .inputValidator((data?: string) => data)
  .handler(async ({ data: returnPathname }) => {
    return getAuthorizationUrl({ data: { returnPathname, screenHint: 'sign-up' } });
  });

export const signOut = createServerFn({ method: 'POST' })
  .inputValidator((data?: string) => data)
  .handler(async ({ data: returnTo }) => {
    const cookieName = getConfig('cookieName') || 'wos_session';
    deleteCookie(cookieName);
    await terminateSession({ returnTo });
  });

export const getAuth = createServerFn({ method: 'GET' }).handler(async (): Promise<UserInfo | NoUserInfo> => {
  const auth = await withAuth();
  return auth;
});

export const getWidgetToken = createServerFn({ method: 'GET' }).handler(async (): Promise<string | null> => {
  const auth = await withAuth();
  
  if (!auth.user || !auth.organizationId) {
    return null;
  }

  try {
    const token = await getWorkOS().widgets.getToken({
      organizationId: auth.organizationId,
      userId: auth.user.id,
      scopes: ['widgets:users-table:manage'],
    });
    
    return token;
  } catch (error) {
    console.error('Failed to generate widget token:', error);
    return null;
  }
});

export const getOrganizationSwitcherToken = createServerFn({ method: 'GET' }).handler(async (): Promise<string | null> => {
  const auth = await withAuth();
  
  if (!auth.user || !auth.organizationId) {
    return null;
  }

  try {
    // For organization switcher, we use the current organizationId
    // The widget will handle listing organizations the user has access to
    // Organization switcher doesn't require specific scopes
    const token = await getWorkOS().widgets.getToken({
      organizationId: auth.organizationId,
      userId: auth.user.id,
      scopes: [],
    });
    
    return token;
  } catch (error) {
    console.error('Failed to generate organization switcher token:', error);
    return null;
  }
});

export const getAllUsersWidgetToken = createServerFn({ method: 'GET' }).handler(async (): Promise<string | null> => {
  const auth = await withAuth();
  
  if (!auth.user) {
    return null;
  }

  try {
    // For all users widget, we don't require organizationId
    // This allows viewing all users across all organizations
    const token = await getWorkOS().widgets.getToken({
      userId: auth.user.id,
      scopes: ['widgets:users-table:manage'],
      // organizationId is optional - omitting it should show all users
    } as any);
    
    return token;
  } catch (error) {
    console.error('Failed to generate all users widget token:', error);
    return null;
  }
});

export const switchOrganization = createServerFn({ method: 'POST' })
  .inputValidator((data: { organizationId: string; returnPathname?: string }) => data)
  .handler(async ({ data }) => {
    const { organizationId, returnPathname } = data;
    const auth = await withAuth();
    
    if (!auth.user) {
      throw new Error('User not authenticated');
    }

    try {
      // Get authorization URL for the new organization
      // This will redirect the user to authenticate with the new organization
      const authorizationUrl = getWorkOS().userManagement.getAuthorizationUrl({
        provider: 'authkit',
        clientId: getConfig('clientId'),
        redirectUri: getConfig('redirectUri'),
        organizationId,
        state: returnPathname ? btoa(JSON.stringify({ returnPathname })) : undefined,
      });

      return { redirectUrl: authorizationUrl };
    } catch (error) {
      console.error('Failed to switch organization:', error);
      throw new Error('Failed to switch organization');
    }
  });

// SMS-based phone login functions
interface CreatePhoneUserInput {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
}

export const createPhoneUserWithSMS = createServerFn({ method: 'POST' })
  .inputValidator((data: CreatePhoneUserInput) => data)
  .handler(async ({ data }) => {
    const { phoneNumber, firstName, lastName } = data;
    
    // Step 1: Create user with phone-based email
    // Get SMS email domain from config
    // Priority: 1) WORKOS_SMS_EMAIL_DOMAIN env var, 2) programmatic config, 3) smart default from redirectUri, 4) 'sms.localhost'
    const smsEmailDomain = getConfig('smsEmailDomain') || 'env.localhost';
    const email = `${phoneNumber}@${smsEmailDomain}`;
    const user = await getWorkOS().userManagement.createUser({
      email,
      firstName,
      lastName,
      emailVerified: true, // Verified since created by backend
    });
    
    // Step 2: Enroll SMS factor
    const factor = await getWorkOS().mfa.enrollFactor({
      type: 'sms',
      phoneNumber: phoneNumber, // E.164 format recommended
    });
    
    return { user, factorId: factor.id, email };
  });

interface ChallengeSMSFactorInput {
  factorId: string;
  smsTemplate?: string;
}

export const challengeSMSFactor = createServerFn({ method: 'POST' })
  .inputValidator((data: ChallengeSMSFactorInput) => data)
  .handler(async ({ data }) => {
    const { factorId, smsTemplate } = data;
    
    // Step 3: Challenge the SMS factor (sends SMS code)
    const challenge = await getWorkOS().mfa.challengeFactor({
      authenticationFactorId: factorId,
      smsTemplate: smsTemplate || 'Your verification code is {{code}}',
    });
    
    return challenge;
  });

interface VerifySMSChallengeInput {
  challengeId: string;
  code: string;
  email: string;
}

export const verifySMSChallengeAndAuthenticate = createServerFn({ method: 'POST' })
  .inputValidator((data: VerifySMSChallengeInput) => data)
  .handler(async ({ data }) => {
    const { challengeId, code, email } = data;
    
    // Step 4: Verify the SMS challenge
    const verifyResponse = await getWorkOS().mfa.verifyChallenge({
      authenticationChallengeId: challengeId,
      code,
    });
    
    if (!verifyResponse.valid) {
      throw new Error('Invalid verification code');
    }
    
    // Step 5: Authenticate the user using Magic Auth as a bridge
    // Since MFA is typically a second factor, we use Magic Auth to create a session
    const magicAuth = await getWorkOS().userManagement.createMagicAuth({
      email,
    });
    
    const response = await getWorkOS().userManagement.authenticateWithMagicAuth({
      clientId: getConfig('clientId'),
      email,
      code: magicAuth.code,
    });
    
    // Save the session
    await saveSession(response as AuthenticationResponse);
    
    return {
      user: response.user,
      organizationId: response.organizationId,
      valid: verifyResponse.valid,
    };
  });
