import { Response, Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthenticatedRequest, authenticateToken } from "../middleware/auth";
import { VariableService } from "../services/VariableService";
import { AppError } from "../utils/errors";
import {
  variableBulkUpsertSchema,
  variableCreateSchema,
  variableReplaceSchema,
  variableUpdateSchema,
} from "../utils/validation/variables";

const router = Router();
const variableService = new VariableService();

// Get all variables for the authenticated user
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { search, scope, workflowId } = req.query;

    const variables = await variableService.getVariables(
      req.user!.id,
      search as string,
      scope as "GLOBAL" | "LOCAL" | undefined,
      workflowId as string | undefined
    );

    res.json({
      success: true,
      data: variables,
    });
  })
);

// Get variable statistics
router.get(
  "/stats",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stats = await variableService.getVariableStats(req.user!.id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get variables for execution (internal endpoint)
router.get(
  "/execution",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { workflowId } = req.query;

    const variableMap = await variableService.getVariablesForExecution(
      req.user!.id,
      workflowId as string | undefined
    );

    res.json({
      success: true,
      data: variableMap,
    });
  })
);

// Get a specific variable
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const variable = await variableService.getVariable(id, req.user!.id);

    if (!variable) {
      throw new AppError("Variable not found", 404);
    }

    res.json({
      success: true,
      data: variable,
    });
  })
);

// Create a new variable
router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validatedData = variableCreateSchema.parse(req.body);

    const variable = await variableService.createVariable(
      req.user!.id,
      validatedData.key,
      validatedData.value,
      validatedData.description,
      validatedData.scope,
      validatedData.workflowId
    );

    res.status(201).json({
      success: true,
      data: variable,
    });
  })
);

// Update a variable
router.put(
  "/:id",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const validatedData = variableUpdateSchema.parse(req.body);

    const variable = await variableService.updateVariable(
      id,
      req.user!.id,
      validatedData
    );

    res.json({
      success: true,
      data: variable,
    });
  })
);

// Delete a variable
router.delete(
  "/:id",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    await variableService.deleteVariable(id, req.user!.id);

    res.json({
      success: true,
      message: "Variable deleted successfully",
    });
  })
);

// Bulk create or update variables
router.post(
  "/bulk",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validatedData = variableBulkUpsertSchema.parse(req.body);

    const variables = await variableService.bulkUpsertVariables(
      req.user!.id,
      validatedData.variables
    );

    res.json({
      success: true,
      data: variables,
      message: `Bulk operation completed: ${variables.length} variables processed`,
    });
  })
);

// Replace variables in text
router.post(
  "/replace",
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validatedData = variableReplaceSchema.parse(req.body);

    const replacedText = await variableService.replaceVariablesInText(
      validatedData.text,
      req.user!.id
    );

    // Find which variables were used
    const variableMatches =
      validatedData.text.match(/\$vars\.([a-zA-Z_][a-zA-Z0-9_.]*)/g) || [];
    const variablesFound = Array.from(
      new Set(variableMatches.map((match) => match.replace("$vars.", "")))
    );

    res.json({
      success: true,
      data: {
        originalText: validatedData.text,
        replacedText,
        variablesFound,
      },
    });
  })
);

export default router;
