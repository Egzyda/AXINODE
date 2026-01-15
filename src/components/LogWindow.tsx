import React, { memo, useState } from 'react'
import type { GameEvent, EventFilter } from '@/types'

interface LogWindowProps {
  events: GameEvent[]
}

const eventTypeIcons: Record<string, string> = {
  military: '⚔️',
  diplomatic: '💬',
  domestic: '📈',
  tech: '🔬',
  important: '🚨',
  battle: '⚔️',
}

const filters: { id: EventFilter; label: string }[] = [
  { id: 'all', label: '全て' },
  { id: 'important', label: '重要' },
  { id: 'military', label: '軍事' },
  { id: 'diplomatic', label: '外交' },
  { id: 'domestic', label: '内政' },
  { id: 'tech', label: '技術' },
]

export const LogWindow: React.FC<LogWindowProps> = memo(({ events }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filter, setFilter] = useState<EventFilter>('all')

  const filteredEvents =
    filter === 'all' ? events : events.filter(e => e.type === filter || e.priority === 'critical')

  const displayEvents = isExpanded ? filteredEvents.slice(0, 50) : filteredEvents.slice(0, 3)

  return (
    <div
      className={`
        bg-panel border-t border-panel flex flex-col
        transition-all duration-300
        ${isExpanded ? 'h-72' : 'h-24'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span>📰</span>
          <span className="font-medium text-sm">ログ</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? '▲ 折りたたむ' : '▼ 展開'}
        </button>
      </div>

      {/* Filter (expanded only) */}
      {isExpanded && (
        <div className="flex items-center gap-1 px-3 py-1 bg-gray-800">
          <span className="text-xs text-gray-400 mr-2">フィルター:</span>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`
                px-2 py-0.5 text-xs rounded transition-colors
                ${filter === f.id
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Event List */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {displayEvents.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">
            ログがありません
          </div>
        ) : (
          displayEvents.map(event => (
            <div
              key={event.id}
              className={`
                flex items-start gap-2 py-1 text-sm border-b border-gray-800 last:border-0
                ${event.priority === 'critical' ? 'text-red-400' : ''}
                ${event.priority === 'high' ? 'text-yellow-400' : ''}
              `}
            >
              <span className="opacity-60">{event.icon || eventTypeIcons[event.type]}</span>
              <span className="text-gray-500 text-xs min-w-[50px]">
                {event.day}日 {event.time}
              </span>
              <span className="flex-1">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

LogWindow.displayName = 'LogWindow'
