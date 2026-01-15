import React, { memo, useState } from 'react'
import type { GameState } from '@/types'
import { ProgressBar } from '@/components/common'
import { calculateCombatPower, calculateEquipmentRate } from '@/utils/calculations'

interface MilitaryTabProps {
  state: GameState
}

export const MilitaryTab: React.FC<MilitaryTabProps> = memo(({ state }) => {
  const [selectedSection, setSelectedSection] = useState<'overview' | 'units' | 'heroes'>('overview')

  const { military, resources } = state
  const equipmentRate = calculateEquipmentRate(
    military.totalSoldiers,
    resources.weapons,
    resources.armor
  )
  const combatPower = calculateCombatPower(
    military.totalSoldiers,
    equipmentRate,
    state.morale
  )

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'overview', label: '軍事概要' },
          { id: 'units', label: '兵種構成' },
          { id: 'heroes', label: '英雄' },
        ].map(section => (
          <button
            key={section.id}
            onClick={() => setSelectedSection(section.id as typeof selectedSection)}
            className={`
              flex-1 py-2 text-sm font-medium transition-colors
              ${selectedSection === section.id
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedSection === 'overview' && (
          <div className="space-y-4">
            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-3">軍事ステータス</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">総兵力</span>
                  <div className="text-2xl font-bold text-primary-400">
                    {military.totalSoldiers}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">戦闘力</span>
                  <div className="text-2xl font-bold text-red-400">
                    {combatPower}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">装備率</h3>
              <ProgressBar
                value={equipmentRate}
                color={equipmentRate >= 80 ? 'green' : equipmentRate >= 50 ? 'yellow' : 'red'}
              />
              <p className="text-xs text-gray-400 mt-2">
                武器: {resources.weapons} / 鎧: {resources.armor}
              </p>
            </div>

            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">士気</h3>
              <ProgressBar
                value={state.morale}
                color={state.morale >= 70 ? 'green' : state.morale >= 40 ? 'yellow' : 'red'}
              />
              <p className="text-xs text-gray-400 mt-2">
                {state.morale >= 80
                  ? '士気は最高です！戦闘力+15%'
                  : state.morale >= 60
                  ? '士気は良好です。'
                  : state.morale >= 40
                  ? '士気が低下しています。戦闘力-15%'
                  : '士気が非常に低いです！壊走の危険あり'}
              </p>
            </div>

            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">維持費</h3>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">兵士維持費:</span>
                  <span className="text-red-400">-{military.totalSoldiers * 5}G/月</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedSection === 'units' && (
          <div className="space-y-4">
            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-3">兵種構成</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>歩兵</span>
                    <span>{military.infantry}</span>
                  </div>
                  <ProgressBar
                    value={military.infantry}
                    max={military.totalSoldiers || 1}
                    showValue={false}
                    color="blue"
                    size="sm"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>弓兵</span>
                    <span>{military.archers}</span>
                  </div>
                  <ProgressBar
                    value={military.archers}
                    max={military.totalSoldiers || 1}
                    showValue={false}
                    color="green"
                    size="sm"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>騎兵</span>
                    <span>{military.cavalry}</span>
                  </div>
                  <ProgressBar
                    value={military.cavalry}
                    max={military.totalSoldiers || 1}
                    showValue={false}
                    color="yellow"
                    size="sm"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>魔導兵</span>
                    <span>{military.mageWarriors}</span>
                  </div>
                  <ProgressBar
                    value={military.mageWarriors}
                    max={military.totalSoldiers || 1}
                    showValue={false}
                    color="purple"
                    size="sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">兵種ボーナス</h3>
              <p className="text-xs text-gray-400">
                バランスの取れた構成で戦闘力にボーナスが付きます。
                特定の兵種に特化すると地形によって有利/不利が発生します。
              </p>
            </div>
          </div>
        )}

        {selectedSection === 'heroes' && (
          <div className="space-y-4">
            {state.heroes.length === 0 ? (
              <div className="bg-panel-dark p-3 rounded text-center">
                <p className="text-gray-400 text-sm">
                  英雄がいません。
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  英雄はランダムイベントで仲間になることがあります（確率1%）
                </p>
              </div>
            ) : (
              state.heroes.map(hero => (
                <div key={hero.id} className="bg-panel-dark p-3 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{hero.name}</div>
                      <div className="text-xs text-gray-400">Lv.{hero.level}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-red-400">戦闘力+{hero.combatPower}</div>
                      <div className="text-xs text-gray-400">{hero.salary}G/月</div>
                    </div>
                  </div>
                  <div className="text-xs">
                    <span className="text-primary-400">{hero.specialAbility.name}:</span>{' '}
                    <span className="text-gray-400">{hero.specialAbility.description}</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">忠誠度</span>
                      <span>{hero.loyalty}%</span>
                    </div>
                    <ProgressBar
                      value={hero.loyalty}
                      showValue={false}
                      color={hero.loyalty >= 70 ? 'green' : hero.loyalty >= 40 ? 'yellow' : 'red'}
                      size="sm"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
})

MilitaryTab.displayName = 'MilitaryTab'
