export type TechnologyCategory =
  | 'agriculture'
  | 'military'
  | 'magic'
  | 'economy'
  | 'industry'
  | 'fantasy'

export interface TechnologyEffect {
  type: string
  value: number
}

export interface TechnologyCost {
  gold: number
  mana?: number
}

export interface TechnologyDefinition {
  id: string
  name: string
  description: string
  tier: 1 | 2 | 3 | 4
  category: TechnologyCategory
  cost: TechnologyCost
  researchTime: number // seconds
  prerequisite?: string[] // prerequisite technology IDs
  effect: TechnologyEffect
}

export interface Technology extends TechnologyDefinition {
  isResearched: boolean
  researchedAt?: number // day when researched
}

export interface Research {
  technologyId: string
  startDay: number
  remainingTime: number // seconds
}
