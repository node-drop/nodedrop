import { CredentialType, CredentialData } from "../../services/CredentialService";

/**
 * Bitbucket App Password Credential
 * Used for authenticating with Bitbucket repositories using an App Password
 * 
 * Note: Bitbucket uses "App Passwords" instead of "Personal Access Tokens"
 * 
 * Required Permissions:
 * - Repositories: Read and Write
 * - Account: Read (optional, for username display)
 */
export const BitbucketPATCredentials: CredentialType = {
  name: "bitbucketPAT",
  displayName: "Bitbucket App Password",
  description: "Authenticate with Bitbucket using an App Password",
  icon: "🔑",
  color: "#0052CC",
  testable: true,
  properties: [
    {
      displayName: "App Password Name",
      name: "tokenName",
      type: "string",
      required: true,
      description: "A descriptive name for this app password (for your reference)",
      placeholder: "My Bitbucket App Password",
    },
    {
      displayName: "Username",
      name: "username",
      type: "string",
      required: true,
      description: "Your Bitbucket username",
      placeholder: "username",
    },
    {
      displayName: "App Password",
      name: "token",
      type: "password",
      required: true,
      description: "Bitbucket App Password with 'Repositories: Read and Write' permission",
      placeholder: "ATBBxxxxxxxxxxxxxxxxxx",
    },
  ],

  /**
   * Test the Bitbucket App Password connection
   */
  async test(data: CredentialData) {
    try {
      if (!data.token || !data.username) {
        return {
          success: false,
          message: "Username and App Password are required"
        };
      }

      const token = data.token as string;
      const username = data.username as string;

      // Validate token format (Bitbucket app passwords typically start with ATB)
      if (!token.startsWith("ATB") && token.length < 20) {
        return {
          success: false,
          message: "Invalid app password format. Bitbucket App Passwords typically start with 'ATB'"
        };
      }

      const axios = require("axios");
      
      // Create Basic Auth header
      const auth = Buffer.from(`${username}:${token}`).toString('base64');
      
      // Test the credentials by fetching user information
      const response = await axios.get("https://api.bitbucket.org/2.0/user", {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      if (response.data && response.data.username) {
        // Verify the username matches
        if (response.data.username.toLowerCase() !== username.toLowerCase()) {
          return {
            success: false,
            message: `Username mismatch. The app password belongs to '${response.data.username}', but you entered '${username}'.`
          };
        }

        // Check if app password has repository access
        try {
          await axios.get("https://api.bitbucket.org/2.0/repositories", {
            headers: {
              Authorization: `Basic ${auth}`,
            },
            params: {
              pagelen: 1, // Just check if we can access repositories
            },
          });

          return {
            success: true,
            message: `Connected successfully as ${response.data.username}. App password has repository access.`
          };
        } catch (repoError: any) {
          if (repoError.response?.status === 403) {
            return {
              success: false,
              message: `Connected as ${response.data.username}, but app password lacks 'Repositories: Read and Write' permission. Please create a new app password with the required permissions.`
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
          message: "Authentication failed. Please check your username and app password."
        };
      } else if (error.response?.status === 403) {
        return {
          success: false,
          message: "Access denied. Please ensure your app password has 'Repositories: Read and Write' permission."
        };
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: "Cannot connect to Bitbucket. Please check your internet connection."
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
