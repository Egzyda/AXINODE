export interface BattleForces {
  total: number
  infantry: number
  archers: number
  cavalry: number
  mageWarriors: number
  equipmentRate: number
  morale: number
  combatPower: number
  techBonus: number
}

export interface EnemyForces {
  total: number
  initialTotal: number
  combatPower: number
  morale: number
}

export type BattleLogEntryType = 'info' | 'important' | 'critical' | 'victory' | 'defeat'

export interface BattleLogEntry {
  time: number // seconds from battle start
  message: string
  type: BattleLogEntryType
}

export interface BattleSpoils {
  gold: number
  ore: number
  prisoners: number
  territory?: string
}

export type BattleResult = 'victory' | 'defeat' | 'ongoing' | 'retreat'

export interface Battle {
  id: string
  targetNationId: string
  targetNationName: string
  isDefensive: boolean

  // Player forces
  playerForces: BattleForces

  // Enemy forces
  enemyForces: EnemyForces

  // Battle progress
  elapsedTime: number // seconds
  battleLog: BattleLogEntry[]

  // Hero participation
  deployedHeroIds: string[]

  // Result
  result: BattleResult
  spoils?: BattleSpoils
}
