/* engine.js - ゲームの計算ロジックと状態管理（完全版） */
import { BUILDINGS, TECHNOLOGIES, NATION_TEMPLATES, MAGICS, HERO_TEMPLATES, SPECIALIST_TEMPLATES } from './data.js';

// ------------------------------------------------------------------
// 1. 定数 (Constants)
// ------------------------------------------------------------------
export const CONSTANTS = {
  DAYS_PER_MONTH: 30,
  // 基礎生産量
  BASE_FOOD_PRODUCTION: 2.0,      // 農民1人あたり
  BASE_ORE_PRODUCTION: 0.8,       // 鉱夫1人あたり
  BASE_WEAPON_PRODUCTION: 0.5,    // 職人1人あたり
  BASE_ARMOR_PRODUCTION: 0.3,     // 職人1人あたり
  BASE_MANA_PRODUCTION: 0,        // 魔法塔がないと0
  // 消費量
  BASE_FOOD_CONSUMPTION_CIVILIAN: 0.8,
  BASE_FOOD_CONSUMPTION_SOLDIER: 1.2,
  // 税収（月次ベース）
  BASE_TAX_PER_POPULATION: 200.0, // 2.0 -> 200.0 に修正（月収360G程度に）
  // 閾値
  SATISFACTION_GROWTH: 70,
  SATISFACTION_DECLINE: 30,
  // ゲーム速度
  GAME_SPEEDS: [1, 2, 5, 10, 20],
  // 初期値
  INITIAL_GOLD: 500,
  INITIAL_FOOD: 200, // 少し増やす
  INITIAL_POPULATION: 15,
  // セーブ関連
  SAVE_KEY: 'axinode_save_v2',
  AUTOSAVE_INTERVAL: 60000,
  // 戦闘関連
  SOLDIER_MAINTENANCE: 15,        // 兵士1人の維持費/月 (3->15)
  SOLDIER_COMBAT_POWER: 1.0,     // 兵士1人の基本戦闘力
  // イベント確率
  EVENT_CHECK_INTERVAL: 0.5,     // イベントチェック間隔（日）
  // 市場基本価格（購入価格、売却は半額）
  MARKET_PRICES: {
    food: 3,
    ore: 8,
    weapons: 25,
    armor: 30
  },
  // 評判ランク閾値
  REPUTATION: {
    LEGEND: 80,
    GREAT: 50,
    NORMAL: 20,
    NEUTRAL: -19, // -19 ~ 19
    BAD: -20,
    TYRANT: -50,
    VILLAIN: -80
  },
  // 周回ボーナスコスト (pt)
  PRESTIGE_COSTS: {
    initial_gold_500: 10, // +500G
    initial_gold_1000: 20, // +1000G
    initial_pop_5: 10, // +5人
    initial_soldier_10: 15, // +10人
    research_speed_20: 20, // 研究+20%
    hero_rate_10: 30 // 英雄率+10%
  }
};

// ------------------------------------------------------------------
// 2. 計算関数 (Calculations)
// ------------------------------------------------------------------
export const Calcs = {
  // 食糧生産
  foodProduction(state) {
    const base = state.population.farmers * CONSTANTS.BASE_FOOD_PRODUCTION;
    let bonusPercent = 0;

    state.buildings.forEach(b => {
      if (b.effect.type === 'foodProduction') bonusPercent += b.effect.value;
    });

    // 魔法効果
    state.activeEffects.forEach(eff => {
      if (eff.type === 'foodProduction') bonusPercent += eff.value;
    });

    // スペシャリスト効果
    state.specialists.forEach(s => {
      if (s.bonus.type === 'foodProduction') bonusPercent += s.bonus.value;
    });

    // 英雄（内政効果持ちがいれば）
    state.heroes.forEach(h => {
      if (h.specialAbility.effect.type === 'foodProduction') {
        bonusPercent += h.specialAbility.effect.value;
      }
    });

    state.technologies.forEach(t => {
      if (t.isResearched && t.effect.type === 'farmEfficiency') {
        bonusPercent += t.effect.value;
      }
    });

    // 貿易協定ボーナス
    state.aiNations.forEach(nation => {
      if (nation.treaties.some(t => t.type === 'trade')) {
        bonusPercent += 5;
      }
    });

    // 工業化ボーナス
    state.technologies.forEach(t => {
      if (t.isResearched && t.effect.type === 'productionBonus') {
        bonusPercent += t.effect.value;
      }
    });

    return base * (1 + bonusPercent / 100);
  },

  // 食糧消費
  foodConsumption(state) {
    const civilians = state.population.total - state.military.totalSoldiers;
    return (civilians * CONSTANTS.BASE_FOOD_CONSUMPTION_CIVILIAN) +
      (state.military.totalSoldiers * CONSTANTS.BASE_FOOD_CONSUMPTION_SOLDIER);
  },

  // 鉱石生産
  oreProduction(state) {
    const base = state.population.miners * CONSTANTS.BASE_ORE_PRODUCTION;
    let bonusPercent = 0;

    state.buildings.forEach(b => {
      if (b.effect.type === 'oreProduction') bonusPercent += b.effect.value;
    });

    state.technologies.forEach(t => {
      if (t.isResearched && t.effect.type === 'productionBonus') {
        bonusPercent += t.effect.value;
      }
    });

    return base * (1 + bonusPercent / 100);
  },

  // 武器生産
  weaponProduction(state) {
    const base = state.population.craftsmen * CONSTANTS.BASE_WEAPON_PRODUCTION;
    let bonusPercent = 0;

    state.buildings.forEach(b => {
      if (b.effect.type === 'weaponProduction') bonusPercent += b.effect.value;
    });

    // スペシャリスト・英雄効果
    state.specialists.forEach(s => {
      if (s.bonus.type === 'weaponProduction') bonusPercent += s.bonus.value;
    });
    state.heroes.forEach(h => {
      if (h.specialAbility.effect.type === 'weaponProduction') bonusPercent += h.specialAbility.effect.value;
    });

    state.technologies.forEach(t => {
      if (t.isResearched && t.effect.type === 'weaponProduction') {
        bonusPercent += t.effect.value;
      }
      if (t.isResearched && t.effect.type === 'productionBonus') {
        bonusPercent += t.effect.value;
      }
    });

    return base * (1 + bonusPercent / 100);
  },

  // 鎧生産
  armorProduction(state) {
    const base = state.population.craftsmen * CONSTANTS.BASE_ARMOR_PRODUCTION;
    let bonusPercent = 0;

    state.buildings.forEach(b => {
      if (b.effect.type === 'armorProduction') bonusPercent += b.effect.value;
    });
    state.technologies.forEach(t => {
      if (t.isResearched && t.effect.type === 'productionBonus') {
        bonusPercent += t.effect.value;
      }
    });

    return base * (1 + bonusPercent / 100);
  },

  // 魔力生産
  manaProduction(state) {
    let mana = 0;

    state.buildings.forEach(b => {
      if (b.effect.type === 'manaGeneration') {
        mana += b.effect.value;
      }
    });

    return mana;
  },

  // 税収 (月次)
  taxIncome(state) {
    const baseTax = state.population.total * CONSTANTS.BASE_TAX_PER_POPULATION;
    const satisfactionCoef = state.satisfaction / 100;
    const taxRate = state.taxRate || 0.15;

    let bonusPercent = 0;
    state.buildings.forEach(b => {
      if (b.effect.type === 'taxBonus' || b.effect.type === 'tradeBonus') {
        bonusPercent += b.effect.value;
      }
    });
    state.technologies.forEach(t => {
      if (t.isResearched && t.effect.type === 'taxBonus') bonusPercent += t.effect.value;
    });

    // スペシャリスト効果
    state.specialists.forEach(s => {
      if (s.bonus.type === 'tradeBonus') bonusPercent += s.bonus.value;
    });
    state.heroes.forEach(h => {
      if (h.specialAbility.effect.type === 'tradeBonus') bonusPercent += h.specialAbility.effect.value;
    });

    return Math.floor(baseTax * satisfactionCoef * taxRate * (1 + bonusPercent / 100));
  },

  // 月次維持費
  maintenance(state) {
    const soldierCost = state.military.totalSoldiers * CONSTANTS.SOLDIER_MAINTENANCE;
    const heroCost = state.heroes.reduce((sum, h) => sum + (h.salary || 0), 0);
    const specialistCost = state.specialists.reduce((sum, s) => sum + (s.salary || 0), 0);
    return soldierCost + heroCost + specialistCost;
  },

  // 満足度計算
  satisfaction(state) {
    let score = 50;

    // 食糧事情
    const consumption = Math.max(1, this.foodConsumption(state));
    const foodDays = state.resources.food / consumption;

    if (foodDays >= 14) score += 25;
    else if (foodDays >= 7) score += 15;
    else if (foodDays >= 3) score += 5;
    else if (foodDays < 1) score -= 30;

    // 税率の影響
    const taxRate = state.taxRate || 0.15;
    if (taxRate > 0.20) score -= 10;
    if (taxRate > 0.25) score -= 10;
    if (taxRate < 0.10) score += 5;

    // 失業率の影響
    const unemploymentRate = state.population.unemployed / Math.max(1, state.population.total);
    if (unemploymentRate > 0.3) score -= 15;
    else if (unemploymentRate > 0.2) score -= 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  },

  // 同時建設可能数
  maxSimultaneousConstruction(state) {
    let max = 1;
    state.technologies.forEach(t => {
      if (t.isResearched && t.effect.type === 'simultaneousConstruction') {
        max = Math.max(max, t.effect.value);
      }
    });
    return max;
  },

  // 研究速度ボーナス
  researchSpeedBonus(state) {
    let bonusPercent = 0;
    state.buildings.forEach(b => {
      if (b.effect.type === 'researchSpeed') bonusPercent += b.effect.value;
    });
    // 魔法効果
    state.activeEffects.forEach(eff => {
      if (eff.type === 'timeAcceleration') bonusPercent += eff.value;
    });
    return 1 + bonusPercent / 100;
  },

  // 建設速度ボーナス
  constructionSpeedBonus(state) {
    let bonusPercent = 0;
    state.activeEffects.forEach(eff => {
      if (eff.type === 'timeAcceleration') bonusPercent += eff.value;
    });
    return 1 + bonusPercent / 100;
  },

  // 装備率計算
  equipmentRate(state) {
    const soldiers = state.military.totalSoldiers;
    if (soldiers === 0) return 100;

    const weapons = state.resources.weapons;
    const armor = state.resources.armor;

    // 武器と鎧の平均装備率
    const weaponRate = Math.min(100, (weapons / soldiers) * 100);
    const armorRate = Math.min(100, (armor / soldiers) * 100);

    return Math.round((weaponRate + armorRate) / 2);
  },

  // 戦闘力計算
  combatPower(state, forDefense = false) {
    const m = state.military;
    const soldiers = m.totalSoldiers;
    if (soldiers === 0) return 0;

    // 装備率と士気係数
    const equipRate = this.equipmentRate(state) / 100;

    // 装備係数
    let equipCoef = 0.5;
    if (equipRate >= 0.8) equipCoef = 1.0;
    else if (equipRate >= 0.6) equipCoef = 0.85;
    else if (equipRate >= 0.4) equipCoef = 0.7;

    // 士気係数
    const morale = m.morale / 100;
    let moraleCoef = 0.65;
    if (morale >= 0.8) moraleCoef = 1.0;
    else if (morale >= 0.6) moraleCoef = 0.85;

    // --- 兵種別計算 ---
    // デフォルト値（未定義なら配分ゼロ）
    const infantry = m.infantry || 0;
    const archers = m.archers || 0;
    const cavalry = m.cavalry || 0;

    // まだ配分が決まっていない（totalSoldiersだけある）場合は、自動的に歩兵として扱う
    const unassigned = Math.max(0, soldiers - (infantry + archers + cavalry));
    let effectiveInfantry = infantry + unassigned;

    // 基礎力
    let infPower = effectiveInfantry;
    let arcPower = archers;
    let cavPower = cavalry;

    // 1. 技術補正
    state.technologies.forEach(t => {
      if (t.isResearched) {
        // 弓兵
        if (t.effect.type === 'archerPower') {
          arcPower *= (1 + t.effect.value / 100);
        }
        // 歩兵
        if (t.effect.type === 'infantryPower') {
          infPower *= (1 + t.effect.value / 100);
        }
        // 騎兵（現時点では技術効果にないが、拡張性を考慮）
        if (h.specialAbility.effect.type === 'combatPower') {
          const bonus = 1 + h.specialAbility.effect.value / 100;
          infPower *= bonus;
          arcPower *= bonus;
          cavPower *= bonus;
        }
      }
    });

    // 2. 状況補正（攻守）
    if (forDefense) {
      // 防衛戦：弓兵が強力、歩兵も堅い、騎兵は不利
      arcPower *= 1.5;
      infPower *= 1.1;
      cavPower *= 0.8;

      // 防衛施設ボーナス
      let defenseBonus = 0;
      state.buildings.forEach(b => {
        if (b.effect.type === 'defense') defenseBonus += b.effect.value;
      });
      // 魔法（大結界）
      state.activeEffects.forEach(eff => {
        if (eff.type === 'defenseBonus') defenseBonus += eff.value;
      });

      // 全体に適用
      const totalDefBonus = 1 + defenseBonus / 100;
      infPower *= totalDefBonus;
      arcPower *= totalDefBonus;
      cavPower *= totalDefBonus;

    } else {
      // 攻撃戦（野戦・攻城）：騎兵が強力
      cavPower *= 1.2;
      arcPower *= 0.9; // 移動しながらは撃ちにくい

      // 攻城兵器（銃兵・大砲）ボーナス
      let siegeBonus = 0;
      state.technologies.forEach(t => {
        if (t.isResearched && t.effect.type === 'siegePower') {
          siegeBonus += t.effect.value;
        }
      });
      // 攻城ボーナスは全体に乗せる（あるいは特定の兵種？）
      // ここでは全体に乗せる
      if (siegeBonus > 0) {
        const siegeMul = 1 + siegeBonus / 100;
        infPower *= siegeMul;
        arcPower *= siegeMul;
        cavPower *= siegeMul;
      }
    }

    // 合計戦闘力
    const totalPower = (infPower + arcPower + cavPower) * CONSTANTS.SOLDIER_COMBAT_POWER;

    return Math.floor(totalPower * equipCoef * moraleCoef);
  }
};

