import { useCallback } from 'react'
import type { GameState } from '@/types'

const SAVE_KEY = 'axinode_save'

export function useStorage() {
  const saveGame = useCallback(async (state: GameState): Promise<boolean> => {
    try {
      const saveData = JSON.stringify(state)
      localStorage.setItem(SAVE_KEY, saveData)
      return true
    } catch (error) {
      console.error('Failed to save game:', error)
      return false
    }
  }, [])

  const loadGame = useCallback(async (): Promise<GameState | null> => {
    try {
      const saveData = localStorage.getItem(SAVE_KEY)
      if (!saveData) return null
      return JSON.parse(saveData) as GameState
    } catch (error) {
      console.error('Failed to load game:', error)
      return null
    }
  }, [])

  const deleteSave = useCallback(async (): Promise<boolean> => {
    try {
      localStorage.removeItem(SAVE_KEY)
      return true
    } catch (error) {
      console.error('Failed to delete save:', error)
      return false
    }
  }, [])

  const hasSave = useCallback((): boolean => {
    return localStorage.getItem(SAVE_KEY) !== null
  }, [])

  return { saveGame, loadGame, deleteSave, hasSave }
}
