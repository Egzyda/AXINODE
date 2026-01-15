import { useEffect, useRef, useCallback } from 'react'

export function useGameLoop(callback: (deltaTime: number) => void, isActive: boolean = true) {
  const callbackRef = useRef(callback)
  const previousTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const animate = useCallback((currentTime: number) => {
    if (previousTimeRef.current !== null) {
      const deltaTime = (currentTime - previousTimeRef.current) / 1000 // Convert to seconds
      callbackRef.current(deltaTime)
    }
    previousTimeRef.current = currentTime
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (isActive) {
      previousTimeRef.current = null
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive, animate])

  // Return a function to manually stop the loop
  const stop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  return { stop }
}
