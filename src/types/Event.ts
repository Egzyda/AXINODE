export type EventType = 'military' | 'diplomatic' | 'domestic' | 'tech' | 'important' | 'battle'
export type EventPriority = 'low' | 'normal' | 'high' | 'critical'

export interface EventActionOption {
  label: string
  actionType: string
  payload?: Record<string, unknown>
}

export interface GameEvent {
  id: string
  day: number
  time: string // HH:MM format
  type: EventType
  message: string
  icon: string // emoji
  priority: EventPriority
  requiresAction?: boolean
  actionOptions?: EventActionOption[]
  isRead?: boolean
}

export type EventFilter = EventType | 'all'
