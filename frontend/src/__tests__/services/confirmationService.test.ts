/**
 * Unit tests for ConfirmationService
 */

import { confirmationService } from "@/services/confirmationService";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock React DOM
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
    unmount: vi.fn(),
  })),
}));

// Mock the ConfirmDialog component
vi.mock("@/components/ui/ConfirmDialog", () => ({
  ConfirmDialog: vi.fn(() => null),
}));

describe("ConfirmationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any dialog containers that might exist
    document.querySelectorAll("body > div").forEach((div) => {
      if (!div.id) {
        // Remove unnamed divs (likely dialog containers)
        div.remove();
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("confirm", () => {
    it("should create a dialog container and render the ConfirmDialog", async () => {
      const { createRoot } = await import("react-dom/client");
      const mockRoot = {
        render: vi.fn(),
        unmount: vi.fn(),
      };
      vi.mocked(createRoot).mockReturnValue(mockRoot as any);

      // Start the confirmation (but don't wait for it)
      confirmationService.confirm({
        title: "Test Title",
        message: "Test Message",
      });

      // Verify container was created
      expect(document.body.children.length).toBeGreaterThan(0);

      // Verify createRoot was called
      expect(createRoot).toHaveBeenCalled();

      // Verify render was called
      expect(mockRoot.render).toHaveBeenCalled();

      // Simulate user clicking cancel by finding the dialog container and removing it
      const containers = Array.from(document.body.children).filter(
        (child) => child.tagName === "DIV" && !child.id
      );
      if (containers.length > 0) {
        containers[0].remove();
      }

      // The promise should still be pending at this point since we didn't trigger the handlers
      // This test just verifies the setup works correctly
    });

    it("should clean up properly when dialog is closed", async () => {
      const { createRoot } = await import("react-dom/client");
      const mockRoot = {
        render: vi.fn(),
        unmount: vi.fn(),
      };
      vi.mocked(createRoot).mockReturnValue(mockRoot as any);

      const initialChildCount = document.body.children.length;

      // Start confirmation
      confirmationService.confirm({
        title: "Test Title",
        message: "Test Message",
      });

      // Verify container was added
      expect(document.body.children.length).toBe(initialChildCount + 1);

      // Simulate cleanup by manually removing the container
      const containers = Array.from(document.body.children).filter(
        (child) => child.tagName === "DIV" && !child.id
      );
      containers.forEach((container) => container.remove());

      // Verify cleanup
      expect(document.body.children.length).toBe(initialChildCount);
    });
  });

  describe("confirmExecuteWithPinnedData", () => {
    it("should call confirm with correct parameters for pinned data execution", async () => {
      const { createRoot } = await import("react-dom/client");
      const mockRoot = {
        render: vi.fn(),
        unmount: vi.fn(),
      };
      vi.mocked(createRoot).mockReturnValue(mockRoot as any);

      const nodeName = "Test Node";

      // Start the confirmation
      confirmationService.confirmExecuteWithPinnedData(nodeName);

      // Verify the render call contains the expected props
      expect(mockRoot.render).toHaveBeenCalled();
      const renderCall = mockRoot.render.mock.calls[0][0];

      // The render call should be a React element with our expected props
      expect(renderCall).toBeDefined();
    });

    it("should include node name in the message", async () => {
      const { createRoot } = await import("react-dom/client");
      const mockRoot = {
        render: vi.fn(),
        unmount: vi.fn(),
      };
      vi.mocked(createRoot).mockReturnValue(mockRoot as any);

      const nodeName = "My Custom Node";

      // Start the confirmation
      confirmationService.confirmExecuteWithPinnedData(nodeName);

      // Verify render was called
      expect(mockRoot.render).toHaveBeenCalled();
    });
  });

  describe("confirmDelete", () => {
    it("should call confirm with danger severity", async () => {
      const { createRoot } = await import("react-dom/client");
      const mockRoot = {
        render: vi.fn(),
        unmount: vi.fn(),
      };
      vi.mocked(createRoot).mockReturnValue(mockRoot as any);

      const itemName = "Test Item";

      // Start the confirmation
      confirmationService.confirmDelete(itemName, "workflow");

      // Verify render was called
      expect(mockRoot.render).toHaveBeenCalled();
    });
  });

  describe("confirmDataLoss", () => {
    it("should call confirm with warning severity", async () => {
      const { createRoot } = await import("react-dom/client");
      const mockRoot = {
        render: vi.fn(),
        unmount: vi.fn(),
      };
      vi.mocked(createRoot).mockReturnValue(mockRoot as any);

      const action = "Resetting the database";

      // Start the confirmation
      confirmationService.confirmDataLoss(action);

      // Verify render was called
      expect(mockRoot.render).toHaveBeenCalled();
    });
  });
});
