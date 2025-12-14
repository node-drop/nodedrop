import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'
import { Workspace, WorkspaceUsage } from '@/types/workspace'

interface WorkspaceContextValue {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  currentWorkspaceId: string | null
  usage: WorkspaceUsage | null
  isLoading: boolean
  error: string | null
  setCurrentWorkspace: (workspaceId: string | null) => void
  refreshWorkspaces: () => Promise<void>
  refreshUsage: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

interface WorkspaceProviderProps {
  children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { isAuthenticated } = useAuthStore()
  const {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    usage,
    isLoading,
    error,
    fetchWorkspaces,
    fetchUsage,
    setCurrentWorkspace,
  } = useWorkspaceStore()

  // Load workspaces when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces()
    }
  }, [isAuthenticated, fetchWorkspaces])

  // Load usage when current workspace changes
  useEffect(() => {
    if (currentWorkspaceId) {
      fetchUsage(currentWorkspaceId)
    }
  }, [currentWorkspaceId, fetchUsage])

  const refreshWorkspaces = async () => {
    await fetchWorkspaces()
  }

  const refreshUsage = async () => {
    if (currentWorkspaceId) {
      await fetchUsage(currentWorkspaceId)
    }
  }

  const value: WorkspaceContextValue = {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    usage,
    isLoading,
    error,
    setCurrentWorkspace,
    refreshWorkspaces,
    refreshUsage,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
