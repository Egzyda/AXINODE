export type NationPersonality =
  | 'aggressive'    // Conqueror
  | 'cautious'      // Guardian
  | 'commercial'    // Merchant state
  | 'isolationist'  // Hermit
  | 'opportunist'   // Opportunist
  | 'honorable'     // Knight
  | 'fanatic'       // Religious state
  | 'scientific'    // Future state

export type TreatyType = 'trade' | 'nonAggression' | 'alliance'

export interface Treaty {
  type: TreatyType
  duration: number // remaining days
  startedAt: number // day when started
}

export interface AINation {
  id: string
  name: string
  personality: NationPersonality

  // Status
  population: number
  militaryPower: number
  economicPower: number
  techLevel: number

  // Relations
  relationWithPlayer: number // -100 to 100
  treaties: Treaty[]

  // State
  isAtWar: boolean
  warTarget?: string // war target nation ID

  // AI behavior parameters
  aggressiveness: number // 0-100
  expansionDesire: number // 0-100
}

export interface DiplomaticRelation {
  nationId: string
  relation: number // -100 to 100
  treaties: Treaty[]
}

export interface DiplomaticProposal {
  fromNationId: string
  type: TreatyType | 'peace' | 'surrender' | 'techExchange'
  duration?: number
  conditions?: {
    gold?: number
    technology?: string
  }
  expiresAt: number // day when expires
}
