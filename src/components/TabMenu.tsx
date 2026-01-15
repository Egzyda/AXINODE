import React, { memo } from 'react'

export type TabType = 'domestic' | 'military' | 'diplomacy' | 'technology' | 'info'

interface TabMenuProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

interface TabConfig {
  id: TabType
  icon: string
  label: string
}

const tabs: TabConfig[] = [
  { id: 'domestic', icon: '🏠', label: '内政' },
  { id: 'military', icon: '⚔️', label: '軍事' },
  { id: 'diplomacy', icon: '🤝', label: '外交' },
  { id: 'technology', icon: '🔬', label: '技術' },
  { id: 'info', icon: '📊', label: '情報' },
]

export const TabMenu: React.FC<TabMenuProps> = memo(({ activeTab, onTabChange }) => {
  return (
    <div className="bg-panel border-t border-panel flex">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex-1 flex flex-col items-center justify-center py-3 px-2
            transition-colors
            ${activeTab === tab.id
              ? 'bg-primary-600 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }
          `}
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-xs mt-1">{tab.label}</span>
        </button>
      ))}
    </div>
  )
})

TabMenu.displayName = 'TabMenu'
