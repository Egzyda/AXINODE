import { useReducer, useCallback, useMemo } from 'react'
import type { GameState, GameAction, GameEvent } from '@/types'
import { createInitialState } from '@/utils/initialState'
import {
  calculateFoodProduction,
  calculateOreProduction,
  calculateWeaponProduction,
  calculateManaGeneration,
  calculateFoodConsumption,
  calculateManaConsumption,
  calculateTaxIncome,
  calculateMaintenance,
  calculateSatisfaction,
  formatGameTime,
} from '@/utils/calculations'
import {
  DAYS_PER_MONTH,
  POPULATION_GROWTH_RATE,
  POPULATION_DECLINE_RATE,
  STARVATION_DECLINE_RATE,
  SATISFACTION_GROWTH_THRESHOLD,
  SATISFACTION_DECLINE_THRESHOLD,
  MAX_LOG_ENTRIES,
} from '@/utils/constants'
import { getBuildingById } from '@/data/buildings'
import { getTechnologyById } from '@/data/technologies'

function addEvent(state: GameState, event: Omit<GameEvent, 'id' | 'day' | 'time'>): GameState {
  const newEvent: GameEvent = {
    ...event,
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    day: Math.floor(state.day),
    time: formatGameTime(state.day),
  }

  const newLog = [newEvent, ...state.eventLog].slice(0, MAX_LOG_ENTRIES)
  return { ...state, eventLog: newLog }
}

function processDailyUpdate(state: GameState): GameState {
  // Resource production
  const foodProduction = calculateFoodProduction(state)
  const oreProduction = calculateOreProduction(state)
  const weaponProduction = calculateWeaponProduction(state)
  const manaGeneration = calculateManaGeneration(state)

  // Resource consumption
  const foodConsumption = calculateFoodConsumption(state)
  const manaConsumption = calculateManaConsumption(state)

  // Update resources
  let newFood = state.resources.food + foodProduction - foodConsumption
  const newOre = state.resources.ore + oreProduction
  const newWeapons = state.resources.weapons + weaponProduction
  let newMana = Math.max(0, state.resources.mana + manaGeneration - manaConsumption)

  // Handle starvation
  let newPopulation = { ...state.population }
  if (newFood < 0) {
    const starvationLoss = Math.ceil(state.population.total * STARVATION_DECLINE_RATE / DAYS_PER_MONTH)
    newPopulation.total = Math.max(0, state.population.total - starvationLoss)
    newPopulation.unemployed = Math.max(0, newPopulation.unemployed - starvationLoss)
    newFood = 0

    state = addEvent(state, {
      type: 'domestic',
      message: `食糧不足により${starvationLoss}人が餓死しました`,
      icon: '💀',
      priority: 'critical',
    })
  }

  return {
    ...state,
    resources: {
      ...state.resources,
      food: Math.max(0, newFood),
      ore: newOre,
      weapons: newWeapons,
      mana: newMana,
    },
    population: newPopulation,
  }
}

function processMonthlyUpdate(state: GameState): GameState {
  // Tax income
  const taxIncome = calculateTaxIncome(state)
  const maintenance = calculateMaintenance(state)
  const netIncome = taxIncome - maintenance

  let newGold = state.resources.gold + netIncome

  // Handle bankruptcy
  let newBankruptcyDays = state.bankruptcyDays
  if (newGold < 0) {
    newBankruptcyDays++
    newGold = 0
    state = addEvent(state, {
      type: 'domestic',
      message: '国庫が破産状態です！',
      icon: '💸',
      priority: 'critical',
    })
  } else {
    newBankruptcyDays = 0
  }

  // Population growth/decline
  let newPopulation = { ...state.population }
  const satisfaction = calculateSatisfaction(state)

  if (satisfaction >= SATISFACTION_GROWTH_THRESHOLD) {
    const growth = Math.ceil(state.population.total * POPULATION_GROWTH_RATE)
    newPopulation.total += growth
    newPopulation.unemployed += growth
  } else if (satisfaction <= SATISFACTION_DECLINE_THRESHOLD) {
    const decline = Math.ceil(state.population.total * POPULATION_DECLINE_RATE)
    newPopulation.total = Math.max(1, state.population.total - decline)
    newPopulation.unemployed = Math.max(0, newPopulation.unemployed - decline)
  }

  // Update income/expense tracking
  const newIncome = {
    tax: taxIncome,
    trade: 0, // TODO: implement trade
    total: taxIncome,
  }

  const newExpense = {
    maintenance,
    other: 0,
    total: maintenance,
  }

  return {
    ...state,
    resources: {
      ...state.resources,
      gold: newGold,
    },
    population: newPopulation,
    income: newIncome,
    expense: newExpense,
    satisfaction,
    bankruptcyDays: newBankruptcyDays,
  }
}

