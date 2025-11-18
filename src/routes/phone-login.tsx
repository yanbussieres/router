import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Box, Button, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { 
  createPhoneUserWithSMS, 
  challengeSMSFactor, 
  verifySMSChallengeAndAuthenticate 
} from '../authkit/serverFunctions';

export const Route = createFileRoute('/phone-login')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'code' | 'success' | 'error'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const handleSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1 & 2: Create user and enroll SMS factor
      const { user, factorId: fid, email } = await createPhoneUserWithSMS({
        data: { phoneNumber },
      });
      
      setFactorId(fid);
      setUserEmail(email);

      // Step 3: Challenge the SMS factor (sends SMS)
      const challenge = await challengeSMSFactor({
        data: {
          factorId: fid!,
        },
      });

      setChallengeId(challenge.id);
      setStep('code');
    } catch (err: any) {
      setError(err.message || 'Failed to create user or send SMS code');
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

