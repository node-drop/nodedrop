/**
 * Mock for better-auth module
 * 
 * This mock provides a minimal implementation of better-auth for testing purposes.
 * It allows tests that import the app to run without the ESM module issues.
 */

export const betterAuth = jest.fn(() => ({
  api: {
    getSession: jest.fn().mockResolvedValue(null),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
  handler: jest.fn(),
  $Infer: {
    Session: {} as any,
  },
}));

export default { betterAuth };
