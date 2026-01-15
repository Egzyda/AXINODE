export type BuildingEffectType =
  | 'foodProduction'
  | 'oreProduction'
  | 'weaponProduction'
  | 'manaGeneration'
  | 'defense'
  | 'taxBonus'
  | 'tradeBonus'
  | 'trainingSpeed'
  | 'moraleBonus'
  | 'researchSpeed'
  | 'other'

export interface BuildingEffect {
  type: BuildingEffectType
  value: number
}

export interface BuildingCost {
  gold: number
  ore?: number
  mana?: number
}

export interface BuildingDefinition {
  id: string
  name: string
  description: string
  level: number
  tier: 1 | 2 | 3
  cost: BuildingCost
  buildTime: number // seconds
  effect: BuildingEffect
  prerequisite?: string[] // prerequisite technology IDs or building IDs
  maxCount?: number // how many can be built (undefined = unlimited)
}

export interface Building extends BuildingDefinition {
  builtAt: number // day when built
}

export interface ConstructionQueue {
  buildingId: string
  startDay: number
  remainingTime: number // seconds
}
