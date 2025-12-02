import { userService } from '@/services'
import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  effectiveTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or default to 'system'
    const stored = localStorage.getItem('theme') as Theme
    return stored || 'system'
  })

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light')

  // Load theme from database on mount - only listen for auth store events
  useEffect(() => {
    // Listen for theme loaded event from auth store
    const handleThemeLoaded = (event: CustomEvent<Theme>) => {
      setThemeState(event.detail)
    }

    window.addEventListener('theme-loaded', handleThemeLoaded as EventListener)
    return () => {
      window.removeEventListener('theme-loaded', handleThemeLoaded as EventListener)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement

    // Function to determine the effective theme
    const getEffectiveTheme = (): 'light' | 'dark' => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return theme
    }

    const updateTheme = () => {
      const effective = getEffectiveTheme()
      setEffectiveTheme(effective)
      
      // Remove both classes first
      root.classList.remove('light', 'dark')
      // Add the effective theme class
      root.classList.add(effective)
    }

    // Initial update
    updateTheme()

    // Listen for system theme changes when in 'system' mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateTheme()
      
      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange)
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange)
        } else {
          mediaQuery.removeListener(handleChange)
        }
      }
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    
    // Save theme to database preferences
    userService.patchPreferences({ theme: newTheme }).catch((error) => {
      console.error('Failed to save theme preference:', error)
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
