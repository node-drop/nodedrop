/**
 * Zod + Drizzle Integration Tests
 * 
 * This test suite verifies that:
 * 1. Zod schemas validate API requests independently
 * 2. Zod validation occurs before Drizzle queries
 * 3. Drizzle types work alongside Zod types
 * 4. Type divergence between Zod and Drizzle doesn't cause issues
 * 
 * Property: API Validation Independence
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { users } from '../../db/schema/auth';
import { workflows } from '../../db/schema/workflows';
import { credentials } from '../../db/schema/credentials';
import { variables } from '../../db/schema/variables';
import { logger } from '../../utils/logger';

/**
 * Generate a simple ID for testing
 */
function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Test Zod Schemas (API Validation Layer)
// ============================================================================

/**
 * User creation schema - validates API input
 * This is independent of Drizzle types
 */
const UserCreateApiSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  role: z.enum(['user', 'admin']).optional(),
  preferences: z.record(z.any()).optional(),
});

type UserCreateApiInput = z.infer<typeof UserCreateApiSchema>;

/**
 * Workflow creation schema - validates API input
 * Includes complex nested structures
 */
const WorkflowCreateApiSchema = z.object({
  name: z.string().min(1, 'Name required').max(255),
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

type WorkflowCreateApiInput = z.infer<typeof WorkflowCreateApiSchema>;

/**
 * Credential creation schema - validates API input
 */
const CredentialCreateApiSchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.string().min(1, 'Type required'),
  data: z.record(z.any()),
  expiresAt: z.date().optional(),
});

type CredentialCreateApiInput = z.infer<typeof CredentialCreateApiSchema>;

/**
 * Variable creation schema - validates API input
 */
const VariableCreateApiSchema = z.object({
  name: z.string().min(1, 'Name required'),
  value: z.any(),
  scope: z.enum(['global', 'workspace', 'workflow']).optional(),
});

type VariableCreateApiInput = z.infer<typeof VariableCreateApiSchema>;

// ============================================================================
// Drizzle Types (Database Layer)
// ============================================================================

/**
 * Drizzle-inferred types from schema
 * These are independent of Zod types
 */
type UserSelect = typeof users.$inferSelect;
type UserInsert = typeof users.$inferInsert;

type WorkflowSelect = typeof workflows.$inferSelect;
type WorkflowInsert = typeof workflows.$inferInsert;

type CredentialSelect = typeof credentials.$inferSelect;
type CredentialInsert = typeof credentials.$inferInsert;

type VariableSelect = typeof variables.$inferSelect;
type VariableInsert = typeof variables.$inferInsert;

// ============================================================================
// Integration Tests
// ============================================================================

