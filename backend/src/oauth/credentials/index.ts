/**
 * Core Credential Definitions
 * 
 * These are reusable credential types that can be used across multiple nodes.
 * Instead of each custom node defining its own OAuth2 or HTTP Basic Auth,
 * they can reference these core credentials.
 * 
 * Benefits:
 * - No duplication of credential definitions
 * - Consistent authentication across nodes
 * - Easier maintenance and updates
 * - Users can reuse the same credentials across multiple nodes
 */

export { GoogleOAuth2Credentials } from "./GoogleOAuth2.credentials";
export { MicrosoftOAuth2Credentials } from "./MicrosoftOAuth2.credentials";
export { HttpBasicAuthCredentials } from "./HttpBasicAuth.credentials";
export { OAuth2Credentials } from "./OAuth2.credentials";
export { ApiKeyCredentials } from "./ApiKey.credentials";
export { BearerTokenCredentials } from "./BearerToken.credentials";
export { PostgresDbCredentials } from "./PostgresDb.credentials";
export { GitHubOAuth2Credentials } from "./GitHubOAuth2.credentials";
export { GitLabOAuth2Credentials } from "./GitLabOAuth2.credentials";
export { BitbucketOAuth2Credentials } from "./BitbucketOAuth2.credentials";
export { GitHubPATCredentials } from "./GitHubPAT.credentials";
export { GitLabPATCredentials } from "./GitLabPAT.credentials";
export { BitbucketPATCredentials } from "./BitbucketPAT.credentials";

// Export OAuth utilities and providers
export * from "..";

// Export all core credentials as an array for easy registration
import { GoogleOAuth2Credentials } from "./GoogleOAuth2.credentials";
import { MicrosoftOAuth2Credentials } from "./MicrosoftOAuth2.credentials";
import { HttpBasicAuthCredentials } from "./HttpBasicAuth.credentials";
import { OAuth2Credentials } from "./OAuth2.credentials";
import { ApiKeyCredentials } from "./ApiKey.credentials";
import { BearerTokenCredentials } from "./BearerToken.credentials";
import { PostgresDbCredentials } from "./PostgresDb.credentials";
import { GitHubOAuth2Credentials } from "./GitHubOAuth2.credentials";
import { GitLabOAuth2Credentials } from "./GitLabOAuth2.credentials";
import { BitbucketOAuth2Credentials } from "./BitbucketOAuth2.credentials";
import { GitHubPATCredentials } from "./GitHubPAT.credentials";
import { GitLabPATCredentials } from "./GitLabPAT.credentials";
import { BitbucketPATCredentials } from "./BitbucketPAT.credentials";

// Note: Slack OAuth2 is now provided by the Slack custom node package
export const CoreCredentials = [
  GoogleOAuth2Credentials,
  MicrosoftOAuth2Credentials,
  HttpBasicAuthCredentials,
  OAuth2Credentials,
  ApiKeyCredentials,
  BearerTokenCredentials,
  PostgresDbCredentials,
  GitHubOAuth2Credentials,
  GitLabOAuth2Credentials,
  BitbucketOAuth2Credentials,
  GitHubPATCredentials,
  GitLabPATCredentials,
  BitbucketPATCredentials,
];
