import { CredentialType, CredentialData } from "../../services/CredentialService";

/**
 * GitLab Personal Access Token Credential
 * Used for authenticating with GitLab repositories using a Personal Access Token
 * 
 * Required Scopes:
 * - api: Full API access
 * - read_repository: Read repository data
 * - write_repository: Write repository data
 */
export const GitLabPATCredentials: CredentialType = {
  name: "gitlabPAT",
  displayName: "GitLab Personal Access Token",
  description: "Authenticate with GitLab using a Personal Access Token (PAT)",
  icon: "🔑",
  color: "#FC6D26",
  testable: true,
  properties: [
    {
      displayName: "Token Name",
      name: "tokenName",
      type: "string",
      required: true,
      description: "A descriptive name for this token (for your reference)",
      placeholder: "My GitLab Token",
    },
    {
      displayName: "Personal Access Token",
      name: "token",
      type: "password",
      required: true,
      description: "GitLab Personal Access Token with 'api' or 'write_repository' scope",
      placeholder: "glpat-xxxxxxxxxxxxxxxxxxxx",
    },
    {
      displayName: "GitLab Instance URL",
      name: "instanceUrl",
      type: "string",
      required: false,
      default: "https://gitlab.com",
      description: "GitLab instance URL (use default for gitlab.com, or your self-hosted URL)",
      placeholder: "https://gitlab.com",
    },
    {
      displayName: "Username (Optional)",
      name: "username",
      type: "string",
      required: false,
      description: "Your GitLab username (optional, used for display purposes)",
      placeholder: "username",
    },
  ],

  /**
   * Test the GitLab PAT connection
   */
  async test(data: CredentialData) {
    try {
      if (!data.token) {
        return {
          success: false,
          message: "Personal Access Token is required"
        };
      }

      // Validate token format (GitLab tokens typically start with glpat-)
      const token = data.token as string;
      if (!token.startsWith("glpat-") && token.length < 20) {
        return {
          success: false,
          message: "Invalid token format. GitLab Personal Access Tokens typically start with 'glpat-'"
        };
      }

      const instanceUrl = (data.instanceUrl as string) || "https://gitlab.com";
      
      // Validate instance URL
      try {
        new URL(instanceUrl);
      } catch {
        return {
          success: false,
          message: "Invalid GitLab instance URL"
        };
      }

      const axios = require("axios");
      
      // Test the token by fetching user information
      const response = await axios.get(`${instanceUrl}/api/v4/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.username) {
        // Check if token has repository access by trying to list projects
        try {
          await axios.get(`${instanceUrl}/api/v4/projects`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              per_page: 1, // Just check if we can access projects
            },
          });

          return {
            success: true,
            message: `Connected successfully as ${response.data.username}. Token has repository access.`
          };
        } catch (projectError: any) {
          if (projectError.response?.status === 403) {
            return {
              success: false,
              message: `Connected as ${response.data.username}, but token lacks required scopes. Please ensure token has 'api' or 'write_repository' scope.`
            };
          }
          throw projectError;
        }
      }

      return {
        success: true,
        message: "Connection successful"
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        return {
          success: false,
          message: "Authentication failed. Please check your Personal Access Token."
        };
      } else if (error.response?.status === 403) {
        return {
          success: false,
          message: "Access denied. Please ensure your token has the required scopes (api or write_repository)."
        };
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: "Cannot connect to GitLab instance. Please check the instance URL and your internet connection."
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
