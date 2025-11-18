import { OrganizationSwitcher, WorkOsWidgets } from '@workos-inc/widgets';
import { useRouter, useLocation } from '@tanstack/react-router';
import { getOrganizationSwitcherToken, switchOrganization } from '../authkit/serverFunctions';
import { useState, useEffect } from 'react';

export default function OrganizationSwitcherComponent() {
  const router = useRouter();
  const location = useLocation();
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the widget token
    getOrganizationSwitcherToken().then((token) => {
      setAuthToken(token);
    });
  }, []);

  const handleOrganizationSwitch = async ({ organizationId, pathname }: { organizationId: string; pathname?: string }) => {
    try {
      // Use the provided pathname or current pathname
      const returnPathname = pathname || location.pathname;
      const result = await switchOrganization({ data: { organizationId, returnPathname } });
      
      if (result?.redirectUrl) {
        // Redirect to the authorization URL to authenticate with the new organization
        window.location.href = result.redirectUrl;
      } else {
        // If no redirect URL, navigate to the pathname or current location
        if (pathname) {
          router.navigate({ to: pathname });
        } else {
          router.invalidate();
        }
      }
    } catch (error) {
      console.error('Error switching organization:', error);
      // Handle error (you might want to show a toast notification here)
    }
  };

  if (!authToken) {
    return null;
  }

  return (
    <WorkOsWidgets>
      <OrganizationSwitcher
        authToken={authToken}
        switchToOrganization={handleOrganizationSwitch}
      />
    </WorkOsWidgets>
  );
}