describe('Zod + Drizzle Integration', () => {
  
  // ========================================================================
  // Test 1: Zod validates API requests independently
  // ========================================================================
  
  describe('Zod validates API requests independently', () => {
    
    it('should validate valid user creation input', () => {
      const validInput = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      };

      const result = UserCreateApiSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.name).toBe('Test User');
      }
    });

    it('should reject invalid email format', () => {
      const invalidInput = {
        email: 'not-an-email',
        name: 'Test User',
      };

      const result = UserCreateApiSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_string');
      }
    });

    it('should reject missing required fields', () => {
      const invalidInput = {
        email: 'test@example.com',
        // name is missing
      };

      const result = UserCreateApiSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate complex nested workflow structure', () => {
      const validInput = {
        name: 'Test Workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
        ],
        connections: [
          {
            id: 'conn-1',
            source: 'node-1',
            target: 'node-2',
          },
        ],
      };

      const result = WorkflowCreateApiSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid nested structure', () => {
      const invalidInput = {
        name: 'Test Workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 'invalid', y: 0 }, // x should be number
            data: { label: 'Start' },
          },
        ],
        connections: [],
      };

      const result = WorkflowCreateApiSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate enum values correctly', () => {
      const validInput = {
        name: 'Test Variable',
        value: 'some-value',
        scope: 'workspace',
      };

      const result = VariableCreateApiSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid enum values', () => {
      const invalidInput = {
        name: 'Test Variable',
        value: 'some-value',
        scope: 'invalid-scope',
      };

      const result = VariableCreateApiSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  // ========================================================================
  // Test 2: Zod validation occurs before Drizzle queries
  // ========================================================================

  describe('Zod validation occurs before Drizzle queries', () => {
    
    it('should validate input before attempting database insert', async () => {
      const invalidInput = {
        email: 'invalid-email',
        name: 'Test User',
      };

      // Validation should fail before any database operation
      const validationResult = UserCreateApiSchema.safeParse(invalidInput);
      expect(validationResult.success).toBe(false);

      // If validation passed, we would proceed to database
      // But since it failed, no database operation should occur
      if (validationResult.success) {
        // This should not execute
        fail('Validation should have failed');
      }
    });

    it('should allow valid input to proceed to database', async () => {
      const validInput = {
        email: `test-${generateTestId()}@example.com`,
        name: 'Test User',
      };

      // Validation should pass
      const validationResult = UserCreateApiSchema.safeParse(validInput);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        // Now we can safely use the validated data with Drizzle
        const userId = generateTestId();
        const result = await db
          .insert(users)
          .values({
            id: userId,
            email: validationResult.data.email,
            name: validationResult.data.name,
            role: validationResult.data.role || 'user',
            preferences: validationResult.data.preferences || {},
          })
          .returning();

        expect(result[0]).toBeDefined();
        expect(result[0].email).toBe(validInput.email);

        // Cleanup
        await db.delete(users).where(eq(users.id, userId));
      }
    });

    it('should reject partial updates with invalid data', async () => {
      const partialUpdateSchema = UserCreateApiSchema.partial();
      
      const invalidPartialInput = {
        email: 'not-an-email', // Invalid even though partial
      };

      const result = partialUpdateSchema.safeParse(invalidPartialInput);
      expect(result.success).toBe(false);
    });

    it('should validate array items before database operation', async () => {
      const invalidWorkflowInput = {
        name: 'Test Workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 'not-a-number', y: 0 }, // Invalid
            data: {},
          },
        ],
        connections: [],
      };

      const result = WorkflowCreateApiSchema.safeParse(invalidWorkflowInput);
      expect(result.success).toBe(false);

      // No database operation should occur
      if (result.success) {
        fail('Validation should have failed');
      }
    });
  });

  // ========================================================================
  // Test 3: Drizzle types work alongside Zod types
  // ========================================================================

  describe('Drizzle types work alongside Zod types', () => {
    
    it('should map Zod-validated input to Drizzle insert type', async () => {
      const validInput = {
        email: `test-${generateTestId()}@example.com`,
        name: 'Test User',
        role: 'user' as const,
      };

      // Validate with Zod
      const validationResult = UserCreateApiSchema.safeParse(validInput);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        // Map to Drizzle insert type
        const drizzleInsert: UserInsert = {
          id: generateTestId(),
          email: validationResult.data.email,
          name: validationResult.data.name,
          role: validationResult.data.role || 'user',
          preferences: validationResult.data.preferences || {},
        };

        // Insert into database
        const result = await db
          .insert(users)
          .values(drizzleInsert)
          .returning();

        expect(result[0]).toBeDefined();
        
        // Verify Drizzle select type
        const selected: UserSelect | undefined = result[0];
        expect(selected?.email).toBe(validInput.email);

        // Cleanup
        await db.delete(users).where(eq(users.id, drizzleInsert.id));
      }
    });

    it('should handle Drizzle select results independently of Zod', async () => {
      // Create a user directly with Drizzle
      const userId = generateTestId();
      const insertResult = await db
        .insert(users)
        .values({
          id: userId,
          email: `test-${generateTestId()}@example.com`,
          name: 'Test User',
          role: 'user',
          preferences: { theme: 'dark' },
        })
        .returning();

      expect(insertResult[0]).toBeDefined();

      // Query with Drizzle
      const selected = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      expect(selected).toBeDefined();
      expect(selected?.email).toBeDefined();

      // The Drizzle result type is independent of Zod
      // We can use it without Zod validation
      const drizzleResult: UserSelect | undefined = selected;
      expect(drizzleResult?.preferences).toEqual({ theme: 'dark' });

      // Cleanup
      await db.delete(users).where(eq(users.id, userId));
    });

    it('should work with complex nested Drizzle types', async () => {
      const workflowId = generateTestId();
      const userId = generateTestId();

      // Create user first
      await db.insert(users).values({
        id: userId,
        email: `test-${generateTestId()}@example.com`,
        name: 'Test User',
        role: 'user',
      });

      // Validate workflow input with Zod
      const validInput = {
        name: 'Test Workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
        ],
        connections: [],
      };

      const validationResult = WorkflowCreateApiSchema.safeParse(validInput);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        // Map to Drizzle insert type
        const drizzleInsert: WorkflowInsert = {
          id: workflowId,
          name: validationResult.data.name,
          description: validationResult.data.description || null,
          nodes: validationResult.data.nodes,
          connections: validationResult.data.connections,
          userId,
          active: validationResult.data.active || false,
        };

        // Insert into database
        const result = await db
          .insert(workflows)
          .values(drizzleInsert)
          .returning();

        expect(result[0]).toBeDefined();
        expect(result[0].nodes).toEqual(validInput.nodes);

        // Cleanup
        await db.delete(workflows).where(eq(workflows.id, workflowId));
      }

      // Cleanup user
      await db.delete(users).where(eq(users.id, userId));
    });
  });

  // ========================================================================
  // Test 4: Type divergence between Zod and Drizzle doesn't cause issues
  // ========================================================================

  describe('Type divergence between Zod and Drizzle doesn\'t cause issues', () => {
    
    it('should handle optional fields that differ between Zod and Drizzle', async () => {
      // Zod schema makes role optional
      const zodInput = {
        email: `test-${generateTestId()}@example.com`,
        name: 'Test User',
        // role is optional in Zod
      };

      const validationResult = UserCreateApiSchema.safeParse(zodInput);
      expect(validationResult.success).toBe(true);

      if (validationResult.success) {
        // Drizzle requires role to have a default
        const drizzleInsert: UserInsert = {
          id: generateTestId(),
          email: validationResult.data.email,
          name: validationResult.data.name,
          role: validationResult.data.role || 'user', // Provide default
        };

        const result = await db
          .insert(users)
          .values(drizzleInsert)
          .returning();

        expect(result[0].role).toBe('user');

        // Cleanup
        await db.delete(users).where(eq(users.id, drizzleInsert.id));
      }
    });

    it('should handle type transformations between Zod and Drizzle', async () => {
      // Zod can transform types
      const TransformSchema = z.object({
        email: z.string().email().toLowerCase(),
        name: z.string().trim(),
      });

      const input = {
        email: '  TEST@EXAMPLE.COM  ',
        name: '  Test User  ',
      };

      const result = TransformSchema.safeParse(input);
      expect(result.success).toBe(true);

      if (result.success) {
        // Zod has transformed the values
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.name).toBe('Test User');

        // Now use with Drizzle
        const userId = generateTestId();
        const drizzleResult = await db
          .insert(users)
          .values({
            id: userId,
            email: result.data.email,
            name: result.data.name,
            role: 'user',
          })
          .returning();

        expect(drizzleResult[0].email).toBe('test@example.com');

        // Cleanup
        await db.delete(users).where(eq(users.id, userId));
      }
    });

    it('should handle JSON fields with different Zod and Drizzle representations', async () => {
      // Zod validates JSON structure
      const PreferencesSchema = z.object({
        theme: z.enum(['light', 'dark']),
        notifications: z.boolean(),
        customData: z.record(z.any()),
      });

      const zodInput = {
        email: `test-${generateTestId()}@example.com`,
        name: 'Test User',
        preferences: {
          theme: 'dark',
          notifications: true,
          customData: { key: 'value' },
        },
      };

      // Validate preferences separately
      const prefsResult = PreferencesSchema.safeParse(zodInput.preferences);
      expect(prefsResult.success).toBe(true);

      if (prefsResult.success) {
        // Drizzle stores as JSON
        const userId = generateTestId();
        const result = await db
          .insert(users)
          .values({
            id: userId,
            email: zodInput.email,
            name: zodInput.name,
            role: 'user',
            preferences: prefsResult.data as Record<string, any>,
          })
          .returning();

        expect(result[0].preferences).toEqual(prefsResult.data);

        // Cleanup
        await db.delete(users).where(eq(users.id, userId));
      }
    });

    it('should handle enum divergence between Zod and Drizzle', async () => {
      // Zod enum
      const ZodScopeEnum = z.enum(['global', 'workspace', 'workflow']);
      
      // Drizzle enum (from schema)
      // Both should accept the same values
      
      const validScopes = ['global', 'workspace', 'workflow'];
      
      for (const scope of validScopes) {
        const result = ZodScopeEnum.safeParse(scope);
        expect(result.success).toBe(true);

        if (result.success) {
          // Can use with Drizzle
          const variableId = generateTestId();
          const drizzleResult = await db
            .insert(variables)
            .values({
              id: variableId,
              name: `test-${generateTestId()}`,
              value: 'test-value',
              scope: result.data,
            })
            .returning();

          expect(drizzleResult[0].scope).toBe(scope);

          // Cleanup
          await db.delete(variables).where(eq(variables.id, variableId));
        }
      }
    });

    it('should handle null/undefined divergence between Zod and Drizzle', async () => {
      // Zod can have optional fields
      const OptionalSchema = z.object({
        email: z.string().email(),
        description: z.string().optional(),
      });

      const input1 = {
        email: `test-${generateTestId()}@example.com`,
        // description is undefined
      };

      const result1 = OptionalSchema.safeParse(input1);
      expect(result1.success).toBe(true);

      if (result1.success) {
        // Drizzle needs explicit null
        const workflowId = generateTestId();
        const userId = generateTestId();

        // Create user first
        await db.insert(users).values({
          id: userId,
          email: `test-${generateTestId()}@example.com`,
          name: 'Test',
          role: 'user',
        });

        const drizzleResult = await db
          .insert(workflows)
          .values({
            id: workflowId,
            name: 'Test',
            description: result1.data.description || null, // Convert undefined to null
            userId,
          })
          .returning();

        expect(drizzleResult[0].description).toBeNull();

        // Cleanup
        await db.delete(workflows).where(eq(workflows.id, workflowId));
        await db.delete(users).where(eq(users.id, userId));
      }
    });
  });

  // ========================================================================
  // Test 5: API validation independence
  // ========================================================================

  describe('API validation independence', () => {
    
    it('should validate API input without database schema knowledge', () => {
      // Zod schema is independent of database schema
      const ApiSchema = z.object({
        email: z.string().email(),
        name: z.string(),
      });

      // This validation works without any database connection
      const result = ApiSchema.safeParse({
        email: 'test@example.com',
        name: 'Test',
      });

      expect(result.success).toBe(true);
    });

    it('should allow API schema to diverge from database schema', () => {
      // API might accept different format than database stores
      const ApiSchema = z.object({
        email: z.string().email(),
        fullName: z.string(), // API uses fullName
      });

      const result = ApiSchema.safeParse({
        email: 'test@example.com',
        fullName: 'Test User',
      });

      expect(result.success).toBe(true);

      if (result.success) {
        // Map API field to database field
        const dbValue = {
          email: result.data.email,
          name: result.data.fullName, // Map fullName to name
        };

        expect(dbValue.name).toBe('Test User');
      }
    });

    it('should validate API constraints independently of database constraints', () => {
      // API might have stricter validation than database
      const ApiSchema = z.object({
        email: z.string().email().max(100),
        name: z.string().min(2).max(50),
      });

      // Valid for API
      const validResult = ApiSchema.safeParse({
        email: 'test@example.com',
        name: 'AB',
      });

      expect(validResult.success).toBe(true);

      // Invalid for API (too short)
      const invalidResult = ApiSchema.safeParse({
        email: 'test@example.com',
        name: 'A',
      });

      expect(invalidResult.success).toBe(false);
    });

    it('should handle API-specific validation rules', () => {
      // API might validate business logic
      const ApiSchema = z.object({
        email: z.string().email(),
        role: z.enum(['user', 'admin']),
        canDelete: z.boolean(),
      }).refine(
        (data) => {
          // Business rule: only admins can delete
          return !data.canDelete || data.role === 'admin';
        },
        {
          message: 'Only admins can have delete permission',
          path: ['canDelete'],
        }
      );

      // Valid: admin with delete
      const validResult = ApiSchema.safeParse({
        email: 'test@example.com',
        role: 'admin',
        canDelete: true,
      });

      expect(validResult.success).toBe(true);

      // Invalid: user with delete
      const invalidResult = ApiSchema.safeParse({
        email: 'test@example.com',
        role: 'user',
        canDelete: true,
      });

      expect(invalidResult.success).toBe(false);
    });
  });

  // ========================================================================
  // Test 6: Zod validation with Drizzle in realistic scenarios
  // ========================================================================

  describe('Realistic integration scenarios', () => {
    
    it('should validate and insert user with all optional fields', async () => {
      const input = {
        email: `test-${generateTestId()}@example.com`,
        name: 'Test User',
        role: 'user',
        preferences: { theme: 'dark', language: 'en' },
      };

      const result = UserCreateApiSchema.safeParse(input);
      expect(result.success).toBe(true);

      if (result.success) {
        const userId = generateTestId();
        const dbResult = await db
          .insert(users)
          .values({
            id: userId,
            email: result.data.email,
            name: result.data.name,
            role: result.data.role || 'user',
            preferences: result.data.preferences || {},
          })
          .returning();

        expect(dbResult[0].preferences).toEqual(input.preferences);

        // Cleanup
        await db.delete(users).where(eq(users.id, userId));
      }
    });

    it('should validate and insert workflow with complex structure', async () => {
      const userId = generateTestId();
      
      // Create user first
      await db.insert(users).values({
        id: userId,
        email: `test-${generateTestId()}@example.com`,
        name: 'Test',
        role: 'user',
      });

      const input = {
        name: 'Complex Workflow',
        description: 'A workflow with multiple nodes',
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
          {
            id: 'action-1',
            type: 'action',
            position: { x: 100, y: 100 },
            data: { label: 'Process' },
          },
        ],
        connections: [
          {
            id: 'conn-1',
            source: 'trigger-1',
            target: 'action-1',
          },
        ],
        active: true,
      };

      const result = WorkflowCreateApiSchema.safeParse(input);
      expect(result.success).toBe(true);

      if (result.success) {
        const workflowId = generateTestId();
        const dbResult = await db
          .insert(workflows)
          .values({
            id: workflowId,
            name: result.data.name,
            description: result.data.description || null,
            nodes: result.data.nodes,
            connections: result.data.connections,
            userId,
            active: result.data.active || false,
          })
          .returning();

        expect(dbResult[0].nodes).toHaveLength(2);
        expect(dbResult[0].connections).toHaveLength(1);

        // Cleanup
        await db.delete(workflows).where(eq(workflows.id, workflowId));
      }

      // Cleanup user
      await db.delete(users).where(eq(users.id, userId));
    });

    it('should handle validation errors gracefully', async () => {
      const invalidInput = {
        email: 'not-an-email',
        name: 'Test',
      };

      const result = UserCreateApiSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);

      if (!result.success) {
        // Should have validation errors
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].code).toBe('invalid_string');
      }
    });
  });
});

