import winston from 'winston'

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

// Create logger instance
export const logger = winston.createLogger({
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
  logger.add(new winston.transports.Console({
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

export default logger