/**
 * Frontend Logger Utility
 * 
 * Provides structured logging for the frontend with environment-based log levels.
 * Respects VITE_LOG_LEVEL environment variable for controlling verbosity.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

interface LogMetadata {
  [key: string]: any;
}

class FrontendLogger {
  private logLevel: LogLevel;
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
  };

  constructor() {
    // Get log level from environment variable, default to 'warn' in production
    const envLogLevel = import.meta.env.VITE_LOG_LEVEL as LogLevel;
    const isProd = import.meta.env.PROD;
    
    this.logLevel = envLogLevel || (isProd ? 'warn' : 'info');
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatMessage(level: string, message: string, meta?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  /**
   * Log debug messages (only in development or when VITE_LOG_LEVEL=debug)
   */
  debug(message: string, meta?: LogMetadata) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, meta?: LogMetadata) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, meta?: LogMetadata) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  /**
   * Log error messages
   */
  error(message: string, meta?: LogMetadata) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  /**
   * Performance timing storage
   */
  private timers = new Map<string, number>();

  /**
   * Start a performance timer
   */
  time(label: string) {
    this.timers.set(label, performance.now());
  }

  /**
   * End a performance timer and log the duration
   */
  timeEnd(label: string) {
    const startTime = this.timers.get(label);
    if (startTime !== undefined) {
      const duration = performance.now() - startTime;
      this.timers.delete(label);
      this.debug(`Timer ${label}: ${duration.toFixed(2)}ms`, { duration, label });
    } else {
      this.warn(`Timer ${label} was never started`);
    }
  }

  /**
   * Log workflow-related events
   */
  workflow(data: {
    workflowId: string;
    action: string;
    nodeId?: string;
    [key: string]: any;
  }) {
    const { workflowId, action, ...rest } = data;
    this.debug(`Workflow ${workflowId} - ${action}`, { workflowId, action, ...rest });
  }

  /**
   * Log execution-related events
   */
  execution(data: {
    executionId: string;
    nodeId?: string;
    status?: string;
    error?: Error;
    [key: string]: any;
  }) {
    const { executionId, nodeId, status, error, ...rest } = data;
    const message = `Execution ${executionId}${nodeId ? ` - Node ${nodeId}` : ''}${status ? ` - ${status}` : ''}`;
    
    if (error) {
      this.error(message, { executionId, nodeId, status, error: error.message, ...rest });
    } else {
      this.debug(message, { executionId, nodeId, status, ...rest });
    }
  }

  /**
   * Log WebSocket events
   */
  websocket(data: {
    event: string;
    executionId?: string;
    [key: string]: any;
  }) {
    const { event, ...rest } = data;
    this.debug(`WebSocket: ${event}`, { event, ...rest });
  }

  /**
   * Set log level dynamically
   */
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
    this.info(`Log level changed to: ${level}`);
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Export singleton instance
export const logger = new FrontendLogger();
export default logger;
