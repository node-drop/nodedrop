import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { workspaceService } from '@/services/workspace'
import { Workspace, WorkspaceMember, WorkspaceUsage } from '@/types/workspace'

export interface WorkspaceLimitInfo {
  allowed: boolean
  reason?: string
  currentCount: number
  maxAllowed: number
  plan: string
}

interface WorkspaceState {
  // State
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  currentWorkspaceId: string | null
  members: WorkspaceMember[]
  usage: WorkspaceUsage | null
  workspaceLimitInfo: WorkspaceLimitInfo | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchWorkspaces: () => Promise<void>
  fetchWorkspace: (id: string) => Promise<Workspace>
  fetchMembers: (workspaceId: string) => Promise<void>
  fetchUsage: (workspaceId: string) => Promise<void>
  checkCanCreateWorkspace: () => Promise<WorkspaceLimitInfo>
  setCurrentWorkspace: (workspaceId: string | null) => void
  createWorkspace: (name: string, description?: string) => Promise<Workspace>
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<Workspace>
  deleteWorkspace: (id: string) => Promise<void>
  inviteMember: (workspaceId: string, email: string, role?: string) => Promise<void>
  removeMember: (workspaceId: string, userId: string) => Promise<void>
  updateMemberRole: (workspaceId: string, userId: string, role: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  currentWorkspaceId: null,
  members: [],
  usage: null,
  workspaceLimitInfo: null,
  isLoading: false,
  error: null,
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchWorkspaces: async () => {
        set({ isLoading: true, error: null })
        try {
          const workspaces = await workspaceService.getWorkspaces()
          set({ workspaces, isLoading: false })

          const { currentWorkspaceId } = get()
          
          // If we have a currentWorkspaceId, verify it's still valid
          if (currentWorkspaceId) {
            const current = workspaces.find(w => w.id === currentWorkspaceId)
            if (current) {
              set({ currentWorkspace: current })
              return
            }
            // Current workspace ID is invalid (user doesn't have access), clear it
            console.warn('[Workspace] Stored workspace ID is invalid, selecting new default')
          }
          
          // Auto-select workspace if none selected or invalid
          if (workspaces.length > 0) {
            // Prefer workspace where user is OWNER, otherwise first one
            const ownedWorkspace = workspaces.find(w => w.userRole === 'OWNER')
            const defaultWorkspace = ownedWorkspace || workspaces[0]
            set({ 
              currentWorkspaceId: defaultWorkspace.id, 
              currentWorkspace: defaultWorkspace 
            })
          } else {
            // No workspaces available, clear current
            set({ currentWorkspaceId: null, currentWorkspace: null })
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
        }
      },

      fetchWorkspace: async (id: string) => {
        set({ isLoading: true, error: null })
        try {
          const workspace = await workspaceService.getWorkspace(id)
          set({ isLoading: false })
          return workspace
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      fetchMembers: async (workspaceId: string) => {
        set({ isLoading: true, error: null })
        try {
          const members = await workspaceService.getWorkspaceMembers(workspaceId)
          set({ members, isLoading: false })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
        }
      },

      fetchUsage: async (workspaceId: string) => {
        try {
          const usage = await workspaceService.getWorkspaceUsage(workspaceId)
          set({ usage })
        } catch (error: any) {
          console.error('Failed to fetch workspace usage:', error)
        }
      },

      setCurrentWorkspace: (workspaceId: string | null) => {
        const { workspaces } = get()
        const workspace = workspaceId ? workspaces.find(w => w.id === workspaceId) : null
        set({ currentWorkspaceId: workspaceId, currentWorkspace: workspace })
      },

      checkCanCreateWorkspace: async () => {
        try {
          const limitInfo = await workspaceService.canCreateWorkspace()
          set({ workspaceLimitInfo: limitInfo })
          return limitInfo
        } catch (error: any) {
          console.error('Failed to check workspace limit:', error)
          const fallback: WorkspaceLimitInfo = { allowed: false, reason: 'Error checking limits', currentCount: 0, maxAllowed: 0, plan: 'free' }
          set({ workspaceLimitInfo: fallback })
          return fallback
        }
      },

      createWorkspace: async (name: string, description?: string) => {
        set({ isLoading: true, error: null })
        try {
          const workspace = await workspaceService.createWorkspace({ name, description })
          set(state => ({
            workspaces: [...state.workspaces, workspace],
            isLoading: false,
          }))
          return workspace
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      updateWorkspace: async (id: string, data: Partial<Workspace>) => {
        set({ isLoading: true, error: null })
        try {
          // Filter out null values and convert to UpdateWorkspaceRequest
          const updateData = {
            ...(data.name && { name: data.name }),
            ...(data.slug && { slug: data.slug }),
            ...(data.description !== undefined && { description: data.description || undefined }),
          }
          const workspace = await workspaceService.updateWorkspace(id, updateData)
          set(state => ({
            workspaces: state.workspaces.map(w => w.id === id ? workspace : w),
            currentWorkspace: state.currentWorkspaceId === id ? workspace : state.currentWorkspace,
            isLoading: false,
          }))
          return workspace
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      deleteWorkspace: async (id: string) => {
        set({ isLoading: true, error: null })
        try {
          await workspaceService.deleteWorkspace(id)
          set(state => ({
            workspaces: state.workspaces.filter(w => w.id !== id),
            currentWorkspaceId: state.currentWorkspaceId === id ? null : state.currentWorkspaceId,
            currentWorkspace: state.currentWorkspaceId === id ? null : state.currentWorkspace,
            isLoading: false,
          }))
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      inviteMember: async (workspaceId: string, email: string, role?: string) => {
        set({ isLoading: true, error: null })
        try {
          await workspaceService.inviteMember(workspaceId, { email, role: role as any })
          set({ isLoading: false })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      removeMember: async (workspaceId: string, userId: string) => {
        set({ isLoading: true, error: null })
        try {
          await workspaceService.removeMember(workspaceId, userId)
          set(state => ({
            members: state.members.filter(m => m.userId !== userId),
            isLoading: false,
          }))
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      updateMemberRole: async (workspaceId: string, userId: string, role: string) => {
        set({ isLoading: true, error: null })
        try {
          const member = await workspaceService.updateMemberRole(workspaceId, userId, { role: role as any })
          set(state => ({
            members: state.members.map(m => m.userId === userId ? member : m),
            isLoading: false,
          }))
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspaceId,
      }),
    }
  )
)
