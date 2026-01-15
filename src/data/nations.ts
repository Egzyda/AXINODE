import type { AINation, NationPersonality } from '@/types'

interface NationTemplate {
  name: string
  personality: NationPersonality
  description: string
  initialPopulation: number
  initialMilitaryPower: number
  aggressiveness: number
  expansionDesire: number
}

export const NATION_TEMPLATES: NationTemplate[] = [
  {
    name: '鉄血帝国',
    personality: 'aggressive',
    description: '軍事力を重視する好戦的な帝国',
    initialPopulation: 800,
    initialMilitaryPower: 400,
    aggressiveness: 85,
    expansionDesire: 90,
  },
  {
    name: '聖守護王国',
    personality: 'cautious',
    description: '防衛を重視する慎重な王国',
    initialPopulation: 600,
    initialMilitaryPower: 300,
    aggressiveness: 20,
    expansionDesire: 30,
  },
  {
    name: '商人連合',
    personality: 'commercial',
    description: '交易を重視する商業国家',
    initialPopulation: 500,
    initialMilitaryPower: 150,
    aggressiveness: 15,
    expansionDesire: 40,
  },
  {
    name: '隠者の森',
    personality: 'isolationist',
    description: '孤立主義を貫く神秘的な国',
    initialPopulation: 300,
    initialMilitaryPower: 200,
    aggressiveness: 10,
    expansionDesire: 5,
  },
  {
    name: '流浪の民',
    personality: 'opportunist',
    description: '状況に応じて動く日和見主義国家',
    initialPopulation: 400,
    initialMilitaryPower: 200,
    aggressiveness: 60,
    expansionDesire: 70,
  },
  {
    name: '騎士団領',
    personality: 'honorable',
    description: '名誉を重んじる騎士道国家',
    initialPopulation: 500,
    initialMilitaryPower: 350,
    aggressiveness: 40,
    expansionDesire: 50,
  },
  {
    name: '聖炎教国',
    personality: 'fanatic',
    description: '信仰に生きる狂信的な宗教国家',
    initialPopulation: 600,
    initialMilitaryPower: 300,
    aggressiveness: 70,
    expansionDesire: 60,
  },
  {
    name: '学術都市',
    personality: 'scientific',
    description: '技術開発を最優先する未来国家',
    initialPopulation: 400,
    initialMilitaryPower: 150,
    aggressiveness: 25,
    expansionDesire: 35,
  },
  {
    name: '蛮族連合',
    personality: 'aggressive',
    description: '略奪を生業とする荒くれ者の集団',
    initialPopulation: 350,
    initialMilitaryPower: 250,
    aggressiveness: 90,
    expansionDesire: 80,
  },
  {
    name: '深淵の民',
    personality: 'isolationist',
    description: '地下に住む謎多き民族',
    initialPopulation: 250,
    initialMilitaryPower: 180,
    aggressiveness: 30,
    expansionDesire: 20,
  },
]

let nationIdCounter = 0

export function createAINation(template: NationTemplate): AINation {
  nationIdCounter++
  return {
    id: `nation_${nationIdCounter}`,
    name: template.name,
    personality: template.personality,
    population: template.initialPopulation,
    militaryPower: template.initialMilitaryPower,
    economicPower: Math.floor(template.initialPopulation * 0.5),
    techLevel: 1,
    relationWithPlayer: 0,
    treaties: [],
    isAtWar: false,
    aggressiveness: template.aggressiveness,
    expansionDesire: template.expansionDesire,
  }
}

export function createInitialNations(count: number = 5): AINation[] {
  // Shuffle and pick templates
  const shuffled = [...NATION_TEMPLATES].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, count)
  return selected.map(createAINation)
}

export function getPersonalityDescription(personality: NationPersonality): string {
  const descriptions: Record<NationPersonality, string> = {
    aggressive: '好戦的で、弱い国を狙って攻撃してくる',
    cautious: '防衛重視で、攻撃しなければ友好的',
    commercial: '交易を好み、戦争を避ける傾向',
    isolationist: '関わりを避けるが、攻撃されると報復する',
    opportunist: '強者に追従し、弱者を攻撃する',
    honorable: '約束を守り、正々堂々と戦う',
    fanatic: '異なる価値観を敵視する',
    scientific: '技術力で態度が変わる',
  }
  return descriptions[personality]
}
