import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { Workflow, Node, Connection, Trigger, WorkflowSettings } from '../types/database';

/**
 * Serialized workflow structure for Git storage
 * Uses the same format as import/export for consistency
 */
export interface SerializedWorkflow {
  version: string;
  exportedAt: string;
  exportedBy: string;
  workflow: {
    title: string;
    name: string;
    description?: string | null;
    category?: string | null;
    tags: string[];
    nodes: any[];
    connections: any[];
    triggers: any[];
    settings: any;
    metadata?: any;
  };
  checksum: string;
}

/**
 * Workflow files structure for Git repository
 * Simplified to single file + optional README
 */
export interface WorkflowFiles {
  'workflow.json': string;
  'README.md'?: string;
}

/**
 * Workflow data structure (matches database structure)
 */
export interface WorkflowData {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags: string[];
  userId: string;
  workspaceId?: string | null;
  teamId?: string | null;
  nodes: any[];
  connections: any[];
  triggers: any[];
  settings: any;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WorkflowSerializer
 * 
 * Handles serialization and deserialization of workflow data for Git storage.
 * Converts workflow data to/from JSON format and generates Git-friendly file structures.
 * 
 * Requirements: 2.1, 2.2, 8.3
 */
export class WorkflowSerializer {
  private readonly CURRENT_VERSION = '1.0.0';

