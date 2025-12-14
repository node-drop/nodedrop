/**
 * Mock for better-auth/react module
 * 
 * This mock provides a minimal implementation of better-auth's React client.
 */

export const createAuthClient = jest.fn(() => ({
  useSession: jest.fn(() => ({ data: null, isPending: false })),
  signIn: {
    email: jest.fn(),
  },
  signUp: {
    email: jest.fn(),
  },
  signOut: jest.fn(),
  useUser: jest.fn(() => null),
}));

export default { createAuthClient };
