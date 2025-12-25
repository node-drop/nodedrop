import { CredentialType, CredentialData } from "../../services/CredentialService";

/**
 * GitHub OAuth2 Credential
 * Used for authenticating with GitHub repositories
 * 
 * Scopes:
 * - repo: Full control of private repositories
 * - user:email: Access to user email addresses
 */
export const GitHubOAuth2Credentials: CredentialType = {
  name: "githubOAuth2",
  displayName: "GitHub OAuth2",
  description: "OAuth2 authentication for GitHub repositories",
  icon: "🐙",
  color: "#24292e",
  testable: true,
  oauthProvider: "github",
  properties: [
    {
      displayName: "Client ID",
      name: "clientId",
      type: "string",
      required: true,
      description: "OAuth2 Client ID from GitHub Developer Settings",
      placeholder: "Iv1.1234567890abcdef",
    },
    {
      displayName: "Client Secret",
      name: "clientSecret",
      type: "password",
      required: true,
      description: "OAuth2 Client Secret from GitHub Developer Settings",
      placeholder: "***",
    },
    {
      displayName: "OAuth Redirect URL",
      name: "oauthCallbackUrl",
      type: "string",
      readonly: true,
      description: "Copy this URL and add it to 'Authorization callback URL' in your GitHub OAuth App settings",
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
      placeholder: "repo, user:email, workflow",
      description: "Space-separated list of OAuth scopes",
      displayOptions: {
        show: {
          useCustomScopes: [true],
        },
      },
    },
  ],

  /**
   * Test the GitHub OAuth2 connection
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
      
      const response = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${data.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (response.data && response.data.login) {
        return {
          success: true,
          message: `Connected successfully as ${response.data.login}`
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
          message: "Authentication failed. Please re-authorize with GitHub."
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
