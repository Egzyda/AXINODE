import type { Hero, Specialist, SpecialistType } from '@/types'

interface HeroTemplate {
  name: string
  combatPower: number
  specialAbility: Hero['specialAbility']
  salary: number
  manaCost?: number
}

interface SpecialistTemplate {
  name: string
  type: SpecialistType
  bonus: { type: string; value: number }
  salary: number
}

export const HERO_TEMPLATES: HeroTemplate[] = [
  {
    name: '剣聖アリエス',
    combatPower: 100,
    specialAbility: {
      name: '無双',
      description: '戦闘開始時に敵50人を即死させる',
      effect: { type: 'instantKill', value: 50, trigger: 'battleStart' },
    },
    salary: 500,
  },
  {
    name: '大魔導師ゼノ',
    combatPower: 30,
    specialAbility: {
      name: '大結界',
      description: '都市防御+50%',
      effect: { type: 'defenseBonus', value: 50, trigger: 'passive' },
    },
    salary: 300,
    manaCost: 10,
  },
  {
    name: '鉄壁のガルド',
    combatPower: 60,
    specialAbility: {
      name: '不退転',
      description: '防衛戦時、士気低下を無効化',
      effect: { type: 'moraleLock', value: 1, trigger: 'passive' },
    },
    salary: 400,
  },
  {
    name: '疾風のリン',
    combatPower: 80,
    specialAbility: {
      name: '奇襲',
      description: '先制攻撃で追加ダメージ',
      effect: { type: 'firstStrike', value: 30, trigger: 'battleStart' },
    },
    salary: 450,
  },
  {
    name: '賢者メルリン',
    combatPower: 20,
    specialAbility: {
      name: '知恵の泉',
      description: '研究速度+30%',
      effect: { type: 'researchSpeed', value: 30, trigger: 'passive' },
    },
    salary: 350,
    manaCost: 5,
  },
]

export const SPECIALIST_TEMPLATES: SpecialistTemplate[] = [
  {
    name: '鍛冶師ゴロン',
    type: 'blacksmith',
    bonus: { type: 'weaponProduction', value: 10 },
    salary: 50,
  },
  {
    name: '商人ミレイユ',
    type: 'merchant',
    bonus: { type: 'tradeBonus', value: 5 },
    salary: 30,
  },
  {
    name: '農場長オルガ',
    type: 'farmer',
    bonus: { type: 'foodProduction', value: 15 },
    salary: 40,
  },
  {
    name: '学者アルベルト',
    type: 'scholar',
    bonus: { type: 'researchSpeed', value: 10 },
    salary: 45,
  },
  {
    name: '将軍マルクス',
    type: 'general',
    bonus: { type: 'moraleBonus', value: 10 },
    salary: 60,
  },
  {
    name: '鍛冶師ヴォルガン',
    type: 'blacksmith',
    bonus: { type: 'weaponProduction', value: 15 },
    salary: 70,
  },
  {
    name: '交易商ハサン',
    type: 'merchant',
    bonus: { type: 'tradeBonus', value: 8 },
    salary: 45,
  },
  {
    name: '農学者エミリア',
    type: 'farmer',
    bonus: { type: 'foodProduction', value: 20 },
    salary: 55,
  },
]

let heroIdCounter = 0
let specialistIdCounter = 0

export function createHero(template: HeroTemplate): Hero {
  heroIdCounter++
  return {
    id: `hero_${heroIdCounter}`,
    name: template.name,
    level: 1,
    experience: 0,
    combatPower: template.combatPower,
    specialAbility: template.specialAbility,
    salary: template.salary,
    manaCost: template.manaCost,
    loyalty: 70 + Math.floor(Math.random() * 30), // 70-99
    isDeployed: false,
  }
}

export function createSpecialist(template: SpecialistTemplate): Specialist {
  specialistIdCounter++
  return {
    id: `specialist_${specialistIdCounter}`,
    name: template.name,
    type: template.type,
    bonus: template.bonus,
    salary: template.salary,
    loyalty: 60 + Math.floor(Math.random() * 40), // 60-99
  }
}

export function getRandomHeroTemplate(): HeroTemplate {
  return HERO_TEMPLATES[Math.floor(Math.random() * HERO_TEMPLATES.length)]
}

export function getRandomSpecialistTemplate(): SpecialistTemplate {
  return SPECIALIST_TEMPLATES[Math.floor(Math.random() * SPECIALIST_TEMPLATES.length)]
}
