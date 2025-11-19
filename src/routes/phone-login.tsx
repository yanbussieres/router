import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Box, Button, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import { useState, useEffect } from 'react';
import { 
  createPhoneUserWithSMS, 
  listOrganizations,
  createOrganizationMembership,
  enrollSMSFactor,
  challengeSMSFactor, 
  verifySMSChallengeAndAuthenticate 
} from '../authkit/serverFunctions';

export const Route = createFileRoute('/phone-login')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'organization' | 'code' | 'success' | 'error'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');

  const loadOrganizations = async () => {
    try {
      const orgs = await listOrganizations();
      setOrganizations(orgs.map(org => ({ id: org.id, name: org.name })));
    } catch (err: any) {
      console.error('Failed to load organizations:', err);
      setError('Failed to load organizations');
    }
  };

  // Load organizations when entering organization selection step
  useEffect(() => {
    if (step === 'organization') {
      loadOrganizations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create user
      const { user, email } = await createPhoneUserWithSMS({
        data: { phoneNumber },
      });
      
      setUserId(user.id);
      setUserEmail(email);
      setStep('organization');
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganizationId || !userId) {
      setError('Please select an organization');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create organization membership
      await createOrganizationMembership({
        data: {
          userId: userId!,
          organizationId: selectedOrganizationId,
          roleSlug: 'member',
        },
      });

      // Step 2: Enroll SMS factor
      const { factorId: fid } = await enrollSMSFactor({
        data: { phoneNumber },
      });
      
      setFactorId(fid);

      // Step 3: Challenge the SMS factor (sends SMS)
      const challenge = await challengeSMSFactor({
        data: {
          factorId: fid!,
        },
      });

      setChallengeId(challenge.id);
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Failed to create membership or send SMS code');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 4 & 5: Verify SMS code and authenticate
      const result = await verifySMSChallengeAndAuthenticate({
        data: {
          challengeId: challengeId!,
          code,
          email: userEmail!,
        },
      });

      setStep('success');
      
      // Redirect to specific route
      setTimeout(() => {
        navigate({ to: '/account' });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to verify code. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <Flex direction="column" gap="4" align="center">
        <Heading size="8">Success!</Heading>
        <Text size="5" color="green">
          Authenticated successfully via SMS.
        </Text>
        <Text size="3" color="gray">
          Redirecting...
        </Text>
      </Flex>
    );
  }

  if (step === 'organization') {
    return (
      <Flex direction="column" gap="4" width="400px">
        <Flex direction="column" gap="2" mb="4">
          <Heading size="8" align="center">
            Select Organization
          </Heading>
          <Text size="5" align="center" color="gray">
            Choose an organization to join
          </Text>
        </Flex>

        {error && (
          <Box p="3" style={{ backgroundColor: 'var(--red-3)', borderRadius: 'var(--radius-3)' }}>
            <Text size="3" color="red">
              {error}
            </Text>
          </Box>
        )}

        <form onSubmit={handleSelectOrganization}>
          <Flex direction="column" gap="3">
            <Flex direction="column" gap="1">
              <Text size="2" weight="bold">
                Organization *
              </Text>
              <select
                value={selectedOrganizationId}
                onChange={(e) => setSelectedOrganizationId(e.target.value)}
                required
                disabled={loading || organizations.length === 0}
                style={{
                  padding: 'var(--spacing-2)',
                  borderRadius: 'var(--radius-3)',
                  border: '1px solid var(--gray-6)',
                  fontSize: 'var(--font-size-3)',
                  backgroundColor: 'var(--gray-2)',
                }}
              >
                <option value="">Select an organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              {organizations.length === 0 && !loading && (
                <Text size="2" color="gray">
                  No organizations available
                </Text>
              )}
            </Flex>

            <Flex gap="3">
              <Button
                type="button"
                variant="soft"
                onClick={() => setStep('phone')}
                disabled={loading}
                style={{ flex: 1 }}
              >
                Back
              </Button>
              <Button type="submit" disabled={loading || !selectedOrganizationId} style={{ flex: 1 }}>
                {loading ? 'Processing...' : 'Continue'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Flex>
    );
  }

  if (step === 'code') {
    return (
      <Flex direction="column" gap="4" width="400px">
        <Flex direction="column" gap="2" mb="4">
          <Heading size="8" align="center">
            Enter SMS Code
          </Heading>
          <Text size="5" align="center" color="gray">
            A verification code has been sent to {phoneNumber}
          </Text>
        </Flex>

        {error && (
          <Box p="3" style={{ backgroundColor: 'var(--red-3)', borderRadius: 'var(--radius-3)' }}>
            <Text size="3" color="red">
              {error}
            </Text>
          </Box>
        )}

        <form onSubmit={handleSubmitCode}>
          <Flex direction="column" gap="3">
            <TextField.Root
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              disabled={loading}
              size="3"
              maxLength={6}
            />

            <Flex gap="3">
              <Button
                type="button"
                variant="soft"
                onClick={() => setStep('phone')}
                disabled={loading}
                style={{ flex: 1 }}
              >
                Back
              </Button>
              <Button type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4" width="400px">
      <Flex direction="column" gap="2" mb="4">
        <Heading size="8" align="center">
          Phone Login
        </Heading>
        <Text size="5" align="center" color="gray">
          Enter your phone number to sign in
        </Text>
      </Flex>

      {error && (
        <Box p="3" style={{ backgroundColor: 'var(--red-3)', borderRadius: 'var(--radius-3)' }}>
          <Text size="3" color="red">
            {error}
          </Text>
        </Box>
      )}

      <form onSubmit={handleSubmitPhone}>
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Text size="2" weight="bold">
              Phone Number *
            </Text>
            <TextField.Root
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              disabled={loading}
              size="3"
            />
          </Flex>

          <Button type="submit" disabled={loading} size="3">
            {loading ? 'Sending Code...' : 'Send SMS Code'}
          </Button>
        </Flex>
      </form>
    </Flex>
  );
}

