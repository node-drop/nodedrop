import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CustomNodesPage } from '../../pages/CustomNodesPage';
import { useCustomNodeStore } from '../../stores/customNode';

// Mock the store
vi.mock('../../stores/customNode');

const mockUseCustomNodeStore = useCustomNodeStore as any;

// Mock the child components
vi.mock('../../components/customNode/CustomNodeList', () => ({
  CustomNodeList: () => <div data-testid="custom-node-list">Custom Node List</div>
}));

vi.mock('../../components/customNode/NodeTemplateGenerator', () => ({
  NodeTemplateGenerator: () => <div data-testid="node-template-generator">Node Template Generator</div>
}));

vi.mock('../../components/customNode/NodeMarketplace', () => ({
  NodeMarketplace: () => <div data-testid="node-marketplace">Node Marketplace</div>
}));

vi.mock('../../components/customNode/PackageValidator', () => ({
  PackageValidator: () => <div data-testid="package-validator">Package Validator</div>
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {component}
    </BrowserRouter>
  );
};

describe('CustomNodesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseCustomNodeStore.mockReturnValue({
      packages: [],
      loading: false,
      error: null,
      searchResults: null,
      searchLoading: false,
      selectedPackage: null,
      loadPackages: vi.fn(),
      validatePackage: vi.fn(),
      loadPackage: vi.fn(),
      unloadPackage: vi.fn(),
      reloadPackage: vi.fn(),
      generatePackage: vi.fn(),
      compilePackage: vi.fn(),
      searchMarketplace: vi.fn(),
      getPackageInfo: vi.fn(),
      installPackage: vi.fn(),
      updatePackage: vi.fn(),
      publishPackage: vi.fn(),
      clearError: vi.fn(),
      setSelectedPackage: vi.fn()
    });
  });

  it('renders the page title and description', () => {
    renderWithRouter(<CustomNodesPage />);

    expect(screen.getByText('Custom Nodes')).toBeInTheDocument();
    expect(screen.getByText('Manage, create, and discover custom nodes for your workflows')).toBeInTheDocument();
  });

  it('renders all navigation tabs', () => {
    renderWithRouter(<CustomNodesPage />);

    expect(screen.getByText('📦')).toBeInTheDocument();
    expect(screen.getByText('Installed Nodes')).toBeInTheDocument();
    expect(screen.getByText('🏪')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
    expect(screen.getByText('Create Node')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.getByText('Validate Package')).toBeInTheDocument();
  });

  it('renders the installed nodes tab by default', () => {
    renderWithRouter(<CustomNodesPage />);

    expect(screen.getByTestId('custom-node-list')).toBeInTheDocument();
  });

  it('displays error message when there is an error', () => {
    mockUseCustomNodeStore.mockReturnValue({
      packages: [],
      loading: false,
      error: 'Test error message',
      searchResults: null,
      searchLoading: false,
      selectedPackage: null,
      loadPackages: vi.fn(),
      validatePackage: vi.fn(),
      loadPackage: vi.fn(),
      unloadPackage: vi.fn(),
      reloadPackage: vi.fn(),
      generatePackage: vi.fn(),
      compilePackage: vi.fn(),
      searchMarketplace: vi.fn(),
      getPackageInfo: vi.fn(),
      installPackage: vi.fn(),
      updatePackage: vi.fn(),
      publishPackage: vi.fn(),
      clearError: vi.fn(),
      setSelectedPackage: vi.fn()
    });

    renderWithRouter(<CustomNodesPage />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('displays loading state when loading', () => {
    mockUseCustomNodeStore.mockReturnValue({
      packages: [],
      loading: true,
      error: null,
      searchResults: null,
      searchLoading: false,
      selectedPackage: null,
      loadPackages: vi.fn(),
      validatePackage: vi.fn(),
      loadPackage: vi.fn(),
      unloadPackage: vi.fn(),
      reloadPackage: vi.fn(),
      generatePackage: vi.fn(),
      compilePackage: vi.fn(),
      searchMarketplace: vi.fn(),
      getPackageInfo: vi.fn(),
      installPackage: vi.fn(),
      updatePackage: vi.fn(),
      publishPackage: vi.fn(),
      clearError: vi.fn(),
      setSelectedPackage: vi.fn()
    });

    renderWithRouter(<CustomNodesPage />);

    expect(screen.getByText('Loading packages...')).toBeInTheDocument();
  });
});
