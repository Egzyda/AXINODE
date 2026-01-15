import React, { memo, useState } from 'react'
import type { GameState, TechnologyCategory } from '@/types'
import { Button, ProgressBar } from '@/components/common'
import { TECHNOLOGIES, getAvailableTechnologies, getTechnologiesByCategory } from '@/data/technologies'

interface TechnologyTabProps {
  state: GameState
  onStartResearch: (technologyId: string) => void
}

const categoryLabels: Record<TechnologyCategory, string> = {
  agriculture: '農業',
  military: '軍事',
  magic: '魔法',
  economy: '経済',
  industry: '工業',
  fantasy: '未来',
}

const categoryIcons: Record<TechnologyCategory, string> = {
  agriculture: '🌾',
  military: '⚔️',
  magic: '✨',
  economy: '💰',
  industry: '⚙️',
  fantasy: '🚀',
}

export const TechnologyTab: React.FC<TechnologyTabProps> = memo(({ state, onStartResearch }) => {
  const [selectedCategory, setSelectedCategory] = useState<TechnologyCategory | 'researching' | 'completed'>('researching')

  const researchedTechIds = state.technologies.filter(t => t.isResearched).map(t => t.id)
  const availableTechnologies = getAvailableTechnologies(researchedTechIds)
  const categories: TechnologyCategory[] = ['agriculture', 'military', 'magic', 'economy', 'industry', 'fantasy']

  // Check if can start new research
  const hasAcademicFreedom = researchedTechIds.includes('academic_freedom')
  const maxResearch = hasAcademicFreedom ? 2 : 1
  const canResearch = state.researchQueue.length < maxResearch

  return (
    <div className="flex flex-col h-full">
      {/* Category tabs */}
      <div className="flex flex-wrap border-b border-gray-700">
        <button
          onClick={() => setSelectedCategory('researching')}
          className={`
            px-3 py-2 text-sm font-medium transition-colors
            ${selectedCategory === 'researching'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-white'
            }
          `}
        >
          研究中
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`
              px-3 py-2 text-sm font-medium transition-colors
              ${selectedCategory === category
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            {categoryIcons[category]} {categoryLabels[category]}
          </button>
        ))}
        <button
          onClick={() => setSelectedCategory('completed')}
          className={`
            px-3 py-2 text-sm font-medium transition-colors
            ${selectedCategory === 'completed'
              ? 'text-primary-400 border-b-2 border-primary-400'
              : 'text-gray-400 hover:text-white'
            }
          `}
        >
          取得済み
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedCategory === 'researching' && (
          <div className="space-y-4">
            {state.researchQueue.length === 0 ? (
              <div className="bg-panel-dark p-3 rounded text-center">
                <p className="text-gray-400 text-sm">研究中の技術はありません</p>
                <p className="text-xs text-gray-500 mt-2">
                  カテゴリを選択して研究を開始してください
                </p>
              </div>
            ) : (
              state.researchQueue.map((research, index) => {
                const tech = TECHNOLOGIES.find(t => t.id === research.technologyId)
                if (!tech) return null

                const progress = tech.researchTime - research.remainingTime
                const percentage = (progress / tech.researchTime) * 100

                return (
                  <div key={index} className="bg-panel-dark p-3 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{tech.name}</div>
                        <div className="text-xs text-gray-400">
                          {categoryIcons[tech.category]} {categoryLabels[tech.category]} | Tier {tech.tier}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          残り {Math.ceil(research.remainingTime)}秒
                        </div>
                      </div>
                    </div>
                    <ProgressBar
                      value={percentage}
                      showValue={false}
                      color="blue"
                    />
                    <p className="text-xs text-gray-400 mt-2">{tech.description}</p>
                  </div>
                )
              })
            )}

            {state.researchQueue.length < maxResearch && (
              <div className="bg-panel-dark p-3 rounded">
                <p className="text-sm text-gray-400">
                  あと {maxResearch - state.researchQueue.length} つの研究を同時に行えます
                </p>
              </div>
            )}
          </div>
        )}

        {selectedCategory === 'completed' && (
          <div className="space-y-2">
            {state.technologies.filter(t => t.isResearched).length === 0 ? (
              <div className="bg-panel-dark p-3 rounded text-center">
                <p className="text-gray-400 text-sm">取得済みの技術はありません</p>
              </div>
            ) : (
              state.technologies
                .filter(t => t.isResearched)
                .map(tech => (
                  <div key={tech.id} className="bg-panel-dark p-3 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-green-400">✓ {tech.name}</div>
                        <div className="text-xs text-gray-400">
                          {categoryIcons[tech.category]} {categoryLabels[tech.category]} | Tier {tech.tier}
                        </div>
                      </div>
                      {tech.researchedAt && (
                        <div className="text-xs text-gray-500">
                          {tech.researchedAt}日目取得
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{tech.description}</p>
                  </div>
                ))
            )}
          </div>
        )}

        {categories.includes(selectedCategory as TechnologyCategory) && (
          <div className="space-y-2">
            {getTechnologiesByCategory(selectedCategory as TechnologyCategory).map(techDef => {
              const tech = state.technologies.find(t => t.id === techDef.id)
              const isResearched = tech?.isResearched
              const isResearching = state.researchQueue.some(r => r.technologyId === techDef.id)
              const isAvailable = availableTechnologies.some(t => t.id === techDef.id)
              const canAfford =
                state.resources.gold >= techDef.cost.gold &&
                (!techDef.cost.mana || state.resources.mana >= techDef.cost.mana)

              return (
                <div
                  key={techDef.id}
                  className={`
                    p-3 rounded
                    ${isResearched ? 'bg-green-900/30' : 'bg-panel-dark'}
                    ${!isResearched && !isAvailable ? 'opacity-50' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className={`font-medium ${isResearched ? 'text-green-400' : ''}`}>
                        {isResearched && '✓ '}
                        {techDef.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        Tier {techDef.tier} | {techDef.cost.gold}G
                        {techDef.cost.mana ? ` + ${techDef.cost.mana}魔力` : ''}
                        {' | '}
                        {techDef.researchTime}秒
                      </div>
                    </div>
                    {!isResearched && !isResearching && (
                      <Button
                        size="sm"
                        onClick={() => onStartResearch(techDef.id)}
                        disabled={!isAvailable || !canAfford || !canResearch}
                      >
                        研究
                      </Button>
                    )}
                    {isResearching && (
                      <span className="text-xs text-primary-400 px-2 py-1 bg-primary-900/30 rounded">
                        研究中...
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{techDef.description}</p>
                  {techDef.prerequisite && !isResearched && (
                    <div className="text-xs text-yellow-400 mt-1">
                      前提: {techDef.prerequisite.map(p => {
                        const prereq = TECHNOLOGIES.find(t => t.id === p)
                        return prereq?.name || p
                      }).join(', ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})

TechnologyTab.displayName = 'TechnologyTab'
