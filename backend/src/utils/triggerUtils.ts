/**
 * Trigger-related utility functions
 * 
 * This module provides backend-specific trigger utilities that extend
 * the shared utilities from @nodedrop/utils.
 */

import { convertScheduleSettings } from "./scheduleUtils";

// Import shared trigger utilities from @nodedrop/utils
import { normalizeTriggers as sharedNormalizeTriggers } from "@nodedrop/utils";

// Re-export shared trigger utilities from @nodedrop/utils
export {
  isTriggerNodeType,
  isTriggerNode,
  getTriggerType,
  getTriggerNodes,
  filterTriggersByType,
  getActiveTriggers,
  hasTriggerOfType,
  countTriggersByType,
  normalizeTriggers,
  type NodeTypeDefinition,
  type ExtractedTrigger,
  type TriggerExtractionConfig,
} from "@nodedrop/utils";

/**
 * Extract triggers from trigger nodes in the workflow using NodeService.
 * This is a backend-specific implementation that uses the NodeService
 * for node definition lookup instead of a static array.
 * 
 * @param nodes - Array of workflow nodes
 * @param nodeService - NodeService instance for looking up node definitions
 * @returns Array of extracted trigger configurations
 */
export function extractTriggersFromNodes(nodes: any[], nodeService: any): any[] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  if (!nodeService) {
    console.warn("NodeService not available, cannot extract triggers");
    return [];
  }

  return nodes
    .filter((node) => {
      const nodeDef = nodeService.getNodeDefinitionSync(node.type);
      return nodeDef?.triggerType !== undefined;
    })
    .map((node) => {
      const nodeDef = nodeService.getNodeDefinitionSync(node.type);
      const triggerType = nodeDef?.triggerType;
      
      const baseSettings = {
        description: node.parameters?.description || `${triggerType} trigger`,
        ...node.parameters,
      };

      // Convert schedule settings if this is a schedule trigger
      const settings = triggerType === 'schedule'
        ? convertScheduleSettings(baseSettings)
        : baseSettings;
      
      return {
        id: `trigger-${node.id}`,
        type: triggerType,
        nodeId: node.id,
        active: !node.disabled,
        settings,
      };
    });
}

/**
 * Prepare triggers for saving - extract from nodes if needed, convert schedules, and normalize
 */
export function prepareTriggersForSave(
  data: { nodes?: any[]; triggers?: any[] },
  nodeService: any
): any[] | undefined {
  let triggersToSave = data.triggers;

  // Extract triggers from nodes if not provided
  if (data.nodes && (!data.triggers || data.triggers.length === 0)) {
    triggersToSave = extractTriggersFromNodes(data.nodes, nodeService);
  } else if (triggersToSave) {
    // Convert schedule settings for triggers sent from frontend
    triggersToSave = triggersToSave.map((trigger: any) => {
      if (trigger.type === 'schedule' && trigger.settings) {
        return {
          ...trigger,
          settings: convertScheduleSettings(trigger.settings),
        };
      }
      return trigger;
    });
  }

  // Normalize triggers if they exist using shared utility
  if (triggersToSave) {
    return sharedNormalizeTriggers(triggersToSave as any);
  }

  return undefined;
}
