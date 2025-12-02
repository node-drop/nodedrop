import { useState, useEffect, useCallback } from 'react'

const SEARCH_HISTORY_KEY = 'marketplace-search-history'
const MAX_HISTORY_ITEMS = 5

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  // Load search history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY)
      if (saved) {
        setSearchHistory(JSON.parse(saved))
      }
    } catch (error) {
      console.warn('Failed to load search history:', error)
    }
  }, [])

  // Add a search term to history
  const addToHistory = useCallback((term: string) => {
    if (!term.trim() || term.length < 2) return

    setSearchHistory(prev => {
      // Remove if already exists
      const filtered = prev.filter(item => item !== term)
      // Add to beginning
      const newHistory = [term, ...filtered].slice(0, MAX_HISTORY_ITEMS)
      
      // Save to localStorage
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
      } catch (error) {
        console.warn('Failed to save search history:', error)
      }
      
      return newHistory
    })
  }, [])

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([])
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY)
    } catch (error) {
      console.warn('Failed to clear search history:', error)
    }
  }, [])

  return {
    searchHistory,
    addToHistory,
    clearHistory
  }
}