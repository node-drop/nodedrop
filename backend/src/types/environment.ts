/**
 * Workflow Environment Types
 *
 * Types for managing workflows across different environments
 * (development, staging, production)
 */

export enum EnvironmentType {
  DEVELOPMENT = "DEVELOPMENT",
  STAGING = "STAGING",
  PRODUCTION = "PRODUCTION",
}

export enum EnvironmentStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum DeploymentStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  ROLLBACK = "ROLLBACK",
}

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

export interface CreateEnvironmentInput {
  workflowId: string;
  environment: EnvironmentType;
  version?: string;
  deploymentNote?: string;
}

export interface DeployEnvironmentInput {
  sourceEnvironment: EnvironmentType;
  targetEnvironment: EnvironmentType;
  version?: string;
  deploymentNote?: string;
  copyVariables?: boolean;
  activateAfterDeploy?: boolean;
}

export interface UpdateEnvironmentInput {
  environment: EnvironmentType;
  version?: string;
  deploymentNote?: string;
  copyVariables?: boolean;
}

export interface PromoteEnvironmentInput {
  version?: string;
  deploymentNote?: string;
  activateAfterDeploy?: boolean;
}

export interface RollbackEnvironmentInput {
  deploymentId: string;
  deploymentNote?: string;
}

export interface EnvironmentComparison {
  workflowId: string;
  sourceEnvironment: EnvironmentType;
  targetEnvironment: EnvironmentType;
  differences: {
    nodes: {
      added: any[];
      removed: any[];
      modified: any[];
    };
    connections: {
      added: any[];
      removed: any[];
    };
    triggers: {
      added: any[];
      removed: any[];
      modified: any[];
    };
    settings: {
      changed: Array<{
        key: string;
        sourceValue: any;
        targetValue: any;
      }>;
    };
    variables: {
      added: string[];
      removed: string[];
      modified: string[];
    };
  };
  sourceVersion: string;
  targetVersion: string;
}

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

export interface EnvironmentDeploymentHistory {
  deployments: WorkflowEnvironmentDeployment[];
  totalCount: number;
  page: number;
  limit: number;
}
