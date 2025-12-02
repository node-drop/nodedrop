/**
 * Service for showing confirmation dialogs from anywhere in the application
 * This allows non-React code (like Zustand stores) to show confirmation dialogs
 */

import {
  ConfirmDialog,
  type ConfirmDialogProps,
} from "@/components/ui/ConfirmDialog";
import React from "react";
import { createRoot } from "react-dom/client";

export interface ConfirmationOptions
  extends Omit<ConfirmDialogProps, "isOpen" | "onClose" | "onConfirm"> {
  // All properties from ConfirmDialogProps except the ones we control
}

class ConfirmationService {
  /**
   * Show a confirmation dialog and return a promise that resolves with the user's choice
   */
  async confirm(options: ConfirmationOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      // Create a container for the dialog
      const dialogContainer = document.createElement("div");
      document.body.appendChild(dialogContainer);

      // Create React root
      const root = createRoot(dialogContainer);

      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        root.unmount();
        document.body.removeChild(dialogContainer);
      };

      // Render the dialog
      root.render(
        React.createElement(ConfirmDialog, {
          ...options,
          isOpen: true,
          onClose: handleCancel,
          onConfirm: handleConfirm,
        })
      );
    });
  }

  /**
   * Show a confirmation dialog specifically for execution with pinned mock data
   */
  async confirmExecuteWithPinnedData(nodeName: string): Promise<boolean> {
    return this.confirm({
      title: "Execute Node with Pinned Mock Data",
      message: `"${nodeName}" has pinned mock data. Executing it will replace the mock data with the actual execution response and unpin the mock data.`,
      confirmText: "Execute & Unpin",
      cancelText: "Keep Mock Data",
      severity: "warning",
      details: [
        "The current mock data will be replaced with real execution results",
        "Mock data will be automatically unpinned after successful execution",
        "You can re-pin the data later if needed",
      ],
    });
  }

  /**
   * Show a confirmation dialog for destructive actions
   */
  async confirmDelete(
    itemName: string,
    itemType: string = "item"
  ): Promise<boolean> {
    return this.confirm({
      title: `Delete ${itemType}`,
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      severity: "danger",
    });
  }

  /**
   * Show a confirmation dialog for potentially data-losing actions
   */
  async confirmDataLoss(action: string): Promise<boolean> {
    return this.confirm({
      title: "Confirm Action",
      message: `${action} This may result in data loss.`,
      confirmText: "Continue",
      cancelText: "Cancel",
      severity: "warning",
    });
  }
}

// Export a singleton instance
export const confirmationService = new ConfirmationService();
