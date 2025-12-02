import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ToastContainer } from '@/components/ui/Toast'
import { useGlobalToast } from '@/hooks/useToast'
import { socketService } from '@/services/socket'
import { useAuthStore } from '@/stores'
import React, { useEffect } from 'react'

interface BaseLayoutProps {
  children: React.ReactNode
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  const { token, isAuthenticated } = useAuthStore()
  const { toasts } = useGlobalToast()

  useEffect(() => {
    // Initialize socket connection when user is authenticated
    if (isAuthenticated && token) {
      socketService.initialize(token)
    } else {
      // Disconnect socket when user is not authenticated
      socketService.disconnect()
    }
  }, [isAuthenticated, token])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "356px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
      <ToastContainer toasts={toasts} position="top-right" />
    </SidebarProvider>
  )
}