import { NodeLoader, NodePackageInfo } from '../services/NodeLoader';
import { NodeService } from '../services/NodeService';

describe('NodeLoader Basic Tests', () => {
  let nodeLoader: NodeLoader;
  let mockNodeService: jest.Mocked<NodeService>;

  beforeEach(() => {
    mockNodeService = {
      registerNode: jest.fn(),
      unregisterNode: jest.fn(),
      validateNodeDefinition: jest.fn()
    } as any;
    
    nodeLoader = new NodeLoader(mockNodeService, '/test/custom-nodes');
  });

  describe('constructor', () => {
    it('should create NodeLoader instance', () => {
      expect(nodeLoader).toBeInstanceOf(NodeLoader);
    });
  });

  describe('getLoadedPackages', () => {
    it('should return empty array when no packages loaded', () => {
      const packages = nodeLoader.getLoadedPackages();
      expect(packages).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources without errors', async () => {
      await expect(nodeLoader.cleanup()).resolves.not.toThrow();
    });
  });
});
