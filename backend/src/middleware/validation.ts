import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodType, ZodError, ZodTypeDef } from 'zod';

/**
 * Validation error structure for API responses
 */
export interface ValidationErrorDetail {
  path: string;      // e.g., "nodes[0].parameters.url"
  message: string;   // e.g., "Expected string, received number"
  code: string;      // e.g., "invalid_type"
}

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  public statusCode: number = 400;
  public code: string = 'VALIDATION_ERROR';
  public errors: ValidationErrorDetail[];

  constructor(zodError: ZodError) {
    super('Request validation failed');
    this.errors = formatZodErrors(zodError);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Format Zod error path to string notation
 * Converts array paths like ['nodes', 0, 'parameters', 'url'] to "nodes[0].parameters.url"
 */
function formatPath(path: (string | number)[]): string {
  if (path.length === 0) return '';
  
  return path.reduce<string>((acc, segment, index) => {
    if (typeof segment === 'number') {
      return `${acc}[${segment}]`;
    }
    return index === 0 ? segment : `${acc}.${segment}`;
  }, '');
}

/**
 * Transform Zod errors to a consistent API error format
 */
export function formatZodErrors(zodError: ZodError): ValidationErrorDetail[] {
  return zodError.errors.map(err => ({
    path: formatPath(err.path),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Middleware to validate request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware that validates req.body
 */
export function validateBody<TOutput, TDef extends ZodTypeDef = ZodTypeDef, TInput = TOutput>(
  schema: ZodType<TOutput, TDef, TInput>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware to validate request query parameters against a Zod schema
 * Supports schemas with transforms (where input type differs from output type)
 * @param schema - Zod schema to validate against
 * @returns Express middleware that validates req.query
 */
export function validateQuery<TOutput, TDef extends ZodTypeDef = ZodTypeDef, TInput = TOutput>(
  schema: ZodType<TOutput, TDef, TInput>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware to validate request URL parameters against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware that validates req.params
 */
export function validateParams<TOutput, TDef extends ZodTypeDef = ZodTypeDef, TInput = TOutput>(
  schema: ZodType<TOutput, TDef, TInput>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error));
      } else {
        next(error);
      }
    }
  };
}
