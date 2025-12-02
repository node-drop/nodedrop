/**
 * WorkflowToolbar Store
 *
 * Separate store for managing WorkflowToolbar state and actions.
 * This includes title management, import/export operations, UI state,
 * workflow activation, and execution display (read-only).
 *
 * Extracted from the main workflow store to maintain separation of concerns
 * and improve code organization.
 */

import { ExecutionState, WorkflowExecutionResult } from "@/types";
import {
  getUserFriendlyErrorMessage,
  validateImportFile,
  ValidationError,
} from "@/utils/errorHandling";
import { devtools } from "zustand/middleware";
import { createWithEqualityFn } from "zustand/traditional";

// Custom validation result for import/export operations
interface ImportValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface WorkflowToolbarStore {
  // Import/Export state
  isExporting: boolean;
  isImporting: boolean;
  importProgress: number;
  exportProgress: number;
  importError: string | null;
  exportError: string | null;

  // UI state
  showExecutionsPanel: boolean;
  showNodePalette: boolean;
  isSaving: boolean;

  // Workflow activation state
  isWorkflowActive: boolean;

  // Execution state (display only)
  executionState: ExecutionState | null;
  lastExecutionResult: WorkflowExecutionResult | null;
  workflowExecutions: any[];

  // Actions - Import/Export (delegate to main workflow store)
  exportWorkflow: (mainExportFn: () => Promise<void>) => Promise<void>;
  importWorkflow: (
    file: File,
    mainImportFn: (file: File) => Promise<void>
  ) => Promise<void>;
  validateImportFile: (file: File) => Promise<ImportValidationResult>;
  setImportProgress: (progress: number) => void;
  setExportProgress: (progress: number) => void;
  clearImportExportErrors: () => void;

  // Actions - UI state
  toggleExecutionsPanel: () => void;
  toggleNodePalette: () => void;
  setSaving: (saving: boolean) => void;

  // Actions - Workflow activation
  toggleWorkflowActive: () => void;
  setWorkflowActive: (active: boolean) => void;

  // Actions - Execution state (for display)
  setExecutionState: (state: ExecutionState | null) => void;
  setLastExecutionResult: (result: WorkflowExecutionResult | null) => void;
  setWorkflowExecutions: (executions: any[]) => void;

  // Actions - Error handling
  handleError: (
    error: unknown,
    operation: string,
    showToast?: (
      type: "error" | "warning",
      title: string,
      options?: any
    ) => void
  ) => void;
}

export const useWorkflowToolbarStore = createWithEqualityFn<WorkflowToolbarStore>()(
  devtools(
    (set) => ({
      // Initial state
      // Import/Export state
      isExporting: false,
      isImporting: false,
      importProgress: 0,
      exportProgress: 0,
      importError: null,
      exportError: null,

      // UI state
      showExecutionsPanel: false,
      showNodePalette: false,
      isSaving: false,

      // Workflow activation state
      isWorkflowActive: false,

      // Execution state (display only)
      executionState: null,
      lastExecutionResult: null,
      workflowExecutions: [],

      // Import/Export actions
      exportWorkflow: async (mainExportFn: () => Promise<void>) => {
        set({
          isExporting: true,
          exportProgress: 0,
          exportError: null,
        });

        try {
          // Delegate to the main workflow store export function
          await mainExportFn();

          set({
            isExporting: false,
            exportProgress: 100,
          });
        } catch (error) {
          const errorMessage = getUserFriendlyErrorMessage(error);
          set({
            isExporting: false,
            exportError: errorMessage,
            exportProgress: 0,
          });
          throw error;
        }
      },

      importWorkflow: async (
        file: File,
        mainImportFn: (file: File) => Promise<void>
      ) => {
        set({
          isImporting: true,
          importProgress: 0,
          importError: null,
        });

        try {
          // Validate file first
          const validationErrors = validateImportFile(file);
          if (validationErrors.length > 0) {
            throw new Error(validationErrors[0].message);
          }

          // Delegate to the main workflow store import function
          await mainImportFn(file);

          set({
            isImporting: false,
            importProgress: 100,
          });
        } catch (error) {
          const errorMessage = getUserFriendlyErrorMessage(error);
          set({
            isImporting: false,
            importError: errorMessage,
            importProgress: 0,
          });
          throw error;
        }
      },

      validateImportFile: async (file: File) => {
        try {
          const validationErrors = validateImportFile(file);

          if (validationErrors.length > 0) {
            return {
              isValid: false,
              errors: validationErrors.map((err) => ({
                field: "file",
                message: err.message,
                code: err.code,
              })),
              warnings: [],
            };
          }

          return {
            isValid: true,
            errors: [],
            warnings: [],
          };
        } catch (error) {
          return {
            isValid: false,
            errors: [
              {
                field: "file",
                message: getUserFriendlyErrorMessage(error),
                code: "VALIDATION_ERROR" as const,
              },
            ],
            warnings: [],
          };
        }
      },

      setImportProgress: (progress: number) => {
        set({ importProgress: Math.max(0, Math.min(100, progress)) });
      },

      setExportProgress: (progress: number) => {
        set({ exportProgress: Math.max(0, Math.min(100, progress)) });
      },

      clearImportExportErrors: () => {
        set({
          importError: null,
          exportError: null,
        });
      },

      // UI state actions
      toggleExecutionsPanel: () => {
        set((state) => ({ showExecutionsPanel: !state.showExecutionsPanel }));
      },

      toggleNodePalette: () => {
        set((state) => ({ showNodePalette: !state.showNodePalette }));
      },

      setSaving: (saving: boolean) => {
        set({ isSaving: saving });
      },

      // Workflow activation actions
      toggleWorkflowActive: () => {
        set((state) => ({ isWorkflowActive: !state.isWorkflowActive }));
      },

      setWorkflowActive: (active: boolean) => {
        set({ isWorkflowActive: active });
      },

      // Execution state actions (for display)
      setExecutionState: (state: ExecutionState | null) => {
        set({ executionState: state });
      },

      setLastExecutionResult: (result: WorkflowExecutionResult | null) => {
        set({ lastExecutionResult: result });
      },

      setWorkflowExecutions: (executions: any[]) => {
        set({ workflowExecutions: executions });
      },

      // Error handling
      handleError: (error, operation, showToast) => {
        const errorMessage = getUserFriendlyErrorMessage(error);
        console.error(`WorkflowToolbar ${operation} error:`, error);

        if (showToast) {
          showToast("error", `${operation} failed`, {
            description: errorMessage,
          });
        }

        // Update error state based on operation
        if (operation.includes("export")) {
          set({ exportError: errorMessage });
        } else if (operation.includes("import")) {
          set({ importError: errorMessage });
        }
      },
    }),
    { name: "workflow-toolbar-store" }
  )
);
