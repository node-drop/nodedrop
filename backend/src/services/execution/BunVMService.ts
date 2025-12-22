/**
 * Bun-compatible VM Service
 * Provides sandboxed code execution using Bun's capabilities
 */

import { logger } from "../../utils/logger";

export interface VMExecutionOptions {
  timeout?: number;
  memoryLimit?: number;
  context?: Record<string, any>;
  skipValidation?: boolean; // For internal use when code is already trusted/wrapped
}

export interface VMExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

export class BunVMService {
  private defaultTimeout = 30000; // 30 seconds
  private defaultMemoryLimit = 128 * 1024 * 1024; // 128MB

  /**
   * Execute code with timeout and context
   */
  async execute(code: string, options: VMExecutionOptions = {}): Promise<VMExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout ?? this.defaultTimeout;
    const context = options.context ?? {};

    try {
      // Validate code unless explicitly skipped (for internal trusted code)
      if (!options.skipValidation) {
        this.validateCode(code);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(code, context, timeout);

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error('VM execution error:', error);
      return {
        success: false,
        error: error.message || 'Unknown execution error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute code with timeout protection
   */
  private async executeWithTimeout(
    code: string,
    context: Record<string, any>,
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeout}ms`));
      }, timeout);

      try {
        // Create function with context
        const contextKeys = Object.keys(context);
        const contextValues = Object.values(context);
        
        // Wrap code in async function to support await
        const wrappedCode = `
          return (async function() {
            ${code}
          })();
        `;
        
        const func = new Function(...contextKeys, wrappedCode);
        const resultPromise = func(...contextValues);

        // Handle both sync and async results
        Promise.resolve(resultPromise)
          .then((result) => {
            clearTimeout(timeoutId);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Validate code for obvious security issues
   * Public so it can be called before wrapping code
   */
  validateCode(code: string): void {
    // Basic validation - block dangerous patterns
    const dangerousPatterns = [
      /require\s*\(/i,
      /import\s+/i,
      /process\./i,
      /child_process/i,
      /fs\./i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /__dirname/i,
      /__filename/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Code contains potentially dangerous pattern: ${pattern.source}`);
      }
    }

    // Check code length
    if (code.length > 100000) {
      throw new Error('Code exceeds maximum length of 100KB');
    }
  }

  /**
   * Execute code in a more isolated way using Bun.spawn
   * This provides better isolation but has more overhead
   */
  async executeIsolated(code: string, options: VMExecutionOptions = {}): Promise<VMExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout ?? this.defaultTimeout;
    const context = options.context ?? {};

    try {
      // Create a temporary script file
      const scriptContent = `
        const context = ${JSON.stringify(context)};
        const result = (function() {
          ${code}
        })();
        console.log(JSON.stringify({ success: true, result }));
      `;

      // Execute in subprocess
      const proc = Bun.spawn(['bun', 'run', '-e', scriptContent], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      // Setup timeout
      const timeoutId = setTimeout(() => {
        proc.kill();
      }, timeout);

      // Wait for completion
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      clearTimeout(timeoutId);

      if (stderr) {
        throw new Error(stderr);
      }

      const output = JSON.parse(stdout);

      return {
        success: true,
        result: output.result,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error('Isolated VM execution error:', error);
      return {
        success: false,
        error: error.message || 'Unknown execution error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Create a sandboxed context with safe utilities
   */
  createSafeContext(customContext: Record<string, any> = {}): Record<string, any> {
    return {
      // Safe built-ins
      console: {
        log: (...args: any[]) => logger.info('[VM]', ...args),
        error: (...args: any[]) => logger.error('[VM]', ...args),
        warn: (...args: any[]) => logger.warn('[VM]', ...args),
      },
      JSON,
      Date,
      Math,
      Object,
      Array,
      String,
      Number,
      Boolean,
      RegExp,
      Promise,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      // Custom context
      ...customContext,
    };
  }
}

// Singleton instance
let vmServiceInstance: BunVMService | null = null;

export function getBunVMService(): BunVMService {
  if (!vmServiceInstance) {
    vmServiceInstance = new BunVMService();
  }
  return vmServiceInstance;
}
