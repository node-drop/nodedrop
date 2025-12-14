/**
 * Credential Types - Re-exported from @nodedrop/types
 * 
 * This file re-exports shared credential types from the types package.
 * All credential types are now defined in @nodedrop/types for consistency
 * between frontend and backend.
 */

// Re-export all credential types from shared package
export type {
  CredentialPropertyType,
  CredentialProperty,
  CredentialType,
  CredentialRotationConfig,
  Credential,
  CredentialData,
  CreateCredentialRequest,
  UpdateCredentialRequest,
  TestCredentialRequest,
  TestCredentialResponse,
  CredentialUsageLog,
  CredentialAuditAction,
  CredentialAuditLog,
  CredentialSecurityPolicy,
  CredentialBackup,
  BulkCredentialOperation,
  CredentialImportData,
  CredentialExportData,
} from "@nodedrop/types";

// Re-export schemas for validation
export {
  CredentialPropertyTypeSchema,
  CredentialPropertySchema,
  CredentialTypeSchema,
  CredentialRotationConfigSchema,
  CredentialSchema,
  CredentialDataSchema,
  CreateCredentialRequestSchema,
  UpdateCredentialRequestSchema,
  TestCredentialRequestSchema,
  TestCredentialResponseSchema,
  CredentialUsageLogSchema,
  CredentialAuditActionSchema,
  CredentialAuditLogSchema,
  CredentialSecurityPolicySchema,
  CredentialBackupSchema,
  BulkCredentialOperationSchema,
  CredentialImportDataSchema,
  CredentialExportDataSchema,
} from "@nodedrop/types";
