export type SpecialistType = 'blacksmith' | 'merchant' | 'farmer' | 'scholar' | 'general'

export interface SpecialistBonus {
  type: string
  value: number
}

export interface Specialist {
  id: string
  name: string
  type: SpecialistType
  bonus: SpecialistBonus
  salary: number // monthly gold cost
  loyalty: number // 0-100
  hiredAt?: number // day when hired
}

export interface SpecialAbility {
  name: string
  description: string
  effect: {
    type: string
    value: number
    trigger?: 'battleStart' | 'battleEnd' | 'daily' | 'monthly' | 'passive'
  }
}

export interface Hero {
  id: string
  name: string
  level: number
  experience: number
  combatPower: number
  specialAbility: SpecialAbility
  salary: number // monthly gold cost
  manaCost?: number // daily mana cost
  loyalty: number // 0-100
  hiredAt?: number // day when hired
  isDeployed: boolean
}
