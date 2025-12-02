import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CustomNodesPage } from '../../pages/CustomNodesPage';

// Simple integration test to verify the page renders
describe('Custom Node System Integration', () => {
  it('should render the custom nodes page without crashing', () => {
    // This test verifies that all imports and dependencies are correctly set up
    expect(() => {
      render(
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <CustomNodesPage />
        </BrowserRouter>
      );
    }).not.toThrow();
  });

  it('should have the main page elements', () => {
    render(
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <CustomNodesPage />
      </BrowserRouter>
    );

    // Check that the main title is present
    expect(screen.getByText('Custom Nodes')).toBeInTheDocument();
    
    // Check that all tabs are present
    expect(screen.getByText('Installed Nodes')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Create Node')).toBeInTheDocument();
    expect(screen.getByText('Validate Package')).toBeInTheDocument();
  });
});
