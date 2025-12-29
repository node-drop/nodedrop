/**
 * Node Embedding Service
 * 
 * Provides semantic search capabilities for node selection using local embeddings
 * (gte-small via Transformers.js) and PostgreSQL pgvector for storage and similarity search.
 * 
 * Benefits of gte-small:
 * - Free (no API costs)
 * - Fast (local inference)
 * - 384 dimensions (smaller storage, faster search)
 * - Good quality for short keyword-rich texts
 */

import { db } from '@/db/client';
import { nodeTypes } from '@/db/schema/nodes';
import { NodeAIMetadata, NodeProperty } from '@/types/node.types';
import { logger } from '@/utils/logger';
import { eq, sql } from 'drizzle-orm';

// Transformers.js - using any for dynamic import
let embeddingPipeline: any = null;

interface NodeForEmbedding {
  id: string;
  identifier: string;
  displayName: string;
  description: string;
  group?: string[];
  keywords?: string[];
  ai?: NodeAIMetadata;
  properties?: NodeProperty[];
}

export class NodeEmbeddingService {
  private static instance: NodeEmbeddingService;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  
  // gte-small produces 384-dimensional embeddings
  public readonly EMBEDDING_DIMENSIONS = 384;
  private readonly MODEL_NAME = 'Supabase/gte-small';

  private constructor() {
    // Initialization is lazy - happens on first use
  }

  static getInstance(): NodeEmbeddingService {
    if (!NodeEmbeddingService.instance) {
      NodeEmbeddingService.instance = new NodeEmbeddingService();
    }
    return NodeEmbeddingService.instance;
  }

  /**
   * Initialize the embedding pipeline (lazy loading)
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      try {
        logger.info('Initializing gte-small embedding model...');
        
        // Dynamic import of transformers.js
        // @ts-ignore - transformers.js doesn't have official types
        const { pipeline } = await import('@xenova/transformers');
        
        // Load the embedding pipeline
        embeddingPipeline = await pipeline('feature-extraction', this.MODEL_NAME, {
          quantized: true, // Use quantized model for faster inference
        });
        
        this.initialized = true;
        logger.info('gte-small embedding model initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize embedding model', { error });
        throw error;
      }
    })();

    await this.initPromise;
  }

  /**
   * Generate embedding text from node data
   * Combines name, description, and group into a searchable string
   */
  private buildEmbeddingText(node: NodeForEmbedding): string {
    const parts = [
      node.displayName,
    ];

    // Priority 1: Use AI-specific description if available, otherwise standard description
    if (node.ai?.description) {
      parts.push(node.ai.description);
    } else {
      parts.push(node.description);
    }
    
    // Priority 2: Use Cases and Tags from AI metadata
    if (node.ai?.useCases && node.ai.useCases.length > 0) {
      parts.push(`Best used for: ${node.ai.useCases.join(', ')}`);
    }

    if (node.ai?.tags && node.ai.tags.length > 0) {
      parts.push(`Tags: ${node.ai.tags.join(', ')}`);
    }

    // Note: ai.rules are NOT included in embeddings - they're operational guidance,
    // not search keywords. They're used in the system prompt instead.

    // Priority 3: Keywords (legacy/manual)
    if (node.keywords && node.keywords.length > 0) {
      parts.push(`Keywords: ${node.keywords.join(', ')}`);
    }

    if (node.group && node.group.length > 0) {
      parts.push(`Category: ${node.group.join(', ')}`);
    }

    // Include top-level property names (parameters) to help AI configure the node
    if (node.properties && node.properties.length > 0) {
      const propNames = node.properties
        .filter(p => p.displayName)
        .map(p => p.displayName)
        .join(', ');
      
      if (propNames) {
        parts.push(`Available Options: ${propNames}`);
      }
    }
    
    return parts.join('. ');
  }

