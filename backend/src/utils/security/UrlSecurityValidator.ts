import { URL } from "url";
import { logger } from "../logger";

export interface SecurityValidationResult {
  isValid: boolean;
  errors: SecurityError[];
  sanitizedUrl?: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface SecurityError {
  type: SecurityErrorType;
  message: string;
  details?: any;
}

export enum SecurityErrorType {
  BLOCKED_URL = "BLOCKED_URL",
  INTERNAL_NETWORK = "INTERNAL_NETWORK",
  INVALID_PROTOCOL = "INVALID_PROTOCOL",
  MALICIOUS_DOMAIN = "MALICIOUS_DOMAIN",
  RESOURCE_LIMIT_EXCEEDED = "RESOURCE_LIMIT_EXCEEDED",
}

export class UrlSecurityValidator {
  private static readonly BLOCKED_PROTOCOLS = [
    "file",
    "ftp",
    "gopher",
    "ldap",
    "ldaps",
  ];
  private static readonly ALLOWED_PROTOCOLS = ["http", "https"];

  // Check if we're in development mode (allow localhost and internal networks)
  private static readonly IS_DEVELOPMENT =
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_LOCALHOST === "true";

  // Internal network ranges (RFC 1918)
  private static readonly INTERNAL_NETWORK_RANGES = [
    { start: "10.0.0.0", end: "10.255.255.255" },
    { start: "172.16.0.0", end: "172.31.255.255" },
    { start: "192.168.0.0", end: "192.168.255.255" },
    { start: "127.0.0.0", end: "127.255.255.255" }, // Loopback
    { start: "169.254.0.0", end: "169.254.255.255" }, // Link-local
    { start: "224.0.0.0", end: "239.255.255.255" }, // Multicast
    { start: "240.0.0.0", end: "255.255.255.255" }, // Reserved
  ];

  // Known malicious or blocked domains (can be extended)
  private static readonly BLOCKED_DOMAINS = [
    "0.0.0.0",
    "metadata.google.internal",
    "169.254.169.254", // AWS/GCP metadata service
  ];

  // Domains that are blocked only in production
  private static readonly DEV_BLOCKED_DOMAINS = ["localhost"];

