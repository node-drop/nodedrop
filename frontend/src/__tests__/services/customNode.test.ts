import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient as api } from "../../services/api";
import { CustomNodeService } from "../../services/customNode";

// Mock the api service
vi.mock("../../services/api");

const mockApi = api as any;

describe("CustomNodeService", () => {
  let customNodeService: CustomNodeService;

  beforeEach(() => {
    customNodeService = new CustomNodeService();
    vi.clearAllMocks();
  });

  describe("getLoadedPackages", () => {
    it("should fetch loaded packages", async () => {
      const mockPackages = [
        {
          name: "test-package",
          version: "1.0.0",
          description: "Test package",
          main: "index.js",
          nodes: ["nodes/TestNode.js"],
        },
      ];

      mockApi.get = vi.fn().mockResolvedValue({
        data: { data: mockPackages },
      });

      const result = await customNodeService.getLoadedPackages();

      expect(mockApi.get).toHaveBeenCalledWith("/custom-nodes/packages");
      expect(result).toEqual(mockPackages);
    });
  });

  describe("validatePackage", () => {
    it("should validate a package", async () => {
      const mockValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
      };

      mockApi.post = vi.fn().mockResolvedValue({
        data: { data: mockValidationResult },
      });

      const result = await customNodeService.validatePackage(
        "/path/to/package"
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/custom-nodes/packages/validate",
        {
          packagePath: "/path/to/package",
        }
      );
      expect(result).toEqual(mockValidationResult);
    });
  });

  describe("loadPackage", () => {
    it("should load a package", async () => {
      const mockLoadResult = {
        success: true,
        nodeType: "test-node",
      };

      mockApi.post = vi.fn().mockResolvedValue({
        data: { data: mockLoadResult },
      });

      const result = await customNodeService.loadPackage("/path/to/package");

      expect(mockApi.post).toHaveBeenCalledWith("/custom-nodes/packages/load", {
        packagePath: "/path/to/package",
      });
      expect(result).toEqual(mockLoadResult);
    });
  });

  describe("unloadPackage", () => {
    it("should unload a package", async () => {
      mockApi.delete = vi.fn().mockResolvedValue({});

      await customNodeService.unloadPackage("test-package");

      expect(mockApi.delete).toHaveBeenCalledWith(
        "/custom-nodes/packages/test-package"
      );
    });
  });

  describe("generatePackage", () => {
    it("should generate a package", async () => {
      const mockOptions = {
        name: "test-node",
        displayName: "Test Node",
        description: "A test node",
        type: "action" as const,
        group: ["transform"],
      };

      const mockResult = {
        success: true,
        packagePath: "/path/to/generated/package",
      };

      mockApi.post = vi.fn().mockResolvedValue({
        data: { data: mockResult },
      });

      const result = await customNodeService.generatePackage(mockOptions);

      expect(mockApi.post).toHaveBeenCalledWith("/custom-nodes/generate", {
        ...mockOptions,
        group: "transform",
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("searchMarketplace", () => {
    it("should search marketplace with filters", async () => {
      const mockSearchResult = {
        packages: [],
        total: 0,
        hasMore: false,
      };

      mockApi.get = vi.fn().mockResolvedValue({
        data: { data: mockSearchResult },
      });

      const filters = {
        query: "test",
        verified: true,
        sortBy: "downloads" as const,
      };

      const result = await customNodeService.searchMarketplace(filters);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining(
          "/custom-nodes/marketplace/search?query=test&verified=true&sortBy=downloads"
        )
      );
      expect(result).toEqual(mockSearchResult);
    });
  });
});
