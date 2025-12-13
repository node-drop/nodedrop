/**
 * @nodedrop/types - Credential Types
 *
 * Shared credential-related type definitions.
 * These types are used by both frontend and backend.
 */

import { z } from "zod";

// =============================================================================
// Credential Property Schemas
// =============================================================================

export const CredentialPropertyTypeSchema = z.enum([
  "string",
  "text",
  "password",
  "number",
  "boolean",
  "options",
]);

export const CredentialPropertySchema = z.object({
  displayName: z.string(),
  name: z.string(),
  type: CredentialPropertyTypeSchema,
  required: z.boolean().optional(),
  default: z.any().optional(),
  description: z.string().optional(),
  options: z.array(z.object({
    name: z.string(),
    value: z.any(),
  })).optional(),
  placeholder: z.string().optional(),
  displayOptions: z.object({
    show: z.record(z.array(z.any())).optional(),
    hide: z.record(z.array(z.any())).optional(),
  }).optional(),
});

// =============================================================================
// Credential Type Schema
// =============================================================================

export const CredentialTypeSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  properties: z.array(CredentialPropertySchema),
  icon: z.string().optional(),
  color: z.string().optional(),
  oauthProvider: z.string().optional(),
});

// =============================================================================
// Credential Schemas
// =============================================================================

export const CredentialRotationConfigSchema = z.object({
  enabled: z.boolean(),
  intervalDays: z.number(),
  warningDays: z.number(),
  autoRotate: z.boolean(),
});

export const CredentialSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  userId: z.string(),
  expiresAt: z.string().nullable().optional(),
  lastUsedAt: z.string().nullable().optional(),
  usageCount: z.number().optional(),
  isShared: z.boolean().optional(),
  sharedWith: z.array(z.string()).optional(),
  rotationConfig: CredentialRotationConfigSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// =============================================================================
// Credential Request Schemas
// =============================================================================

export const CredentialDataSchema = z.record(z.any());

export const CreateCredentialRequestSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  data: CredentialDataSchema,
});

export const UpdateCredentialRequestSchema = z.object({
  name: z.string().optional(),
  data: CredentialDataSchema.optional(),
});

export const TestCredentialRequestSchema = z.object({
  type: z.string(),
  data: CredentialDataSchema,
});

export const TestCredentialResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// =============================================================================
// Credential Usage and Audit Schemas
// =============================================================================

export const CredentialUsageLogSchema = z.object({
  id: z.string(),
  credentialId: z.string(),
  workflowId: z.string(),
  workflowName: z.string(),
  nodeId: z.string(),
  nodeName: z.string(),
  usedAt: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
});

export const CredentialAuditActionSchema = z.enum([
  "created",
  "updated",
  "deleted",
  "rotated",
  "shared",
  "accessed",
]);

export const CredentialAuditLogSchema = z.object({
  id: z.string(),
  credentialId: z.string(),
  action: CredentialAuditActionSchema,
  userId: z.string(),
  userName: z.string(),
  timestamp: z.string(),
  details: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
});

// =============================================================================
// Credential Security Policy Schema
// =============================================================================

export const CredentialSecurityPolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  rules: z.object({
    maxAge: z.number().optional(),
    requireRotation: z.boolean(),
    rotationInterval: z.number().optional(),
    allowSharing: z.boolean(),
    requireMFA: z.boolean(),
    allowedIpRanges: z.array(z.string()).optional(),
    encryptionLevel: z.enum(["standard", "high"]),
  }),
});

// =============================================================================
// Credential Backup and Bulk Operations Schemas
// =============================================================================

export const CredentialBackupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  credentials: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    encrypted: z.boolean(),
  })),
  createdAt: z.string(),
  size: z.number(),
});

export const BulkCredentialOperationSchema = z.object({
  operation: z.enum(["import", "export", "delete", "rotate"]),
  credentialIds: z.array(z.string()),
  options: z.record(z.any()).optional(),
});

export const CredentialImportDataSchema = z.object({
  credentials: z.array(z.object({
    name: z.string(),
    type: z.string(),
    data: CredentialDataSchema,
    expiresAt: z.string().optional(),
  })),
  overwriteExisting: z.boolean().optional(),
});

export const CredentialExportDataSchema = z.object({
  credentials: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    data: CredentialDataSchema.optional(),
    expiresAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  exportedAt: z.string(),
  exportedBy: z.string(),
});

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type CredentialPropertyType = z.infer<typeof CredentialPropertyTypeSchema>;
export type CredentialProperty = z.infer<typeof CredentialPropertySchema>;
export type CredentialType = z.infer<typeof CredentialTypeSchema>;
export type CredentialRotationConfig = z.infer<typeof CredentialRotationConfigSchema>;
export type Credential = z.infer<typeof CredentialSchema>;
export type CredentialData = z.infer<typeof CredentialDataSchema>;
export type CreateCredentialRequest = z.infer<typeof CreateCredentialRequestSchema>;
export type UpdateCredentialRequest = z.infer<typeof UpdateCredentialRequestSchema>;
export type TestCredentialRequest = z.infer<typeof TestCredentialRequestSchema>;
export type TestCredentialResponse = z.infer<typeof TestCredentialResponseSchema>;
export type CredentialUsageLog = z.infer<typeof CredentialUsageLogSchema>;
export type CredentialAuditAction = z.infer<typeof CredentialAuditActionSchema>;
export type CredentialAuditLog = z.infer<typeof CredentialAuditLogSchema>;
export type CredentialSecurityPolicy = z.infer<typeof CredentialSecurityPolicySchema>;
export type CredentialBackup = z.infer<typeof CredentialBackupSchema>;
export type BulkCredentialOperation = z.infer<typeof BulkCredentialOperationSchema>;
export type CredentialImportData = z.infer<typeof CredentialImportDataSchema>;
export type CredentialExportData = z.infer<typeof CredentialExportDataSchema>;
