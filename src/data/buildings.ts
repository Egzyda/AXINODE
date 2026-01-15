import type { BuildingDefinition } from '@/types'

export const BUILDINGS: BuildingDefinition[] = [
  // Tier 1 - Early game
  {
    id: 'farm_lv1',
    name: '農場Lv1',
    description: '食糧生産を増加させる基本的な農業施設',
    level: 1,
    tier: 1,
    cost: { gold: 100 },
    buildTime: 30,
    effect: { type: 'foodProduction', value: 50 },
  },
  {
    id: 'mine_lv1',
    name: '鉱山Lv1',
    description: '鉱石を採掘する施設',
    level: 1,
    tier: 1,
    cost: { gold: 150 },
    buildTime: 45,
    effect: { type: 'oreProduction', value: 100 },
  },
  {
    id: 'workshop_lv1',
    name: '工房Lv1',
    description: '武器や装備を製造する施設',
    level: 1,
    tier: 1,
    cost: { gold: 200 },
    buildTime: 60,
    effect: { type: 'weaponProduction', value: 50 },
  },

  // Tier 2 - Mid game
  {
    id: 'farm_lv2',
    name: '農場Lv2',
    description: '大規模な農業施設',
    level: 2,
    tier: 2,
    cost: { gold: 500, ore: 20 },
    buildTime: 90,
    effect: { type: 'foodProduction', value: 100 },
    prerequisite: ['farm_lv1'],
  },
  {
    id: 'mine_lv2',
    name: '鉱山Lv2',
    description: '大規模な採掘施設',
    level: 2,
    tier: 2,
    cost: { gold: 600, ore: 30 },
    buildTime: 100,
    effect: { type: 'oreProduction', value: 200 },
    prerequisite: ['mine_lv1'],
  },
  {
    id: 'workshop_lv2',
    name: '工房Lv2',
    description: '大規模な製造施設',
    level: 2,
    tier: 2,
    cost: { gold: 700, ore: 25 },
    buildTime: 110,
    effect: { type: 'weaponProduction', value: 100 },
    prerequisite: ['workshop_lv1'],
  },
  {
    id: 'market',
    name: '市場',
    description: '交易と税収を強化する施設',
    level: 1,
    tier: 2,
    cost: { gold: 800 },
    buildTime: 120,
    effect: { type: 'tradeBonus', value: 20 },
    maxCount: 1,
  },
  {
    id: 'barracks',
    name: '兵舎',
    description: '兵士の訓練速度と士気を上昇させる',
    level: 1,
    tier: 2,
    cost: { gold: 1000 },
    buildTime: 150,
    effect: { type: 'trainingSpeed', value: 50 },
    maxCount: 1,
  },
  {
    id: 'training_ground',
    name: '訓練場',
    description: '士気を上昇させる施設',
    level: 1,
    tier: 2,
    cost: { gold: 600 },
    buildTime: 90,
    effect: { type: 'moraleBonus', value: 10 },
    maxCount: 1,
  },

  // Tier 3 - Late game
  {
    id: 'farm_lv3',
    name: '農場Lv3',
    description: '最高効率の農業施設',
    level: 3,
    tier: 3,
    cost: { gold: 1500, ore: 50 },
    buildTime: 150,
    effect: { type: 'foodProduction', value: 150 },
    prerequisite: ['farm_lv2'],
  },
  {
    id: 'magic_tower_lv1',
    name: '魔法塔Lv1',
    description: '魔力を生成する施設',
    level: 1,
    tier: 3,
    cost: { gold: 3000, ore: 100 },
    buildTime: 180,
    effect: { type: 'manaGeneration', value: 10 },
    prerequisite: ['magic_theory'],
    maxCount: 1,
  },
  {
    id: 'magic_tower_lv2',
    name: '魔法塔Lv2',
    description: '強力な魔力を生成する施設',
    level: 2,
    tier: 3,
    cost: { gold: 6000, ore: 200, mana: 100 },
    buildTime: 240,
    effect: { type: 'manaGeneration', value: 30 },
    prerequisite: ['magic_tower_lv1'],
    maxCount: 1,
  },
  {
    id: 'magic_tower_lv3',
    name: '魔法塔Lv3',
    description: '最高効率の魔力生成施設',
    level: 3,
    tier: 3,
    cost: { gold: 12000, ore: 400, mana: 300 },
    buildTime: 300,
    effect: { type: 'manaGeneration', value: 70 },
    prerequisite: ['magic_tower_lv2'],
    maxCount: 1,
  },
  {
    id: 'magic_academy',
    name: '魔法学院',
    description: '魔力生産と魔法研究を強化する',
    level: 1,
    tier: 3,
    cost: { gold: 5000, ore: 150, mana: 50 },
    buildTime: 200,
    effect: { type: 'manaGeneration', value: 20 },
    prerequisite: ['magic_tower_lv1'],
    maxCount: 1,
  },
  {
    id: 'research_lab',
    name: '研究所',
    description: '全技術の研究速度を上昇させる',
    level: 1,
    tier: 3,
    cost: { gold: 5000 },
    buildTime: 180,
    effect: { type: 'researchSpeed', value: 30 },
    maxCount: 1,
  },
  {
    id: 'walls_lv1',
    name: '城壁Lv1',
    description: '都市の防御力を強化する',
    level: 1,
    tier: 3,
    cost: { gold: 4000, ore: 200 },
    buildTime: 180,
    effect: { type: 'defense', value: 50 },
    maxCount: 1,
  },
]

export function getBuildingById(id: string): BuildingDefinition | undefined {
  return BUILDINGS.find(b => b.id === id)
}

export function getAvailableBuildings(
  researchedTechIds: string[],
  builtBuildingIds: string[]
): BuildingDefinition[] {
  return BUILDINGS.filter(building => {
    // Check prerequisites
    if (building.prerequisite) {
      const hasAllPrerequisites = building.prerequisite.every(
        prereq => researchedTechIds.includes(prereq) || builtBuildingIds.includes(prereq)
      )
      if (!hasAllPrerequisites) return false
    }

    // Check max count
    if (building.maxCount) {
      const builtCount = builtBuildingIds.filter(id => id === building.id).length
      if (builtCount >= building.maxCount) return false
    }

    return true
  })
}