function updateConstructions(state: GameState, deltaTime: number): GameState {
  if (state.constructionQueue.length === 0) return state

  const updatedQueue = state.constructionQueue.map(construction => ({
    ...construction,
    remainingTime: construction.remainingTime - deltaTime,
  }))

  // Check for completed constructions
  const completed = updatedQueue.filter(c => c.remainingTime <= 0)
  const remaining = updatedQueue.filter(c => c.remainingTime > 0)

  let newBuildings = [...state.buildings]
  let newState = state

  for (const construction of completed) {
    const building = getBuildingById(construction.buildingId)
    if (building) {
      newBuildings.push({
        ...building,
        builtAt: Math.floor(state.day),
      })
      newState = addEvent(newState, {
        type: 'domestic',
        message: `${building.name}の建設が完了しました`,
        icon: '🏗️',
        priority: 'normal',
      })
    }
  }

  return {
    ...newState,
    buildings: newBuildings,
    constructionQueue: remaining,
  }
}

function updateResearch(state: GameState, deltaTime: number): GameState {
  if (state.researchQueue.length === 0) return state

  const updatedQueue = state.researchQueue.map(research => ({
    ...research,
    remainingTime: research.remainingTime - deltaTime,
  }))

  // Check for completed research
  const completed = updatedQueue.filter(r => r.remainingTime <= 0)
  const remaining = updatedQueue.filter(r => r.remainingTime > 0)

  let newTechnologies = [...state.technologies]
  let newState = state

  for (const research of completed) {
    const techIndex = newTechnologies.findIndex(t => t.id === research.technologyId)
    if (techIndex >= 0) {
      newTechnologies[techIndex] = {
        ...newTechnologies[techIndex],
        isResearched: true,
        researchedAt: Math.floor(state.day),
      }
      newState = addEvent(newState, {
        type: 'tech',
        message: `${newTechnologies[techIndex].name}の研究が完了しました`,
        icon: '🔬',
        priority: 'normal',
      })
    }
  }

  return {
    ...newState,
    technologies: newTechnologies,
    researchQueue: remaining,
  }
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'TICK': {
      if (state.isPaused) return state

      const { deltaTime } = action.payload
      const secondsToAdvance = deltaTime * state.gameSpeed
      const daysToAdvance = secondsToAdvance / (60 * 60 * 24)
      const newDay = state.day + daysToAdvance

      let newState = { ...state, day: newDay }

      // Daily update
      if (Math.floor(newDay) > Math.floor(state.day)) {
        newState = processDailyUpdate(newState)
      }

      // Monthly update
      if (Math.floor(newDay / DAYS_PER_MONTH) > Math.floor(state.day / DAYS_PER_MONTH)) {
        newState = processMonthlyUpdate(newState)
      }

      // Construction progress
      newState = updateConstructions(newState, secondsToAdvance)

      // Research progress
      newState = updateResearch(newState, secondsToAdvance)

      return newState
    }

    case 'SET_GAME_SPEED':
      return { ...state, gameSpeed: action.payload.speed }

    case 'TOGGLE_PAUSE':
      return { ...state, isPaused: !state.isPaused }

    case 'UPDATE_RESOURCES':
      return {
        ...state,
        resources: { ...state.resources, ...action.payload },
      }

    case 'UPDATE_POPULATION': {
      const newPopulation = { ...state.population, ...action.payload }
      // Recalculate total
      newPopulation.total =
        newPopulation.farmers +
        newPopulation.miners +
        newPopulation.craftsmen +
        newPopulation.merchants +
        newPopulation.soldiers +
        newPopulation.unemployed
      // Update military
      const newMilitary = { ...state.military, totalSoldiers: newPopulation.soldiers }
      return { ...state, population: newPopulation, military: newMilitary }
    }

    case 'START_CONSTRUCTION': {
      const building = getBuildingById(action.payload.buildingId)
      if (!building) return state

      // Check if can afford
      if (state.resources.gold < building.cost.gold) return state
      if (building.cost.ore && state.resources.ore < building.cost.ore) return state

      // Deduct cost
      const newResources = {
        ...state.resources,
        gold: state.resources.gold - building.cost.gold,
        ore: state.resources.ore - (building.cost.ore || 0),
      }

      // Add to queue
      const newConstruction = {
        buildingId: building.id,
        startDay: Math.floor(state.day),
        remainingTime: building.buildTime,
      }

      return {
        ...state,
        resources: newResources,
        constructionQueue: [...state.constructionQueue, newConstruction],
      }
    }

    case 'CANCEL_CONSTRUCTION': {
      const { index } = action.payload
      const newQueue = state.constructionQueue.filter((_, i) => i !== index)
      return { ...state, constructionQueue: newQueue }
    }

    case 'START_RESEARCH': {
      const tech = getTechnologyById(action.payload.technologyId)
      if (!tech) return state

      // Check if can afford
      if (state.resources.gold < tech.cost.gold) return state
      if (tech.cost.mana && state.resources.mana < tech.cost.mana) return state

      // Check prerequisites
      if (tech.prerequisite) {
        const hasPrereqs = tech.prerequisite.every(prereqId =>
          state.technologies.find(t => t.id === prereqId && t.isResearched)
        )
        if (!hasPrereqs) return state
      }

      // Deduct cost
      const newResources = {
        ...state.resources,
        gold: state.resources.gold - tech.cost.gold,
        mana: state.resources.mana - (tech.cost.mana || 0),
      }

      // Calculate research time with bonuses
      let researchTime = tech.researchTime
      const researchSpeedBonus = state.buildings
        .filter(b => b.effect.type === 'researchSpeed')
        .reduce((sum, b) => sum + b.effect.value, 0)
      researchTime = Math.floor(researchTime * (100 / (100 + researchSpeedBonus)))

      // Add to queue
      const newResearch = {
        technologyId: tech.id,
        startDay: Math.floor(state.day),
        remainingTime: researchTime,
      }

      return {
        ...state,
        resources: newResources,
        researchQueue: [...state.researchQueue, newResearch],
      }
    }

    case 'CANCEL_RESEARCH': {
      const { index } = action.payload
      const newQueue = state.researchQueue.filter((_, i) => i !== index)
      return { ...state, researchQueue: newQueue }
    }

    case 'ADD_EVENT':
      return addEvent(state, action.payload.event)

    case 'LOAD_GAME':
      return action.payload.state

    case 'NEW_GAME':
      return createInitialState()

    default:
      return state
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState)

  const tick = useCallback((deltaTime: number) => {
    dispatch({ type: 'TICK', payload: { deltaTime } })
  }, [])

  const setGameSpeed = useCallback((speed: number) => {
    dispatch({ type: 'SET_GAME_SPEED', payload: { speed } })
  }, [])

  const togglePause = useCallback(() => {
    dispatch({ type: 'TOGGLE_PAUSE' })
  }, [])

  const updatePopulation = useCallback((population: Partial<GameState['population']>) => {
    dispatch({ type: 'UPDATE_POPULATION', payload: population })
  }, [])

  const startConstruction = useCallback((buildingId: string) => {
    dispatch({ type: 'START_CONSTRUCTION', payload: { buildingId } })
  }, [])

  const startResearch = useCallback((technologyId: string) => {
    dispatch({ type: 'START_RESEARCH', payload: { technologyId } })
  }, [])

  const newGame = useCallback(() => {
    dispatch({ type: 'NEW_GAME' })
  }, [])

  const actions = useMemo(
    () => ({
      tick,
      setGameSpeed,
      togglePause,
      updatePopulation,
      startConstruction,
      startResearch,
      newGame,
      dispatch,
    }),
    [tick, setGameSpeed, togglePause, updatePopulation, startConstruction, startResearch, newGame]
  )

  return { state, actions }
}
