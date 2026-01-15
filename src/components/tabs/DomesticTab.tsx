import React, { memo, useState, useCallback } from 'react'
import type { GameState } from '@/types'
import { Button, Slider, ProgressBar } from '@/components/common'
import {
  calculateFoodProduction,
  calculateOreProduction,
  calculateWeaponProduction,
  calculateFoodConsumption,
  calculateTaxIncome,
  calculateMaintenance,
} from '@/utils/calculations'
import { BUILDINGS, getAvailableBuildings } from '@/data/buildings'

interface DomesticTabProps {
  state: GameState
  onUpdatePopulation: (population: Partial<GameState['population']>) => void
  onStartConstruction: (buildingId: string) => void
}

export const DomesticTab: React.FC<DomesticTabProps> = memo(
  ({ state, onUpdatePopulation, onStartConstruction }) => {
    const [selectedSection, setSelectedSection] = useState<'population' | 'economy' | 'buildings' | 'resources'>('population')

    const totalAssignable =
      state.population.farmers +
      state.population.miners +
      state.population.craftsmen +
      state.population.merchants +
      state.population.soldiers +
      state.population.unemployed

    const handleJobChange = useCallback(
      (job: keyof GameState['population'], value: number) => {
        const currentValue = state.population[job]
        const diff = value - currentValue

        // Adjust unemployed
        const newUnemployed = state.population.unemployed - diff

        if (newUnemployed >= 0) {
          onUpdatePopulation({
            [job]: value,
            unemployed: newUnemployed,
          })
        }
      },
      [state.population, onUpdatePopulation]
    )

    const researchedTechIds = state.technologies.filter(t => t.isResearched).map(t => t.id)
    const builtBuildingIds = state.buildings.map(b => b.id)
    const availableBuildings = getAvailableBuildings(researchedTechIds, builtBuildingIds)

    // Calculate max simultaneous constructions
    const hasOrganization = researchedTechIds.includes('organization')
    const hasIndustrialization = researchedTechIds.includes('industrialization')
    const maxConstructions = hasIndustrialization ? 3 : hasOrganization ? 2 : 1
    const canBuild = state.constructionQueue.length < maxConstructions

    const foodProduction = calculateFoodProduction(state)
    const oreProduction = calculateOreProduction(state)
    const weaponProduction = calculateWeaponProduction(state)
    const foodConsumption = calculateFoodConsumption(state)

    return (
      <div className="flex flex-col h-full">
        {/* Section tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'population', label: '人口管理' },
            { id: 'economy', label: '経済状況' },
            { id: 'buildings', label: '施設建設' },
            { id: 'resources', label: '資源詳細' },
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
          {selectedSection === 'population' && (
            <div className="space-y-4">
              <div className="bg-panel-dark p-3 rounded">
                <h3 className="text-sm font-medium mb-2">職業配分</h3>
                <p className="text-xs text-gray-400 mb-4">
                  無職: {state.population.unemployed}人を配置可能
                </p>

                <div className="space-y-3">
                  <Slider
                    label="農民"
                    value={state.population.farmers}
                    max={totalAssignable}
                    onChange={v => handleJobChange('farmers', v)}
                  />
                  <Slider
                    label="鉱夫"
                    value={state.population.miners}
                    max={totalAssignable}
                    onChange={v => handleJobChange('miners', v)}
                  />
                  <Slider
                    label="職人"
                    value={state.population.craftsmen}
                    max={totalAssignable}
                    onChange={v => handleJobChange('craftsmen', v)}
                  />
                  <Slider
                    label="商人"
                    value={state.population.merchants}
                    max={totalAssignable}
                    onChange={v => handleJobChange('merchants', v)}
                  />
                  <Slider
                    label="兵士"
                    value={state.population.soldiers}
                    max={totalAssignable}
                    onChange={v => handleJobChange('soldiers', v)}
                  />
                </div>
              </div>

              <div className="bg-panel-dark p-3 rounded">
                <h3 className="text-sm font-medium mb-2">生産予測</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">食糧生産:</span>
                    <span className="text-green-400">+{foodProduction}/日</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">食糧消費:</span>
                    <span className="text-red-400">-{foodConsumption}/日</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">鉱石生産:</span>
                    <span className="text-green-400">+{oreProduction.toFixed(1)}/日</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">武器生産:</span>
                    <span className="text-green-400">+{weaponProduction.toFixed(1)}/日</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedSection === 'economy' && (
            <div className="space-y-4">
              <div className="bg-panel-dark p-3 rounded">
                <h3 className="text-sm font-medium mb-2">月次収支</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">税収:</span>
                    <span className="text-green-400">+{calculateTaxIncome(state)}G</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">維持費:</span>
                    <span className="text-red-400">-{calculateMaintenance(state)}G</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between font-medium">
                    <span>純益:</span>
                    <span
                      className={
                        calculateTaxIncome(state) - calculateMaintenance(state) >= 0
                          ? 'text-green-400'
                          : 'text-red-400'
                      }
                    >
                      {calculateTaxIncome(state) - calculateMaintenance(state)}G/月
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-panel-dark p-3 rounded">
                <h3 className="text-sm font-medium mb-2">満足度</h3>
                <ProgressBar
                  value={state.satisfaction}
                  color={
                    state.satisfaction >= 60
                      ? 'green'
                      : state.satisfaction >= 40
                      ? 'yellow'
                      : 'red'
                  }
                />
                <p className="text-xs text-gray-400 mt-2">
                  {state.satisfaction >= 70
                    ? '民衆は満足しています。人口が増加します。'
                    : state.satisfaction >= 40
                    ? '民衆は普通の状態です。'
                    : '民衆は不満を持っています！人口が減少します。'}
                </p>
              </div>
            </div>
          )}

          {selectedSection === 'buildings' && (
            <div className="space-y-4">
              {/* Construction Queue */}
              {state.constructionQueue.length > 0 && (
                <div className="bg-panel-dark p-3 rounded">
                  <h3 className="text-sm font-medium mb-2">
                    建設中 ({state.constructionQueue.length}/{maxConstructions})
                  </h3>
                  {state.constructionQueue.map((construction, index) => {
                    const building = BUILDINGS.find(b => b.id === construction.buildingId)
                    return (
                      <div key={index} className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{building?.name}</span>
                          <span className="text-gray-400">
                            残り {Math.ceil(construction.remainingTime)}秒
                          </span>
                        </div>
                        <ProgressBar
                          value={
                            building
                              ? building.buildTime - construction.remainingTime
                              : 0
                          }
                          max={building?.buildTime || 100}
                          showValue={false}
                          size="sm"
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Available Buildings */}
              <div className="bg-panel-dark p-3 rounded">
                <h3 className="text-sm font-medium mb-2">建設可能な施設</h3>
                <div className="space-y-2">
                  {availableBuildings.map(building => {
                    const canAfford =
                      state.resources.gold >= building.cost.gold &&
                      (!building.cost.ore || state.resources.ore >= building.cost.ore)

                    return (
                      <div
                        key={building.id}
                        className="flex items-center justify-between p-2 bg-gray-800 rounded"
                      >
                        <div>
                          <div className="text-sm font-medium">{building.name}</div>
                          <div className="text-xs text-gray-400">
                            {building.cost.gold}G
                            {building.cost.ore ? ` + ${building.cost.ore}鉱石` : ''}
                            {' | '}
                            {building.buildTime}秒
                          </div>
                          <div className="text-xs text-primary-400">
                            {building.effect.type === 'foodProduction' &&
                              `食糧生産+${building.effect.value}%`}
                            {building.effect.type === 'oreProduction' &&
                              `鉱石生産+${building.effect.value}%`}
                            {building.effect.type === 'weaponProduction' &&
                              `武器生産+${building.effect.value}%`}
                            {building.effect.type === 'manaGeneration' &&
                              `魔力生産+${building.effect.value}/日`}
                            {building.effect.type === 'defense' &&
                              `防御+${building.effect.value}%`}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => onStartConstruction(building.id)}
                          disabled={!canAfford || !canBuild}
                        >
                          建設
                        </Button>
                      </div>
                    )
                  })}
                  {availableBuildings.length === 0 && (
                    <p className="text-sm text-gray-400">
                      建設可能な施設がありません。技術を研究してください。
                    </p>
                  )}
                </div>
              </div>

              {/* Built Buildings */}
              {state.buildings.length > 0 && (
                <div className="bg-panel-dark p-3 rounded">
                  <h3 className="text-sm font-medium mb-2">建設済み施設</h3>
                  <div className="space-y-1">
                    {state.buildings.map((building, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm py-1"
                      >
                        <span>{building.name}</span>
                        <span className="text-xs text-gray-400">
                          {building.builtAt}日目建設
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedSection === 'resources' && (
            <div className="space-y-4">
              <div className="bg-panel-dark p-3 rounded">
                <h3 className="text-sm font-medium mb-2">資源状況</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>💰 ゴールド</span>
                      <span>{state.resources.gold.toLocaleString()}G</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>🌾 食糧</span>
                      <span>
                        {Math.floor(state.resources.food)} (
                        {Math.floor(state.resources.food / Math.max(1, foodConsumption))}日分)
                      </span>
                    </div>
                    <ProgressBar
                      value={state.resources.food}
                      max={foodConsumption * 30}
                      showValue={false}
                      color={state.resources.food / foodConsumption >= 7 ? 'green' : state.resources.food / foodConsumption >= 3 ? 'yellow' : 'red'}
                      size="sm"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>⛏️ 鉱石</span>
                      <span>{Math.floor(state.resources.ore)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>🗡️ 武器</span>
                      <span>{Math.floor(state.resources.weapons)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>🛡️ 鎧</span>
                      <span>{Math.floor(state.resources.armor)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>✨ 魔力</span>
                      <span>{Math.floor(state.resources.mana)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

DomesticTab.displayName = 'DomesticTab'
