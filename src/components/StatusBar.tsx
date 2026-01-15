import React, { memo } from 'react'
import type { GameState } from '@/types'
import {
  calculateFoodProduction,
  calculateFoodConsumption,
  calculateTaxIncome,
  calculateMaintenance,
  getFoodStatus,
  getGoldStatus,
  getSatisfactionStatus,
} from '@/utils/calculations'
import { GAME_SPEEDS } from '@/utils/constants'

interface StatusBarProps {
  state: GameState
  onSpeedChange: (speed: number) => void
  onTogglePause: () => void
}

const StatusValue: React.FC<{
  icon: string
  label: string
  value: string | number
  status?: 'safe' | 'warning' | 'danger'
  subValue?: string
}> = ({ icon, label, value, status, subValue }) => {
  const statusColors = {
    safe: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
  }

  const colorClass = status ? statusColors[status] : 'text-white'

  return (
    <div className="flex items-center gap-1">
      <span>{icon}</span>
      <span className="text-gray-400 text-xs hidden sm:inline">{label}:</span>
      <span className={`font-medium ${colorClass}`}>{value}</span>
      {subValue && <span className="text-xs text-gray-500">{subValue}</span>}
    </div>
  )
}

export const StatusBar: React.FC<StatusBarProps> = memo(
  ({ state, onSpeedChange, onTogglePause }) => {
    const foodProduction = calculateFoodProduction(state)
    const foodConsumption = calculateFoodConsumption(state)
    const netFood = foodProduction - foodConsumption

    const taxIncome = calculateTaxIncome(state)
    const maintenance = calculateMaintenance(state)
    const netIncome = taxIncome - maintenance

    const foodStatus = getFoodStatus(state.resources.food, foodConsumption)
    const goldStatus = getGoldStatus(netIncome)
    const satisfactionStatus = getSatisfactionStatus(state.satisfaction)

    return (
      <div className="bg-panel border-b border-panel p-2 flex flex-col gap-2">
        {/* Row 1: Resources */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusValue
            icon="👑"
            label="人口"
            value={state.population.total.toLocaleString()}
          />
          <StatusValue
            icon="💰"
            label="資金"
            value={`${state.resources.gold.toLocaleString()}G`}
            status={goldStatus}
            subValue={netIncome >= 0 ? `+${netIncome}/月` : `${netIncome}/月`}
          />
          <StatusValue
            icon="🌾"
            label="食糧"
            value={Math.floor(state.resources.food)}
            status={foodStatus}
            subValue={netFood >= 0 ? `+${netFood}/日` : `${netFood}/日`}
          />
        </div>

        {/* Row 2: Military & Status */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusValue
            icon="⚔️"
            label="兵力"
            value={state.military.totalSoldiers}
          />
          <StatusValue
            icon="✨"
            label="魔力"
            value={Math.floor(state.resources.mana)}
          />
          <StatusValue
            icon="😊"
            label="満足度"
            value={`${state.satisfaction}%`}
            status={satisfactionStatus}
          />
        </div>

        {/* Row 3: Time Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">⏱️</span>
            <span className="font-medium">{Math.floor(state.day)}日目</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onTogglePause}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-colors
                ${state.isPaused
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }
              `}
            >
              {state.isPaused ? '▶️ 開始' : '⏸️ 停止'}
            </button>

            <div className="flex items-center bg-gray-700 rounded overflow-hidden">
              {GAME_SPEEDS.map(speed => (
                <button
                  key={speed}
                  onClick={() => onSpeedChange(speed)}
                  className={`
                    px-2 py-1 text-xs font-medium transition-colors
                    ${state.gameSpeed === speed
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-600'
                    }
                  `}
                >
                  x{speed}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

StatusBar.displayName = 'StatusBar'
