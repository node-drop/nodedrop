/**
 * Node Embedding Service
 * 
 * Provides semantic search capabilities for node selection using OpenAI embeddings
 * and PostgreSQL pgvector for storage and similarity search.
 */

import { db } from '@/db/client';
import { nodeTypes } from '@/db/schema/nodes';
import { logger } from '@/utils/logger';
import { eq, sql } from 'drizzle-orm';
import OpenAI from 'openai';

interface NodeForEmbedding {
  id: string;
  identifier: string;
  displayName: string;
  description: string;
  group?: string[];
}

export class NodeEmbeddingService {
  private static instance: NodeEmbeddingService;
  private openai: OpenAI | null = null;
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small';
  private readonly EMBEDDING_DIMENSIONS = 1536;

  private constructor() {
    this.initializeOpenAI();
  }

  static getInstance(): NodeEmbeddingService {
    if (!NodeEmbeddingService.instance) {
      NodeEmbeddingService.instance = new NodeEmbeddingService();
    }
    return NodeEmbeddingService.instance;
  }

  private initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      logger.warn('NodeEmbeddingService: OpenAI API key not configured. Embeddings will be disabled.');
    }
  }

  /**
   * Generate embedding text from node data
   * Combines name, description, and group into a searchable string
   */
  private buildEmbeddingText(node: NodeForEmbedding): string {
    const parts = [
      node.displayName,
      node.description,
    ];
    
    if (node.group && node.group.length > 0) {
      parts.push(`Category: ${node.group.join(', ')}`);
    }
    
    return parts.join('. ');
  }

  /**
   * Generate embedding vector for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.openai) {
      logger.warn('Cannot generate embedding: OpenAI not configured');
      return null;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: text,
        dimensions: this.EMBEDDING_DIMENSIONS,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', { error, text: text.substring(0, 100) });
      return null;
    }
  }

  /**
   * Convert embedding array to PostgreSQL vector string format
   */
  private embeddingToVectorString(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
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
   */
  async findSimilarNodes(query: string, topK: number = 10): Promise<string[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    if (!queryEmbedding) {
      logger.warn('Could not generate query embedding, returning empty results');
      return [];
    }

    try {
      // Use Drizzle's cosineDistance helper for clean syntax
      const { cosineDistance } = await import('drizzle-orm');
      const { isNotNull, and, eq, asc } = await import('drizzle-orm');
      
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
          eq(nodeTypes.active, true)
        ))
        .orderBy(asc(similarity))
        .limit(topK);

      const nodeIds = results.map(row => row.identifier);
      logger.info(`Found ${nodeIds.length} similar nodes for query`, { 
        query: query.substring(0, 50), 
        results: nodeIds 
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

    for (const node of nodes) {
      const result = await this.indexNode(node);
      if (result) {
        success++;
      } else {
        failed++;
      }

      // Rate limiting: OpenAI has limits on embedding requests
      if ((success + failed) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info(`Reindex complete: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Check if embeddings are available (OpenAI configured)
   */
  isEnabled(): boolean {
    return this.openai !== null;
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
