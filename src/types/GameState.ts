import type { Building, ConstructionQueue } from './Building'
import type { Technology, Research } from './Technology'
import type { Specialist, Hero } from './Hero'
import type { AINation, DiplomaticRelation } from './AINation'
import type { GameEvent } from './Event'
import type { Battle } from './Battle'

export interface Resources {
  gold: number
  food: number
  ore: number
  mana: number
  weapons: number
  armor: number
}

export interface Population {
  total: number
  farmers: number
  miners: number
  craftsmen: number
  merchants: number
  soldiers: number
  unemployed: number
}

export interface Income {
  tax: number
  trade: number
  total: number
}

export interface Expense {
  maintenance: number
  other: number
  total: number
}

export interface Military {
  totalSoldiers: number
  infantry: number
  archers: number
  cavalry: number
  mageWarriors: number
  equipmentRate: number
}

export interface PermanentData {
  totalPlaytime: number
  clearCount: number
  points: number
  upgrades: string[]
}

export interface GameState {
  // Basic info
  day: number
  gameSpeed: number // 1, 10, 20
  isPaused: boolean

  // Resources
  resources: Resources

  // Population
  population: Population

  // Income/Expense (monthly)
  income: Income
  expense: Expense

  // Satisfaction & Morale
  satisfaction: number // 0-100
  morale: number // 0-100

  // Buildings
  buildings: Building[]
  constructionQueue: ConstructionQueue[]

  // Technologies
  technologies: Technology[]
  researchQueue: Research[]

  // Personnel
  specialists: Specialist[]
  heroes: Hero[]

  // Diplomacy
  reputation: number // -100 to 100
  diplomaticRelations: DiplomaticRelation[]

  // Military
  military: Military

  // AI Nations
  aiNations: AINation[]

  // Battle
  currentBattle: Battle | null

  // Event Log
  eventLog: GameEvent[]

  // Permanent Data (for New Game+)
  permanent: PermanentData

  // Bankruptcy tracking
  bankruptcyDays: number
  lowSatisfactionDays: number
}

export type GameAction =
  | { type: 'TICK'; payload: { deltaTime: number } }
  | { type: 'SET_GAME_SPEED'; payload: { speed: number } }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'UPDATE_RESOURCES'; payload: Partial<Resources> }
  | { type: 'UPDATE_POPULATION'; payload: Partial<Population> }
  | { type: 'START_CONSTRUCTION'; payload: { buildingId: string } }
  | { type: 'CANCEL_CONSTRUCTION'; payload: { index: number } }
  | { type: 'START_RESEARCH'; payload: { technologyId: string } }
  | { type: 'CANCEL_RESEARCH'; payload: { index: number } }
  | { type: 'HIRE_SPECIALIST'; payload: { specialist: Specialist } }
  | { type: 'FIRE_SPECIALIST'; payload: { specialistId: string } }
  | { type: 'HIRE_HERO'; payload: { hero: Hero } }
  | { type: 'FIRE_HERO'; payload: { heroId: string } }
  | { type: 'START_BATTLE'; payload: { targetNationId: string } }
  | { type: 'END_BATTLE'; payload: { result: 'victory' | 'defeat' } }
  | { type: 'ADD_EVENT'; payload: { event: GameEvent } }
  | { type: 'PROPOSE_TREATY'; payload: { nationId: string; type: string } }
  | { type: 'LOAD_GAME'; payload: { state: GameState } }
  | { type: 'NEW_GAME' }
