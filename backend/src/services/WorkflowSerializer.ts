import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { Workflow, Node, Connection, Trigger, WorkflowSettings } from '../types/database';

/**
 * Serialized workflow structure for Git storage
 * Minimal format - only version and workflow content
 */
export interface SerializedWorkflow {
  version: string;
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
    metadata?: any; // Optional, for backwards compatibility
  };
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
  metadata?: any; // Frontend compatibility
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
   * Minimal format to prevent false change detections
   * 
   * NOTE: Only stores version and workflow content. Git tracks timestamps and history.
   */
  async serializeWorkflow(workflow: WorkflowData): Promise<SerializedWorkflow> {
    try {
      const workflowId = workflow.id || workflow.metadata?.workflowId || 'unknown';
      logger.debug(`Serializing workflow: ${workflowId}`);
      
      // Extract name from various possible locations
      const workflowName = workflow.name || workflow.metadata?.title || 'Untitled Workflow';
      
      const serialized: SerializedWorkflow = {
        version: this.CURRENT_VERSION,
        workflow: {
          title: workflowName,
          name: workflowName,
          description: workflow.description || null,
          category: workflow.category || null,
          tags: workflow.tags || [],
          nodes: this.sanitizeNodes(workflow.nodes || []),
          connections: this.sanitizeConnections(workflow.connections || []),
          triggers: this.sanitizeTriggers(workflow.triggers || []),
          settings: this.sanitizeSettings(workflow.settings || {}),
        },
      };

      logger.debug(`Workflow serialized successfully: ${workflowId}`);
      return serialized;
    } catch (error) {
      logger.error('Failed to serialize workflow:', {
        workflowId: workflow?.id || 'unknown',
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
   * 
   * NOTE: Metadata comes from database, not Git. Git only stores workflow content.
   */
  async deserializeWorkflow(data: SerializedWorkflow): Promise<Partial<WorkflowData>> {
    try {
      // Try to get workflowId from metadata if it exists (backwards compatibility)
      const workflowId = data.workflow.metadata?.workflowId || '';
      logger.debug(`Deserializing workflow: ${workflowId || 'unknown'}`);

      // Validate version compatibility
      this.validateVersion(data.version);

      const deserialized: Partial<WorkflowData> = {
        id: workflowId,
        name: data.workflow.name,
        description: data.workflow.description,
        category: data.workflow.category,
        tags: data.workflow.tags || [],
        nodes: data.workflow.nodes || [],
        connections: data.workflow.connections || [],
        triggers: data.workflow.triggers || [],
        settings: data.workflow.settings || {},
        // Minimal metadata for frontend compatibility
        // Full metadata (userId, workspaceId, etc.) comes from database
        metadata: {
          title: data.workflow.title || data.workflow.name,
          workflowId: workflowId,
          version: data.version,
        },
      };

      logger.debug(`Workflow deserialized successfully: ${workflowId || 'unknown'}`);
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
   * @param environment - Optional environment for environment-specific files (development, staging, production)
   * @returns Promise<WorkflowFiles>
   * 
   * Requirement 2.2: Generate workflow file structure for Git commits
   * Simplified to single workflow.json file + optional README
   */
  async workflowToFiles(workflow: WorkflowData, environment?: 'development' | 'staging' | 'production'): Promise<WorkflowFiles> {
    try {
      logger.debug(`Converting workflow to files: ${workflow.id}${environment ? ` (environment: ${environment})` : ''}`);

      const serialized = await this.serializeWorkflow(workflow);

      // Determine filename based on environment
      const workflowFileName = environment ? `workflow-${environment}.json` : 'workflow.json';

      const files: WorkflowFiles = {
        [workflowFileName]: JSON.stringify(serialized, null, 2),
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
   * @param environment - Optional environment to read environment-specific file from
   * @returns Promise<WorkflowData>
   * 
   * Requirement 8.3: Reconstruct workflow from Git files
   * Simplified to read from single workflow.json file
   */
  async filesToWorkflow(files: WorkflowFiles, environment?: 'development' | 'staging' | 'production'): Promise<Partial<WorkflowData>> {
    try {
      logger.debug('Converting files to workflow');

      // Determine which file to read based on environment
      const workflowFileName = environment ? `workflow-${environment}.json` : 'workflow.json';
      
      // Parse workflow file (try environment-specific, fall back to base)
      let serialized: SerializedWorkflow;
      
      if (environment && files[workflowFileName]) {
        // Use environment-specific file if it exists
        serialized = JSON.parse(files[workflowFileName]) as SerializedWorkflow;
        logger.debug(`Using environment-specific file: ${workflowFileName}`);
      } else if (files['workflow.json']) {
        // Fall back to base workflow.json
        serialized = JSON.parse(files['workflow.json']) as SerializedWorkflow;
        logger.debug(`Using base workflow.json file`);
      } else {
        // Try to find any workflow file
        const foundKey = Object.keys(files).find(key => key.startsWith('workflow-') && key.endsWith('.json')) || 'workflow.json';
        serialized = JSON.parse(files[foundKey]) as SerializedWorkflow;
        logger.debug(`Using found workflow file: ${foundKey}`);
      }

      // Deserialize using standard method
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

