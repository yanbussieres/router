import { createFileRoute } from '@tanstack/react-router';
import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { UsersManagement, WorkOsWidgets } from '@workos-inc/widgets';
import { getWidgetToken } from '../../authkit/serverFunctions';

export const Route = createFileRoute('/_authenticated/users')({
  component: RouteComponent,
  loader: async () => {
    const token = await getWidgetToken();
    return { token };
  },
});

function RouteComponent() {
  const { token } = Route.useLoaderData();

  if (!token) {
    return (
      <Flex direction="column" gap="2" align="center">
        <Heading size="8">User Management</Heading>
        <Text size="5" color="gray">
          Unable to load user management. Please ensure you are authenticated.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4" width="100%">
      <Flex direction="column" gap="2" mb="4">
        <Heading size="8" align="center">
          User Management
        </Heading>
        <Text size="5" align="center" color="gray">
          Manage organization members, invite users, and assign roles
        </Text>
      </Flex>

      <Box width="100%" style={{ minHeight: '600px' }}>
        <WorkOsWidgets>
          <UsersManagement authToken={token} />
        </WorkOsWidgets>
      </Box>
    </Flex>
  );
}

