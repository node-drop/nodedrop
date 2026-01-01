/**
 * Startup Module
 * 
 * Handles all initialization tasks that run when the server starts:
 * - Loading nodes into memory
 * - Registering new nodes to database
 * - Generating embeddings for nodes (background)
 */

import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { nodeTypes } from "../db/schema/nodes";
import { NodeEmbeddingService } from "../modules/ai/services/NodeEmbeddingService";
import { NodeLoader, NodeService } from "../services";
import { nodeDiscovery } from "../utils/NodeDiscovery";
import { logger } from "../utils/logger";

/**
 * Initialize node systems - loads nodes, registers to DB, generates embeddings
 */
export async function initializeNodeSystems(
  nodeService: NodeService,
  nodeLoader: NodeLoader
): Promise<void> {
  try {
    // Step 1: Load built-in nodes into memory (for execution)
    await nodeService.loadBuiltInNodes();

    // Step 2: Load custom nodes
    await nodeLoader.initialize();

    const totalNodes = await nodeService.getNodeTypes();
    logger.info(`✅ Loaded ${totalNodes.length} nodes into memory`);

    // Step 3: Register new nodes to database (skip existing)
    logger.info(`📝 Checking for new nodes to register...`);
    await registerNewNodes(nodeService);

    // Step 4: Generate embeddings in background (non-blocking)
    generateMissingEmbeddings(nodeService);
  } catch (error) {
    logger.error("❌ Failed to initialize node systems", { error });
    // Don't throw - allow the application to start
  }
}

/**
 * Register nodes that don't exist in database yet
 * Uses batch query for efficiency
 */
async function registerNewNodes(nodeService: NodeService): Promise<void> {
  const nodeDefinitions = await nodeDiscovery.getAllNodeDefinitions();
  
  if (nodeDefinitions.length === 0) return;

  // Get all existing node names in ONE query
  const nodeNames = nodeDefinitions.map(n => n.name);
  const existingNodes = await db
    .select({ name: nodeTypes.name })
    .from(nodeTypes)
    .where(inArray(nodeTypes.name, nodeNames));
  
  const existingNames = new Set(existingNodes.map(n => n.name));
  
  // Filter to only new nodes
  const newNodes = nodeDefinitions.filter(n => !existingNames.has(n.name));
  
  if (newNodes.length === 0) {
    logger.info(`✅ All ${nodeDefinitions.length} nodes already in database`);
    return;
  }

  logger.info(`📝 Registering ${newNodes.length} new nodes...`);
  
  let registered = 0;
  for (const node of newNodes) {
    const result = await nodeService.registerNode(node);
    if (result.success) registered++;
  }

  logger.info(`✅ Registered ${registered} new nodes to database`);
}

/**
 * Generate embeddings for nodes that don't have them
 * Runs in background - doesn't block server startup
 */
function generateMissingEmbeddings(nodeService: NodeService): void {
  // Fire and forget - run entirely in background
  (async () => {
    try {
      const nodesNeedingEmbeddings = await db
        .select()
        .from(nodeTypes)
        .where(sql`${nodeTypes.active} = true AND ${nodeTypes.embedding} IS NULL`);

      if (nodesNeedingEmbeddings.length === 0) {
        return;
      }

      logger.info(`🧠 Generating embeddings for ${nodesNeedingEmbeddings.length} nodes (background)...`);

      const embeddingService = NodeEmbeddingService.getInstance();
      let indexed = 0;

      for (const node of nodesNeedingEmbeddings) {
        try {
          const fullDefinition = nodeService.getNodeDefinitionSync(node.name);

          const nodeData = fullDefinition
            ? {
                id: fullDefinition.name,
                name: fullDefinition.name,
                displayName: fullDefinition.displayName,
                description: fullDefinition.description,
                group: fullDefinition.group,
                keywords: fullDefinition.keywords,
                ai: fullDefinition.ai,
                properties:
                  typeof fullDefinition.properties === "function"
                    ? fullDefinition.properties()
                    : fullDefinition.properties,
              }
            : {
                id: node.name,
                name: node.name,
                displayName: node.displayName,
                description: node.description,
                group: node.group || [],
              };

          const success = await embeddingService.indexNode(nodeData);
          if (success) indexed++;
        } catch (err) {
          logger.warn(`Failed to index ${node.name}`, { error: err });
        }
      }

      logger.info(`✅ Generated ${indexed} embeddings`);
    } catch (error) {
      logger.error("Failed to generate embeddings", { error });
    }
  })();
}