  /**
   * Serialize workflow data to a structured format
   * @param workflow - Workflow data to serialize
   * @returns Promise<SerializedWorkflow>
   * 
   * Requirement 2.1: Serialize workflow configuration for Git storage
   * Uses single-file format consistent with import/export
   */
  async serializeWorkflow(workflow: WorkflowData): Promise<SerializedWorkflow> {
    try {
      logger.debug(`Serializing workflow: ${workflow.id}`);

      const now = new Date().toISOString();
      const serialized: SerializedWorkflow = {
        version: this.CURRENT_VERSION,
        exportedAt: now,
        exportedBy: 'git-service',
        workflow: {
          title: workflow.name,
          name: workflow.name,
          description: workflow.description,
          category: workflow.category,
          tags: workflow.tags || [],
          nodes: this.sanitizeNodes(workflow.nodes),
          connections: this.sanitizeConnections(workflow.connections),
          triggers: this.sanitizeTriggers(workflow.triggers),
          settings: this.sanitizeSettings(workflow.settings),
          metadata: {
            workflowId: workflow.id,
            userId: workflow.userId,
            workspaceId: workflow.workspaceId,
            teamId: workflow.teamId,
            active: workflow.active,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
          },
        },
        checksum: this.generateChecksum(workflow),
      };

      logger.debug(`Workflow serialized successfully: ${workflow.id}`);
      return serialized;
    } catch (error) {
      logger.error('Failed to serialize workflow:', {
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AppError('Failed to serialize workflow', 500);
    }
  }

  /**
   * Deserialize workflow data from structured format
   * @param data - Serialized workflow data
   * @returns Promise<WorkflowData>
   * 
   * Requirement 8.3: Deserialize workflow configuration from Git storage
   */
  async deserializeWorkflow(data: SerializedWorkflow): Promise<Partial<WorkflowData>> {
    try {
      const workflowId = data.workflow.metadata?.workflowId || '';
      logger.debug(`Deserializing workflow: ${workflowId}`);

      // Validate version compatibility
      this.validateVersion(data.version);

      const deserialized: Partial<WorkflowData> = {
        id: data.workflow.metadata?.workflowId,
        name: data.workflow.name,
        description: data.workflow.description,
        category: data.workflow.category,
        tags: data.workflow.tags || [],
        nodes: data.workflow.nodes || [],
        connections: data.workflow.connections || [],
        triggers: data.workflow.triggers || [],
        settings: data.workflow.settings || {},
        userId: data.workflow.metadata?.userId,
        workspaceId: data.workflow.metadata?.workspaceId,
        teamId: data.workflow.metadata?.teamId,
        active: data.workflow.metadata?.active,
      };

      logger.debug(`Workflow deserialized successfully: ${workflowId}`);
      return deserialized;
    } catch (error) {
      logger.error('Failed to deserialize workflow:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AppError('Failed to deserialize workflow', 500);
    }
  }

  /**
   * Convert workflow data to files for Git storage
   * @param workflow - Workflow data to convert
   * @returns Promise<WorkflowFiles>
   * 
   * Requirement 2.2: Generate workflow file structure for Git commits
   * Simplified to single workflow.json file + optional README
   */
  async workflowToFiles(workflow: WorkflowData): Promise<WorkflowFiles> {
    try {
      logger.debug(`Converting workflow to files: ${workflow.id}`);

      const serialized = await this.serializeWorkflow(workflow);

      const files: WorkflowFiles = {
        'workflow.json': JSON.stringify(serialized, null, 2),
        'README.md': this.generateReadme(workflow),
      };

      logger.debug(`Workflow converted to files successfully: ${workflow.id}`);
      return files;
    } catch (error) {
      logger.error('Failed to convert workflow to files:', {
        workflowId: workflow.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AppError('Failed to convert workflow to files', 500);
    }
  }

  /**
   * Convert files back to workflow data
   * @param files - Workflow files from Git
   * @returns Promise<WorkflowData>
   * 
   * Requirement 8.3: Reconstruct workflow from Git files
   * Simplified to read from single workflow.json file
   */
  async filesToWorkflow(files: WorkflowFiles): Promise<Partial<WorkflowData>> {
    try {
      logger.debug('Converting files to workflow');

      // Parse the single workflow.json file
      const serialized = JSON.parse(files['workflow.json']) as SerializedWorkflow;

      // Deserialize using the standard method
      const workflow = await this.deserializeWorkflow(serialized);

      logger.debug(`Files converted to workflow successfully: ${workflow.id}`);
      return workflow;
    } catch (error) {
      logger.error('Failed to convert files to workflow:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AppError('Failed to convert files to workflow', 500);
    }
  }

  /**
   * Sanitize nodes data for serialization
   * Removes any sensitive or runtime-only data
   */
  private sanitizeNodes(nodes: any[]): any[] {
    if (!Array.isArray(nodes)) {
      return [];
    }

    return nodes.map((node) => ({
      id: node.id,
      type: node.type,
      name: node.name,
      parameters: node.parameters || {},
      position: node.position || { x: 0, y: 0 },
      credentials: node.credentials || [],
      disabled: node.disabled || false,
      // Include group node properties if present
      ...(node.parentId && { parentId: node.parentId }),
      ...(node.extent && { extent: node.extent }),
      ...(node.style && { style: node.style }),
    }));
  }

  /**
   * Sanitize connections data for serialization
   */
  private sanitizeConnections(connections: any[]): any[] {
    if (!Array.isArray(connections)) {
      return [];
    }

    return connections.map((conn) => ({
      id: conn.id,
      sourceNodeId: conn.sourceNodeId,
      sourceOutput: conn.sourceOutput,
      targetNodeId: conn.targetNodeId,
      targetInput: conn.targetInput,
    }));
  }

  /**
   * Sanitize triggers data for serialization
   */
  private sanitizeTriggers(triggers: any[]): any[] {
    if (!Array.isArray(triggers)) {
      return [];
    }

    return triggers.map((trigger) => ({
      id: trigger.id,
      type: trigger.type,
      settings: trigger.settings || {},
      active: trigger.active || false,
    }));
  }

  /**
   * Sanitize settings data for serialization
   */
  private sanitizeSettings(settings: any): any {
    if (!settings || typeof settings !== 'object') {
      return {};
    }

    return {
      timezone: settings.timezone,
      saveExecutionProgress: settings.saveExecutionProgress,
      saveDataErrorExecution: settings.saveDataErrorExecution,
      saveDataSuccessExecution: settings.saveDataSuccessExecution,
      callerPolicy: settings.callerPolicy,
      executionTimeout: settings.executionTimeout,
      errorWorkflowId: settings.errorWorkflowId,
    };
  }

  /**
   * Validate version compatibility
   * @param version - Version string to validate
   */
  private validateVersion(version: string): void {
    if (!version) {
      throw new AppError('Workflow version is missing', 400);
    }

    // Parse version numbers
    const [major] = version.split('.').map(Number);
    const [currentMajor] = this.CURRENT_VERSION.split('.').map(Number);

    // Check major version compatibility
    if (major > currentMajor) {
      throw new AppError(
        `Workflow version ${version} is not compatible with current version ${this.CURRENT_VERSION}`,
        400
      );
    }

    // Log warning for older versions
    if (major < currentMajor) {
      logger.warn(
        `Workflow version ${version} is older than current version ${this.CURRENT_VERSION}. Some features may not be available.`
      );
    }
  }

  /**
   * Generate README.md content for the workflow
   * @param workflow - Workflow data
   * @returns README content as string
   */
  private generateReadme(workflow: WorkflowData): string {
    const nodeCount = workflow.nodes?.length || 0;
    const connectionCount = workflow.connections?.length || 0;
    const triggerCount = workflow.triggers?.length || 0;

    return `# ${workflow.name}

${workflow.description || 'No description provided.'}

## Workflow Information

- **ID**: ${workflow.id}
- **Category**: ${workflow.category || 'Uncategorized'}
- **Tags**: ${workflow.tags?.length ? workflow.tags.join(', ') : 'None'}
- **Active**: ${workflow.active ? 'Yes' : 'No'}

## Structure

- **Nodes**: ${nodeCount}
- **Connections**: ${connectionCount}
- **Triggers**: ${triggerCount}

## Files

- \`workflow.json\` - Complete workflow definition (nodes, connections, triggers, settings, and metadata)

## Version

This workflow was exported using version ${this.CURRENT_VERSION} of the serialization format.

## Import/Export Compatibility

This workflow uses the same format as the import/export feature, making it easy to:
- Import workflows directly from Git repositories
- Export workflows and commit them to Git
- Share workflows across teams using Git

---

*Last updated: ${new Date().toISOString()}*
`;
  }

  /**
   * Generate a simple checksum for workflow data
   * @param workflow - Workflow data
   * @returns Checksum string
   */
  private generateChecksum(workflow: WorkflowData): string {
    const content = JSON.stringify({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      triggers: workflow.triggers,
      settings: workflow.settings,
    });

    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Get the current serialization version
   * @returns Current version string
   */
  getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  /**
   * Check if a version is compatible with the current serializer
   * @param version - Version string to check
   * @returns boolean indicating compatibility
   */
  isVersionCompatible(version: string): boolean {
    try {
      this.validateVersion(version);
      return true;
    } catch {
      return false;
    }
  }
}

