import { z } from "zod";

// Variable validation schemas
export const variableCreateSchema = z
  .object({
    key: z
      .string()
      .min(1, "Variable key is required")
      .max(100, "Variable key must be 100 characters or less")
      .regex(
        /^[a-zA-Z_][a-zA-Z0-9_.]*$/,
        "Variable key must start with a letter or underscore and contain only letters, numbers, underscores, and dots"
      ),
    value: z
      .string()
      .max(10000, "Variable value must be 10,000 characters or less"),
    description: z
      .string()
      .max(500, "Description must be 500 characters or less")
      .optional(),
    scope: z.enum(["GLOBAL", "LOCAL"]).default("GLOBAL"),
    workflowId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.scope === "LOCAL" && !data.workflowId) {
        return false;
      }
      if (data.scope === "GLOBAL" && data.workflowId) {
        return false;
      }
      return true;
    },
    {
      message:
        "Local variables must have a workflowId, global variables cannot have a workflowId",
    }
  );

export const variableUpdateSchema = z.object({
  key: z
    .string()
    .min(1, "Variable key is required")
    .max(100, "Variable key must be 100 characters or less")
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_.]*$/,
      "Variable key must start with a letter or underscore and contain only letters, numbers, underscores, and dots"
    )
    .optional(),
  value: z
    .string()
    .max(10000, "Variable value must be 10,000 characters or less")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional()
    .nullable(),
  // Note: scope and workflowId cannot be changed after creation for data integrity
});

export const variableBulkUpsertSchema = z.object({
  variables: z
    .array(
      z.object({
        key: z
          .string()
          .min(1, "Variable key is required")
          .max(100, "Variable key must be 100 characters or less")
          .regex(
            /^[a-zA-Z_][a-zA-Z0-9_.]*$/,
            "Variable key must start with a letter or underscore and contain only letters, numbers, underscores, and dots"
          ),
        value: z
          .string()
          .max(10000, "Variable value must be 10,000 characters or less"),
        description: z
          .string()
          .max(500, "Description must be 500 characters or less")
          .optional(),
      })
    )
    .min(1, "At least one variable is required")
    .max(100, "Cannot process more than 100 variables at once"),
});

export const variableQuerySchema = z.object({
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50)),
  sortBy: z.enum(["key", "createdAt", "updatedAt"]).optional().default("key"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const variableReplaceSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(50000, "Text must be 50,000 characters or less"),
});
