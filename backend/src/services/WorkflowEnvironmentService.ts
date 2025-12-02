import { PrismaClient } from "@prisma/client";
import {
  CreateEnvironmentInput,
  DeployEnvironmentInput,
  DeploymentStatus,
  EnvironmentComparison,
  EnvironmentDeploymentHistory,
  EnvironmentStatus,
  EnvironmentSummary,
  EnvironmentType,
  PromoteEnvironmentInput,
  RollbackEnvironmentInput,
  UpdateEnvironmentInput,
  WorkflowEnvironment,
} from "../types/environment";
import { AppError } from "../utils/errors";

/**
 * Service for managing workflow environments
 * Handles deployment, promotion, rollback, and comparison of workflows across environments
 */
export class WorkflowEnvironmentService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get all environments for a workflow
   */
  async getWorkflowEnvironments(
    workflowId: string,
    userId: string
  ): Promise<WorkflowEnvironment[]> {
    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    const environments = await this.prisma.workflowEnvironment.findMany({
      where: { workflowId },
      orderBy: { environment: "asc" },
    });

    return environments as any[];
  }

  /**
   * Get a specific environment
   */
  async getEnvironment(
    workflowId: string,
    environment: EnvironmentType,
    userId: string
  ): Promise<WorkflowEnvironment | null> {
    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    const env = await this.prisma.workflowEnvironment.findUnique({
      where: {
        workflowId_environment: {
          workflowId,
          environment,
        },
      },
    });

    return env as any;
  }

  /**
   * Create or initialize an environment from current workflow state
   */
  async createEnvironment(
    userId: string,
    input: CreateEnvironmentInput
  ): Promise<WorkflowEnvironment> {
    const { workflowId, environment, version, deploymentNote } = input;

    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    // Check if environment already exists
    const existing = await this.prisma.workflowEnvironment.findUnique({
      where: {
        workflowId_environment: {
          workflowId,
          environment,
        },
      },
    });

    if (existing) {
      throw new AppError(
        `Environment ${environment} already exists for this workflow`,
        400
      );
    }

    // Get current workflow state
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new AppError("Workflow not found", 404);
    }

    // Create environment with current workflow state
    const newEnvironment = await this.prisma.workflowEnvironment.create({
      data: {
        workflowId,
        environment,
        version: version || "1.0.0",
        nodes: workflow.nodes as any,
        connections: workflow.connections as any,
        triggers: workflow.triggers as any,
        settings: workflow.settings as any,
        variables: {},
        status: EnvironmentStatus.DRAFT,
        active: false,
        deployedAt: new Date(),
        deployedBy: userId,
        deploymentNote,
      },
    });

    // Create deployment record
    await this.createDeploymentRecord(
      newEnvironment.id,
      userId,
      version || "1.0.0",
      undefined,
      deploymentNote,
      newEnvironment
    );

    return newEnvironment as any;
  }

  /**
   * Update an environment with current workflow state
   * This syncs the environment with the latest workflow changes
   */
  async updateEnvironment(
    workflowId: string,
    userId: string,
    input: UpdateEnvironmentInput
  ): Promise<WorkflowEnvironment> {
    const {
      environment,
      version,
      deploymentNote,
      copyVariables = false,
    } = input;

    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    // Get current workflow state
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new AppError("Workflow not found", 404);
    }

    // Get existing environment
    const existingEnv = await this.prisma.workflowEnvironment.findUnique({
      where: {
        workflowId_environment: {
          workflowId,
          environment,
        },
      },
    });

    if (!existingEnv) {
      throw new AppError(`Environment ${environment} not found`, 404);
    }

    // Calculate new version if not provided
    const newVersion = version || this.incrementVersion(existingEnv.version);

    // Update environment with current workflow state
    const updatedEnv = await this.prisma.workflowEnvironment.update({
      where: { id: existingEnv.id },
      data: {
        version: newVersion,
        nodes: workflow.nodes as any,
        connections: workflow.connections as any,
        triggers: workflow.triggers as any,
        settings: workflow.settings as any,
        variables: copyVariables
          ? (((workflow as any).variables || existingEnv.variables) as any)
          : (existingEnv.variables as any),
        deployedAt: new Date(),
        deployedBy: userId,
        deploymentNote:
          deploymentNote || `Updated from workflow (v${newVersion})`,
      },
    });

    // Create deployment record
    await this.createDeploymentRecord(
      updatedEnv.id,
      userId,
      newVersion,
      undefined, // No source environment (updating from workflow)
      deploymentNote || `Updated from workflow (v${newVersion})`,
      updatedEnv
    );

    return updatedEnv as any;
  }

  /**
   * Deploy workflow from one environment to another
   */
  async deployToEnvironment(
    workflowId: string,
    userId: string,
    input: DeployEnvironmentInput
  ): Promise<WorkflowEnvironment> {
    const {
      sourceEnvironment,
      targetEnvironment,
      version,
      deploymentNote,
      copyVariables = true,
      activateAfterDeploy = false,
    } = input;

    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    // Get source environment
    const source = await this.prisma.workflowEnvironment.findUnique({
      where: {
        workflowId_environment: {
          workflowId,
          environment: sourceEnvironment,
        },
      },
    });

    if (!source) {
      throw new AppError(
        `Source environment ${sourceEnvironment} not found`,
        404
      );
    }

    // Calculate new version if not provided
    const newVersion = version || this.incrementVersion(source.version);

    // Check if target environment exists
    const existingTarget = await this.prisma.workflowEnvironment.findUnique({
      where: {
        workflowId_environment: {
          workflowId,
          environment: targetEnvironment,
        },
      },
    });

    let targetEnv: any;

    if (existingTarget) {
      // Update existing environment
      targetEnv = await this.prisma.workflowEnvironment.update({
        where: { id: existingTarget.id },
        data: {
          version: newVersion,
          nodes: source.nodes as any,
          connections: source.connections as any,
          triggers: source.triggers as any,
          settings: source.settings as any,
          variables: copyVariables
            ? (source.variables as any)
            : (existingTarget.variables as any),
          deployedAt: new Date(),
          deployedBy: userId,
          deploymentNote,
          active: activateAfterDeploy,
          status: activateAfterDeploy
            ? EnvironmentStatus.ACTIVE
            : EnvironmentStatus.INACTIVE,
        },
      });
    } else {
      // Create new environment
      targetEnv = await this.prisma.workflowEnvironment.create({
        data: {
          workflowId,
          environment: targetEnvironment,
          version: newVersion,
          nodes: source.nodes as any,
          connections: source.connections as any,
          triggers: source.triggers as any,
          settings: source.settings as any,
          variables: copyVariables ? (source.variables as any) : {},
          deployedAt: new Date(),
          deployedBy: userId,
          deploymentNote,
          active: activateAfterDeploy,
          status: activateAfterDeploy
            ? EnvironmentStatus.ACTIVE
            : EnvironmentStatus.DRAFT,
        },
      });
    }

    // Create deployment record
    await this.createDeploymentRecord(
      targetEnv.id,
      userId,
      newVersion,
      sourceEnvironment,
      deploymentNote,
      targetEnv
    );

    return targetEnv;
  }

  /**
   * Promote environment (dev → staging → production)
   */
  async promoteEnvironment(
    workflowId: string,
    currentEnvironment: EnvironmentType,
    userId: string,
    input: PromoteEnvironmentInput
  ): Promise<WorkflowEnvironment> {
    const promotionMap: Record<EnvironmentType, EnvironmentType | null> = {
      [EnvironmentType.DEVELOPMENT]: EnvironmentType.STAGING,
      [EnvironmentType.STAGING]: EnvironmentType.PRODUCTION,
      [EnvironmentType.PRODUCTION]: null,
    };

    const targetEnvironment = promotionMap[currentEnvironment];

    if (!targetEnvironment) {
      throw new AppError("Cannot promote from production environment", 400);
    }

    return this.deployToEnvironment(workflowId, userId, {
      sourceEnvironment: currentEnvironment,
      targetEnvironment,
      version: input.version,
      deploymentNote: input.deploymentNote,
      copyVariables: true,
      activateAfterDeploy: input.activateAfterDeploy,
    });
  }

  /**
   * Rollback environment to a previous deployment
   */
  async rollbackEnvironment(
    workflowId: string,
    environment: EnvironmentType,
    userId: string,
    input: RollbackEnvironmentInput
  ): Promise<WorkflowEnvironment> {
    const { deploymentId, deploymentNote } = input;

    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    // Get deployment record
    const deployment =
      await this.prisma.workflowEnvironmentDeployment.findUnique({
        where: { id: deploymentId },
        include: { environment: true },
      });

    if (!deployment) {
      throw new AppError("Deployment record not found", 404);
    }

    if (deployment.environment.workflowId !== workflowId) {
      throw new AppError("Deployment does not belong to this workflow", 400);
    }

    if (deployment.environment.environment !== environment) {
      throw new AppError(
        "Deployment does not belong to the specified environment",
        400
      );
    }

    const snapshot = deployment.snapshot as any;

    // Update environment with snapshot data
    const rolledBackEnv = await this.prisma.workflowEnvironment.update({
      where: { id: deployment.environmentId },
      data: {
        version: this.incrementVersion(deployment.environment.version),
        nodes: snapshot.nodes,
        connections: snapshot.connections,
        triggers: snapshot.triggers,
        settings: snapshot.settings,
        variables: snapshot.variables,
        deployedAt: new Date(),
        deployedBy: userId,
        deploymentNote:
          deploymentNote || `Rollback to version ${deployment.version}`,
      },
    });

    // Create rollback deployment record
    await this.prisma.workflowEnvironmentDeployment.create({
      data: {
        environmentId: deployment.environmentId,
        version: rolledBackEnv.version,
        deployedBy: userId,
        deployedAt: new Date(),
        deploymentNote:
          deploymentNote || `Rollback to version ${deployment.version}`,
        snapshot: snapshot,
        status: DeploymentStatus.ROLLBACK,
        rollbackFrom: deploymentId,
      },
    });

    return rolledBackEnv as any;
  }

  /**
   * Compare two environments
   */
  async compareEnvironments(
    workflowId: string,
    sourceEnvironment: EnvironmentType,
    targetEnvironment: EnvironmentType,
    userId: string
  ): Promise<EnvironmentComparison> {
    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    // Get both environments
    const source = await this.getEnvironment(
      workflowId,
      sourceEnvironment,
      userId
    );
    const target = await this.getEnvironment(
      workflowId,
      targetEnvironment,
      userId
    );

    if (!source) {
      throw new AppError(
        `Source environment ${sourceEnvironment} not found`,
        404
      );
    }

    if (!target) {
      throw new AppError(
        `Target environment ${targetEnvironment} not found`,
        404
      );
    }

    // Compare nodes
    const sourceNodes = (source.nodes as any[]) || [];
    const targetNodes = (target.nodes as any[]) || [];
    const sourceNodeIds = new Set(sourceNodes.map((n) => n.id));
    const targetNodeIds = new Set(targetNodes.map((n) => n.id));

    const addedNodes = sourceNodes.filter((n) => !targetNodeIds.has(n.id));
    const removedNodes = targetNodes.filter((n) => !sourceNodeIds.has(n.id));
    const modifiedNodes = sourceNodes.filter((sn) => {
      const tn = targetNodes.find((n) => n.id === sn.id);
      return tn && JSON.stringify(sn) !== JSON.stringify(tn);
    });

    // Compare connections
    const sourceConnections = (source.connections as any[]) || [];
    const targetConnections = (target.connections as any[]) || [];
    const sourceConnectionIds = new Set(sourceConnections.map((c) => c.id));
    const targetConnectionIds = new Set(targetConnections.map((c) => c.id));

    const addedConnections = sourceConnections.filter(
      (c) => !targetConnectionIds.has(c.id)
    );
    const removedConnections = targetConnections.filter(
      (c) => !sourceConnectionIds.has(c.id)
    );

    // Compare triggers
    const sourceTriggers = (source.triggers as any[]) || [];
    const targetTriggers = (target.triggers as any[]) || [];
    const sourceTriggerIds = new Set(sourceTriggers.map((t) => t.id));
    const targetTriggerIds = new Set(targetTriggers.map((t) => t.id));

    const addedTriggers = sourceTriggers.filter(
      (t) => !targetTriggerIds.has(t.id)
    );
    const removedTriggers = targetTriggers.filter(
      (t) => !sourceTriggerIds.has(t.id)
    );
    const modifiedTriggers = sourceTriggers.filter((st) => {
      const tt = targetTriggers.find((t) => t.id === st.id);
      return tt && JSON.stringify(st) !== JSON.stringify(tt);
    });

    // Compare settings
    const sourceSettings = (source.settings as Record<string, any>) || {};
    const targetSettings = (target.settings as Record<string, any>) || {};
    const changedSettings: Array<{
      key: string;
      sourceValue: any;
      targetValue: any;
    }> = [];

    const allSettingKeys = new Set([
      ...Object.keys(sourceSettings),
      ...Object.keys(targetSettings),
    ]);

    allSettingKeys.forEach((key) => {
      if (
        JSON.stringify(sourceSettings[key]) !==
        JSON.stringify(targetSettings[key])
      ) {
        changedSettings.push({
          key,
          sourceValue: sourceSettings[key],
          targetValue: targetSettings[key],
        });
      }
    });

    // Compare variables
    const sourceVariables = (source.variables as Record<string, any>) || {};
    const targetVariables = (target.variables as Record<string, any>) || {};
    const sourceVarKeys = new Set(Object.keys(sourceVariables));
    const targetVarKeys = new Set(Object.keys(targetVariables));

    const addedVariables = Array.from(sourceVarKeys).filter(
      (k) => !targetVarKeys.has(k)
    );
    const removedVariables = Array.from(targetVarKeys).filter(
      (k) => !sourceVarKeys.has(k)
    );
    const modifiedVariables = Array.from(sourceVarKeys).filter(
      (k) =>
        targetVarKeys.has(k) &&
        JSON.stringify(sourceVariables[k]) !==
          JSON.stringify(targetVariables[k])
    );

    return {
      workflowId,
      sourceEnvironment,
      targetEnvironment,
      differences: {
        nodes: {
          added: addedNodes,
          removed: removedNodes,
          modified: modifiedNodes,
        },
        connections: {
          added: addedConnections,
          removed: removedConnections,
        },
        triggers: {
          added: addedTriggers,
          removed: removedTriggers,
          modified: modifiedTriggers,
        },
        settings: {
          changed: changedSettings,
        },
        variables: {
          added: addedVariables,
          removed: removedVariables,
          modified: modifiedVariables,
        },
      },
      sourceVersion: source.version,
      targetVersion: target.version,
    };
  }

  /**
   * Get environment summary for all environments
   */
  async getEnvironmentSummaries(
    workflowId: string,
    userId: string
  ): Promise<EnvironmentSummary[]> {
    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    const environments = await this.prisma.workflowEnvironment.findMany({
      where: { workflowId },
      include: {
        deployments: {
          orderBy: { deployedAt: "desc" },
          take: 1,
        },
      },
    });

    return environments.map((env) => {
      const nodes = (env.nodes as any[]) || [];
      const lastDeployment = env.deployments[0];

      return {
        environment: env.environment as EnvironmentType,
        version: env.version,
        status: env.status as EnvironmentStatus,
        active: env.active,
        nodeCount: nodes.length,
        lastDeployment: lastDeployment
          ? {
              deployedAt: lastDeployment.deployedAt,
              deployedBy: lastDeployment.deployedBy,
              note: lastDeployment.deploymentNote || undefined,
            }
          : undefined,
      };
    });
  }

  /**
   * Get deployment history for an environment
   */
  async getDeploymentHistory(
    workflowId: string,
    environment: EnvironmentType,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<EnvironmentDeploymentHistory> {
    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    // Get environment
    const env = await this.prisma.workflowEnvironment.findUnique({
      where: {
        workflowId_environment: {
          workflowId,
          environment,
        },
      },
    });

    if (!env) {
      throw new AppError(`Environment ${environment} not found`, 404);
    }

    const skip = (page - 1) * limit;

    const [deployments, totalCount] = await Promise.all([
      this.prisma.workflowEnvironmentDeployment.findMany({
        where: { environmentId: env.id },
        orderBy: { deployedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.workflowEnvironmentDeployment.count({
        where: { environmentId: env.id },
      }),
    ]);

    return {
      deployments: deployments as any[],
      totalCount,
      page,
      limit,
    };
  }

  /**
   * Activate an environment
   */
  async activateEnvironment(
    workflowId: string,
    environment: EnvironmentType,
    userId: string
  ): Promise<WorkflowEnvironment> {
    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    const env = await this.prisma.workflowEnvironment.update({
      where: {
        workflowId_environment: {
          workflowId,
          environment,
        },
      },
      data: {
        active: true,
        status: EnvironmentStatus.ACTIVE,
      },
    });

    return env as any;
  }

  /**
   * Deactivate an environment
   */
  async deactivateEnvironment(
    workflowId: string,
    environment: EnvironmentType,
    userId: string
  ): Promise<WorkflowEnvironment> {
    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    const env = await this.prisma.workflowEnvironment.update({
      where: {
        workflowId_environment: {
          workflowId,
          environment,
        },
      },
      data: {
        active: false,
        status: EnvironmentStatus.INACTIVE,
      },
    });

    return env as any;
  }

  /**
   * Delete an environment
   */
  async deleteEnvironment(
    workflowId: string,
    environment: EnvironmentType,
    userId: string
  ): Promise<void> {
    // Verify workflow ownership
    await this.verifyWorkflowOwnership(workflowId, userId);

    // Don't allow deleting production environment if it's active
    const env = await this.prisma.workflowEnvironment.findUnique({
      where: {
        workflowId_environment: {
          workflowId,
          environment,
        },
      },
    });

    if (!env) {
      throw new AppError(`Environment ${environment} not found`, 404);
    }

    if (environment === EnvironmentType.PRODUCTION && env.active) {
      throw new AppError(
        "Cannot delete active production environment. Deactivate it first.",
        400
      );
    }

    await this.prisma.workflowEnvironment.delete({
      where: {
        workflowId_environment: {
          workflowId,
          environment,
        },
      },
    });
  }

  // Helper methods

  private async verifyWorkflowOwnership(
    workflowId: string,
    userId: string
  ): Promise<void> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      select: { userId: true },
    });

    if (!workflow) {
      throw new AppError("Workflow not found", 404);
    }

    if (workflow.userId !== userId) {
      throw new AppError(
        "You don't have permission to access this workflow",
        403
      );
    }
  }

  private async createDeploymentRecord(
    environmentId: string,
    deployedBy: string,
    version: string,
    sourceEnvironment: EnvironmentType | undefined,
    deploymentNote: string | undefined,
    snapshot: any
  ): Promise<void> {
    await this.prisma.workflowEnvironmentDeployment.create({
      data: {
        environmentId,
        version,
        deployedBy,
        deployedAt: new Date(),
        sourceEnvironment,
        deploymentNote,
        snapshot: {
          nodes: snapshot.nodes,
          connections: snapshot.connections,
          triggers: snapshot.triggers,
          settings: snapshot.settings,
          variables: snapshot.variables,
        },
        status: DeploymentStatus.SUCCESS,
      },
    });
  }

  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split(".");
    const patch = parseInt(parts[2] || "0", 10) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }
}
