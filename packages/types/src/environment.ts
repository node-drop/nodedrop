/**
 * @nodedrop/types - Environment Types
 *
 * Shared environment-related type definitions for workflow deployment.
 * These types are used by both frontend and backend.
 */

import { z } from "zod";

// Import and re-export enums from common.ts
import { EnvironmentType, EnvironmentStatus, DeploymentStatus } from "./common";
export { EnvironmentType, EnvironmentStatus, DeploymentStatus };

// =============================================================================
// Environment Schemas (using nativeEnum for proper TypeScript enum types)
// =============================================================================

export const WorkflowEnvironmentSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  environment: z.nativeEnum(EnvironmentType),
  version: z.string(),
  nodes: z.array(z.any()),
  connections: z.array(z.any()),
  triggers: z.array(z.any()),
  settings: z.record(z.any()),
  variables: z.record(z.any()),
  active: z.boolean(),
  deployedAt: z.string().optional(),
  deployedBy: z.string().optional(),
  deploymentNote: z.string().optional(),
  status: z.nativeEnum(EnvironmentStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WorkflowEnvironmentDeploymentSchema = z.object({
  id: z.string(),
  environmentId: z.string(),
  version: z.string(),
  deployedBy: z.string(),
  deployedAt: z.string(),
  sourceEnvironment: z.nativeEnum(EnvironmentType).optional(),
  deploymentNote: z.string().optional(),
  snapshot: z.any(),
  status: z.nativeEnum(DeploymentStatus),
  rollbackFrom: z.string().optional(),
  createdAt: z.string(),
});

export const EnvironmentSummarySchema = z.object({
  environment: z.nativeEnum(EnvironmentType),
  version: z.string(),
  status: z.nativeEnum(EnvironmentStatus),
  active: z.boolean(),
  nodeCount: z.number(),
  lastDeployment: z.object({
    deployedAt: z.string(),
    deployedBy: z.string(),
    note: z.string().optional(),
  }).optional(),
});

export const EnvironmentComparisonSchema = z.object({
  workflowId: z.string(),
  sourceEnvironment: z.nativeEnum(EnvironmentType),
  targetEnvironment: z.nativeEnum(EnvironmentType),
  differences: z.object({
    nodes: z.object({
      added: z.array(z.any()),
      removed: z.array(z.any()),
      modified: z.array(z.any()),
    }),
    connections: z.object({
      added: z.array(z.any()),
      removed: z.array(z.any()),
    }),
    triggers: z.object({
      added: z.array(z.any()),
      removed: z.array(z.any()),
      modified: z.array(z.any()),
    }),
    settings: z.object({
      changed: z.array(z.object({
        key: z.string(),
        sourceValue: z.any(),
        targetValue: z.any(),
      })),
    }),
    variables: z.object({
      added: z.array(z.string()),
      removed: z.array(z.string()),
      modified: z.array(z.string()),
    }),
  }),
  sourceVersion: z.string(),
  targetVersion: z.string(),
});

// =============================================================================
// Environment Input Schemas
// =============================================================================

export const CreateEnvironmentInputSchema = z.object({
  environment: z.nativeEnum(EnvironmentType),
  version: z.string().optional(),
  deploymentNote: z.string().optional(),
});

export const DeployEnvironmentInputSchema = z.object({
  sourceEnvironment: z.nativeEnum(EnvironmentType),
  targetEnvironment: z.nativeEnum(EnvironmentType),
  version: z.string().optional(),
  deploymentNote: z.string().optional(),
  copyVariables: z.boolean().optional(),
  activateAfterDeploy: z.boolean().optional(),
});

export const UpdateEnvironmentInputSchema = z.object({
  environment: z.nativeEnum(EnvironmentType),
  version: z.string().optional(),
  deploymentNote: z.string().optional(),
  copyVariables: z.boolean().optional(),
});

export const PromoteEnvironmentInputSchema = z.object({
  version: z.string().optional(),
  deploymentNote: z.string().optional(),
  activateAfterDeploy: z.boolean().optional(),
});

export const RollbackEnvironmentInputSchema = z.object({
  deploymentId: z.string(),
  deploymentNote: z.string().optional(),
});

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type WorkflowEnvironment = z.infer<typeof WorkflowEnvironmentSchema>;
export type WorkflowEnvironmentDeployment = z.infer<typeof WorkflowEnvironmentDeploymentSchema>;
export type EnvironmentSummary = z.infer<typeof EnvironmentSummarySchema>;
export type EnvironmentComparison = z.infer<typeof EnvironmentComparisonSchema>;
export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentInputSchema>;
export type DeployEnvironmentInput = z.infer<typeof DeployEnvironmentInputSchema>;
export type UpdateEnvironmentInput = z.infer<typeof UpdateEnvironmentInputSchema>;
export type PromoteEnvironmentInput = z.infer<typeof PromoteEnvironmentInputSchema>;
export type RollbackEnvironmentInput = z.infer<typeof RollbackEnvironmentInputSchema>;