  /**
   * Validate URL for security compliance
   */
  public static validateUrl(url: string): SecurityValidationResult {
    const errors: SecurityError[] = [];
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";

    try {
      // Parse URL
      const parsedUrl = new URL(url);

      // Check protocol
      const protocolCheck = this.validateProtocol(parsedUrl.protocol);
      if (!protocolCheck.isValid) {
        errors.push(...protocolCheck.errors);
        riskLevel = "high";
      }

      // Check for internal network access
      const networkCheck = this.validateNetworkAccess(parsedUrl.hostname);
      if (!networkCheck.isValid) {
        errors.push(...networkCheck.errors);
        riskLevel = "critical";
      }

      // Check for blocked domains
      const domainCheck = this.validateDomain(parsedUrl.hostname);
      if (!domainCheck.isValid) {
        errors.push(...domainCheck.errors);
        riskLevel = "high";
      }

      // Sanitize URL
      const sanitizedUrl = this.sanitizeUrl(parsedUrl);

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedUrl,
        riskLevel,
      };
    } catch (error) {
      errors.push({
        type: SecurityErrorType.BLOCKED_URL,
        message: `Invalid URL format: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });

      return {
        isValid: false,
        errors,
        riskLevel: "medium",
      };
    }
  }

  /**
   * Check if URL protocol is allowed
   */
  private static validateProtocol(protocol: string): SecurityValidationResult {
    const cleanProtocol = protocol.replace(":", "").toLowerCase();

    if (this.BLOCKED_PROTOCOLS.includes(cleanProtocol)) {
      return {
        isValid: false,
        errors: [
          {
            type: SecurityErrorType.INVALID_PROTOCOL,
            message: `Protocol '${cleanProtocol}' is not allowed`,
            details: { protocol: cleanProtocol },
          },
        ],
        riskLevel: "high",
      };
    }

    if (!this.ALLOWED_PROTOCOLS.includes(cleanProtocol)) {
      return {
        isValid: false,
        errors: [
          {
            type: SecurityErrorType.INVALID_PROTOCOL,
            message: `Protocol '${cleanProtocol}' is not in allowed list`,
            details: {
              protocol: cleanProtocol,
              allowed: this.ALLOWED_PROTOCOLS,
            },
          },
        ],
        riskLevel: "medium",
      };
    }

    return {
      isValid: true,
      errors: [],
      riskLevel: "low",
    };
  }

  /**
   * Check if hostname is in internal network range
   */
  private static validateNetworkAccess(
    hostname: string
  ): SecurityValidationResult {
    // In development mode, allow internal network access
    if (this.IS_DEVELOPMENT) {
      return {
        isValid: true,
        errors: [],
        riskLevel: "low",
      };
    }

    // Check if it's an IP address
    if (this.isIPAddress(hostname)) {
      if (this.isInternalNetwork(hostname)) {
        return {
          isValid: false,
          errors: [
            {
              type: SecurityErrorType.INTERNAL_NETWORK,
              message: `Access to internal network IP '${hostname}' is blocked`,
              details: { hostname },
            },
          ],
          riskLevel: "critical",
        };
      }
    }

    return {
      isValid: true,
      errors: [],
      riskLevel: "low",
    };
  }

  /**
   * Check if domain is blocked
   */
  private static validateDomain(hostname: string): SecurityValidationResult {
    const lowerHostname = hostname.toLowerCase();

    // Always check production blocked domains
    if (this.BLOCKED_DOMAINS.includes(lowerHostname)) {
      return {
        isValid: false,
        errors: [
          {
            type: SecurityErrorType.MALICIOUS_DOMAIN,
            message: `Domain '${hostname}' is blocked`,
            details: { hostname },
          },
        ],
        riskLevel: "high",
      };
    }

    // Check development-only blocked domains only in production
    if (
      !this.IS_DEVELOPMENT &&
      this.DEV_BLOCKED_DOMAINS.includes(lowerHostname)
    ) {
      return {
        isValid: false,
        errors: [
          {
            type: SecurityErrorType.MALICIOUS_DOMAIN,
            message: `Domain '${hostname}' is blocked`,
            details: { hostname },
          },
        ],
        riskLevel: "high",
      };
    }

    return {
      isValid: true,
      errors: [],
      riskLevel: "low",
    };
  }

  /**
   * Check if string is an IP address
   */
  private static isIPAddress(hostname: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(hostname) || ipv6Regex.test(hostname);
  }

  /**
   * Check if IP is in internal network range
   */
  private static isInternalNetwork(ip: string): boolean {
    // Simple IPv4 check for internal ranges
    const parts = ip.split(".").map(Number);
    if (
      parts.length !== 4 ||
      parts.some((part) => isNaN(part) || part < 0 || part > 255)
    ) {
      return false;
    }

    for (const range of this.INTERNAL_NETWORK_RANGES) {
      if (this.isIPInRange(ip, range.start, range.end)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if IP is within a range
   */
  private static isIPInRange(ip: string, start: string, end: string): boolean {
    const ipNum = this.ipToNumber(ip);
    const startNum = this.ipToNumber(start);
    const endNum = this.ipToNumber(end);

    return ipNum >= startNum && ipNum <= endNum;
  }

  /**
   * Convert IP address to number for comparison
   */
  private static ipToNumber(ip: string): number {
    return (
      ip
        .split(".")
        .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
    );
  }

  /**
   * Sanitize URL by removing potentially dangerous components
   */
  private static sanitizeUrl(parsedUrl: URL): string {
    // Remove auth info from URL
    parsedUrl.username = "";
    parsedUrl.password = "";

    // Ensure protocol is lowercase
    parsedUrl.protocol = parsedUrl.protocol.toLowerCase();

    return parsedUrl.toString();
  }

  /**
   * Validate request parameters for security
   */
  public static validateRequestParameters(
    parameters: Record<string, any>
  ): SecurityValidationResult {
    const errors: SecurityError[] = [];
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";

    // Check for potentially dangerous headers
    if (parameters.headers) {
      const dangerousHeaders = [
        "authorization",
        "cookie",
        "x-forwarded-for",
        "x-real-ip",
      ];
      const headerKeys = Object.keys(parameters.headers).map((k) =>
        k.toLowerCase()
      );

      for (const dangerousHeader of dangerousHeaders) {
        if (headerKeys.includes(dangerousHeader)) {
          logger.warn("Potentially dangerous header detected", {
            header: dangerousHeader,
          });
          riskLevel = "medium";
        }
      }
    }

    // Check body size (basic validation)
    if (parameters.body) {
      const bodySize = JSON.stringify(parameters.body).length;
      const maxBodySize = 10 * 1024 * 1024; // 10MB limit

      if (bodySize > maxBodySize) {
        errors.push({
          type: SecurityErrorType.RESOURCE_LIMIT_EXCEEDED,
          message: `Request body size (${bodySize} bytes) exceeds limit (${maxBodySize} bytes)`,
          details: { bodySize, maxBodySize },
        });
        riskLevel = "high";
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      riskLevel,
    };
  }
}
