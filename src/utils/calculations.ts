import type { GameState } from '@/types'
import {
  BASE_FOOD_PRODUCTION_PER_FARMER,
  BASE_ORE_PRODUCTION_PER_MINER,
  BASE_WEAPON_PRODUCTION_PER_CRAFTSMAN,
  BASE_FOOD_CONSUMPTION_PER_PERSON,
  BASE_FOOD_CONSUMPTION_PER_SOLDIER,
  BASE_TAX_PER_POPULATION,
  EQUIPMENT_COEFFICIENTS,
  MORALE_COEFFICIENTS,
} from './constants'

// Helper to get coefficient from threshold map
function getCoefficient(value: number, coefficients: Record<number, number>): number {
  const thresholds = Object.keys(coefficients)
    .map(Number)
    .sort((a, b) => b - a)

  for (const threshold of thresholds) {
    if (value >= threshold) {
      return coefficients[threshold]
    }
  }
  return coefficients[0] || 1
}

// Production calculations
export function calculateFoodProduction(state: GameState): number {
  const baseFarmers = state.population.farmers
  const baseProduction = baseFarmers * BASE_FOOD_PRODUCTION_PER_FARMER

  // Building bonuses
  const buildingBonus = state.buildings
    .filter(b => b.effect.type === 'foodProduction')
    .reduce((sum, b) => sum + b.effect.value, 0)

  // Technology bonuses
  const techBonus = state.technologies
    .filter(t => t.isResearched && t.effect.type === 'farmEfficiency')
    .reduce((sum, t) => sum + t.effect.value, 0)

  // Specialist bonuses
  const specialistBonus = state.specialists
    .filter(s => s.bonus.type === 'foodProduction')
    .reduce((sum, s) => sum + s.bonus.value, 0)

  // Production bonus from industry tech
  const productionBonus = state.technologies
    .filter(t => t.isResearched && t.effect.type === 'productionBonus')
    .reduce((sum, t) => sum + t.effect.value, 0)

  const totalBonus = 1 + (buildingBonus + techBonus + specialistBonus + productionBonus) / 100
  return Math.floor(baseProduction * totalBonus)
}

export function calculateOreProduction(state: GameState): number {
  const baseMiners = state.population.miners
  const baseProduction = baseMiners * BASE_ORE_PRODUCTION_PER_MINER

  // Building bonuses
  const buildingBonus = state.buildings
    .filter(b => b.effect.type === 'oreProduction')
    .reduce((sum, b) => sum + b.effect.value, 0)

  // Production bonus from industry tech
  const productionBonus = state.technologies
    .filter(t => t.isResearched && t.effect.type === 'productionBonus')
    .reduce((sum, t) => sum + t.effect.value, 0)

  const totalBonus = 1 + (buildingBonus + productionBonus) / 100
  return Math.floor(baseProduction * totalBonus)
}

export function calculateWeaponProduction(state: GameState): number {
  const baseCraftsmen = state.population.craftsmen
  const baseProduction = baseCraftsmen * BASE_WEAPON_PRODUCTION_PER_CRAFTSMAN

  // Building bonuses
  const buildingBonus = state.buildings
    .filter(b => b.effect.type === 'weaponProduction')
    .reduce((sum, b) => sum + b.effect.value, 0)

  // Technology bonuses
  const techBonus = state.technologies
    .filter(t => t.isResearched && t.effect.type === 'weaponProduction')
    .reduce((sum, t) => sum + t.effect.value, 0)

  // Specialist bonuses
  const specialistBonus = state.specialists
    .filter(s => s.bonus.type === 'weaponProduction')
    .reduce((sum, s) => sum + s.bonus.value, 0)

  // Production bonus from industry tech
  const productionBonus = state.technologies
    .filter(t => t.isResearched && t.effect.type === 'productionBonus')
    .reduce((sum, t) => sum + t.effect.value, 0)

  const totalBonus = 1 + (buildingBonus + techBonus + specialistBonus + productionBonus) / 100
  return Math.floor(baseProduction * totalBonus)
}

export function calculateManaGeneration(state: GameState): number {
  // Building bonuses (magic towers, etc.)
  const buildingMana = state.buildings
    .filter(b => b.effect.type === 'manaGeneration')
    .reduce((sum, b) => sum + b.effect.value, 0)

  // Hero mana generation
  const heroMana = state.heroes
    .filter(h => h.specialAbility.effect.type === 'manaGeneration')
    .reduce((sum, h) => sum + h.specialAbility.effect.value, 0)

  return buildingMana + heroMana
}

