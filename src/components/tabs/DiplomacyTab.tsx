import React, { memo, useState } from 'react'
import type { GameState, AINation } from '@/types'
import { Button, ProgressBar } from '@/components/common'
import { getPersonalityDescription } from '@/data/nations'

interface DiplomacyTabProps {
  state: GameState
}

const getRelationColor = (relation: number): string => {
  if (relation >= 50) return 'text-green-400'
  if (relation >= 20) return 'text-blue-400'
  if (relation >= -20) return 'text-gray-400'
  if (relation >= -50) return 'text-yellow-400'
  return 'text-red-400'
}

const getRelationLabel = (relation: number): string => {
  if (relation >= 80) return '同盟'
  if (relation >= 50) return '友好'
  if (relation >= 20) return '好意的'
  if (relation >= -20) return '中立'
  if (relation >= -50) return '警戒'
  return '敵対'
}

const getReputationLabel = (reputation: number): string => {
  if (reputation >= 80) return '伝説の英雄'
  if (reputation >= 50) return '名君'
  if (reputation >= 20) return '良い評判'
  if (reputation >= -20) return '普通'
  if (reputation >= -50) return '悪評'
  if (reputation >= -80) return '暴君'
  return '大悪党'
}

const NationCard: React.FC<{ nation: AINation }> = ({ nation }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-panel-dark p-3 rounded">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <div className="font-medium">{nation.name}</div>
          <div className="text-xs text-gray-400">
            {nation.personality === 'aggressive' && '征服者'}
            {nation.personality === 'cautious' && '守護者'}
            {nation.personality === 'commercial' && '商人国家'}
            {nation.personality === 'isolationist' && '隠者'}
            {nation.personality === 'opportunist' && '機会主義者'}
            {nation.personality === 'honorable' && '騎士道'}
            {nation.personality === 'fanatic' && '狂信者'}
            {nation.personality === 'scientific' && '科学国家'}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-medium ${getRelationColor(nation.relationWithPlayer)}`}>
            {getRelationLabel(nation.relationWithPlayer)}
          </div>
          <div className="text-xs text-gray-400">{nation.relationWithPlayer}</div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <span className="text-gray-400">人口:</span>
              <span className="ml-2">{nation.population.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">軍事力:</span>
              <span className="ml-2">{nation.militaryPower.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">経済力:</span>
              <span className="ml-2">{nation.economicPower.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">技術Lv:</span>
              <span className="ml-2">{nation.techLevel}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3">
            {getPersonalityDescription(nation.personality)}
          </p>

          {/* Treaties */}
          {nation.treaties.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">条約:</div>
              {nation.treaties.map((treaty, index) => (
                <div key={index} className="text-xs">
                  <span className="text-primary-400">
                    {treaty.type === 'trade' && '貿易協定'}
                    {treaty.type === 'nonAggression' && '不可侵条約'}
                    {treaty.type === 'alliance' && '軍事同盟'}
                  </span>
                  <span className="text-gray-500 ml-2">
                    残り{treaty.duration}日
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Status */}
          {nation.isAtWar && (
            <div className="text-red-400 text-xs mb-3">
              ⚔️ 戦争中
              {nation.warTarget && ` (対象: ${nation.warTarget})`}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled>
              貿易提案
            </Button>
            <Button size="sm" variant="secondary" disabled>
              不可侵
            </Button>
            <Button size="sm" variant="danger" disabled>
              宣戦布告
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const DiplomacyTab: React.FC<DiplomacyTabProps> = memo(({ state }) => {
  const [selectedSection, setSelectedSection] = useState<'reputation' | 'nations' | 'proposals'>('reputation')

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'reputation', label: '評判' },
          { id: 'nations', label: '各国関係' },
          { id: 'proposals', label: '提案' },
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
        {selectedSection === 'reputation' && (
          <div className="space-y-4">
            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">世界での評判</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{state.reputation}</span>
                <span
                  className={`
                    px-2 py-1 rounded text-sm
                    ${state.reputation >= 50 ? 'bg-green-900 text-green-400' : ''}
                    ${state.reputation < 50 && state.reputation >= -20 ? 'bg-gray-700 text-gray-300' : ''}
                    ${state.reputation < -20 ? 'bg-red-900 text-red-400' : ''}
                  `}
                >
                  {getReputationLabel(state.reputation)}
                </span>
              </div>
              <ProgressBar
                value={state.reputation + 100}
                max={200}
                showValue={false}
                color={state.reputation >= 0 ? 'green' : 'red'}
              />
            </div>

            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">評判の効果</h3>
              <div className="text-sm text-gray-400 space-y-1">
                {state.reputation >= 80 && (
                  <p>• 移民が殺到します (+20人/月)</p>
                )}
                {state.reputation >= 50 && (
                  <p>• 外交成功率 +15%</p>
                )}
                {state.reputation < -20 && state.reputation >= -50 && (
                  <p>• 同盟が組みにくくなります</p>
                )}
                {state.reputation < -50 && (
                  <p>• 複数国家が敵対する可能性</p>
                )}
                {state.reputation < -80 && (
                  <p>• 全世界の敵になりました！</p>
                )}
              </div>
            </div>

            <div className="bg-panel-dark p-3 rounded">
              <h3 className="text-sm font-medium mb-2">評判変動の要因</h3>
              <div className="text-xs text-gray-400 space-y-1">
                <p>• 戦争勝利: +5</p>
                <p>• 約束履行: +10</p>
                <p>• 強大国に勝利: +20</p>
                <p>• 戦争敗北: -3</p>
                <p>• 弱小国侵略: -15</p>
                <p>• 約束破棄: -30</p>
              </div>
            </div>
          </div>
        )}

        {selectedSection === 'nations' && (
          <div className="space-y-3">
            {state.aiNations.map(nation => (
              <NationCard key={nation.id} nation={nation} />
            ))}
          </div>
        )}

        {selectedSection === 'proposals' && (
          <div className="space-y-4">
            <div className="bg-panel-dark p-3 rounded text-center">
              <p className="text-gray-400 text-sm">
                外交提案はありません
              </p>
              <p className="text-xs text-gray-500 mt-2">
                他国からの提案がここに表示されます
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

DiplomacyTab.displayName = 'DiplomacyTab'
