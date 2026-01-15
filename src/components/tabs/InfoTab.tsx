import React, { memo, useState } from 'react'
import type { GameState } from '@/types'

interface InfoTabProps {
  state: GameState
}

export const InfoTab: React.FC<InfoTabProps> = memo(({ state }) => {
  const [selectedSection, setSelectedSection] = useState<'world' | 'stats' | 'personnel' | 'achievements'>('world')

  // Calculate rankings
  const allPowers = [
    { name: 'プレイヤー', power: state.military.totalSoldiers * 10 },
    ...state.aiNations.map(n => ({ name: n.name, power: n.militaryPower })),
  ].sort((a, b) => b.power - a.power)

  const playerRank = allPowers.findIndex(p => p.name === 'プレイヤー') + 1
  const strongestNation = allPowers[0]
  const weakestNation = allPowers[allPowers.length - 1]

  const warsInProgress = state.aiNations.filter(n => n.isAtWar).length

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'world', label: '世界情勢' },
          { id: 'stats', label: '統計' },
          { id: 'personnel', label: '人材' },
          { id: 'achievements', label: '実績' },
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
        {selectedSection === 'world' && (
          <div className="space-y-4">
            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-3">世界の状況</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">現在日数</span>
                  <div className="text-xl font-bold">{Math.floor(state.day)}日目</div>
                </div>
                <div>
                  <span className="text-gray-400">国家数</span>
                  <div className="text-xl font-bold">{state.aiNations.length + 1}</div>
                </div>
                <div>
                  <span className="text-gray-400">戦争中</span>
                  <div className="text-xl font-bold text-red-400">{warsInProgress}件</div>
                </div>
                <div>
                  <span className="text-gray-400">あなたの順位</span>
                  <div className="text-xl font-bold text-primary-400">
                    {playerRank}/{allPowers.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">勢力ランキング</h3>
              <div className="space-y-2">
                {allPowers.slice(0, 5).map((power, index) => (
                  <div
                    key={power.name}
                    className={`
                      flex justify-between text-sm p-2 rounded
                      ${power.name === 'プレイヤー' ? 'bg-primary-900/30' : 'bg-gray-800'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-4">{index + 1}.</span>
                      <span className={power.name === 'プレイヤー' ? 'text-primary-400' : ''}>
                        {power.name}
                      </span>
                    </div>
                    <span className="text-gray-400">戦力: {power.power}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">最強/最弱国家</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">最強</span>
                  <div className="text-green-400">{strongestNation.name}</div>
                  <div className="text-xs text-gray-500">戦力: {strongestNation.power}</div>
                </div>
                <div>
                  <span className="text-gray-400">最弱</span>
                  <div className="text-red-400">{weakestNation.name}</div>
                  <div className="text-xs text-gray-500">戦力: {weakestNation.power}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedSection === 'stats' && (
          <div className="space-y-4">
            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-3">基本統計</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">総人口:</span>
                  <span>{state.population.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">総兵力:</span>
                  <span>{state.military.totalSoldiers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">総資産:</span>
                  <span>{state.resources.gold.toLocaleString()}G</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">取得技術数:</span>
                  <span>{state.technologies.filter(t => t.isResearched).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">建設済み施設:</span>
                  <span>{state.buildings.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">プレイ統計</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">クリア回数:</span>
                  <span>{state.permanent.clearCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">総プレイ時間:</span>
                  <span>{Math.floor(state.permanent.totalPlaytime / 60)}分</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">永続ポイント:</span>
                  <span>{state.permanent.points}pt</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedSection === 'personnel' && (
          <div className="space-y-4">
            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">英雄 ({state.heroes.length})</h3>
              {state.heroes.length === 0 ? (
                <p className="text-gray-400 text-sm">英雄がいません</p>
              ) : (
                state.heroes.map(hero => (
                  <div key={hero.id} className="py-2 border-b border-gray-700 last:border-0">
                    <div className="flex justify-between">
                      <span>{hero.name}</span>
                      <span className="text-xs text-gray-400">Lv.{hero.level}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      戦闘力+{hero.combatPower} | {hero.specialAbility.name}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">熟練者 ({state.specialists.length})</h3>
              {state.specialists.length === 0 ? (
                <p className="text-gray-400 text-sm">熟練者がいません</p>
              ) : (
                state.specialists.map(specialist => (
                  <div key={specialist.id} className="py-2 border-b border-gray-700 last:border-0">
                    <div className="flex justify-between">
                      <span>{specialist.name}</span>
                      <span className="text-xs text-gray-400">{specialist.salary}G/月</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {specialist.bonus.type}: +{specialist.bonus.value}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {selectedSection === 'achievements' && (
          <div className="space-y-4">
            <div className="bg-panel-dark p-3 rounded text-center">
              <p className="text-gray-400 text-sm">実績システムは準備中です</p>
              <p className="text-xs text-gray-500 mt-2">
                Phase 4で実装予定
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

InfoTab.displayName = 'InfoTab'
