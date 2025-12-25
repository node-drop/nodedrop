import { CredentialType, CredentialData } from "../../services/CredentialService";

/**
 * GitHub Personal Access Token Credential
 * Used for authenticating with GitHub repositories using a Personal Access Token
 * 
 * This is an alternative to OAuth2 for users who prefer to use PATs.
 * PATs are useful for:
 * - Automated scripts and CI/CD
 * - Users who want more control over permissions
 * - Environments where OAuth flow is not practical
 * 
 * Required Scopes:
 * - repo: Full control of private repositories
 * - workflow: Update GitHub Action workflows (optional)
 */
export const GitHubPATCredentials: CredentialType = {
  name: "githubPAT",
  displayName: "GitHub Personal Access Token",
  description: "Authenticate with GitHub using a Personal Access Token (PAT)",
  icon: "🔑",
  color: "#24292e",
  testable: true,
  properties: [
    {
      displayName: "Token Name",
      name: "tokenName",
      type: "string",
      required: true,
      description: "A descriptive name for this token (for your reference)",
      placeholder: "My GitHub Token",
    },
    {
      displayName: "Personal Access Token",
      name: "token",
      type: "password",
      required: true,
      description: "GitHub Personal Access Token with 'repo' scope",
      placeholder: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    },
    {
      displayName: "Token Type",
      name: "tokenType",
      type: "options",
      required: true,
      default: "classic",
      description: "Type of GitHub token",
      options: [
        { name: "Classic Token", value: "classic" },
        { name: "Fine-grained Token", value: "fine-grained" },
      ],
    },
    {
      displayName: "Username (Optional)",
      name: "username",
      type: "string",
      required: false,
      description: "Your GitHub username (optional, used for display purposes)",
      placeholder: "octocat",
    },
  ],

  /**
   * Test the GitHub PAT connection
   */
  async test(data: CredentialData) {
    try {
      if (!data.token) {
        return {
          success: false,
          message: "Personal Access Token is required"
        };
      }

      // Validate token format
      const token = data.token as string;
      
      // Classic tokens start with ghp_, fine-grained with github_pat_
      const isClassicToken = token.startsWith("ghp_");
      const isFineGrainedToken = token.startsWith("github_pat_");
      
      if (!isClassicToken && !isFineGrainedToken) {
        return {
          success: false,
          message: "Invalid token format. GitHub tokens should start with 'ghp_' (classic) or 'github_pat_' (fine-grained)"
        };
      }

      // Verify token type matches
      if (data.tokenType === "classic" && !isClassicToken) {
        return {
          success: false,
          message: "Token appears to be fine-grained but 'classic' was selected. Please select the correct token type."
        };
      }

      if (data.tokenType === "fine-grained" && !isFineGrainedToken) {
        return {
          success: false,
          message: "Token appears to be classic but 'fine-grained' was selected. Please select the correct token type."
        };
      }

      const axios = require("axios");
      
      // Test the token by fetching user information
      const response = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (response.data && response.data.login) {
        // Check if token has repo scope by trying to list repos
        try {
          await axios.get("https://api.github.com/user/repos", {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
            params: {
              per_page: 1, // Just check if we can access repos
            },
          });

          return {
            success: true,
            message: `Connected successfully as ${response.data.login}. Token has repository access.`
          };
        } catch (repoError: any) {
          if (repoError.response?.status === 403 || repoError.response?.status === 404) {
            return {
              success: false,
              message: `Connected as ${response.data.login}, but token lacks 'repo' scope. Please create a new token with 'repo' permissions.`
            };
          }
          throw repoError;
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
        // Check if it's a rate limit issue
        if (error.response.headers['x-ratelimit-remaining'] === '0') {
          return {
            success: false,
            message: "GitHub API rate limit exceeded. Please try again later."
          };
        }
        return {
          success: false,
          message: "Access denied. Please ensure your token has the required 'repo' scope."
        };
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: "Cannot connect to GitHub. Please check your internet connection."
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
