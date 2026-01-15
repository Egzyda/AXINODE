import { useState, useCallback } from 'react'
import { StatusBar } from '@/components/StatusBar'
import { TabMenu, TabType } from '@/components/TabMenu'
import { LogWindow } from '@/components/LogWindow'
import { DomesticTab, MilitaryTab, DiplomacyTab, TechnologyTab, InfoTab } from '@/components/tabs'
import { useGameState, useGameLoop } from '@/hooks'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('domestic')
  const { state, actions } = useGameState()

  // Game loop
  const handleTick = useCallback(
    (deltaTime: number) => {
      actions.tick(deltaTime)
    },
    [actions]
  )

  useGameLoop(handleTick, !state.isPaused)

  // Render active tab
  const renderTab = () => {
    switch (activeTab) {
      case 'domestic':
        return (
          <DomesticTab
            state={state}
            onUpdatePopulation={actions.updatePopulation}
            onStartConstruction={actions.startConstruction}
          />
        )
      case 'military':
        return <MilitaryTab state={state} />
      case 'diplomacy':
        return <DiplomacyTab state={state} />
      case 'technology':
        return (
          <TechnologyTab
            state={state}
            onStartResearch={actions.startResearch}
          />
        )
      case 'info':
        return <InfoTab state={state} />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Status Bar */}
      <StatusBar
        state={state}
        onSpeedChange={actions.setGameSpeed}
        onTogglePause={actions.togglePause}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">{renderTab()}</main>

      {/* Log Window */}
      <LogWindow events={state.eventLog} />

      {/* Tab Menu */}
      <TabMenu activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
