import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'

// Mock the Header component
vi.mock('@/components/layout/Header', () => ({
  Header: () => <div data-testid="header">Header</div>
}))

describe('Layout', () => {
  const renderLayout = () => {
    return render(
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Layout />
      </BrowserRouter>
    )
  }

  it('should render with full height layout', () => {
    const { container } = renderLayout()
    
    // Check that the main container has full height classes
    const mainContainer = container.querySelector('.h-screen.bg-gray-50.flex.flex-col')
    expect(mainContainer).toBeInTheDocument()
  })

  it('should render header', () => {
    renderLayout()
    
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('should render main content area with proper flex classes', () => {
    const { container } = renderLayout()
    
    // Check that main has flex-1 and overflow-hidden for full height layout
    const mainElement = container.querySelector('main.flex-1.overflow-hidden')
    expect(mainElement).toBeInTheDocument()
  })

  it('should have proper structure for full-height pages', () => {
    const { container } = renderLayout()
    
    // The layout should be: div.h-screen > header + main.flex-1
    const layoutContainer = container.firstChild
    expect(layoutContainer).toHaveClass('h-screen', 'bg-gray-50', 'flex', 'flex-col')
    
    const header = layoutContainer?.firstChild
    const main = layoutContainer?.lastChild
    
    expect(main).toHaveClass('flex-1', 'overflow-hidden')
  })
})
