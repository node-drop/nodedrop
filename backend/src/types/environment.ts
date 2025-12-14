/**
 * Workflow Environment Types
 *
 * Re-exports shared types from @nodedrop/types and defines backend-specific types.
 * Backend-specific types use Date objects for timestamps (as returned by Prisma).
 */

// Re-export shared types from @nodedrop/types
export {
  // Enums
  EnvironmentType,
  EnvironmentStatus,
  DeploymentStatus,
  // Types (API response format with string timestamps)
  type EnvironmentComparison,
  type DeployEnvironmentInput,
  type UpdateEnvironmentInput,
  type PromoteEnvironmentInput,
  type RollbackEnvironmentInput,
  // Schemas
  WorkflowEnvironmentSchema,
  WorkflowEnvironmentDeploymentSchema,
  EnvironmentSummarySchema,
  EnvironmentComparisonSchema,
  DeployEnvironmentInputSchema,
  UpdateEnvironmentInputSchema,
  PromoteEnvironmentInputSchema,
  RollbackEnvironmentInputSchema,
} from "@nodedrop/types";

// Import CreateEnvironmentInput schema to extend it
import { CreateEnvironmentInputSchema as BaseCreateEnvironmentInputSchema } from "@nodedrop/types";
import { z } from "zod";

// Backend-specific CreateEnvironmentInput that includes workflowId
export const CreateEnvironmentInputSchema = BaseCreateEnvironmentInputSchema.extend({
  workflowId: z.string(),
});

export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentInputSchema>;

import { EnvironmentType, EnvironmentStatus, DeploymentStatus } from "@nodedrop/types";

// =============================================================================
// Backend-specific types (use Date objects as returned by Prisma)
// =============================================================================

/**
 * Workflow environment as stored in database (uses Date objects)
 */
export interface WorkflowEnvironment {
  id: string;
  workflowId: string;
  environment: EnvironmentType;
  version: string;
  nodes: any[];
  connections: any[];
  triggers: any[];
  settings: Record<string, any>;
  variables: Record<string, any>;
  active: boolean;
  deployedAt?: Date;
  deployedBy?: string;
  deploymentNote?: string;
  status: EnvironmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow environment deployment as stored in database (uses Date objects)
 */
export interface WorkflowEnvironmentDeployment {
  id: string;
  environmentId: string;
  version: string;
  deployedBy: string;
  deployedAt: Date;
  sourceEnvironment?: EnvironmentType;
  deploymentNote?: string;
  snapshot: any;
  status: DeploymentStatus;
  rollbackFrom?: string;
  createdAt: Date;
}

/**
 * Environment summary with Date objects for backend use
 */
export interface EnvironmentSummary {
  environment: EnvironmentType;
  version: string;
  status: EnvironmentStatus;
  active: boolean;
  nodeCount: number;
  lastDeployment?: {
    deployedAt: Date;
    deployedBy: string;
    note?: string;
  };
}

/**
 * Paginated deployment history response
 */
export interface EnvironmentDeploymentHistory {
  deployments: WorkflowEnvironmentDeployment[];
  totalCount: number;
  page: number;
  limit: number;
}