// ------------------------------------------------------------------
// 3. ゲームエンジンクラス (GameEngine)
// ------------------------------------------------------------------
export class GameEngine {
  constructor() {
    this.CONSTANTS = CONSTANTS; // UIから参照できるように公開
    this.state = this.createInitialState();
    this.lastTime = 0;
    this.listeners = [];
    this.autosaveTimer = null;
    this.lastEventCheck = 0;
  }

  // 初期状態の作成
  createInitialState() {
    const aiNations = NATION_TEMPLATES.map((template, index) => ({
      id: `nation_${index}`,
      name: template.name,
      personality: template.personality,
      description: template.description,
      population: template.initialPopulation,
      militaryPower: template.initialMilitaryPower,
      economicPower: Math.floor(template.initialPopulation * 1.5),
      techLevel: 1,
      relationWithPlayer: 0,
      treaties: [],
      isAtWar: false,
      aggressiveness: template.aggressiveness,
      expansionDesire: template.expansionDesire,
      lastAttackDay: 0,
    }));

    const initialPop = CONSTANTS.INITIAL_POPULATION;

    return {
      day: 1,
      gameSpeed: 1,
      isPaused: true,
      isEventPaused: false,
      taxRate: 0.15,
      resources: {
        gold: CONSTANTS.INITIAL_GOLD,
        food: CONSTANTS.INITIAL_FOOD,
        ore: 30,
        mana: 0,
        weapons: 10,
        armor: 5
      },
      population: {
        total: initialPop,
        farmers: Math.floor(initialPop * 0.5),
        miners: Math.floor(initialPop * 0.1),
        craftsmen: Math.floor(initialPop * 0.1),
        soldiers: Math.floor(initialPop * 0.2),
        unemployed: initialPop - Math.floor(initialPop * 0.9)
      },
      satisfaction: 60,
      buildings: [],
      constructionQueue: [],
      technologies: JSON.parse(JSON.stringify(TECHNOLOGIES)),
      researchQueue: [],
      eventLog: [
        { id: 1, type: 'important', message: '新たな国家の歴史が始まりました。', day: 1, time: '1日' }
      ],
      military: {
        totalSoldiers: Math.floor(initialPop * 0.2),
        morale: 70,
        infantry: Math.floor(initialPop * 0.15),
        archers: Math.floor(initialPop * 0.05),
        cavalry: 0
      },
      aiNations: aiNations,
      reputation: 0,
      currentBattle: null,
      gameOver: false,
      gameOverReason: null,
      victory: false,
      victoryType: null,

      // 英雄・スペシャリスト
      heroes: [],
      specialists: [], // { name, type, bonus, salary }
      bankruptcyDays: 0,
      lowSatisfactionDays: 0,
      conqueredNations: 0,
      activeEffects: [],
    };
  }

