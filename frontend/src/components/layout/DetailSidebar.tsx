import { Button } from '@/components/ui/button'
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
} from '@/components/ui/sidebar'
import { ArrowLeft } from 'lucide-react'
import React from 'react'

export interface DetailSidebarProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  showBackButton?: boolean
  backButtonText?: string
}

export function DetailSidebar({
  isOpen,
  onClose,
  title,
  children,
  showBackButton = true,
  backButtonText = "Back"
}: DetailSidebarProps) {
  if (!isOpen) return null

  return (
    <Sidebar collapsible="none" className="flex-1 border-l">
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex items-center gap-2 -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {backButtonText}
            </Button>
          )}
          <div className="flex-1 text-center">
            <div className="text-foreground text-base font-medium">
              {title}
            </div>
          </div>
          {showBackButton && <div className="w-16" />} {/* Spacer for centering */}
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0">
        {children}
      </SidebarContent>
    </Sidebar>
  )
}
