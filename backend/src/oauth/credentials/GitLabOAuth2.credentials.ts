import { CredentialType, CredentialData } from "../../services/CredentialService";

/**
 * GitLab OAuth2 Credential
 * Used for authenticating with GitLab repositories
 * 
 * Scopes:
 * - api: Full API access
 * - read_user: Read user information
 * - read_repository: Read repository data
 * - write_repository: Write repository data
 */
export const GitLabOAuth2Credentials: CredentialType = {
  name: "gitlabOAuth2",
  displayName: "GitLab OAuth2",
  description: "OAuth2 authentication for GitLab repositories",
  icon: "🦊",
  color: "#FC6D26",
  testable: true,
  oauthProvider: "gitlab",
  properties: [
    {
      displayName: "Client ID",
      name: "clientId",
      type: "string",
      required: true,
      description: "OAuth2 Application ID from GitLab",
      placeholder: "1234567890abcdef",
    },
    {
      displayName: "Client Secret",
      name: "clientSecret",
      type: "password",
      required: true,
      description: "OAuth2 Secret from GitLab",
      placeholder: "***",
    },
    {
      displayName: "OAuth Redirect URL",
      name: "oauthCallbackUrl",
      type: "string",
      readonly: true,
      description: "Copy this URL and add it to 'Redirect URI' in your GitLab OAuth Application settings",
      get placeholder() {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return `${frontendUrl}/oauth/callback`;
      },
      get default() {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return `${frontendUrl}/oauth/callback`;
      },
    },
    {
      displayName: "Use Custom Scopes",
      name: "useCustomScopes",
      type: "boolean",
      default: false,
    },
    {
      displayName: "Custom Scopes",
      name: "customScopes",
      type: "string",
      placeholder: "api, read_user, read_repository, write_repository",
      description: "Space-separated list of OAuth scopes",
      displayOptions: {
        show: {
          useCustomScopes: [true],
        },
      },
    },
  ],

  /**
   * Test the GitLab OAuth2 connection
   */
  async test(data: CredentialData) {
    try {
      if (!data.clientId || !data.clientSecret) {
        return {
          success: false,
          message: "Client ID and client secret are required"
        };
      }

      if (!data.accessToken) {
        if (data.clientId.length < 10 || data.clientSecret.length < 10) {
          return {
            success: false,
            message: "Client ID or Client Secret appears to be invalid"
          };
        }
        return {
          success: true,
          message: "Credentials format is valid. Complete OAuth2 authorization to test the connection."
        };
      }

      const axios = require("axios");
      
      const response = await axios.get("https://gitlab.com/api/v4/user", {
        headers: {
          Authorization: `Bearer ${data.accessToken}`,
        },
      });

      if (response.data && response.data.username) {
        return {
          success: true,
          message: `Connected successfully as ${response.data.username}`
        };
      }

      return {
        success: true,
        message: "Connection successful"
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        return {
          success: false,
          message: "Authentication failed. Please re-authorize with GitLab."
        };
      } else if (error.response?.status === 403) {
        return {
          success: false,
          message: "Access denied. Please check your API permissions and scopes."
        };
      } else {
        return {
          success: false,
          message: `Connection failed: ${error.message || "Unknown error"}`
        };
      }
    }
  }
};
