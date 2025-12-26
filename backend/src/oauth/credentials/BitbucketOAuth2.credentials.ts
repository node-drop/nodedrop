import { CredentialType, CredentialData } from "../../services/CredentialService";

/**
 * Bitbucket OAuth2 Credential
 * Used for authenticating with Bitbucket repositories
 * 
 * Scopes:
 * - repository: Read and write access to repositories
 * - repository:write: Write access to repositories
 * - account: Read account information
 */
export const BitbucketOAuth2Credentials: CredentialType = {
  name: "bitbucketOAuth2",
  displayName: "Bitbucket OAuth2",
  description: "OAuth2 authentication for Bitbucket repositories",
  icon: "🪣",
  color: "#0052CC",
  testable: true,
  oauthProvider: "bitbucket",
  properties: [
    {
      displayName: "Client ID",
      name: "clientId",
      type: "string",
      required: true,
      description: "OAuth2 Key from Bitbucket OAuth Consumer",
      placeholder: "1234567890abcdef",
    },
    {
      displayName: "Client Secret",
      name: "clientSecret",
      type: "password",
      required: true,
      description: "OAuth2 Secret from Bitbucket OAuth Consumer",
      placeholder: "***",
    },
    {
      displayName: "OAuth Redirect URL",
      name: "oauthCallbackUrl",
      type: "string",
      readonly: true,
      description: "Copy this URL and add it to 'Callback URL' in your Bitbucket OAuth Consumer settings",
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
      placeholder: "repository, repository:write, account",
      description: "Space-separated list of OAuth scopes",
      displayOptions: {
        show: {
          useCustomScopes: [true],
        },
      },
    },
  ],

  /**
   * Test the Bitbucket OAuth2 connection
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
      
      const response = await axios.get("https://api.bitbucket.org/2.0/user", {
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
          message: "Authentication failed. Please re-authorize with Bitbucket."
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