  /**
   * Generate embedding vector for text using gte-small
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      await this.initialize();
      
      if (!embeddingPipeline) {
        logger.warn('Embedding pipeline not available');
        return null;
      }

      // Generate embedding using gte-small
      const output = await embeddingPipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert to regular array
      const embedding = Array.from(output.data) as number[];
      
      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', { error, text: text.substring(0, 100) });
      return null;
    }
  }

  /**
   * Index a single node by generating and storing its embedding
   */
  async indexNode(node: NodeForEmbedding): Promise<boolean> {
    const text = this.buildEmbeddingText(node);
    const embedding = await this.generateEmbedding(text);

    if (!embedding) {
      return false;
    }

    try {
      // Pass embedding array directly - customType handles conversion
      await db.update(nodeTypes)
        .set({ embedding: embedding })
        .where(eq(nodeTypes.identifier, node.identifier));

      logger.info(`Indexed node: ${node.identifier}`);
      return true;
    } catch (error) {
      logger.error('Failed to store node embedding', { error, nodeId: node.identifier });
      return false;
    }
  }

  /**
   * Remove embedding for a node
   */
  async removeNodeEmbedding(identifier: string): Promise<void> {
    try {
      await db.update(nodeTypes)
        .set({ embedding: null })
        .where(eq(nodeTypes.identifier, identifier));
    } catch (error) {
      logger.error('Failed to remove node embedding', { error, identifier });
    }
  }

  /**
   * Find nodes most similar to the query text
   * Uses Drizzle's cosineDistance helper for pgvector
   * 
   * @param query - The search query text
   * @param topK - Maximum number of results to return (default: 10)
   * @param similarityThreshold - Maximum cosine distance to consider relevant (default: 0.7)
   *                              Lower values = stricter matching (0 = exact match, 1 = orthogonal)
   */
  async findSimilarNodes(query: string, topK: number = 10, similarityThreshold: number = 0.7): Promise<string[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    if (!queryEmbedding) {
      logger.warn('Could not generate query embedding, returning empty results');
      return [];
    }

    try {
      // Use Drizzle's cosineDistance helper for clean syntax
      const { cosineDistance } = await import('drizzle-orm');
      const { isNotNull, and, eq, asc, lte } = await import('drizzle-orm');
      
      const similarity = cosineDistance(nodeTypes.embedding, queryEmbedding);
      
      const results = await db
        .select({
          identifier: nodeTypes.identifier,
          displayName: nodeTypes.displayName,
          distance: similarity,
        })
        .from(nodeTypes)
        .where(and(
          isNotNull(nodeTypes.embedding),
          eq(nodeTypes.active, true),
          lte(similarity, similarityThreshold) // Only include nodes within threshold
        ))
        .orderBy(asc(similarity))
        .limit(topK);

      const nodeIds = results.map(row => row.identifier);
      
      // Log with distance scores for debugging
      logger.info(`Found ${nodeIds.length} similar nodes for query (threshold: ${similarityThreshold})`, { 
        query: query.substring(0, 50), 
        results: results.map(r => ({ id: r.identifier, distance: typeof r.distance === 'number' ? r.distance.toFixed(3) : r.distance }))
      });

      return nodeIds;
    } catch (error) {
      logger.error('Similarity search failed', { error });
      return [];
    }
  }

  /**
   * Re-index all nodes (for migrations or resets)
   */
  async reindexAllNodes(nodes: NodeForEmbedding[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    logger.info(`Starting reindex of ${nodes.length} nodes`);

    // Initialize once before batch processing
    await this.initialize();

    for (const node of nodes) {
      const result = await this.indexNode(node);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    logger.info(`Reindex complete: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Check if embeddings are available
   */
  isEnabled(): boolean {
    // Always enabled - gte-small runs locally without API keys
    return true;
  }

  /**
   * Get count of nodes with embeddings
   */
  async getIndexedCount(): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM nodes WHERE embedding IS NOT NULL
    `);
    return parseInt((result.rows[0] as any).count, 10);
  }
}