  // 状態更新の購読
  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.state));
  }

  // セーブ/ロード機能
  saveGame() {
    // ゲームオーバーまたは勝利状態ならセーブしない
    if (this.state.gameOver || this.state.victory) {
      return false;
    }

    try {
      const saveData = JSON.stringify(this.state);
      localStorage.setItem(CONSTANTS.SAVE_KEY, saveData);
      this.addLog('ゲームをセーブしました', 'domestic');
      return true;
    } catch (e) {
      console.error('セーブに失敗:', e);
      return false;
    }
  }

  loadGame() {
    console.log('[DEBUG] loadGame Start. SaveKey:', CONSTANTS.SAVE_KEY);
    try {
      const saveData = localStorage.getItem(CONSTANTS.SAVE_KEY);
      console.log('[DEBUG] SaveData found:', !!saveData);
      if (saveData) {
        const loadedState = JSON.parse(saveData);
        console.log('[DEBUG] Loaded GameOver state:', loadedState.gameOver);

        // ロードしたデータが既に終了状態なら破棄する
        if (loadedState.gameOver || loadedState.victory) {
          console.warn('終了状態のセーブデータが見つかりました。破棄して新規ゲームを開始します。');
          this.deleteSave();
          return false;
        }

        const defaultState = this.createInitialState();
        this.state = this.migrateState(loadedState, defaultState);
        this.addLog('セーブデータをロードしました', 'domestic');
        this.notify();
        return true;
      }
      return false;
    } catch (e) {
      console.error('ロードに失敗:', e);
      return false;
    }
  }

  migrateState(loaded, defaultState) {
    // 必要なプロパティの追加
    const migrations = [
      'resources.armor', 'taxRate', 'military.morale', 'military.infantry',
      'military.archers', 'military.cavalry', 'currentBattle', 'gameOver',
      'gameOverReason', 'victory', 'victoryType', 'bankruptcyDays',
      'gameOverReason', 'victory', 'victoryType', 'bankruptcyDays',
      'lowSatisfactionDays', 'conqueredNations', 'heroes', 'specialists'
    ];

    // リソース
    if (!loaded.resources.armor) loaded.resources.armor = defaultState.resources.armor;
    if (!loaded.taxRate) loaded.taxRate = defaultState.taxRate;

    // 軍事
    if (!loaded.military.morale) loaded.military.morale = defaultState.military.morale;
    if (!loaded.military.infantry) loaded.military.infantry = loaded.military.totalSoldiers;
    if (!loaded.military.archers) loaded.military.archers = 0;
    if (!loaded.military.cavalry) loaded.military.cavalry = 0;

    // ゲーム状態
    if (loaded.currentBattle === undefined) loaded.currentBattle = null;
    if (loaded.gameOver === undefined) loaded.gameOver = false;
    if (loaded.gameOverReason === undefined) loaded.gameOverReason = null;
    if (loaded.victory === undefined) loaded.victory = false;
    if (loaded.victoryType === undefined) loaded.victoryType = null;
    if (loaded.bankruptcyDays === undefined) loaded.bankruptcyDays = 0;
    if (loaded.lowSatisfactionDays === undefined) loaded.lowSatisfactionDays = 0;
    if (loaded.heroes === undefined) loaded.heroes = [];
    if (loaded.specialists === undefined) loaded.specialists = [];
    if (loaded.conqueredNations === undefined) loaded.conqueredNations = 0;

    // AI国家
    if (!loaded.aiNations || loaded.aiNations.length === 0) {
      loaded.aiNations = defaultState.aiNations;
    } else {
      loaded.aiNations.forEach(n => {
        if (n.lastAttackDay === undefined) n.lastAttackDay = 0;
      });
    }

    if (loaded.reputation === undefined) loaded.reputation = 0;
    if (loaded.activeEffects === undefined) loaded.activeEffects = [];

    return loaded;
  }

  deleteSave() {
    try {
      localStorage.removeItem(CONSTANTS.SAVE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  hasSaveData() {
    return localStorage.getItem(CONSTANTS.SAVE_KEY) !== null;
  }

  startAutosave() {
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
    this.autosaveTimer = setInterval(() => {
      if (!this.state.isPaused && !this.state.gameOver) {
        this.saveGame();
      }
    }, CONSTANTS.AUTOSAVE_INTERVAL);
  }

  stopAutosave() {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  // --- ゲームループ ---
  tick(currentTime) {
    if (this.state.isPaused || this.state.isEventPaused || this.state.gameOver || this.state.victory) {
      this.lastTime = currentTime;
      requestAnimationFrame((t) => this.tick(t));
      return;
    }

    let deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    // タイムスキップ防止（最大1秒）
    if (deltaTime > 1.0) deltaTime = 1.0;

    const prevDay = Math.floor(this.state.day);
    // 日数進行: 1日 = 60秒（1分）、ゲームスピードで加速
    this.state.day += deltaTime * this.state.gameSpeed / 60;
    const currentDay = Math.floor(this.state.day);
    const dayDiff = this.state.day - (prevDay + (this.state.day % 1) - (deltaTime * this.state.gameSpeed * 0.1));
    // ※正確な差分計算が面倒なので、概算でdeltaTimeから計算する方が安全
    const preciseDayProgress = deltaTime * this.state.gameSpeed * 0.1;

    // 持続効果の更新
    this.updateActiveEffects(preciseDayProgress);

    // 日次更新
    if (currentDay > prevDay) {
      this.processDailyUpdate();
      this.checkRandomEvents();
      this.checkAIActions();
      this.checkEndGameEvents();
    }

    // 月次更新
    if (Math.floor(currentDay / 30) > Math.floor(prevDay / 30)) {
      this.processMonthlyUpdate();
    }

    // 建設・研究の進行（実時間ベース、gameSpeedで加速）
    this.updateProgress(deltaTime * this.state.gameSpeed);

    // AI国家の更新
    this.updateAINations(deltaTime * this.state.gameSpeed);

    // 戦闘の進行
    if (this.state.currentBattle) {
      this.updateBattle(deltaTime * this.state.gameSpeed);
    }

    // 勝敗判定
    this.checkVictoryConditions();
    this.checkDefeatConditions();

    this.notify();
    requestAnimationFrame((t) => this.tick(t));
  }

  startGameLoop() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.tick(t));
  }

  togglePause() {
    this.state.isPaused = !this.state.isPaused;
    if (!this.state.isPaused) {
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.tick(t));
    }
  }

  // --- 更新ロジック ---
  processDailyUpdate() {
    // 生産
    const foodProd = Calcs.foodProduction(this.state);
    const oreProd = Calcs.oreProduction(this.state);
    const weaponProd = Calcs.weaponProduction(this.state);
    const armorProd = Calcs.armorProduction(this.state);
    const manaProd = Calcs.manaProduction(this.state);

    // 消費
    // 消費
    const foodCons = Calcs.foodConsumption(this.state);

    // 税収と維持費（日次加算）
    // 月次計算メソッドの結果を30で割って日次分を算出
    const tax = Calcs.taxIncome(this.state) / 30;
    const maintenance = Calcs.maintenance(this.state) / 30;

    // 反映（小数のまま加算し、表示時に整数化する）
    this.state.resources.gold += (tax - maintenance);
    this.state.resources.food += (foodProd - foodCons);
    this.state.resources.ore += oreProd;
    this.state.resources.weapons += weaponProd;
    this.state.resources.armor += armorProd;
    this.state.resources.mana += manaProd;

    // 餓死判定
    if (this.state.resources.food < 0) {
      this.state.resources.food = 0;
      const starved = Math.ceil(this.state.population.total * 0.01);
      this.addPopulation(-starved);
      this.addLog(`食糧不足で${starved}人が餓死しました`, 'important');
    }
  }

  processMonthlyUpdate() {
    // 税収と維持費はprocessDailyUpdateで毎日処理されます

    // 月次ログ（目安）
    // const tax = Calcs.taxIncome(this.state) * 30;
    // const maintenance = Calcs.maintenance(this.state) * 30;
    // this.addLog(`月次定期報告: 財政状況を確認しました`, 'domestic');

    // 破産判定

    // 破産判定
    if (this.state.resources.gold < 0) {
      this.state.bankruptcyDays += 30;
      this.addLog('国庫が破産状態です！', 'important');
    } else {
      this.state.bankruptcyDays = 0;
    }

    // 満足度更新
    this.state.satisfaction = Calcs.satisfaction(this.state);

    // 満足度による判定
    if (this.state.satisfaction <= 0) {
      this.state.lowSatisfactionDays += 30;
    } else {
      this.state.lowSatisfactionDays = 0;
    }

    // 人口増減
    if (this.state.satisfaction >= CONSTANTS.SATISFACTION_GROWTH) {
      const growth = Math.ceil(this.state.population.total * 0.03);
      this.addPopulation(growth);
      this.addLog(`${growth}人の移民が到着しました`, 'domestic');
    } else if (this.state.satisfaction <= CONSTANTS.SATISFACTION_DECLINE) {
      const decline = Math.ceil(this.state.population.total * 0.02);
      this.addPopulation(-decline);
      this.addLog(`${decline}人が国を去りました`, 'important');
    }

    // 貿易協定の期間減少
    this.state.aiNations.forEach(nation => {
      nation.treaties = nation.treaties.filter(t => {
        t.duration -= 1;
        if (t.duration <= 0) {
          this.addLog(`${nation.name}との貿易協定が期限切れになりました`, 'diplomatic');
          return false;
        }
        return true;
      });
    });

    // 士気の自然回復
    if (this.state.military.morale < 70) {
      this.state.military.morale = Math.min(70, this.state.military.morale + 5);
    }
  }

  updateProgress(deltaSeconds) {
    // 建設キューの処理
    const buildSpeed = Calcs.constructionSpeedBonus(this.state);

    for (let i = this.state.constructionQueue.length - 1; i >= 0; i--) {
      this.state.constructionQueue[i].remainingTime -= deltaSeconds * buildSpeed;
      if (this.state.constructionQueue[i].remainingTime <= 0) {
        const completed = this.state.constructionQueue.splice(i, 1)[0];
        const buildingData = BUILDINGS.find(b => b.id === completed.buildingId);

        this.state.buildings.push({ ...buildingData, builtAt: this.state.day });
        this.addLog(`${buildingData.name} の建設が完了しました`, 'domestic');
      }
    }

    // 研究キューの処理
    const speedBonus = Calcs.researchSpeedBonus(this.state);

    for (let i = this.state.researchQueue.length - 1; i >= 0; i--) {
      this.state.researchQueue[i].remainingTime -= deltaSeconds * speedBonus;
      if (this.state.researchQueue[i].remainingTime <= 0) {
        const completed = this.state.researchQueue.splice(i, 1)[0];

        const tech = this.state.technologies.find(t => t.id === completed.techId);
        if (tech) {
          tech.isResearched = true;
          this.addLog(`技術「${tech.name}」の研究が完了しました！`, 'tech');
          this.applyTechEffect(tech);
        }
      }
    }
  }

  applyTechEffect(tech) {
    switch (tech.effect.type) {
      case 'unlockBuilding':
        this.addLog(`新しい施設が建設可能になりました`, 'tech');
        break;
      case 'unlockVictory':
        this.addLog(`技術勝利への道が開かれました！`, 'important');
        break;
      case 'simultaneousConstruction':
        this.addLog(`同時建設可能数が ${tech.effect.value} に増加しました`, 'tech');
        break;
      case 'productionBonus':
        this.addLog(`全体の生産効率が ${tech.effect.value}% 向上しました`, 'tech');
        break;
      case 'combatPower':
        this.addLog(`軍事技術の向上により、全軍の戦闘力が ${tech.effect.value}% 上昇しました`, 'military');
        break;
      case 'taxBonus':
        this.addLog(`税制改革により、税収が ${tech.effect.value}% 増加しました`, 'domestic');
        break;
    }
  }

  updateAINations(deltaSeconds) {
    this.state.aiNations.forEach(nation => {
      if (nation.isDefeated) return;

      // 成長処理
      const dailyGrowth = 1 + (0.005 / 30) * (deltaSeconds / 10);
      nation.population = Math.floor(nation.population * dailyGrowth);
      nation.militaryPower = Math.floor(nation.population * 0.12);
      nation.economicPower = Math.floor(nation.population * 1.5);

      // 関係値の自然変動
      if (nation.relationWithPlayer > 0) {
        nation.relationWithPlayer = Math.max(0, nation.relationWithPlayer - 0.001 * deltaSeconds);
      } else if (nation.relationWithPlayer < 0) {
        nation.relationWithPlayer = Math.min(0, nation.relationWithPlayer + 0.0005 * deltaSeconds);
      }
    });
  }

  // --- ランダムイベント ---
  checkRandomEvents() {
    if (Math.random() > 0.15) return; // 15%の確率でイベント発生

    const events = [
      // ポジティブイベント
      {
        type: 'positive',
        name: '移住者到着',
        title: '移住者の到着',
        description: '隣国から戦火を逃れてきた人々が、あなたの国への定住を求めています。彼らは疲弊していますが、働き手としては期待できそうです。',
        weight: 20,
        choices: [
          {
            text: '歓迎して受け入れる',
            description: '市民として迎え入れ、食糧を配給します。(人口増大、1人5食糧消費)',
            effect: (state) => {
              const amount = Math.floor(Math.random() * 10) + 5;
              const cost = amount * 5;
              state.resources.food = Math.max(0, state.resources.food - cost);
              this.addPopulation(amount);
              this.addLog(`${amount}人の移住者を受け入れ、食糧${cost}を配給しました`, 'domestic');
            }
          },
          {
            text: '労働力として酷使する',
            description: '権利を与えず働かせます。(人口増大、満足度-15)',
            effect: (state) => {
              const amount = Math.floor(Math.random() * 10) + 5;
              this.addPopulation(amount);
              state.satisfaction = Math.max(0, state.satisfaction - 15);
              this.addLog(`${amount}人の移住者を労働力として受け入れましたが、民衆の不満が高まりました`, 'important');
            }
          },
          {
            text: '拒否する',
            description: '国内の安定を優先し、追い返します。(変化なし)',
            effect: (state) => {
              this.addLog('移住者の受け入れを拒否しました', 'domestic');
            }
          }
        ]
      },
      {
        type: 'positive',
        name: '豊作',
        title: '予期せぬ豊作',
        description: '天候に恵まれ、予想以上の作物が収穫できました。余剰分をどうしますか？',
        weight: 15,
        choices: [
          {
            text: '備蓄する',
            description: 'すべて倉庫に保管します。(食糧大量増加)',
            effect: (state) => {
              const amount = Math.floor(Math.random() * 100) + 50;
              state.resources.food += amount;
              this.addLog(`豊作により食糧${amount}を備蓄しました`, 'domestic');
            }
          },
          {
            text: '民に振る舞う',
            description: '宴を開き、民衆と喜びを分かち合います。(食糧増加小、満足度上昇)',
            effect: (state) => {
              const amount = Math.floor(Math.random() * 50) + 20;
              state.resources.food += amount;
              state.satisfaction = Math.min(100, state.satisfaction + 10);
              this.addLog(`収穫祭を開催しました。食糧+${amount}、満足度+10`, 'domestic');
            }
          }
        ]
      },
      {
        type: 'positive',
        name: '鉱脈発見',
        title: '新たな鉱脈の兆候',
        description: '鉱山師が有望な鉱脈を発見したとの報告が入りました。本格的な採掘には投資が必要です。',
        weight: 10,
        choices: [
          {
            text: '大規模な採掘を行う (100G)',
            description: '資金を投じて徹底的に掘ります。(金消費、鉱石大量獲得)',
            effect: (state) => {
              const cost = 100;
              if (state.resources.gold >= cost) {
                state.resources.gold -= cost;
                const amount = Math.floor(Math.random() * 100) + 50;
                state.resources.ore += amount;
                this.addLog(`投資を行い、${amount}の鉱石を採掘しました`, 'domestic');
              } else {
                this.addLog('資金不足のため大規模な採掘は行えませんでした', 'domestic');
              }
            }
          },
          {
            text: '手作業で採掘する',
            description: 'コストをかけずに掘ります。(鉱石少量獲得)',
            effect: (state) => {
              const amount = Math.floor(Math.random() * 30) + 10;
              state.resources.ore += amount;
              this.addLog(`手作業で${amount}の鉱石を採掘しました`, 'domestic');
            }
          }
        ]
      },
      {
        type: 'positive',
        name: '商人来訪',
        title: '異国の行商人',
        description: '珍しい品を扱う行商人が訪れました。何を購入しますか？',
        weight: 15,
        choices: [
          {
            text: '武器を購入する (200G)',
            description: '武器20個を購入します。',
            effect: (state) => {
              if (state.resources.gold >= 200) {
                state.resources.gold -= 200;
                state.resources.weapons += 20;
                this.addLog('行商人から武器20個を購入しました', 'domestic');
              } else {
                this.addLog('資金が足りず購入できませんでした', 'domestic');
              }
            }
          },
          {
            text: '書物を購入する (300G)',
            description: '研究が進むかもしれません。(全技術の研究時間短縮)',
            effect: (state) => {
              if (state.resources.gold >= 300) {
                state.resources.gold -= 300;
                state.researchQueue.forEach(q => q.remainingTime = Math.max(0, q.remainingTime - 30));
                this.addLog('貴重な書物を入手し、研究が進みました', 'tech');
              } else {
                this.addLog('資金が足りず購入できませんでした', 'domestic');
              }
            }
          },
          {
            text: '何も買わない',
            description: '興味がありません。',
            effect: (state) => { }
          }
        ]
      },
      // 英雄・スペシャリスト来訪イベント
      {
        type: 'positive',
        name: '英雄来訪',
        title: '英雄の来訪',
        description: '名声を聞きつけた英雄が、あなたへの謁見を求めています。',
        weight: 5, // 低確率
        condition: () => this.state.day > 30 && this.state.heroes.length < 3,
        choices: [
          {
            text: '謁見する',
            description: '英雄の能力を確認します',
            effect: (state) => {
              // ランダムに英雄を選ぶ
              const hero = HERO_TEMPLATES[Math.floor(Math.random() * HERO_TEMPLATES.length)];
              // 重複チェックは簡易的に名前で
              if (state.heroes.some(h => h.name === hero.name)) {
                this.addLog('訪れた英雄は既に雇用されていました...', 'domestic');
                return;
              }

              this.triggerEvent({
                id: Date.now(),
                type: 'positive',
                title: `英雄「${hero.name}」`,
                description: `「${hero.name}」が仕官を申し出ています。\n能力: ${hero.specialAbility.description}\n給与: ${hero.salary}G/月`,

                choices: [
                  {
                    text: '雇用する (契約金なし)',
                    effect: () => this.recruitUnit('hero', hero)
                  },
                  {
                    text: '断る',
                    effect: () => this.addLog(`${hero.name}を見送りました`, 'domestic')
                  }
                ]
              });
            },
          },
          { text: '断る', effect: () => { } }
        ]
      },
      {
        type: 'positive',
        name: 'スペシャリスト来訪',
        title: '熟練者の来訪',
        description: '腕利きの専門家が仕事を求めています。',
        weight: 10,
        condition: () => this.state.day > 15,
        choices: [
          {
            text: '面会する',
            effect: (state) => {
              const spec = SPECIALIST_TEMPLATES[Math.floor(Math.random() * SPECIALIST_TEMPLATES.length)];
              if (state.specialists.some(s => s.name === spec.name)) {
                this.addLog('その者は既に雇用されています', 'domestic'); return;
              }
              this.triggerEvent({
                id: Date.now(),
                type: 'positive',
                title: `熟練者「${spec.name}」`,
                description: `職種: ${this.getSpecialistTypeName(spec.type)}\n効果: ${spec.bonus.type} +${spec.bonus.value}\n給与: ${spec.salary}G/月`,
                choices: [
                  { text: '雇用する (契約金なし)', effect: () => this.recruitUnit('specialist', spec) },
                  { text: '断る', effect: () => { } }
                ]
              });
            }
          },
          { text: '断る', effect: () => { } }
        ]
      },
      // ネガティブイベント
      {
        type: 'negative',
        name: '干ばつ',
        title: '深刻な干ばつ',
        description: '雨が降らず、作物が枯れ始めています。どう対処しますか？',
        weight: 10,
        condition: () => this.state.day > 15,
        choices: [
          {
            text: '耐える',
            description: '自然に任せます。(食糧30%減少)',
            effect: (state) => {
              const loss = Math.floor(state.resources.food * 0.3);
              state.resources.food = Math.max(0, state.resources.food - loss);
              this.addLog(`干ばつで作物が枯れ、食糧${loss}を失いました`, 'important');
            }
          },
          {
            text: '備蓄を放出する (100G)',
            description: '市場に介入し、混乱を防ぎます。(食糧10%減少、金消費)',
            effect: (state) => {
              const loss = Math.floor(state.resources.food * 0.1);
              const cost = 100;
              if (state.resources.gold >= cost) {
                state.resources.gold -= cost;
                state.resources.food = Math.max(0, state.resources.food - loss);
                this.addLog('資金を投じて被害を最小限に食い止めました', 'domestic');
              } else {
                const bigLoss = Math.floor(state.resources.food * 0.3);
                state.resources.food = Math.max(0, state.resources.food - bigLoss);
                this.addLog('資金が足りず、大きな被害を受けました', 'important');
              }
            }
          }
        ]
      },
      {
        type: 'negative',
        name: '山賊襲撃',
        title: '山賊団の出現',
        description: '国境付近で山賊が略奪を行っています。',
        weight: 12,
        condition: () => this.state.day > 20,
        choices: [
          {
            text: '兵士を派遣して討伐 (必要兵力: 5)',
            description: '武力で解決します。(勝利すれば被害なし、兵士が負傷する可能性あり)',
            effect: (state) => {
              const soldiers = state.military.totalSoldiers;
              if (soldiers >= 5) {
                const injury = Math.floor(Math.random() * 3);
                state.military.totalSoldiers = Math.max(0, state.military.totalSoldiers - injury);
                this.addLog(`兵士を派遣し、山賊を撃退しました！(負傷者${injury}名)`, 'military');
              } else {
                const loss = Math.floor(state.resources.gold * 0.2);
                state.resources.gold -= loss;
                this.addLog(`兵力が足りず撃退に失敗... ${loss}Gを略奪されました`, 'important');
              }
            }
          },
          {
            text: '金を払って見逃してもらう (約10%金減少)',
            description: '平和的に解決します。(金減少)',
            effect: (state) => {
              const loss = Math.floor(state.resources.gold * 0.1) + 50;
              state.resources.gold = Math.max(0, state.resources.gold - loss);
              this.addLog(`要求通り${loss}Gを支払い、山賊は去りました`, 'domestic');
            }
          }
        ]
      },
      {
        type: 'negative',
        name: '疫病',
        title: '謎の疫病',
        description: '原因不明の病が流行の兆しを見せています。',
        weight: 5,
        condition: () => this.state.day > 30 && this.state.population.total > 30,
        choices: [
          {
            text: '都市を封鎖する',
            description: '感染拡大を防ぎます。(満足度大幅低下、死者小)',
            effect: (state) => {
              state.satisfaction -= 20;
              const dead = Math.floor(state.population.total * 0.01);
              this.addPopulation(-dead);
              this.addLog(`封鎖により被害を抑えましたが、民衆は不満を抱いています (死者${dead}人)`, 'important');
            }
          },
          {
            text: '魔法薬を配布する (300G, 50魔力)',
            description: '高価な薬で治療します。(被害なし)',
            effect: (state) => {
              const goldCost = 300;
              const manaCost = 50;
              if (state.resources.gold >= goldCost && state.resources.mana >= manaCost) {
                state.resources.gold -= goldCost;
                state.resources.mana -= manaCost;
                state.satisfaction += 10;
                this.addLog('魔法薬の効果で疫病は収束しました。政府の対応が賞賛されています', 'domestic');
              } else {
                const dead = Math.floor(state.population.total * 0.1);
                this.addPopulation(-dead);
                this.addLog(`リソースが足りず薬を配れませんでした... ${dead}人が亡くなりました`, 'important');
              }
            }
          }
        ]
      },
    ];

    // 重み付き抽選
    const availableEvents = events.filter(e => !e.condition || e.condition());
    const totalWeight = availableEvents.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;

    for (const event of availableEvents) {
      random -= event.weight;
      if (random <= 0) {
        this.triggerEvent(event);
        break;
      }
    }
  }

  // --- イベントトリガー ---
  triggerEvent(event) {
    this.state.isEventPaused = true;
    this.notify();

    if (window.game && window.game.ui) {
      window.game.ui.showEventModal(event, (choiceIndex) => {
        const choice = event.choices[choiceIndex];
        if (choice.effect) {
          choice.effect(this.state); // stateを渡す
        }
        this.addLog(`イベント「${event.title}」: 【${choice.text}】を選択しました`, 'important');

        this.state.isEventPaused = false;
        this.lastTime = performance.now();
        this.notify();
      });
    } else {
      // フォールバック
      console.warn('UI not found for event');
      this.state.isEventPaused = false;
    }
  }

  // --- AI行動 ---
  checkAIActions() {
    if (this.state.currentBattle) return;

    this.state.aiNations.forEach(nation => {
      if (nation.isDefeated) return;
      if (this.state.day < 60) return; // 開始60日は様子見

      // クールダウン（攻撃も外交も共有）
      const lastAction = Math.max(nation.lastAttackDay || 0, nation.lastDiplomacyDay || 0);
      if (this.state.day - lastAction < 30) return;

      const playerPower = Calcs.combatPower(this.state, true);

      // 1. 戦争状態の処理
      if (nation.isAtWar) {
        // 戦争中なら攻撃頻度が高い
        if (Math.random() < 0.2) {
          nation.lastAttackDay = this.state.day;
          this.startBattle(nation.id, true);
        }
        return;
      }

      // 2. 宣戦布告判定（関係最悪）
      if (nation.relationWithPlayer < -80) {
        if (Math.random() < 0.1) {
          this.declareWar(nation);
          return;
        }
      }

      // 3. 奇襲攻撃判定（好戦的かつ相手が弱い）
      if (nation.aggressiveness > 70 && nation.militaryPower > playerPower * 1.5) {
        if (Math.random() < 0.05) {
          this.declareWar(nation); // 奇襲でも宣戦布告扱いにする
          return;
        }
      }

      // 4. 外交アクション判定
      if (Math.random() < 0.05) {
        this.processDiplomaticAction(nation);
      }
    });
  }

  // 宣戦布告
  declareWar(nation) {
    nation.lastAttackDay = this.state.day;
    nation.isAtWar = true;
    nation.relationWithPlayer = -100;

    this.addLog(`${nation.name}から宣戦布告されました！`, 'important');

    // イベントとして通知
    this.triggerEvent({
      id: Date.now(),
      type: 'negative',
      title: '宣戦布告',
      description: `${nation.name}が我が国に対して宣戦を布告しました！国境付近に軍が集結しています。`,
      choices: [{
        text: '迎撃準備',
        description: '直ちに戦闘態勢に入ります。',
        effect: () => {
          this.startBattle(nation.id, true);
        }
      }]
    });
    // D. 同盟・不可侵の打診 (親密な場合)
    if (rel > 50 && !nation.treaties.some(t => t.type === 'alliance') && Math.random() < 0.3) {
      // ... (省略可能だが、プレイヤーからのアクションを主とするため今回は省略)
    }
  }

  // --- 拡張外交 ---
  signTreaty(nationId, type) {
    const nation = this.state.aiNations.find(n => n.id === nationId);
    if (!nation) return;

    let cost = 0;
    let duration = 0;
    let relReq = 0;

    switch (type) {
      case 'non_aggression': // 不可侵条約
        cost = 500;
        duration = 360; // 1年
        relReq = 20;
        break;
      case 'alliance': // 軍事同盟
        cost = 2000;
        duration = 720; // 2年
        relReq = 60;
        break;
    }

    if (nation.relationWithPlayer < relReq) {
      this.addLog(`${nation.name}は提案に応じる気がないようです（友好度不足）`, 'diplomatic');
      return;
    }
    if (this.state.resources.gold < cost) {
      this.addLog(`条約締結のための資金が不足しています(${cost}G)`, 'diplomatic');
      return;
    }

    this.state.resources.gold -= cost;
    nation.treaties.push({ type: type, duration: duration });
    nation.relationWithPlayer += 20;

    const typeName = type === 'alliance' ? '軍事同盟' : '不可侵条約';
    this.addLog(`${nation.name}との${typeName}を締結しました！`, 'diplomatic');
  }

  // 外交アクション処理
  processDiplomaticAction(nation) {
    nation.lastDiplomacyDay = this.state.day;
    const rel = nation.relationWithPlayer;
    const isCommercial = nation.personality === 'commercial';
    const isAggressive = nation.personality === 'aggressive';

    // A. 貿易提案
    if (!nation.treaties.some(t => t.type === 'trade') && (rel > 0 || isCommercial)) {
      if (Math.random() < 0.6) {
        const gift = Math.floor(Math.random() * 200) + 100;
        this.triggerEvent({
          id: Date.now(),
          type: 'positive',
          title: '貿易協定の打診',
          description: `${nation.name}から貿易協定の申し入れがありました。友好の証として${gift}Gの提供を申し出ています。`,
          choices: [
            {
              text: '受諾する',
              description: `資金+${gift}、関係改善、貿易協定締結`,
              effect: (s) => {
                s.resources.gold += gift;
                nation.relationWithPlayer += 15;
                nation.treaties.push({ type: 'trade', duration: 12 });
                this.addLog(`${nation.name}との貿易協定を締結しました`, 'diplomatic');
              }
            },
            {
              text: '拒否する',
              description: '関係悪化小',
              effect: () => {
                nation.relationWithPlayer -= 5;
                this.addLog(`${nation.name}からの申し入れを断りました`, 'diplomatic');
              }
            }
          ]
        });
        return;
      }
    }

    // B. 貢物要求（脅迫）
    if (rel < -20 || isAggressive) {
      const playerPower = Calcs.combatPower(this.state, true);
      if (nation.militaryPower > playerPower * 1.3) {
        const demand = Math.floor(this.state.resources.gold * 0.2) + 100;
        this.triggerEvent({
          id: Date.now(),
          type: 'negative',
          title: '貢物の要求',
          description: `${nation.name}が国境に軍を展開し、手切れ金として${demand}Gを要求しています。「支払わぬなら剣で語るのみ」とのことです。`,
          choices: [
            {
              text: '支払う',
              description: `資金-${demand}、関係改善小、一時休戦`,
              effect: (s) => {
                if (s.resources.gold >= demand) {
                  s.resources.gold -= demand;
                  nation.relationWithPlayer += 10;
                  this.addLog(`${nation.name}に要求された貢物を支払いました`, 'diplomatic');
                } else {
                  // 足りない場合は関係さらに悪化
                  nation.relationWithPlayer -= 20;
                  this.addLog('資金が足りず支払えませんでした。関係がさらに悪化しました', 'important');
                }
              }
            },
            {
              text: '拒否する',
              description: '関係大幅悪化、宣戦布告の可能性大',
              effect: () => {
                nation.relationWithPlayer -= 30;
                this.addLog(`${nation.name}の要求を拒絶しました`, 'diplomatic');
                if (Math.random() < 0.5) {
                  setTimeout(() => this.declareWar(nation), 1000);
                }
              }
            }
          ]
        });
        return;
      }
    }

    // C. 関係改善（親書）
    if (rel > -20 && rel < 50) {
      this.triggerEvent({
        id: Date.now(),
        type: 'normal',
        title: '親書の到来',
        description: `${nation.name}から親書が届きました。我が国との関係を深めたい意向のようです。`,
        choices: [
          {
            text: '丁重に返信する',
            description: '関係改善',
            effect: () => {
              nation.relationWithPlayer += 10;
              this.addLog(`${nation.name}と友好的な書簡を交わしました`, 'diplomatic');
            }
          },
          {
            text: '無視する',
            description: '関係微減',
            effect: () => {
              nation.relationWithPlayer -= 2;
            }
          }
        ]
      });
    }
  }

  // --- 終盤イベント ---
  checkEndGameEvents() {
    const day = Math.floor(this.state.day);

    // 90日目: 魔王復活の予兆
    if (day === 90 && !this.state.eventLog.some(e => e.message.includes('魔王'))) {
      this.addLog('【警告】 世界各地で謎の瘴気が観測されています... 魔王復活の予兆かもしれません', 'important');
    }

    // 100日目: 魔王軍出現（世界大戦モード）
    if (day === 100 && !this.state.eventLog.some(e => e.message.includes('全国家の軍事力が強化'))) {
      this.state.aiNations.forEach(n => {
        if (!n.isDefeated) {
          n.militaryPower += 2000;
          n.aggressiveness = 100; // 超攻撃的
          n.relationWithPlayer = -100;
          // 魔王軍の影響下にあるという設定
        }
      });
      // 魔王軍（仮想国家）も作成可能だが、既存国家の暴走で表現
      this.addLog('【緊急】 魔王が復活し、世界中の国家が支配下に置かれました！', 'important');
      this.triggerEvent({
        id: Date.now(),
        type: 'negative',
        title: '魔王復活',
        description: '魔王の復活により世界は闇に包まれました。全ての国家が敵となり襲い掛かってきます！生き残るか、魔王を討伐しなければなりません。',
        choices: [{ text: '迎撃準備', effect: () => { } }]
      });
    }

    // 120日目: 魔王本隊襲来（最終決戦）
    if (day === 120 && !this.state.victory) {
      this.triggerEvent({
        id: Date.now(),
        type: 'negative',
        title: '魔王軍本隊襲来',
        description: '魔王軍の本隊が王都に接近しています！ これが最後の戦いです。勝利すれば世界に平和が戻ります。',
        choices: [
          {
            text: '決戦を挑む',
            description: '魔王軍(戦力5000)との戦闘開始',
            effect: () => {
              this.startBossBattle();
            }
          },
          {
            text: '降伏する',
            description: 'ゲームオーバー',
            effect: () => {
              this.endGame(false, 'surrender');
            }
          }
        ]
      });
    }
  }

  startBossBattle() {
    this.state.currentBattle = {
      enemyId: 'demon_lord',
      enemyName: '魔王軍本隊',
      isDefense: true,
      playerForces: {
        initial: this.state.military.totalSoldiers,
        current: this.state.military.totalSoldiers,
        power: Calcs.combatPower(this.state, true),
        morale: this.state.military.morale
      },
      enemyForces: {
        initial: 5000,
        current: 5000,
        power: 5000, // 固定戦力
        morale: 100
      },
      elapsed: 0,
      log: ['魔王軍本隊との最終決戦が始まりました！'],
      result: null,
      isBoss: true
    };
    this.addLog('魔王軍本隊との戦闘が開始されました！', 'military');
  }

  // --- 勝敗判定 ---
  checkVictoryConditions() {
    if (this.state.victory || this.state.gameOver) return;

    // 1. 統一勝利: 全ての他国を征服
    const allConquered = this.state.aiNations.every(n => n.isDefeated);
    if (allConquered) {
      this.endGame(true, 'domination');
      return;
    }

    // 2. 経済勝利: 資金100万G以上（難易度高め）
    if (this.state.resources.gold >= 1000000) {
      this.endGame(true, 'economic');
      return;
    }

    // 3. 技術勝利: 全技術研究完了
    if (this.state.technologies.every(t => t.isResearched)) {
      this.endGame(true, 'technology');
      return;
    }
  }

  checkDefeatConditions() {
    if (this.state.victory || this.state.gameOver) return;

    // 1. 全滅敗北
    if (this.state.population.total <= 0) {
      this.endGame(false, 'annihilation');
      return;
    }

    // 2. 破産敗北（借金生活が長く続くとか）
    if (this.state.bankruptcyDays >= 360) { // 1年破産
      this.endGame(false, 'bankruptcy');
      return;
    }

    // 3. 支持率低下による革命
    if (this.state.lowSatisfactionDays >= 180) { // 半年不満
      this.endGame(false, 'revolution');
      return;
    }
  }

  endGame(isVictory, reason) {
    this.state.victory = isVictory;
    this.state.gameOver = !isVictory;
    this.state.victoryType = reason;
    this.state.isPaused = true;

    // スコア計算
    const score = this.calculateScore();
    this.savePrestige(score);

    const title = isVictory ? 'GAME CLEAR!' : 'GAME OVER';
    let message = '';

    switch (reason) {
      case 'domination': message = 'あなたは大陸全土を統一し、絶対的な支配者となりました。'; break;
      case 'economic': message = 'あなたの国は世界最大の経済大国となり、金で世界を動かすに至りました。'; break;
      case 'technology': message = 'あなたの国は科学の極致に達し、別次元へと旅立ちました。'; break;
      case 'demon_slayer': message = 'あなたは魔王を討ち果たし、伝説の英雄として語り継がれるでしょう。'; break;
      case 'annihilation': message = '国民は死に絶え、国は滅びました...'; break;
      case 'bankruptcy': message = '国家財政は破綻し、国は解体されました...'; break;
      case 'revolution': message = '激怒した民衆により王宮は包囲され、あなたの治世は終わりました...'; break;
      case 'surrender': message = '魔王軍に降伏し、世界は闇に包まれました...'; break;
      case 'defeat': message = '戦いに敗れ、国は滅ぼされました...'; break;
    }

    message += `\n\n獲得スコア: ${score} pt\n周回ポイントとして保存されました。`;

    if (window.game && window.game.ui) {
      window.game.ui.showEventModal({
        title: title,
        description: message,
        choices: [
          { text: 'タイトルに戻る', effect: () => { location.reload(); } }
        ]
      }, () => { location.reload(); });
    }
  }

  // --- 戦闘システム ---
  startBattle(nationId, isDefense = false) {
    const nation = this.state.aiNations.find(n => n.id === nationId);
    if (!nation || nation.isDefeated) return { success: false, message: '対象国家が見つかりません' };

    if (this.state.currentBattle) {
      return { success: false, message: '既に戦闘中です' };
    }

    const playerPower = Calcs.combatPower(this.state, isDefense);
    const enemyPower = nation.militaryPower;

    this.state.currentBattle = {
      enemyId: nationId,
      enemyName: nation.name,
      isDefense: isDefense,
      playerForces: {
        initial: this.state.military.totalSoldiers,
        current: this.state.military.totalSoldiers,
        power: playerPower,
        morale: this.state.military.morale
      },
      enemyForces: {
        initial: Math.floor(nation.population * 0.15),
        current: Math.floor(nation.population * 0.15),
        power: enemyPower,
        morale: 70
      },
      elapsed: 0,
      log: [],
      result: null
    };

    const battleType = isDefense ? '防衛戦' : '侵攻戦';
    this.addLog(`${nation.name}との${battleType}が開始されました！`, 'military');
    this.state.currentBattle.log.push(`戦闘開始: 味方${playerPower} vs 敵${enemyPower}`);

    return { success: true };
  }

  updateBattle(deltaSeconds) {
    const battle = this.state.currentBattle;
    if (!battle || battle.result) return;

    battle.elapsed += deltaSeconds;

    // 10秒ごとに戦闘フェーズを処理
    if (battle.elapsed >= 1) {
      battle.elapsed = 0;

      // 戦闘が60秒以上続いた場合、強制的に決着
      if (battle.log.length >= 60) { // logの長さで時間を概算
        if (battle.playerForces.current >= battle.enemyForces.current) {
          this.resolveBattle('victory');
        } else {
          this.resolveBattle('defeat');
        }
        return;
      }

      const playerDamage = Math.floor(battle.enemyForces.power * 0.08);
      const enemyDamage = Math.floor(battle.playerForces.power * 0.10);

      battle.playerForces.current = Math.max(0, battle.playerForces.current - playerDamage);
      battle.enemyForces.current = Math.max(0, battle.enemyForces.current - enemyDamage);

      // 士気変動
      if (battle.playerForces.power > battle.enemyForces.power) {
        battle.playerForces.morale = Math.min(100, battle.playerForces.morale + 2);
        battle.enemyForces.morale = Math.max(0, battle.enemyForces.morale - 3);
      } else {
        battle.playerForces.morale = Math.max(0, battle.playerForces.morale - 3);
        battle.enemyForces.morale = Math.min(100, battle.enemyForces.morale + 2);
      }

      // 戦闘力の再計算（最小値1を保証して無限ループ防止）
      // 兵数が残っているのに戦闘力が0になるとダメージが0になり終わらなくなるため
      battle.playerForces.power = Math.max(1, Math.floor(battle.playerForces.power * (battle.playerForces.current / Math.max(1, battle.playerForces.initial))));
      battle.enemyForces.power = Math.max(1, Math.floor(battle.enemyForces.power * (battle.enemyForces.current / Math.max(1, battle.enemyForces.initial))));

      battle.log.push(`味方: ${battle.playerForces.current}人 (士気${battle.playerForces.morale}%) | 敵: ${battle.enemyForces.current}人`);

      // 勝敗判定
      if (battle.enemyForces.current <= battle.enemyForces.initial * 0.3 || battle.enemyForces.morale <= 20) {
        this.resolveBattle('victory');
      } else if (battle.playerForces.current <= battle.playerForces.initial * 0.3 || battle.playerForces.morale <= 20) {
        this.resolveBattle('defeat');
      }
    }
  }

  resolveBattle(result) {
    const battle = this.state.currentBattle;
    if (!battle) return;

    battle.result = result;
    const nation = this.state.aiNations.find(n => n.id === battle.enemyId);

    if (result === 'victory') {
      const casualties = battle.playerForces.initial - battle.playerForces.current;
      this.state.military.totalSoldiers -= casualties;
      this.state.military.infantry = Math.max(0, this.state.military.infantry - casualties);
      this.state.military.morale = Math.min(100, this.state.military.morale + 10);

      // 戦利品
      const goldSpoils = Math.floor(nation.economicPower * 0.3);
      this.state.resources.gold += goldSpoils;
      this.state.reputation += 5;

      if (!battle.isDefense) {
        // 侵攻勝利で征服
        nation.isDefeated = true;
        this.state.conqueredNations++;
        this.addLog(`${nation.name}を征服しました！戦利品: ${goldSpoils}G`, 'military');
      } else {
        this.addLog(`${nation.name}の侵攻を撃退しました！`, 'military');
        nation.relationWithPlayer -= 20;
      }
    } else {
      const casualties = Math.floor((battle.playerForces.initial - battle.playerForces.current) * 0.8);
      this.state.military.totalSoldiers -= casualties;
      this.state.military.infantry = Math.max(0, this.state.military.infantry - casualties);
      this.state.military.morale = Math.max(20, this.state.military.morale - 15);
      this.state.reputation -= 3;

      if (battle.isDefense) {
        // 防衛失敗でペナルティ
        const goldLoss = Math.floor(this.state.resources.gold * 0.3);
        this.state.resources.gold = Math.max(0, this.state.resources.gold - goldLoss);
        this.addLog(`${nation.name}に敗北しました。${goldLoss}Gを略奪されました`, 'important');
      } else {
        this.addLog(`${nation.name}への侵攻に失敗しました`, 'important');
      }
    }
  }

  closeBattle() {
    this.state.currentBattle = null;
  }

  // --- 勝敗判定 ---
  checkVictoryConditions() {
    // 軍事統一
    const activeNations = this.state.aiNations.filter(n => !n.isDefeated).length;
    if (activeNations === 0) {
      this.state.victory = true;
      this.state.victoryType = 'military';
      this.addLog('全国家を征服しました！軍事統一達成！', 'important');
      return;
    }

    // 技術勝利
    const dimMagic = this.state.technologies.find(t => t.id === 'dimensional_magic');
    if (dimMagic && dimMagic.isResearched && this.state.resources.gold >= 100000) {
      this.state.victory = true;
      this.state.victoryType = 'technology';
      this.addLog('次元門を建設しました！技術勝利達成！', 'important');
      return;
    }

    // 経済勝利
    const allTrade = this.state.aiNations.every(n => n.isDefeated || n.treaties.some(t => t.type === 'trade'));
    if (this.state.resources.gold >= 50000 && allTrade) {
      this.state.victory = true;
      this.state.victoryType = 'economic';
      this.addLog('経済的覇権を達成しました！経済勝利！', 'important');
      return;
    }
  }

  checkDefeatConditions() {
    // 人口0
    if (this.state.population.total <= 0) {
      this.state.gameOver = true;
      this.state.gameOverReason = 'population';
      this.addLog('人口が0になりました。ゲームオーバー...', 'important');
      return;
    }

    // 破産30日
    if (this.state.bankruptcyDays >= 30) {
      this.state.gameOver = true;
      this.state.gameOverReason = 'bankruptcy';
      this.addLog('30日間の破産状態により国家が崩壊しました', 'important');
      return;
    }

    // 満足度0が7日
    if (this.state.lowSatisfactionDays >= 7) {
      this.state.gameOver = true;
      this.state.gameOverReason = 'coup';
      this.addLog('民衆の不満によりクーデターが発生しました', 'important');
      return;
    }
  }

  // --- アクション ---
  togglePause() {
    this.state.isPaused = !this.state.isPaused;
    this.lastTime = performance.now();
    this.notify();
  }

  setSpeed(speed) {
    this.state.gameSpeed = speed;
    this.notify();
  }

  setTaxRate(rate) {
    this.state.taxRate = Math.max(0.05, Math.min(0.30, rate));
    this.notify();
  }

  addPopulation(amount) {
    this.state.population.total = Math.max(0, this.state.population.total + amount);
    if (amount > 0) {
      this.state.population.unemployed += amount;
    } else {
      // 減少時は無職から優先的に減らす
      let remaining = Math.abs(amount);
      const jobs = ['unemployed', 'farmers', 'miners', 'craftsmen'];
      for (const job of jobs) {
        const reduce = Math.min(this.state.population[job], remaining);
        this.state.population[job] -= reduce;
        remaining -= reduce;
        if (remaining <= 0) break;
      }
    }
  }

  // 職業配分
  // 職業への人口割り当て

  // 職業への人口割り当て
  assignPopulation(job, amount) {
    const currentAssigned = this.state.population.farmers + this.state.population.miners +
      this.state.population.craftsmen + this.state.population.soldiers;
    const maxAssignable = this.state.population.total;

    if (job === 'soldiers') {
      // 兵士への配置は特別処理
      const change = amount - this.state.population.soldiers;
      if (change > 0 && this.state.population.unemployed >= change) {
        this.state.population.soldiers += change;
        this.state.population.unemployed -= change;
        this.state.military.totalSoldiers += change;
        this.state.military.infantry += change;
      } else if (change < 0) {
        const release = Math.min(this.state.population.soldiers, Math.abs(change));
        this.state.population.soldiers -= release;
        this.state.population.unemployed += release;
        this.state.military.totalSoldiers -= release;
        this.state.military.infantry = Math.max(0, this.state.military.infantry - release);
      }
    } else {
      const currentJob = this.state.population[job] || 0;
      const change = amount - currentJob;

      if (change > 0 && this.state.population.unemployed >= change) {
        this.state.population[job] = amount;
        this.state.population.unemployed -= change;
      } else if (change < 0) {
        this.state.population[job] = amount;
        this.state.population.unemployed += Math.abs(change);
      }
    }
    this.notify();
  }

  // 建設開始
  startConstruction(buildingId) {
    const building = BUILDINGS.find(b => b.id === buildingId);
    if (!building) return { success: false, message: '建物が見つかりません' };

    const maxSimultaneous = Calcs.maxSimultaneousConstruction(this.state);
    if (this.state.constructionQueue.length >= maxSimultaneous) {
      return { success: false, message: `同時建設は${maxSimultaneous}件までです` };
    }

    if (this.state.resources.gold < building.cost.gold) {
      return { success: false, message: '資金が不足しています' };
    }
    if (building.cost.ore && this.state.resources.ore < building.cost.ore) {
      return { success: false, message: '鉱石が不足しています' };
    }

    if (building.prerequisite) {
      const hasPrereq = building.prerequisite.every(prereqId => {
        const tech = this.state.technologies.find(t => t.id === prereqId);
        if (tech) return tech.isResearched;
        return this.state.buildings.some(b => b.id === prereqId);
      });
      if (!hasPrereq) {
        return { success: false, message: '前提条件を満たしていません' };
      }
    }

    if (building.maxCount) {
      const currentCount = this.state.buildings.filter(b => b.id === building.id).length;
      if (currentCount >= building.maxCount) {
        return { success: false, message: 'これ以上建設できません' };
      }
    }

    this.state.resources.gold -= building.cost.gold;
    if (building.cost.ore) this.state.resources.ore -= building.cost.ore;

    this.state.constructionQueue.push({
      buildingId: building.id,
      name: building.name,
      remainingTime: building.buildTime / 10
    });

    this.addLog(`${building.name} の建設を開始しました`, 'domestic');
    this.notify();
    return { success: true };
  }

  // 研究開始
  startResearch(techId) {
    const tech = this.state.technologies.find(t => t.id === techId);
    if (!tech) return { success: false, message: '技術が見つかりません' };

    if (tech.isResearched) {
      return { success: false, message: '既に研究済みです' };
    }

    if (this.state.researchQueue.some(r => r.techId === techId)) {
      return { success: false, message: '既に研究中です' };
    }

    if (tech.prerequisite) {
      const hasPrereq = tech.prerequisite.every(prereqId => {
        const prereqTech = this.state.technologies.find(t => t.id === prereqId);
        return prereqTech && prereqTech.isResearched;
      });
      if (!hasPrereq) {
        return { success: false, message: '前提技術を研究していません' };
      }
    }

    if (this.state.resources.gold < tech.cost.gold) {
      return { success: false, message: '資金が不足しています' };
    }
    if (tech.cost.mana && this.state.resources.mana < tech.cost.mana) {
      return { success: false, message: '魔力が不足しています' };
    }

    this.state.resources.gold -= tech.cost.gold;
    if (tech.cost.mana) this.state.resources.mana -= tech.cost.mana;

    this.state.researchQueue.push({
      techId: tech.id,
      name: tech.name,
      remainingTime: tech.researchTime / 10
    });

    this.addLog(`技術「${tech.name}」の研究を開始しました`, 'tech');
    this.notify();
    return { success: true };
  }

  // 貿易協定
  proposeTradeAgreement(nationId) {
    const nation = this.state.aiNations.find(n => n.id === nationId);
    if (!nation) return { success: false, message: '国家が見つかりません' };
    if (nation.isDefeated) return { success: false, message: 'この国家は既に征服されています' };

    if (nation.treaties.some(t => t.type === 'trade')) {
      return { success: false, message: '既に貿易協定を結んでいます' };
    }

    const baseCost = 200;
    const relationModifier = nation.relationWithPlayer < 0 ? 1.5 : 1.0;
    const cost = Math.floor(baseCost * relationModifier);

    if (this.state.resources.gold < cost) {
      return { success: false, message: `資金が不足しています（必要: ${cost}G）` };
    }

    let successChance = 50 + nation.relationWithPlayer / 2;
    if (nation.personality === 'commercial') successChance += 30;
    if (nation.personality === 'aggressive') successChance -= 20;
    if (nation.personality === 'isolationist') successChance -= 40;

    this.state.resources.gold -= cost;

    if (Math.random() * 100 < successChance) {
      nation.treaties.push({ type: 'trade', duration: 12 });
      nation.relationWithPlayer += 10;
      this.addLog(`${nation.name}と貿易協定を締結しました！`, 'diplomatic');
      this.notify();
      return { success: true };
    } else {
      nation.relationWithPlayer -= 5;
      this.addLog(`${nation.name}が貿易協定を拒否しました`, 'diplomatic');
      this.notify();
      return { success: false, message: '提案は拒否されました' };
    }
  }

  // 侵攻開始
  attackNation(nationId) {
    const nation = this.state.aiNations.find(n => n.id === nationId);
    if (!nation) return { success: false, message: '国家が見つかりません' };
    if (nation.isDefeated) return { success: false, message: 'この国家は既に征服されています' };

    if (this.state.military.totalSoldiers < 10) {
      return { success: false, message: '最低10人の兵士が必要です' };
    }

    return this.startBattle(nationId, false);
  }

  // 魔法発動
  castMagic(magicId, targetId = null) {
    const magic = MAGICS.find(m => m.id === magicId);
    if (!magic) return { success: false, message: '魔法が見つかりません' };

    if (this.state.resources.mana < magic.manaCost) {
      return { success: false, message: '魔力が不足しています' };
    }

    // 発動条件チェック
    if (magic.type === 'battle' && !this.state.currentBattle) {
      return { success: false, message: '戦闘中のみ使用可能です' };
    }
    if (magic.type === 'strategic' && !targetId) {
      // 大結界はターゲット不要（自国）だが、天候操作などは必要
      if (magic.id !== 'major_barrier') return { success: false, message: '対象国家を選択してください' };
    }

    // コスト消費
    this.state.resources.mana -= magic.manaCost;

    // 効果適用
    switch (magic.effect.type) {
      case 'foodProduction':
      case 'timeAcceleration':
      case 'defenseBonus':
        if (magic.type === 'domestic' || magic.id === 'major_barrier') {
          // 自国へのバフ
          this.state.activeEffects.push({
            id: magic.id,
            name: magic.name,
            type: magic.effect.type,
            value: magic.effect.value,
            duration: magic.effect.duration,
            maxDuration: magic.effect.duration
          });
          this.addLog(`魔法「${magic.name}」を発動しました！`, 'magic');
        } else {
          // 戦略魔法（敵へのデバフ）未実装部分は簡易ログのみ
          this.addLog(`魔法「${magic.name}」を発動しましたが、対象への効果は未実装です`, 'magic');
        }
        break;

      case 'resourceGain':
        this.state.resources[magic.effect.resource] += magic.effect.value;
        this.addLog(`魔法「${magic.name}」により${magic.effect.value}の${magic.effect.resource}を得ました`, 'magic');
        break;

      case 'directDamage':
        if (this.state.currentBattle) {
          let damage = magic.effect.value;
          // 攻城ボーナスなどがここに入る可能性あり

          this.state.currentBattle.enemyForces.current = Math.max(0, this.state.currentBattle.enemyForces.current - damage);
          this.state.currentBattle.log.push(`魔法攻撃！ 敵軍に${damage}のダメージ！`);
          this.addLog(`魔法「${magic.name}」で敵軍にダメージを与えました`, 'magic');
        }
        break;

      case 'sabotageFood':
      case 'sabotagePopulation':
        if (targetId) {
          const target = this.state.aiNations.find(n => n.id === targetId);
          if (target) {
            if (magic.effect.type === 'sabotagePopulation') {
              const loss = Math.floor(target.population * (magic.effect.value / 100));
              target.population -= loss;
              target.militaryPower = Math.floor(target.population * 0.12); // 戦力も減衰
              this.addLog(`魔法「${magic.name}」が${target.name}の人口を${loss}人減少させました`, 'magic');
              target.relationWithPlayer -= 30;
            } else {
              // 食糧サボタージュなどはAIの成長を阻害する形などで表現
              this.addLog(`魔法「${magic.name}」を${target.name}に発動しました（AIへの効果は限定的です）`, 'magic');
              target.relationWithPlayer -= 20;
            }
          }
        }
        break;
    }

    this.notify();
    return { success: true };
  }

  updateActiveEffects(dayProgress) {
    if (this.state.activeEffects.length === 0) return;

    this.state.activeEffects = this.state.activeEffects.filter(eff => {
      eff.duration -= dayProgress;
      if (eff.duration <= 0) {
        this.addLog(`魔法「${eff.name}」の効果が切れました`, 'domestic');
        return false;
      }
      return true;
    });
  }

  // ログ追加
  addLog(message, type = 'domestic') {
    const time = `${Math.floor(this.state.day)}日`;
    this.state.eventLog.unshift({
      id: Date.now(),
      type,
      message,
      time,
      priority: type === 'important' ? 'high' : 'normal'
    });
    if (this.state.eventLog.length > 50) this.state.eventLog.pop();
  }

  // セーブデータ削除
  deleteSave() {
    console.log('[DEBUG] deleteSave() called. Removing key:', CONSTANTS.SAVE_KEY);
    localStorage.removeItem(CONSTANTS.SAVE_KEY);
    console.log('[DEBUG] localStorage.removeItem executed.');
  }

  // --- 市場取引 ---
  buyResource(type, amount) {
    const price = CONSTANTS.MARKET_PRICES[type];
    if (!price) return { success: false, message: '取引できない資源です' };

    // 購入コスト計算（市場手数料を含む簡単なロジック）
    const cost = Math.ceil(price * amount);

    if (this.state.resources.gold < cost) return { success: false, message: '資金が不足しています' };

    this.state.resources.gold -= cost;
    this.state.resources[type] += amount;
    this.addLog(`${amount}個の${type}を購入しました（-${cost}G）`, 'domestic');
    this.notify();
    return { success: true };
  }

  sellResource(type, amount) {
    const price = CONSTANTS.MARKET_PRICES[type];
    if (!price) return { success: false, message: '取引できない資源です' };

    if (this.state.resources[type] < amount) return { success: false, message: '在庫が不足しています' };

    // 売却価格は買値の50%
    const revenue = Math.floor(price * 0.5 * amount);

    this.state.resources[type] -= amount;
    this.state.resources.gold += revenue;
    this.addLog(`${amount}個の${type}を売却しました（+${revenue}G）`, 'domestic');
    this.notify();
    return { success: true };
  }

  // --- 諜報 ---
  executeEspionage(type, targetId) {
    const nation = this.state.aiNations.find(n => n.id === targetId);
    if (!nation) return { success: false, message: '対象が見つかりません' };
    if (nation.isDefeated) return { success: false, message: '征服済みの国家です' };

    let cost = 0;
    let successRate = 0;

    switch (type) {
      case 'spy': // 情報収集
        cost = 500;
        successRate = 0.8 + (this.state.reputation > 50 ? 0.1 : 0);
        break;
      case 'sabotage': // 工作（戦力低下）
        cost = 1000;
        successRate = 0.5;
        break;
      case 'rumor': // 離間工作（他国との関係悪化）
        cost = 800;
        successRate = 0.6;
        break;
      default:
        return { success: false, message: '不明な指令です' };
    }

    if (this.state.resources.gold < cost) return { success: false, message: `資金が不足しています(${cost}G)` };
    this.state.resources.gold -= cost;

    if (Math.random() < successRate) {
      if (type === 'spy') {
        // 詳細情報をログに出す
        const info = `【${nation.name}】 戦力:${nation.militaryPower} 経済:${nation.economicPower} 性格:${nation.personality} 態度:${nation.relationWithPlayer.toFixed(0)}`;
        this.addLog(`諜報成功: ${info}`, 'diplomatic');
        return { success: true, message: info };
      } else if (type === 'sabotage') {
        const damage = Math.floor(nation.militaryPower * 0.2);
        nation.militaryPower -= damage;
        this.addLog(`工作成功: ${nation.name}の軍事システムを妨害し、戦力を低下させました`, 'military');
        return { success: true };
      } else if (type === 'rumor') {
        nation.relationWithPlayer -= 30; // プレイヤーへの態度が悪化？それとも他国？
        // ここではシンプルに「孤立化させる」＝全AI国家との関係悪化とするのが理想だが、データ構造上持っていない
        // 代わりに「混乱」状態にして行動不能にするか、あるいはプレイヤーへの態度がさらに悪化して暴発させるか
        this.addLog(`流言により${nation.name}国内が混乱しています`, 'diplomatic');
        nation.lastDiplomacyDay = this.state.day + 30; // 暫く外交不可
        return { success: true };
      }
    } else {
      nation.relationWithPlayer -= 20;
      this.addLog(`諜報員が捕縛されました... ${nation.name}との関係が悪化しました`, 'important');
      if (nation.relationWithPlayer < -80 && Math.random() < 0.5) {
        this.declareWar(nation);
      }
      return { success: false, message: '任務に失敗しました' };
    }
  }

  // --- 周回要素 ---
  calculateScore() {
    let score = 0;
    score += this.state.population.total * 10;
    score += Math.floor(this.state.resources.gold / 100);
    score += this.state.technologies.filter(t => t.isResearched).length * 500;
    score += this.state.conqueredNations * 1000;
    if (this.state.victory) score += 10000;

    // 魔王討伐ボーナスなどはgameOverReasonで判定
    if (this.state.victoryType === 'domination') score += 5000;

    return score;
  }

  savePrestige(points) {
    try {
      const current = parseInt(localStorage.getItem('axinode_prestige') || '0');
      localStorage.setItem('axinode_prestige', current + points);
    } catch (e) {
      console.error('周回ポイント保存失敗', e);
    }
  }

  getPrestige() {
    return parseInt(localStorage.getItem('axinode_prestige') || '0');
  }

  recruitUnit(type, template) {
    if (type === 'hero') {
      this.state.heroes.push({ ...template, hiredAt: this.state.day });
      this.addLog(`英雄「${template.name}」を雇用しました！`, 'military');

      // 即時効果があれば適用
      if (template.specialAbility.effect.trigger === 'onHire') {
        // 実装例: 関係改善など
      }
    } else if (type === 'specialist') {
      this.state.specialists.push({ ...template, hiredAt: this.state.day });
      this.addLog(`スペシャリスト「${template.name}」を雇用しました！`, 'domestic');
    }
  }

  getSpecialistTypeName(type) {
    const types = { blacksmith: '鍛冶師', merchant: '商人', farmer: '農場長' };
    return types[type] || '専門家';
  }

  // --- ニューゲーム（周回ボーナス対応） ---
  newGame(bonuses = {}) {
    this.deleteSave(); // 古いデータを消す
    this.state = this.createInitialState();

    // ボーナス適用
    if (bonuses.initial_gold_500) this.state.resources.gold += 500;
    if (bonuses.initial_gold_1000) this.state.resources.gold += 1000;
    if (bonuses.initial_pop_5) this.addPopulation(5);
    if (bonuses.initial_soldier_10) {
      this.addPopulation(10);
      this.state.population.unemployed -= 10;
      this.state.population.soldiers += 10;
      this.state.military.totalSoldiers += 10;
      this.state.military.infantry += 10;
    }
    // 研究速度などは activeEffects や technologies の補正値として入れる必要があるが、
    // ここでは簡易的に resources に特別なフラグを持たせるか、初期技術として処理する

    this.addLog('新しい時代が始まりました', 'important');
    this.notify();
    this.saveGame();
  }
}
