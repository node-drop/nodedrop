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

  const nodesForEmbedding = nodes.map(node => ({
    id: node.identifier,
    identifier: node.identifier,
    displayName: node.displayName,
    description: node.description,
    group: node.group,
  }));

  const result = await embeddingService.reindexAllNodes(nodesForEmbedding);
  
  logger.info(`Indexing complete! Success: ${result.success}, Failed: ${result.failed}`);
  
  // Verify count
  const count = await embeddingService.getIndexedCount();
  logger.info(`Total indexed nodes in DB: ${count}`);
  
  process.exit(0);
}

main().catch(console.error);
