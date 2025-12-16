import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useTeamStore } from '@/stores/team'
import { useAuthStore } from '@/stores/auth'
import { editionConfig } from '@/config/edition'
import { Team } from '@/types'

interface TeamContextValue {
  teams: Team[]
  currentTeam: Team | null
  currentTeamId: string | null
  isLoading: boolean
  error: string | null
  setCurrentTeam: (teamId: string | null) => void
  refreshTeams: () => Promise<void>
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined)

interface TeamProviderProps {
  children: ReactNode
}

export function TeamProvider({ children }: TeamProviderProps) {
  const { isAuthenticated } = useAuthStore()
  const {
    teams,
    currentTeam,
    currentTeamId,
    isLoading,
    error,
    fetchTeams,
    setCurrentTeam,
  } = useTeamStore()

  // Load teams when user is authenticated (only if team collaboration feature is enabled)
  useEffect(() => {
    if (isAuthenticated && editionConfig.isFeatureEnabled('teamCollaboration')) {
      fetchTeams()
    }
  }, [isAuthenticated, fetchTeams])

  // Load current team from localStorage on mount
  useEffect(() => {
    const savedTeamId = localStorage.getItem('currentTeamId')
    if (savedTeamId && savedTeamId !== 'null') {
      // Validate that the saved team still exists in the teams list
      const teamExists = teams.some(t => t.id === savedTeamId)
      if (teamExists) {
        setCurrentTeam(savedTeamId)
      } else {
        // Clear invalid team from localStorage
        localStorage.removeItem('currentTeamId')
        setCurrentTeam(null)
      }
    }
  }, [setCurrentTeam, teams])

  // Save current team to localStorage when it changes
  useEffect(() => {
    if (currentTeamId) {
      localStorage.setItem('currentTeamId', currentTeamId)
    } else {
      localStorage.removeItem('currentTeamId')
    }
  }, [currentTeamId])

  const refreshTeams = async () => {
    // Only fetch teams if feature is enabled
    if (editionConfig.isFeatureEnabled('teamCollaboration')) {
      await fetchTeams()
    }
  }

  const value: TeamContextValue = {
    teams,
    currentTeam,
    currentTeamId,
    isLoading,
    error,
    setCurrentTeam,
    refreshTeams,
  }

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam() {
  const context = useContext(TeamContext)
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider')
  }
  return context
}
