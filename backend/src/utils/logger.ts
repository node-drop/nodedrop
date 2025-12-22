import winston from 'winston';

/**
 * Custom serializer for Error objects to ensure they're properly logged
 */
function serializeError(error: any): any {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: (error as any).code,
      detail: (error as any).detail,
    };
  }
  return error;
}

/**
 * Safe JSON stringify that handles circular references
 */
function safeStringify(obj: any): string {
  const seen = new WeakSet();
  
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

// Create base logger instance
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf((info: any) => {
      // Custom formatter to handle Error objects
      const meta: Record<string, any> = {};
      
      // Copy all properties except standard ones
      for (const key in info) {
        if (!['message', 'level', 'timestamp', 'service'].includes(key)) {
          meta[key] = info[key];
        }
      }
      
      // Serialize any Error objects in the metadata
      for (const key in meta) {
        if (meta[key] instanceof Error) {
          meta[key] = serializeError(meta[key]);
        }
      }
      
      return safeStringify({
        timestamp: info.timestamp,
        level: info.level,
        message: info.message,
        service: info.service,
        ...meta,
      });
    })
  ),
  defaultMeta: { service: 'node-drop-backend' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
  baseLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf((info: any) => {
        // Serialize Error objects for console output
        const meta: Record<string, any> = {};
        
        for (const key in info) {
          if (!['message', 'level', 'timestamp', 'service'].includes(key)) {
            meta[key] = info[key];
          }
        }
        
        for (const key in meta) {
          if (meta[key] instanceof Error) {
            meta[key] = serializeError(meta[key]);
          }
        }
        
        const metaStr = Object.keys(meta).length > 0 ? ` ${safeStringify(meta)}` : '';
        return `${info.level}: ${info.message}${metaStr}`;
      })
    )
  }))
}

/**
 * Performance timing storage
 */
const timers = new Map<string, number>();

/**
 * Enhanced logger with convenience methods and performance utilities
 */
export const logger = {
  // Standard logging methods
  error: (message: string, meta?: Record<string, any>) => baseLogger.error(message, meta),
  warn: (message: string, meta?: Record<string, any>) => baseLogger.warn(message, meta),
  info: (message: string, meta?: Record<string, any>) => baseLogger.info(message, meta),
  debug: (message: string, meta?: Record<string, any>) => baseLogger.debug(message, meta),
  
  /**
   * Start a performance timer
   * @param label - Unique label for the timer
   */
  time: (label: string) => {
    timers.set(label, Date.now());
  },
  
  /**
   * End a performance timer and log the duration
   * @param label - Label of the timer to end
   */
  timeEnd: (label: string) => {
    const startTime = timers.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      timers.delete(label);
      baseLogger.debug(`Timer ${label}: ${duration}ms`, { duration, label });
    } else {
      baseLogger.warn(`Timer ${label} was never started`);
    }
  },
  
  /**
   * Log execution-related events with structured data
   */
  execution: (data: {
    executionId: string;
    nodeId?: string;
    status?: string;
    duration?: number;
    error?: Error;
    [key: string]: any;
  }) => {
    const { executionId, nodeId, status, duration, error, ...rest } = data;
    const message = `Execution ${executionId}${nodeId ? ` - Node ${nodeId}` : ''}${status ? ` - ${status}` : ''}`;
    
    if (error) {
      baseLogger.error(message, { executionId, nodeId, status, duration, error, ...rest });
    } else {
      baseLogger.debug(message, { executionId, nodeId, status, duration, ...rest });
    }
  },
  
  /**
   * Log workflow-related events
   */
  workflow: (data: {
    workflowId: string;
    action: string;
    userId?: string;
    [key: string]: any;
  }) => {
    const { workflowId, action, ...rest } = data;
    baseLogger.info(`Workflow ${workflowId} - ${action}`, { workflowId, action, ...rest });
  },
  
  /**
   * Log API request/response
   */
  http: (data: {
    method: string;
    path: string;
    status?: number;
    duration?: number;
    userId?: string;
    [key: string]: any;
  }) => {
    const { method, path, status, duration, ...rest } = data;
    const message = `${method} ${path}${status ? ` - ${status}` : ''}${duration ? ` (${duration}ms)` : ''}`;
    
    if (status && status >= 400) {
      baseLogger.warn(message, { method, path, status, duration, ...rest });
    } else {
      baseLogger.debug(message, { method, path, status, duration, ...rest });
    }
  },
  
  /**
   * Access to the underlying Winston logger for advanced use cases
   */
  _winston: baseLogger,
};

export default logger