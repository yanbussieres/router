import { Box, Button, Card, Container, Flex, Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Suspense } from 'react';
import { getAuth, getSignInUrl } from '../authkit/serverFunctions';
import Footer from '../components/footer';
import SignInButton from '../components/sign-in-button';
import OrganizationSwitcherComponent from '../components/organization-switcher';
import type { ReactNode } from 'react';

export const Route = createRootRoute({
  beforeLoad: async () => {
    const auth = await getAuth();

    return { user: auth.user, organizationId: auth.organizationId };
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'AuthKit Example in TanStack Start',
      },
    ],
  }),
  loader: async ({ context }) => {
    const { user, organizationId } = context;
    const url = await getSignInUrl();
    return {
      user,
      organizationId,
      url,
    };
  },
  component: RootComponent,
  notFoundComponent: () => <div>Not Found</div>,
});

function RootComponent() {
  const { user, organizationId, url } = Route.useLoaderData();
  return (
    <RootDocument>
      <Theme accentColor="iris" panelBackground="solid" style={{ backgroundColor: 'var(--gray-1)' }}>
        <Container style={{ backgroundColor: 'var(--gray-1)' }}>
          <Flex direction="column" gap="5" p="5" height="100vh">
            <Box asChild flexGrow="1">
              <Card size="4">
                <Flex direction="column" height="100%">
                  <Flex asChild justify="between">
                    <header>
                      {user && (
                        <Flex gap="4">
                          <Button asChild variant="soft">
                            <Link to="/">Home</Link>
                          </Button>

                          <Button asChild variant="soft">
                            <Link to="/account">Account</Link>
                          </Button>

                          <Button asChild variant="soft">
                            <Link to="/users">Users</Link>
                          </Button>
                          
                          <Button asChild variant="soft">
                            <Link to="/phone-login">Phone Login</Link>
                          </Button>
                        </Flex>
                      )}

                      <Flex gap="4" align="center">
                        {user && organizationId && (
                          <Suspense fallback={null}>
                            <OrganizationSwitcherComponent />
                          </Suspense>
                        )}
                        <Suspense fallback={<div>Loading...</div>}>
                          <SignInButton user={user} url={url} />
                        </Suspense>
                      </Flex>
                    </header>
                  </Flex>

                  <Flex flexGrow="1" align="center" justify="center">
                    <main>
                      <Outlet />
                    </main>
                  </Flex>
                </Flex>
              </Card>
            </Box>
            <Footer />
          </Flex>
        </Container>
      </Theme>
      <TanStackRouterDevtools position="bottom-right" />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
