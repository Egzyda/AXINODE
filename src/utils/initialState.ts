import type { GameState, Technology } from '@/types'
import { TECHNOLOGIES } from '@/data/technologies'
import { createInitialNations } from '@/data/nations'
import {
  INITIAL_GOLD,
  INITIAL_FOOD,
  INITIAL_POPULATION,
  INITIAL_SATISFACTION,
  INITIAL_MORALE,
} from './constants'

export function createInitialTechnologies(): Technology[] {
  return TECHNOLOGIES.map(tech => ({
    ...tech,
    isResearched: false,
  }))
}

export function createInitialState(): GameState {
  const initialFarmers = Math.floor(INITIAL_POPULATION * 0.5)
  const initialSoldiers = Math.floor(INITIAL_POPULATION * 0.2)
  const initialUnemployed = INITIAL_POPULATION - initialFarmers - initialSoldiers

  return {
    // Basic info
    day: 1,
    gameSpeed: 1,
    isPaused: true,

    // Resources
    resources: {
      gold: INITIAL_GOLD,
      food: INITIAL_FOOD,
      ore: 20,
      mana: 0,
      weapons: 5,
      armor: 5,
    },

    // Population
    population: {
      total: INITIAL_POPULATION,
      farmers: initialFarmers,
      miners: 0,
      craftsmen: 0,
      merchants: 0,
      soldiers: initialSoldiers,
      unemployed: initialUnemployed,
    },

    // Income/Expense
    income: {
      tax: 0,
      trade: 0,
      total: 0,
    },

    expense: {
      maintenance: 0,
      other: 0,
      total: 0,
    },

    // Satisfaction & Morale
    satisfaction: INITIAL_SATISFACTION,
    morale: INITIAL_MORALE,

    // Buildings
    buildings: [],
    constructionQueue: [],

    // Technologies
    technologies: createInitialTechnologies(),
    researchQueue: [],

    // Personnel
    specialists: [],
    heroes: [],

    // Diplomacy
    reputation: 0,
    diplomaticRelations: [],

    // Military
    military: {
      totalSoldiers: initialSoldiers,
      infantry: initialSoldiers,
      archers: 0,
      cavalry: 0,
      mageWarriors: 0,
      equipmentRate: 50,
    },

    // AI Nations
    aiNations: createInitialNations(5),

    // Battle
    currentBattle: null,

    // Event Log
    eventLog: [
      {
        id: 'initial_1',
        day: 1,
        time: '00:00',
        type: 'domestic',
        message: 'ゲームを開始しました。人口1人から国家を築き上げましょう。',
        icon: '🏰',
        priority: 'normal',
        isRead: false,
      },
    ],

    // Permanent Data
    permanent: {
      totalPlaytime: 0,
      clearCount: 0,
      points: 0,
      upgrades: [],
    },

    // Tracking
    bankruptcyDays: 0,
    lowSatisfactionDays: 0,
  }
}
