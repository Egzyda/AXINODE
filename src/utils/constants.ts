// Game constants

// Time constants
export const SECONDS_PER_DAY = 60 * 60 * 24
export const DAYS_PER_MONTH = 30

// Resource base values
export const BASE_FOOD_PRODUCTION_PER_FARMER = 1
export const BASE_ORE_PRODUCTION_PER_MINER = 0.5
export const BASE_WEAPON_PRODUCTION_PER_CRAFTSMAN = 0.3
export const BASE_FOOD_CONSUMPTION_PER_PERSON = 1
export const BASE_FOOD_CONSUMPTION_PER_SOLDIER = 1.5

// Tax calculation
export const BASE_TAX_PER_POPULATION = 1.2

// Equipment rate coefficients
export const EQUIPMENT_COEFFICIENTS: Record<number, number> = {
  100: 1.0,
  80: 0.9,
  60: 0.75,
  40: 0.5,
  20: 0.3,
  0: 0.2,
}

// Morale coefficients
export const MORALE_COEFFICIENTS: Record<number, number> = {
  100: 1.15,
  80: 1.0,
  60: 0.85,
  40: 0.65,
  20: 0.4,
}

// Satisfaction thresholds
export const SATISFACTION_GROWTH_THRESHOLD = 70 // population grows above this
export const SATISFACTION_DECLINE_THRESHOLD = 30 // population declines below this
export const SATISFACTION_COUP_THRESHOLD = 0 // coup risk below this

// Population growth rates
export const POPULATION_GROWTH_RATE = 0.02 // 2% per month
export const POPULATION_DECLINE_RATE = 0.01 // 1% per month
export const STARVATION_DECLINE_RATE = 0.05 // 5% per month

// Combat constants
export const BATTLE_TICK_INTERVAL = 10 // seconds
export const ATTACKER_DAMAGE_RATE = 0.1 // 10% of combat power
export const DEFENDER_DAMAGE_RATE = 0.08 // 8% of combat power
export const MORALE_WIN_BONUS = 2
export const MORALE_LOSE_PENALTY = 3
export const ROUT_MORALE_THRESHOLD = 30
export const ROUT_CHANCE = 0.2 // 20% per tick when morale < threshold
export const VICTORY_THRESHOLD = 0.3 // win when enemy at 30% or less

// AI constants
export const AI_GROWTH_RATE = 0.01 // 1% per month
export const AI_ACTION_CHANCE = 1 / 30 // ~once per month

// Game speed options
export const GAME_SPEEDS = [1, 10, 20]

// Max values
export const MAX_SATISFACTION = 100
export const MAX_MORALE = 100
export const MAX_LOYALTY = 100
export const MAX_REPUTATION = 100
export const MIN_REPUTATION = -100
export const MAX_LOG_ENTRIES = 100

// Bankruptcy and coup timing
export const BANKRUPTCY_DAYS_LIMIT = 30
export const LOW_SATISFACTION_DAYS_LIMIT = 7

// Initial game values
export const INITIAL_GOLD = 500
export const INITIAL_FOOD = 100
export const INITIAL_POPULATION = 10
export const INITIAL_SATISFACTION = 60
export const INITIAL_MORALE = 70
