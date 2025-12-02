import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CustomNodeList } from '../../../components/customNode/CustomNodeList';
import { useCustomNodeStore } from '../../../stores/customNode';

// Mock the store
vi.mock('../../../stores/customNode');

const mockUseCustomNodeStore = useCustomNodeStore as any;

describe('CustomNodeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no packages are loaded', () => {
    mockUseCustomNodeStore.mockReturnValue({
      packages: [],
      unloadPackage: vi.fn(),
      reloadPackage: vi.fn()
    });

    render(<CustomNodeList />);

    expect(screen.getByText('No custom nodes installed')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating a new node or installing one from the marketplace.')).toBeInTheDocument();
  });

  it('renders package list when packages are loaded', () => {
    const mockPackages = [
      {
        name: 'test-package',
        version: '1.0.0',
        description: 'A test package',
        main: 'index.js',
        nodes: ['nodes/TestNode.js'],
        author: 'Test Author'
      }
    ];

    mockUseCustomNodeStore.mockReturnValue({
      packages: mockPackages,
      unloadPackage: vi.fn(),
      reloadPackage: vi.fn()
    });

    render(<CustomNodeList />);

    expect(screen.getByText('test-package')).toBeInTheDocument();
    expect(screen.getByText('A test package')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('1 node')).toBeInTheDocument();
  });

  it('renders reload and unload buttons', () => {
    const mockPackages = [
      {
        name: 'test-package',
        version: '1.0.0',
        description: 'A test package',
        main: 'index.js',
        nodes: ['nodes/TestNode.js'],
        author: 'Test Author'
      }
    ];

    mockUseCustomNodeStore.mockReturnValue({
      packages: mockPackages,
      unloadPackage: vi.fn(),
      reloadPackage: vi.fn()
    });

    render(<CustomNodeList />);

    expect(screen.getByText('Reload')).toBeInTheDocument();
    expect(screen.getByText('Unload')).toBeInTheDocument();
  });
});
