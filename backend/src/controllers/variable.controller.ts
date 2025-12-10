import { Response, Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";
import {
  WorkspaceRequest,
  requireWorkspace,
} from "../middleware/workspace";
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
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { search, scope, workflowId } = req.query;
    const workspaceId = req.workspace?.workspaceId;

    const variables = await variableService.getVariables(
      req.user!.id,
      search as string,
      scope as "GLOBAL" | "LOCAL" | undefined,
      workflowId as string | undefined,
      { workspaceId }
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
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const stats = await variableService.getVariableStats(req.user!.id, { workspaceId });

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get variables for execution (internal endpoint)
router.get(
  "/execution",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { workflowId } = req.query;
    const workspaceId = req.workspace?.workspaceId;

    const variableMap = await variableService.getVariablesForExecution(
      req.user!.id,
      workflowId as string | undefined,
      { workspaceId }
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
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.workspace?.workspaceId;

    const variable = await variableService.getVariable(id, req.user!.id, { workspaceId });

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
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const validatedData = variableCreateSchema.parse(req.body);
    const workspaceId = req.workspace?.workspaceId;

    const variable = await variableService.createVariable(
      req.user!.id,
      validatedData.key,
      validatedData.value,
      validatedData.description,
      validatedData.scope,
      validatedData.workflowId,
      { workspaceId }
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
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { id } = req.params;
    const validatedData = variableUpdateSchema.parse(req.body);
    const workspaceId = req.workspace?.workspaceId;

    const variable = await variableService.updateVariable(
      id,
      req.user!.id,
      validatedData,
      { workspaceId }
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
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.workspace?.workspaceId;

    await variableService.deleteVariable(id, req.user!.id, { workspaceId });

    res.json({
      success: true,
      message: "Variable deleted successfully",
    });
  })
);

// Bulk create or update variables
router.post(
  "/bulk",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const validatedData = variableBulkUpsertSchema.parse(req.body);
    const workspaceId = req.workspace?.workspaceId;

    const variables = await variableService.bulkUpsertVariables(
      req.user!.id,
      validatedData.variables,
      { workspaceId }
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
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const validatedData = variableReplaceSchema.parse(req.body);
    const workspaceId = req.workspace?.workspaceId;

    const replacedText = await variableService.replaceVariablesInText(
      validatedData.text,
      req.user!.id,
      { workspaceId }
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
