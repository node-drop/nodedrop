/**
 * Auth API Tests
 * 
 * NOTE: These tests are for the legacy JWT-based authentication system.
 * The system has been migrated to better-auth, and the new authentication
 * flows are tested in:
 * - src/__tests__/integration/auth-flows.test.ts (registration, login, logout)
 * - src/__tests__/integration/password-reset.test.ts (password reset flow)
 * 
 * These tests are skipped because:
 * 1. The API endpoints have changed (e.g., /api/auth/register -> /api/auth/sign-up/email)
 * 2. The authentication mechanism has changed from JWT to session-based
 * 3. The response format has changed to match better-auth's format
 * 
 * The integration tests provide comprehensive coverage of the new auth system.
 */

describe.skip('Auth API (Legacy - Skipped)', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', () => {
      // Skipped - see auth-flows.test.ts for registration tests
    });

    it('should return error for duplicate email', () => {
      // Skipped - see auth-flows.test.ts for duplicate email tests
    });

    it('should return validation error for invalid email', () => {
      // Skipped - validation is handled by better-auth
    });

    it('should return validation error for short password', () => {
      // Skipped - validation is handled by better-auth
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', () => {
      // Skipped - see auth-flows.test.ts for login tests
    });

    it('should return error for invalid email', () => {
      // Skipped - see auth-flows.test.ts for invalid credentials tests
    });

    it('should return error for invalid password', () => {
      // Skipped - see auth-flows.test.ts for invalid credentials tests
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', () => {
      // Skipped - see auth-flows.test.ts for session tests
    });

    it('should return error without token', () => {
      // Skipped - see auth-flows.test.ts for unauthenticated tests
    });

    it('should return error with invalid token', () => {
      // Skipped - see auth-flows.test.ts for invalid session tests
    });
  });
});

// Export empty to satisfy module requirements
export {};
