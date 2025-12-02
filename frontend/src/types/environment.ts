/**
 * Workflow Environment Types (Frontend)
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
  deployedAt?: string;
  deployedBy?: string;
  deploymentNote?: string;
  status: EnvironmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowEnvironmentDeployment {
  id: string;
  environmentId: string;
  version: string;
  deployedBy: string;
  deployedAt: string;
  sourceEnvironment?: EnvironmentType;
  deploymentNote?: string;
  snapshot: any;
  status: DeploymentStatus;
  rollbackFrom?: string;
  createdAt: string;
}

export interface EnvironmentSummary {
  environment: EnvironmentType;
  version: string;
  status: EnvironmentStatus;
  active: boolean;
  nodeCount: number;
  lastDeployment?: {
    deployedAt: string;
    deployedBy: string;
    note?: string;
  };
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

export interface CreateEnvironmentInput {
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
