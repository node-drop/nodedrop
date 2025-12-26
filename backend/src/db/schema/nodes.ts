import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspace';

/**
 * NodeTypes table - stores node type definitions
 * Includes both core system nodes and custom workspace-specific nodes
 * Each node type defines inputs, outputs, properties, and credential requirements
 */
export const nodeTypes = pgTable(
  'nodes',
  {
    id: text('id').primaryKey().default(sql`cuid()`),
    
    // Unique identifier for the node type
    identifier: text('identifier').unique().notNull(),
    
    // Display information
    displayName: text('display_name').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    
    // Organization
    group: text('group').array().default(sql`ARRAY[]::text[]`),
    version: integer('version').default(1),
    
    // Node configuration
    defaults: json('defaults').default({}),
    inputs: text('inputs').array().default(sql`ARRAY[]::text[]`),
    outputs: text('outputs').array().default(sql`ARRAY[]::text[]`),
    inputsConfig: json('inputs_config'), // Configuration for input positioning
    properties: json('properties').default([]),
    
    // Credentials configuration
    credentials: json('credentials'), // Credential type definitions
    credentialSelector: json('credential_selector'), // Unified credential selector configuration
    
    // Appearance
    icon: text('icon'),
    color: text('color'),
    outputComponent: text('output_component'), // Custom output component identifier
    
    // Status and flags
    active: boolean('active').default(true),
    isCore: boolean('is_core').default(false), // Core system nodes cannot be deleted
    isTemplate: boolean('is_template').default(false), // Template nodes
    templateData: json('template_data'), // Template structure (nodes and connections)
    
    // Execution control
    nodeCategory: text('node_category'), // 'service' or 'tool'
    
    // Workspace association (NULL = global/system node)
    workspaceId: text('workspace_id'),
    
    // AI Embedding for semantic search (pgvector)
    embedding: vector('embedding', { dimensions: 1536 }),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    identifierUnique: uniqueIndex('nodes_identifier_unique').on(
      table.identifier
    ),
    workspaceIdIdx: index('nodes_workspace_id_idx').on(table.workspaceId),
    isCoreIdx: index('nodes_is_core_idx').on(table.isCore),
    // Note: HNSW index for vector should be created via raw SQL migration:
    // CREATE INDEX nodes_embedding_idx ON nodes USING hnsw (embedding vector_cosine_ops);
  })
);

/**
 * Relations for nodeTypes table
 */
export const nodeTypesRelations = relations(nodeTypes, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [nodeTypes.workspaceId],
    references: [workspaces.id],
  }),
}));
