import { NodeEmbeddingService } from '../modules/ai/services/NodeEmbeddingService';
import { NodeService } from '../services/nodes/NodeService';
import { logger } from '../utils/logger';

async function main() {
  logger.info('Starting node embedding re-indexing...');
  
  const nodeService = new NodeService();
  // Wait for built-in nodes to load
  await nodeService.waitForInitialization();
  
  const embeddingService = NodeEmbeddingService.getInstance();
  
  if (!embeddingService.isEnabled()) {
    logger.error('Embedding service is not enabled (missing OpenAI key)');
    process.exit(1);
  }

  const nodes = await nodeService.getNodeTypes();
  logger.info(`Found ${nodes.length} nodes to index`);

  const nodesForEmbedding = [];
  
  for (const node of nodes) {
    // Get full definition to ensure we have AI metadata, keywords, etc.
    // getNodeTypes() returns a stripped down version
    const fullDefinition = nodeService.getNodeDefinitionSync(node.identifier);
    
    if (fullDefinition) {
      nodesForEmbedding.push({
        id: fullDefinition.identifier,
        identifier: fullDefinition.identifier,
        displayName: fullDefinition.displayName,
        description: fullDefinition.description,
        group: fullDefinition.group,
        keywords: fullDefinition.keywords,
        ai: fullDefinition.ai,
        properties: typeof fullDefinition.properties === 'function' ? fullDefinition.properties() : fullDefinition.properties,
      });
    } else {
      logger.warn(`Could not find full definition for ${node.identifier}, using basic info`);
      nodesForEmbedding.push({
        id: node.identifier,
        identifier: node.identifier,
        displayName: node.displayName,
        description: node.description,
        group: node.group,
      });
    }
  }

  const result = await embeddingService.reindexAllNodes(nodesForEmbedding);
  
  logger.info(`Indexing complete! Success: ${result.success}, Failed: ${result.failed}`);
  
  // Verify count
  const count = await embeddingService.getIndexedCount();
  logger.info(`Total indexed nodes in DB: ${count}`);
  
  process.exit(0);
}

main().catch(console.error);
