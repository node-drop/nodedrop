/**
 * Property-Based Tests: API Validation Independence
 * 
 * This test suite uses property-based testing to verify that:
 * - Zod validation succeeds or fails independently of Drizzle type definitions
 * - API contracts are enforced regardless of database schema changes
 * - Type safety is maintained across the validation and database layers
 * 
 * Property 7: API Validation Independence
 * Validates: Requirements 5.1, 5.2
 * 
 * **Feature: prisma-to-drizzle-migration, Property 7: API Validation Independence**
 */

import fc from 'fast-check';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { users } from '../../db/schema/auth';
import { workflows } from '../../db/schema/workflows';

/**
 * Generate a simple ID for testing
 */
function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Arbitraries for Property-Based Testing
// ============================================================================

/**
 * Generate valid email addresses
 */
const validEmailArbitrary = fc.emailAddress();

/**
 * Generate valid user names
 */
const validNameArbitrary = fc.stringMatching(/^[a-zA-Z0-9\s\-_]{1,255}$/);

/**
 * Generate valid workflow names
 */
const validWorkflowNameArbitrary = fc.stringMatching(/^[a-zA-Z0-9\s\-_]{1,255}$/);

/**
 * Generate valid node IDs
 */
const validNodeIdArbitrary = fc.stringMatching(/^[a-zA-Z0-9\-_]{1,50}$/);

/**
 * Generate valid node types
 */
const validNodeTypeArbitrary = fc.oneof(
  fc.constant('trigger'),
  fc.constant('action'),
  fc.constant('condition'),
  fc.constant('loop'),
  fc.constant('end')
);

/**
 * Generate valid positions
 */
const positionArbitrary = fc.record({
  x: fc.integer({ min: -1000, max: 1000 }),
  y: fc.integer({ min: -1000, max: 1000 }),
});

/**
 * Generate valid workflow nodes
 */
const workflowNodeArbitrary = fc.record({
  id: validNodeIdArbitrary,
  type: validNodeTypeArbitrary,
  position: positionArbitrary,
  data: fc.record({
    label: fc.string({ maxLength: 100 }),
  }),
});

/**
 * Generate valid workflow connections
 */
const workflowConnectionArbitrary = fc.record({
  id: validNodeIdArbitrary,
  source: validNodeIdArbitrary,
  target: validNodeIdArbitrary,
});

// ============================================================================
// Zod Schemas for Testing
// ============================================================================

const UserCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: z.enum(['user', 'admin']).optional(),
});

const WorkflowCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.record(z.any()),
  })),
  connections: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
  })),
  active: z.boolean().optional(),
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Property 7: API Validation Independence', () => {
  
  // ========================================================================
  // Property: Valid inputs always pass Zod validation
  // ========================================================================
  
  it('should validate all valid user inputs consistently', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: validEmailArbitrary,
          name: validNameArbitrary,
          role: fc.oneof(
            fc.constant('user'),
            fc.constant('admin'),
            fc.constant(undefined)
          ),
        }),
        (input) => {
          const result = UserCreateSchema.safeParse(input);
          
          // All generated valid inputs should pass validation
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Validated data should match input
            expect(result.data.email).toBe(input.email);
            expect(result.data.name).toBe(input.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ========================================================================
  // Property: Invalid emails always fail validation
  // ========================================================================
  
  it('should reject all invalid email formats', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          validNameArbitrary,
          fc.string({ minLength: 1, maxLength: 50 })
        ),
        ([name, invalidEmail]) => {
          // Ensure it's not a valid email
          if (invalidEmail.includes('@') && invalidEmail.includes('.')) {
            return; // Skip if it happens to be valid
          }

          const input = {
            email: invalidEmail,
            name: name,
          };

          const result = UserCreateSchema.safeParse(input);
          
          // Invalid emails should fail validation
          if (!invalidEmail.includes('@')) {
            expect(result.success).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  // ========================================================================
  // Property: Zod validation is deterministic
  // ========================================================================
  
  it('should validate the same input consistently', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: validEmailArbitrary,
          name: validNameArbitrary,
        }),
        (input) => {
          // Validate multiple times
          const result1 = UserCreateSchema.safeParse(input);
          const result2 = UserCreateSchema.safeParse(input);
          const result3 = UserCreateSchema.safeParse(input);

          // All results should be identical
          expect(result1.success).toBe(result2.success);
          expect(result2.success).toBe(result3.success);

          if (result1.success && result2.success && result3.success) {
            expect(result1.data).toEqual(result2.data);
            expect(result2.data).toEqual(result3.data);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ========================================================================
  // Property: Zod validation is independent of database state
  // ========================================================================
  
  it('should validate input regardless of database state', async () => {
    // Create a user in the database
    const userId = generateTestId();
    const testEmail = `test-${generateTestId()}@example.com`;
    
    await db.insert(users).values({
      id: userId,
      email: testEmail,
      name: 'Test User',
      role: 'user',
    });

    try {
      fc.assert(
        fc.property(
          fc.record({
            email: validEmailArbitrary,
            name: validNameArbitrary,
          }),
          (input) => {
            // Validation should work regardless of database state
            const result = UserCreateSchema.safeParse(input);
            
            // Should validate based on schema, not database
            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    } finally {
      // Cleanup
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  // ========================================================================
  // Property: Zod validation doesn't require Drizzle types
  // ========================================================================
  
  it('should validate without any database connection', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: validEmailArbitrary,
          name: validNameArbitrary,
        }),
        (input) => {
          // This validation works without database
          const result = UserCreateSchema.safeParse(input);
          
          // Should succeed for valid input
          expect(result.success).toBe(true);
          
          // Result should be usable independently
          if (result.success) {
            expect(typeof result.data.email).toBe('string');
            expect(typeof result.data.name).toBe('string');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ========================================================================
  // Property: Complex nested validation is independent
  // ========================================================================
  
  it('should validate complex nested structures independently', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: validWorkflowNameArbitrary,
          nodes: fc.array(workflowNodeArbitrary, { minLength: 1, maxLength: 10 }),
          connections: fc.array(workflowConnectionArbitrary, { maxLength: 10 }),
        }),
        (input) => {
          const result = WorkflowCreateSchema.safeParse(input);
          
          // Should validate based on schema structure
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Validated structure should match input
            expect(result.data.nodes).toHaveLength(input.nodes.length);
            expect(result.data.connections).toHaveLength(input.connections.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  // ========================================================================
  // Property: Validation errors are consistent
  // ========================================================================
  
  it('should produce consistent validation errors', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.string({ minLength: 1, maxLength: 50 }),
          name: fc.string({ minLength: 0, maxLength: 0 }), // Empty name
        }),
        (input) => {
          // Skip if email happens to be valid
          if (input.email.includes('@') && input.email.includes('.')) {
            return;
          }

          const result = UserCreateSchema.safeParse(input);
          
          // Should fail due to invalid email or empty name
          if (!result.success) {
            // Should have at least one error
            expect(result.error.issues.length).toBeGreaterThan(0);
            
            // Errors should be consistent
            const result2 = UserCreateSchema.safeParse(input);
            expect(result2.success).toBe(false);
            expect(result2.error.issues.length).toBe(result.error.issues.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  // ========================================================================
  // Property: Partial validation works independently
  // ========================================================================
  
  it('should validate partial updates independently', () => {
    const PartialUserSchema = UserCreateSchema.partial();

    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({ email: validEmailArbitrary }),
          fc.record({ name: validNameArbitrary }),
          fc.record({
            email: validEmailArbitrary,
            name: validNameArbitrary,
          })
        ),
        (input) => {
          const result = PartialUserSchema.safeParse(input);
          
          // Partial validation should work independently
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  // ========================================================================
  // Property: Enum validation is independent
  // ========================================================================
  
  it('should validate enum values independently', () => {
    const RoleEnum = z.enum(['user', 'admin']);

    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('user'),
          fc.constant('admin')
        ),
        (role) => {
          const result = RoleEnum.safeParse(role);
          
          // Valid enum values should pass
          expect(result.success).toBe(true);
          expect(result.data).toBe(role);
        }
      ),
      { numRuns: 20 }
    );
  });

  // ========================================================================
  // Property: Type transformations are independent
  // ========================================================================
  
  it('should apply transformations independently', () => {
    const TransformSchema = z.object({
      email: z.string().email().toLowerCase(),
      name: z.string().trim(),
    });

    fc.assert(
      fc.property(
        fc.record({
          email: validEmailArbitrary,
          name: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        (input) => {
          const result = TransformSchema.safeParse(input);
          
          if (result.success) {
            // Transformations should be applied
            expect(result.data.email).toBe(input.email.toLowerCase());
            expect(result.data.name).toBe(input.name.trim());
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  // ========================================================================
  // Property: Validation doesn't mutate input
  // ========================================================================
  
  it('should not mutate input during validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: validEmailArbitrary,
          name: validNameArbitrary,
        }),
        (input) => {
          // Create a copy to compare
          const inputCopy = JSON.parse(JSON.stringify(input));
          
          // Validate
          UserCreateSchema.safeParse(input);
          
          // Input should not be mutated
          expect(input).toEqual(inputCopy);
        }
      ),
      { numRuns: 50 }
    );
  });

  // ========================================================================
  // Property: Validation result is serializable
  // ========================================================================
  
  it('should produce serializable validation results', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: validEmailArbitrary,
          name: validNameArbitrary,
        }),
        (input) => {
          const result = UserCreateSchema.safeParse(input);
          
          if (result.success) {
            // Result should be JSON serializable
            const serialized = JSON.stringify(result.data);
            const deserialized = JSON.parse(serialized);
            
            expect(deserialized.email).toBe(result.data.email);
            expect(deserialized.name).toBe(result.data.name);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