// Consumption calculations
export function calculateFoodConsumption(state: GameState): number {
  const civilianConsumption =
    (state.population.total - state.military.totalSoldiers) * BASE_FOOD_CONSUMPTION_PER_PERSON
  const soldierConsumption = state.military.totalSoldiers * BASE_FOOD_CONSUMPTION_PER_SOLDIER
  return Math.ceil(civilianConsumption + soldierConsumption)
}

export function calculateManaConsumption(state: GameState): number {
  // Hero mana costs
  const heroManaCost = state.heroes
    .filter(h => h.manaCost)
    .reduce((sum, h) => sum + (h.manaCost || 0), 0)

  // Mage warrior maintenance
  const mageWarriorCost = state.military.mageWarriors * 1

  return heroManaCost + mageWarriorCost
}

// Income calculations
export function calculateTaxIncome(state: GameState): number {
  const baseTax = state.population.total * BASE_TAX_PER_POPULATION
  const satisfactionCoef = state.satisfaction / 100

  // Tax rate (default 15%)
  const taxRate = 0.15

  // Technology bonuses
  const techBonus = state.technologies
    .filter(t => t.isResearched && t.effect.type === 'taxBonus')
    .reduce((sum, t) => sum + t.effect.value, 0)

  // Building bonuses
  const buildingBonus = state.buildings
    .filter(b => b.effect.type === 'taxBonus')
    .reduce((sum, b) => sum + b.effect.value, 0)

  const totalBonus = 1 + (techBonus + buildingBonus) / 100
  return Math.floor(baseTax * satisfactionCoef * taxRate * totalBonus)
}

export function calculateMaintenance(state: GameState): number {
  // Soldier maintenance: 5G/month each
  const soldierCost = state.military.totalSoldiers * 5

  // Specialist salaries
  const specialistCost = state.specialists.reduce((sum, s) => sum + s.salary, 0)

  // Hero salaries
  const heroCost = state.heroes.reduce((sum, h) => sum + h.salary, 0)

  // Building maintenance (simplified: 1% of build cost per month)
  // For now, we'll skip this

  return soldierCost + specialistCost + heroCost
}

// Combat calculations
export function calculateCombatPower(
  soldiers: number,
  equipmentRate: number,
  morale: number,
  techBonus: number = 1
): number {
  const equipmentCoef = getCoefficient(equipmentRate, EQUIPMENT_COEFFICIENTS)
  const moraleCoef = getCoefficient(morale, MORALE_COEFFICIENTS)
  return Math.floor(soldiers * equipmentCoef * moraleCoef * techBonus)
}

export function calculateEquipmentRate(soldiers: number, weapons: number, armor: number): number {
  if (soldiers === 0) return 100
  const equipped = Math.min(soldiers, weapons, armor)
  return Math.floor((equipped / soldiers) * 100)
}

// Satisfaction calculation
export function calculateSatisfaction(state: GameState): number {
  let satisfaction = 50 // base

  // Food status
  const foodDays = state.resources.food / Math.max(1, calculateFoodConsumption(state))
  if (foodDays >= 7) satisfaction += 20
  else if (foodDays >= 3) satisfaction += 10
  else if (foodDays < 1) satisfaction -= 30
  else satisfaction -= 10

  // Economic status
  const netIncome = calculateTaxIncome(state) - calculateMaintenance(state)
  if (netIncome > 0) satisfaction += 10
  else if (netIncome < -100) satisfaction -= 20
  else if (netIncome < 0) satisfaction -= 10

  // Military threat
  if (state.currentBattle) satisfaction -= 10

  // Clamp
  return Math.max(0, Math.min(100, satisfaction))
}

// Time formatting
export function formatGameTime(day: number): string {
  const hours = Math.floor((day % 1) * 24)
  const minutes = Math.floor(((day % 1) * 24 - hours) * 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function formatDay(day: number): string {
  return `${Math.floor(day)}日目`
}

// Resource status helpers
export function getFoodStatus(
  food: number,
  consumption: number
): 'safe' | 'warning' | 'danger' {
  const days = food / Math.max(1, consumption)
  if (days >= 7) return 'safe'
  if (days >= 3) return 'warning'
  return 'danger'
}

export function getGoldStatus(netIncome: number): 'safe' | 'warning' | 'danger' {
  if (netIncome > 0) return 'safe'
  if (netIncome >= -50) return 'warning'
  return 'danger'
}

export function getSatisfactionStatus(satisfaction: number): 'safe' | 'warning' | 'danger' {
  if (satisfaction >= 60) return 'safe'
  if (satisfaction >= 40) return 'warning'
  return 'danger'
}
