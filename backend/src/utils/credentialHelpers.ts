/**
 * Credential Helpers Utility
 *
 * Shared utilities for building credential mappings across execution engines.
 * Used by RealtimeExecutionEngine, ExecutionService, ExecutionEngine, FlowExecutionEngine
 */

import { logger } from "./logger";

/**
 * Node type property interface for credential extraction
 */
export interface NodeTypeProperty {
  name: string;
  type: string;
  allowedTypes?: string[];
}

/**
 * Node type info interface
 */
export interface NodeTypeInfo {
  identifier: string;
  properties?: NodeTypeProperty[];
}

/**
 * Options for building credentials mapping
 */
export interface BuildCredentialsMappingOptions {
  /** Node parameters containing credential IDs */
  nodeParameters: Record<string, any>;
  /** Node type properties (from node type definition) */
  nodeTypeProperties?: NodeTypeProperty[];
  /** User ID for ownership verification */
  userId: string;
  /** Optional: Legacy credentials array from node */
  legacyCredentials?: string[];
  /** Optional: Log prefix for debugging */
  logPrefix?: string;
}

/**
 * Result of credential mapping
 */
export interface CredentialsMappingResult {
  /** Map of credential type -> credential ID */
  mapping: Record<string, string>;
  /** Any warnings encountered during mapping */
  warnings: string[];
}

/**
 * Builds a credentials mapping from node parameters and type definition.
 * This is the single source of truth for credential mapping logic.
 *
 * The mapping maps credential types (e.g., "googleSheetsOAuth2") to credential IDs.
 * This allows nodes to request credentials by their type.
 *
 * @param options - Options for building the mapping
 * @returns Credentials mapping and any warnings
 *
 * @example
 * const { mapping, warnings } = await buildCredentialsMapping({
 *   nodeParameters: { authentication: "cred_123" },
 *   nodeTypeProperties: [{ name: "authentication", type: "credential", allowedTypes: ["apiKey"] }],
 *   userId: "user_456",
 * });
 * // mapping = { "apiKey": "cred_123" }
 */
export async function buildCredentialsMapping(
  options: BuildCredentialsMappingOptions
): Promise<CredentialsMappingResult> {
  const {
    nodeParameters,
    nodeTypeProperties,
    userId,
    legacyCredentials,
    logPrefix = "[CredentialHelper]",
  } = options;

  const mapping: Record<string, string> = {};
  const warnings: string[] = [];

  logger.debug(
    `${logPrefix} buildCredentialsMapping called with:`,
    {
      nodeTypePropertiesCount: nodeTypeProperties?.length || 0,
      nodeTypeProperties: nodeTypeProperties?.map((p) => ({
        name: p.name,
        type: p.type,
        allowedTypes: p.allowedTypes,
      })),
      nodeParameterKeys: Object.keys(nodeParameters || {}),
      legacyCredentialsCount: legacyCredentials?.length || 0,
    }
  );

  // PRIMARY METHOD: Extract credentials from node type properties
  if (nodeTypeProperties && nodeTypeProperties.length > 0) {
    for (const property of nodeTypeProperties) {
      if (
        property.type === "credential" &&
        property.allowedTypes &&
        property.allowedTypes.length > 0
      ) {
        // Get the credential ID from parameters using the field name
        const credentialId = nodeParameters?.[property.name];

        if (credentialId && typeof credentialId === "string") {
          // Credential verification would be done via CredentialService
          // For now, just map the credential ID
          mapping[property.name] = credentialId;
          
          // Also map by each allowed credential type for backward compatibility
          // This allows nodes to request credentials by type name (e.g., "slack")
          for (const allowedType of property.allowedTypes) {
            mapping[allowedType] = credentialId;
          }
          
          logger.info(
            `${logPrefix} Mapped credential ID '${credentialId}' from parameter '${property.name}' with types: ${property.allowedTypes.join(", ")}`
          );
        }
      }
    }
  }

  // FALLBACK: Check legacy credentials array (if no credentials found via properties)
  if (legacyCredentials && Array.isArray(legacyCredentials) && legacyCredentials.length > 0) {
    logger.info(
      `${logPrefix} Processing legacy credentials array with ${legacyCredentials.length} credentials`
    );

    for (const credId of legacyCredentials) {
      // If we already have a mapping from properties, skip
      if (Object.values(mapping).includes(credId)) {
        logger.debug(`${logPrefix} Credential ${credId} already mapped from properties`);
        continue;
      }

      // Legacy credential lookup would be done via CredentialService
      // For now, just map the credential ID directly
      mapping[credId] = credId;
      
      // Also try to map by common credential type names
      // This helps when node type properties are not available
      if (nodeTypeProperties && nodeTypeProperties.length > 0) {
        for (const property of nodeTypeProperties) {
          if (property.type === "credential" && property.allowedTypes) {
            for (const allowedType of property.allowedTypes) {
              mapping[allowedType] = credId;
            }
          }
        }
      }
      
      logger.info(
        `${logPrefix} Mapped legacy credential ID '${credId}'`
      );
    }
  }

  return { mapping, warnings };
}

/**
 * Extracts credential properties from a node type definition.
 * Helper function to get just the credential-related properties.
 *
 * @param nodeTypeInfo - Node type information
 * @returns Array of credential properties
 */
export function extractCredentialProperties(
  nodeTypeInfo: NodeTypeInfo | undefined
): NodeTypeProperty[] {
  if (!nodeTypeInfo?.properties) {
    logger.debug("[extractCredentialProperties] No properties found in nodeTypeInfo", {
      hasNodeTypeInfo: !!nodeTypeInfo,
      nodeTypeIdentifier: nodeTypeInfo?.identifier,
    });
    return [];
  }

  const properties = Array.isArray(nodeTypeInfo.properties)
    ? nodeTypeInfo.properties
    : [];

  const credentialProperties = properties.filter(
    (p) =>
      p.type === "credential" && p.allowedTypes && p.allowedTypes.length > 0
  );

  logger.debug("[extractCredentialProperties] Extracted credential properties", {
    nodeTypeIdentifier: nodeTypeInfo.identifier,
    totalProperties: properties.length,
    credentialPropertiesCount: credentialProperties.length,
    credentialProperties: credentialProperties.map((p) => ({
      name: p.name,
      allowedTypes: p.allowedTypes,
    })),
  });

  return credentialProperties;
}
