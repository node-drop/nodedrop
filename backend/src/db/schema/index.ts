/**
 * Database Schema Exports
 * 
 * This file exports all Drizzle ORM schema definitions.
 * Schema files are organized by domain:
 * - auth.ts: User authentication and sessions
 * - workspace.ts: Workspace and workspace member management
 * - teams.ts: Team and team member management
 * - workflows.ts: Workflow definitions and environments
 * - executions.ts: Workflow execution tracking
 * - credentials.ts: Credential storage and sharing
 * - variables.ts: Workflow variables
 * - nodes.ts: Node type definitions
 * - triggers.ts: Trigger job management
 * - webhooks.ts: Webhook request logging
 * - categories.ts: Node categories
 */

// Import all schema definitions
export * from './auth';
export * from './workspace';
export * from './teams';
export * from './workflows';
export * from './executions';
export * from './credentials';
export * from './variables';
export * from './nodes';
export * from './triggers';
export * from './webhooks';
export * from './categories';
