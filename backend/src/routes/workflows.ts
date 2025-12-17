import { Response, Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import {
    validateBody,
    validateParams,
    validateQuery,
} from "../middleware/validation";
import {
    WorkspaceRequest,
    checkWorkspaceLimit,
    requireWorkspace,
} from "../middleware/workspace";
import { CategoryServiceDrizzle } from "../services/CategoryService.drizzle";
import { workflowService } from "../services/WorkflowService";
import {
    ApiResponse,
    CreateWorkflowSchema,
    IdParamSchema,
    LimitQuerySchema,
    UpdateWorkflowSchema,
    WorkflowQuerySchema,
} from "../types/api";
import { validateWorkflow } from "../utils/workflowValidator";

const router = Router();
const categoryService = new CategoryServiceDrizzle();

// GET /api/workflows/for-trigger - Get workflows with active triggers for triggering
router.get(
  "/for-trigger",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    
    // Get workflows with triggers field included
    const result = await workflowService.listWorkflows(
      req.user!.id,
      { limit: 100 },
      { workspaceId }
    );
    
    // Filter workflows that have active triggers and format for node options
    const workflowOptions = result.workflows
      .filter((workflow: any) => {
        const triggers = (workflow.triggers as any[]) || [];
        return triggers.some((trigger: any) => trigger.active === true);
      })
      .map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        active: workflow.active,
        triggers: ((workflow.triggers as any[]) || [])
          .filter((trigger: any) => trigger.active === true)
          .map((trigger: any) => ({
            id: trigger.id,
            type: trigger.type,
            nodeId: trigger.nodeId,
            description:
              trigger.settings?.description || `${trigger.type} trigger`,
          })),
      }));

    const response: ApiResponse = {
      success: true,
      data: workflowOptions,
    };

    res.json(response);
  })
);

// GET /api/workflows/:id/triggers - Get triggers for a specific workflow
router.get(
  "/:id/triggers",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const workflow = await workflowService.getWorkflow(
      req.params.id,
      req.user!.id,
      { workspaceId }
    );

    const triggers = ((workflow.triggers as any[]) || [])
      .filter((trigger: any) => trigger.active === true)
      .map((trigger: any) => ({
        id: trigger.id,
        type: trigger.type,
        nodeId: trigger.nodeId,
        description: trigger.settings?.description || `${trigger.type} trigger`,
        settings: trigger.settings,
      }));

    const response: ApiResponse = {
      success: true,
      data: triggers,
    };

    res.json(response);
  })
);

// GET /api/workflows/:id/upcoming-executions - Get upcoming scheduled executions
router.get(
  "/:id/upcoming-executions",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  validateQuery(LimitQuerySchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const workflow = await workflowService.getWorkflow(
      req.params.id,
      req.user!.id,
      { workspaceId }
    );

    const { limit } = req.query as unknown as { limit: number };
    const upcomingExecutions = await workflowService.getUpcomingExecutions(
      workflow,
      limit
    );

    const response: ApiResponse = {
      success: true,
      data: upcomingExecutions,
    };

    res.json(response);
  })
);

// GET /api/workflows/categories - Get available workflow categories
router.get(
  "/categories",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const categories = await categoryService.getAvailableCategories(
      req.user!.id
    );

    const response: ApiResponse = {
      success: true,
      data: categories,
    };

    res.json(response);
  })
);

// POST /api/workflows/categories - Create a new category
router.post(
  "/categories",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const category = await categoryService.createCategory(
      req.user!.id,
      req.body
    );

    const response: ApiResponse = {
      success: true,
      data: category,
    };

    res.status(201).json(response);
  })
);

// DELETE /api/workflows/categories/:name - Delete a category
router.delete(
  "/categories/:name",
  requireAuth,
  requireWorkspace,
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const result = await categoryService.deleteCategory(
      req.user!.id,
      req.params.name
    );

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  })
);

// GET /api/workflows - List workflows
router.get(
  "/",
  requireAuth,
  requireWorkspace,
  validateQuery(WorkflowQuerySchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const result = await workflowService.listWorkflows(
      req.user!.id,
      req.query as any,
      { workspaceId }
    );

    const response: ApiResponse = {
      success: true,
      data: result.workflows,
      pagination: result.pagination,
    };

    res.json(response);
  })
);

// POST /api/workflows - Create workflow
router.post(
  "/",
  requireAuth,
  requireWorkspace,
  checkWorkspaceLimit("workflow"),
  validateBody(CreateWorkflowSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const workflow = await workflowService.createWorkflow(
      req.user!.id,
      req.body,
      { workspaceId }
    );

    const response: ApiResponse = {
      success: true,
      data: workflow,
    };

    res.status(201).json(response);
  })
);

// GET /api/workflows/:id - Get workflow by ID
router.get(
  "/:id",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const workflow = await workflowService.getWorkflow(
      req.params.id,
      req.user!.id,
      { workspaceId }
    );

    const response: ApiResponse = {
      success: true,
      data: workflow,
    };

    res.json(response);
  })
);

// PUT /api/workflows/:id - Update workflow
router.put(
  "/:id",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  validateBody(UpdateWorkflowSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const workflow = await workflowService.updateWorkflow(
      req.params.id,
      req.user!.id,
      req.body
    );

    const response: ApiResponse = {
      success: true,
      data: workflow,
    };

    res.json(response);
  })
);

// DELETE /api/workflows/:id - Delete workflow
router.delete(
  "/:id",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    await workflowService.deleteWorkflow(req.params.id, req.user!.id);

    const response: ApiResponse = {
      success: true,
      data: { message: "Workflow deleted successfully" },
    };

    res.json(response);
  })
);

// POST /api/workflows/:id/duplicate - Duplicate workflow
router.post(
  "/:id/duplicate",
  requireAuth,
  requireWorkspace,
  checkWorkspaceLimit("workflow"),
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const { name } = req.body;
    const workflow = await workflowService.duplicateWorkflow(
      req.params.id,
      req.user!.id,
      name
    );

    const response: ApiResponse = {
      success: true,
      data: workflow,
    };

    res.status(201).json(response);
  })
);

// POST /api/workflows/:id/validate - Validate workflow
router.post(
  "/:id/validate",
  requireAuth,
  requireWorkspace,
  validateParams(IdParamSchema),
  asyncHandler(async (req: WorkspaceRequest, res: Response) => {
    const workspaceId = req.workspace?.workspaceId;
    const workflow = await workflowService.getWorkflow(
      req.params.id,
      req.user!.id,
      { workspaceId }
    );
    const validation = validateWorkflow(workflow);

    const response: ApiResponse = {
      success: true,
      data: validation,
    };

    res.json(response);
  })
);

export { router as workflowRoutes };
