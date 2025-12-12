/**
 * Environment Types - Re-exported from @nodedrop/types
 * 
 * This file re-exports shared environment types from the types package.
 * Helper functions for UI display are defined below.
 */

// Re-export all environment types from shared package
export type {
  WorkflowEnvironment,
  WorkflowEnvironmentDeployment,
  EnvironmentSummary,
  EnvironmentComparison,
  CreateEnvironmentInput,
  DeployEnvironmentInput,
  UpdateEnvironmentInput,
  PromoteEnvironmentInput,
  RollbackEnvironmentInput,
} from "@nodedrop/types";

// Re-export enums
export { EnvironmentType, EnvironmentStatus, DeploymentStatus } from "@nodedrop/types";

// Re-export schemas for validation
export {
  WorkflowEnvironmentSchema,
  WorkflowEnvironmentDeploymentSchema,
  EnvironmentSummarySchema,
  EnvironmentComparisonSchema,
  CreateEnvironmentInputSchema,
  DeployEnvironmentInputSchema,
  UpdateEnvironmentInputSchema,
  PromoteEnvironmentInputSchema,
  RollbackEnvironmentInputSchema,
} from "@nodedrop/types";

// Import enums for use in helper functions
import { EnvironmentType, EnvironmentStatus } from "@nodedrop/types";

// Helper functions
export const getEnvironmentColor = (environment: EnvironmentType): string => {
  switch (environment) {
    case EnvironmentType.DEVELOPMENT:
      return "blue";
    case EnvironmentType.STAGING:
      return "yellow";
    case EnvironmentType.PRODUCTION:
      return "green";
    default:
      return "gray";
  }
};

export const getEnvironmentLabel = (environment: EnvironmentType): string => {
  switch (environment) {
    case EnvironmentType.DEVELOPMENT:
      return "Development";
    case EnvironmentType.STAGING:
      return "Staging";
    case EnvironmentType.PRODUCTION:
      return "Production";
    default:
      return environment;
  }
};

export const getEnvironmentIcon = (environment: EnvironmentType): string => {
  switch (environment) {
    case EnvironmentType.DEVELOPMENT:
      return "wrench";
    case EnvironmentType.STAGING:
      return "flask-conical";
    case EnvironmentType.PRODUCTION:
      return "rocket";
    default:
      return "package";
  }
};

export const getStatusColor = (status: EnvironmentStatus): string => {
  switch (status) {
    case EnvironmentStatus.ACTIVE:
      return "green";
    case EnvironmentStatus.INACTIVE:
      return "gray";
    case EnvironmentStatus.DRAFT:
      return "blue";
    case EnvironmentStatus.ARCHIVED:
      return "red";
    default:
      return "gray";
  }
};
