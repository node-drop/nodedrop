import { describe, it, expect } from 'vitest';
import { CustomNodeService } from '../../services/customNode';

describe('CustomNodeService', () => {
  it('should create an instance', () => {
    const service = new CustomNodeService();
    expect(service).toBeInstanceOf(CustomNodeService);
  });

  it('should have all required methods', () => {
    const service = new CustomNodeService();
    
    expect(typeof service.getLoadedPackages).toBe('function');
    expect(typeof service.validatePackage).toBe('function');
    expect(typeof service.loadPackage).toBe('function');
    expect(typeof service.unloadPackage).toBe('function');
    expect(typeof service.reloadPackage).toBe('function');
    expect(typeof service.generatePackage).toBe('function');
    expect(typeof service.compilePackage).toBe('function');
    expect(typeof service.searchMarketplace).toBe('function');
    expect(typeof service.getPackageInfo).toBe('function');
    expect(typeof service.installPackage).toBe('function');
    expect(typeof service.updatePackage).toBe('function');
    expect(typeof service.publishPackage).toBe('function');
  });
});
