/* engine.js - ゲームの計算ロジックと状態管理 */
import { BUILDINGS, TECHNOLOGIES, NATION_TEMPLATES } from './data.js';

// ------------------------------------------------------------------
// 1. 定数 (Constants)
// ------------------------------------------------------------------
export const CONSTANTS = {
  DAYS_PER_MONTH: 30,
  // 基礎生産量
  BASE_FOOD_PRODUCTION: 1,
  BASE_ORE_PRODUCTION: 0.5,
  BASE_WEAPON_PRODUCTION: 0.3,
  BASE_ARMOR_PRODUCTION: 0.2,
  // 消費量
  BASE_FOOD_CONSUMPTION_CIVILIAN: 1,
  BASE_FOOD_CONSUMPTION_SOLDIER: 1.5,
  // 税収
  BASE_TAX_PER_POPULATION: 1.2,
  // 閾値
  SATISFACTION_GROWTH: 70,
  SATISFACTION_DECLINE: 30,
  // ゲーム速度
  GAME_SPEEDS: [1, 10, 20],
  // 初期値
  INITIAL_GOLD: 500,
  INITIAL_FOOD: 100,
  INITIAL_POPULATION: 10,
  // セーブ関連
  SAVE_KEY: 'axinode_save',
  AUTOSAVE_INTERVAL: 60000, // 1分
};

// ------------------------------------------------------------------
// 2. 計算関数 (Calculations)
// ------------------------------------------------------------------
const Calcs = {
  // 食糧生産
  foodProduction(state) {
    const base = state.population.farmers * CONSTANTS.BASE_FOOD_PRODUCTION;
    
    // ボーナス計算 (施設 + 技術 + 貿易協定)
    let bonusPercent = 0;
    
    // 施設ボーナス
    state.buildings.forEach(b => {
      if (b.effect.type === 'foodProduction') bonusPercent += b.effect.value;
    });
    
    // 技術ボーナス
    state.technologies.forEach(t => {
      if (t.isResearched && t.effect.type === 'farmEfficiency') {
        bonusPercent += t.effect.value;
      }
    });

    // 貿易協定ボーナス
    state.aiNations.forEach(nation => {
      if (nation.treaties.some(t => t.type === 'trade')) {
        bonusPercent += 5; // 各貿易協定で+5%
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

    return base * (1 + bonusPercent / 100);
  },

  // 武器生産
  weaponProduction(state) {
    const base = state.population.craftsmen * CONSTANTS.BASE_WEAPON_PRODUCTION;
    let bonusPercent = 0;

    state.buildings.forEach(b => {
      if (b.effect.type === 'weaponProduction') bonusPercent += b.effect.value;
    });
    state.technologies.forEach(t => {
      if (t.isResearched && t.effect.type === 'weaponProduction') {
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
      if (t.isResearched && t.effect.type === 'armorProduction') {
        bonusPercent += t.effect.value;
      }
    });

    return base * (1 + bonusPercent / 100);
  },

  // 税収 (月次)
  taxIncome(state) {
    const baseTax = state.population.total * CONSTANTS.BASE_TAX_PER_POPULATION;
    const satisfactionCoef = state.satisfaction / 100;
    const taxRate = 0.15;

    let bonusPercent = 0;
    state.buildings.forEach(b => {
      if (b.effect.type === 'taxBonus') bonusPercent += b.effect.value;
    });
    state.technologies.forEach(t => {
      if (t.isResearched && t.effect.type === 'taxBonus') bonusPercent += t.effect.value;
    });

    return Math.floor(baseTax * satisfactionCoef * taxRate * (1 + bonusPercent / 100));
  },

  // 満足度計算
  satisfaction(state) {
    let score = 50;

    const consumption = Math.max(1, this.foodConsumption(state));
    const foodDays = state.resources.food / consumption;
    
    if (foodDays >= 7) score += 20;
    else if (foodDays >= 3) score += 10;
    else if (foodDays < 1) score -= 30;
    
    return Math.max(0, Math.min(100, score));
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
    return 1 + bonusPercent / 100;
  }
};

// ------------------------------------------------------------------
// 3. ゲームエンジンクラス (GameEngine)
// ------------------------------------------------------------------
export class GameEngine {
  constructor() {
    this.state = this.createInitialState();
    this.lastTime = 0;
    this.listeners = [];
    this.autosaveTimer = null;
  }

  // 初期状態の作成
  createInitialState() {
    // AI国家の初期化
    const aiNations = NATION_TEMPLATES.map((template, index) => ({
      id: `nation_${index}`,
      name: template.name,
      personality: template.personality,
      description: template.description,
      population: template.initialPopulation,
      militaryPower: template.initialMilitaryPower,
      economicPower: Math.floor(template.initialPopulation * 1.5),
      techLevel: 1,
      relationWithPlayer: 0, // -100 to 100
      treaties: [],
      isAtWar: false,
      aggressiveness: template.aggressiveness,
      expansionDesire: template.expansionDesire,
    }));

    return {
      day: 1,
      gameSpeed: 1,
      isPaused: true,
      resources: {
        gold: CONSTANTS.INITIAL_GOLD,
        food: CONSTANTS.INITIAL_FOOD,
        ore: 20,
        mana: 0,
        weapons: 5,
        armor: 3  // 鎧リソースを追加
      },
      population: {
        total: CONSTANTS.INITIAL_POPULATION,
        farmers: Math.floor(CONSTANTS.INITIAL_POPULATION * 0.5),
        miners: 0,
        craftsmen: 0,
        soldiers: Math.floor(CONSTANTS.INITIAL_POPULATION * 0.2),
        unemployed: CONSTANTS.INITIAL_POPULATION - Math.floor(CONSTANTS.INITIAL_POPULATION * 0.7)
      },
      satisfaction: 60,
      buildings: [],
      constructionQueue: [],
      technologies: JSON.parse(JSON.stringify(TECHNOLOGIES)),
      researchQueue: [],
      eventLog: [
        { id: 1, type: 'important', message: '人口1人から国家を築き上げましょう。', day: 1, time: '00:00' }
      ],
      military: {
        totalSoldiers: Math.floor(CONSTANTS.INITIAL_POPULATION * 0.2)
      },
      aiNations: aiNations,
      reputation: 0 // -100 to 100
    };
  }

  // 状態更新の購読（UI更新用）
  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.state));
  }

  // --- セーブ/ロード機能 ---
  saveGame() {
    try {
      const saveData = JSON.stringify(this.state);
      localStorage.setItem(CONSTANTS.SAVE_KEY, saveData);
      this.addLog('ゲームをセーブしました', 'domestic');
      return true;
    } catch (e) {
      console.error('セーブに失敗:', e);
      this.addLog('セーブに失敗しました', 'important');
      return false;
    }
  }

  loadGame() {
    try {
      const saveData = localStorage.getItem(CONSTANTS.SAVE_KEY);
      if (saveData) {
        const loadedState = JSON.parse(saveData);
        
        // 新しいプロパティが追加されている場合のマイグレーション
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

  // 古いセーブデータに新しいプロパティを追加
  migrateState(loaded, defaultState) {
    // リソースのマイグレーション
    if (!loaded.resources.armor) {
      loaded.resources.armor = defaultState.resources.armor;
    }
    // AI国家のマイグレーション
    if (!loaded.aiNations || loaded.aiNations.length === 0) {
      loaded.aiNations = defaultState.aiNations;
    }
    // reputationのマイグレーション
    if (loaded.reputation === undefined) {
      loaded.reputation = defaultState.reputation;
    }
    return loaded;
  }

  deleteSave() {
    try {
      localStorage.removeItem(CONSTANTS.SAVE_KEY);
      this.addLog('セーブデータを削除しました', 'important');
      return true;
    } catch (e) {
      console.error('削除に失敗:', e);
      return false;
    }
  }

  hasSaveData() {
    return localStorage.getItem(CONSTANTS.SAVE_KEY) !== null;
  }

  // オートセーブの開始
  startAutosave() {
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
    this.autosaveTimer = setInterval(() => {
      if (!this.state.isPaused) {
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
    if (this.state.isPaused) {
      this.lastTime = currentTime;
      requestAnimationFrame((t) => this.tick(t));
      return;
    }

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    const prevDay = Math.floor(this.state.day);
    this.state.day += deltaTime * this.state.gameSpeed * 0.1;
    const currentDay = Math.floor(this.state.day);

    // 日次更新
    if (currentDay > prevDay) {
      this.processDailyUpdate();
    }

    // 月次更新
    if (Math.floor(currentDay / 30) > Math.floor(prevDay / 30)) {
      this.processMonthlyUpdate();
    }

    // 建設・研究の進行
    this.updateProgress(deltaTime * this.state.gameSpeed);

    // AI国家の更新
    this.updateAINations(deltaTime * this.state.gameSpeed);

    this.notify();
    requestAnimationFrame((t) => this.tick(t));
  }

  startGameLoop() {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.tick(t));
  }

  // --- 更新ロジック ---
  processDailyUpdate() {
    // 生産
    const foodProd = Calcs.foodProduction(this.state);
    const oreProd = Calcs.oreProduction(this.state);
    const weaponProd = Calcs.weaponProduction(this.state);
    const armorProd = Calcs.armorProduction(this.state);
    
    // 消費
    const foodCons = Calcs.foodConsumption(this.state);

    // 反映
    this.state.resources.food += (foodProd - foodCons);
    this.state.resources.ore += oreProd;
    this.state.resources.weapons += weaponProd;
    this.state.resources.armor += armorProd;

    // 餓死判定
    if (this.state.resources.food < 0) {
      this.state.resources.food = 0;
      this.addLog('食糧不足により住民が苦しんでいます', 'important');
    }
  }

  processMonthlyUpdate() {
    // 税収
    const tax = Calcs.taxIncome(this.state);
    const maintenance = this.state.military.totalSoldiers * 5;
    
    this.state.resources.gold += (tax - maintenance);
    this.addLog(`月次収支: 税収+${tax}G, 維持費-${maintenance}G`, 'domestic');

    // 満足度更新
    this.state.satisfaction = Calcs.satisfaction(this.state);

    // 人口増減
    if (this.state.satisfaction >= CONSTANTS.SATISFACTION_GROWTH) {
      const growth = Math.ceil(this.state.population.total * 0.02);
      this.addPopulation(growth);
      this.addLog(`${growth}人の移民が到着しました`, 'domestic');
    } else if (this.state.satisfaction <= CONSTANTS.SATISFACTION_DECLINE) {
      const decline = Math.ceil(this.state.population.total * 0.01);
      this.addPopulation(-decline);
      this.addLog(`${decline}人が国を去りました`, 'important');
    }

    // 貿易協定の期間減少
    this.state.aiNations.forEach(nation => {
      nation.treaties = nation.treaties.filter(t => {
        t.duration -= 1;
        if (t.duration <= 0) {
          this.addLog(`${nation.name}との${t.type === 'trade' ? '貿易協定' : '条約'}が期限切れになりました`, 'diplomatic');
          return false;
        }
        return true;
      });
    });

    // 破産判定
    if (this.state.resources.gold < 0) {
      this.addLog('国庫が破産状態です！', 'important');
    }
  }

  updateProgress(deltaSeconds) {
    // 建設キューの処理
    const constructionQueue = this.state.constructionQueue;
    for (let i = constructionQueue.length - 1; i >= 0; i--) {
      constructionQueue[i].remainingTime -= deltaSeconds;
      if (constructionQueue[i].remainingTime <= 0) {
        const completed = constructionQueue.splice(i, 1)[0];
        const buildingData = BUILDINGS.find(b => b.id === completed.buildingId);
        
        this.state.buildings.push({ ...buildingData, builtAt: this.state.day });
        this.addLog(`${buildingData.name} の建設が完了しました`, 'domestic');
      }
    }
    
    // 研究キューの処理
    const researchQueue = this.state.researchQueue;
    const speedBonus = Calcs.researchSpeedBonus(this.state);
    
    for (let i = researchQueue.length - 1; i >= 0; i--) {
      researchQueue[i].remainingTime -= deltaSeconds * speedBonus;
      if (researchQueue[i].remainingTime <= 0) {
        const completed = researchQueue.splice(i, 1)[0];
        
        // 技術を研究済みにする
        const tech = this.state.technologies.find(t => t.id === completed.techId);
        if (tech) {
          tech.isResearched = true;
          this.addLog(`技術「${tech.name}」の研究が完了しました！`, 'tech');
          
          // 効果の適用（特殊なものはここで処理）
          this.applyTechEffect(tech);
        }
      }
    }
  }

  // 技術効果の適用
  applyTechEffect(tech) {
    // 特殊効果の処理
    switch (tech.effect.type) {
      case 'unlockBuilding':
        this.addLog(`新しい施設が建設可能になりました`, 'tech');
        break;
      case 'unlockVictory':
        this.addLog(`勝利条件への道が開かれました！`, 'important');
        break;
      case 'simultaneousConstruction':
        this.addLog(`同時建設可能数が ${tech.effect.value} に増加しました`, 'tech');
        break;
      case 'productionBonus':
        this.addLog(`全体の生産効率が ${tech.effect.value}% 向上しました`, 'tech');
        break;
      // 他の効果はCalcs内で自動的に反映される
    }
  }

  // AI国家の更新
  updateAINations(deltaSeconds) {
    this.state.aiNations.forEach(nation => {
      // 成長処理（月1%を日割り）
      const dailyGrowth = 1 + (0.01 / 30) * (deltaSeconds / 10);
      nation.population = Math.floor(nation.population * dailyGrowth);
      nation.militaryPower = Math.floor(nation.population * 0.1);
      nation.economicPower = Math.floor(nation.population * 1.5);

      // 関係値の自然変動（ごくわずかに中立へ）
      if (nation.relationWithPlayer > 0) {
        nation.relationWithPlayer -= 0.001 * deltaSeconds;
      } else if (nation.relationWithPlayer < 0) {
        nation.relationWithPlayer += 0.001 * deltaSeconds;
      }
    });
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

  addPopulation(amount) {
    this.state.population.total += amount;
    if (amount > 0) {
      this.state.population.unemployed += amount;
    } else {
      const actualLoss = Math.min(this.state.population.unemployed, Math.abs(amount));
      this.state.population.unemployed -= actualLoss;
    }
  }

  // 建設開始
  startConstruction(buildingId) {
    const building = BUILDINGS.find(b => b.id === buildingId);
    if (!building) return { success: false, message: '建物が見つかりません' };

    // 同時建設数チェック
    const maxSimultaneous = Calcs.maxSimultaneousConstruction(this.state);
    if (this.state.constructionQueue.length >= maxSimultaneous) {
      return { success: false, message: `同時建設は${maxSimultaneous}件までです` };
    }

    // コスト確認
    if (this.state.resources.gold < building.cost.gold) {
      return { success: false, message: '資金が不足しています' };
    }
    if (building.cost.ore && this.state.resources.ore < building.cost.ore) {
      return { success: false, message: '鉱石が不足しています' };
    }

    // 前提条件チェック
    if (building.prerequisite) {
      const hasPrereq = building.prerequisite.every(prereqId => {
        // 技術の前提
        const tech = this.state.technologies.find(t => t.id === prereqId);
        if (tech) return tech.isResearched;
        // 建物の前提
        return this.state.buildings.some(b => b.id === prereqId);
      });
      if (!hasPrereq) {
        return { success: false, message: '前提条件を満たしていません' };
      }
    }

    // 最大数チェック
    if (building.maxCount) {
      const currentCount = this.state.buildings.filter(b => b.id === building.id).length;
      if (currentCount >= building.maxCount) {
        return { success: false, message: 'これ以上建設できません' };
      }
    }

    // コスト消費
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

    // 既に研究済みか確認
    if (tech.isResearched) {
      return { success: false, message: '既に研究済みです' };
    }

    // 研究中か確認
    if (this.state.researchQueue.some(r => r.techId === techId)) {
      return { success: false, message: '既に研究中です' };
    }

    // 前提条件チェック
    if (tech.prerequisite) {
      const hasPrereq = tech.prerequisite.every(prereqId => {
        const prereqTech = this.state.technologies.find(t => t.id === prereqId);
        return prereqTech && prereqTech.isResearched;
      });
      if (!hasPrereq) {
        return { success: false, message: '前提技術を研究していません' };
      }
    }

    // コスト確認
    if (this.state.resources.gold < tech.cost.gold) {
      return { success: false, message: '資金が不足しています' };
    }
    if (tech.cost.mana && this.state.resources.mana < tech.cost.mana) {
      return { success: false, message: '魔力が不足しています' };
    }

    // コスト消費
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

  // 貿易協定を提案
  proposeTradeAgreement(nationId) {
    const nation = this.state.aiNations.find(n => n.id === nationId);
    if (!nation) return { success: false, message: '国家が見つかりません' };

    // 既に貿易協定があるか確認
    if (nation.treaties.some(t => t.type === 'trade')) {
      return { success: false, message: '既に貿易協定を結んでいます' };
    }

    // コスト（関係値に応じて変動）
    const baseCost = 200;
    const relationModifier = nation.relationWithPlayer < 0 ? 1.5 : 1.0;
    const cost = Math.floor(baseCost * relationModifier);

    if (this.state.resources.gold < cost) {
      return { success: false, message: `資金が不足しています（必要: ${cost}G）` };
    }

    // 成功率（関係値と性格に応じて）
    let successChance = 50 + nation.relationWithPlayer / 2;
    if (nation.personality === 'commercial') successChance += 30;
    if (nation.personality === 'aggressive') successChance -= 20;
    if (nation.personality === 'isolationist') successChance -= 40;

    // コスト消費
    this.state.resources.gold -= cost;

    // 判定
    if (Math.random() * 100 < successChance) {
      nation.treaties.push({ type: 'trade', duration: 12 }); // 12ヶ月
      nation.relationWithPlayer += 10;
      this.addLog(`${nation.name}と貿易協定を締結しました！食糧生産+5%`, 'diplomatic');
      this.notify();
      return { success: true };
    } else {
      nation.relationWithPlayer -= 5;
      this.addLog(`${nation.name}が貿易協定を拒否しました`, 'diplomatic');
      this.notify();
      return { success: false, message: '提案は拒否されました' };
    }
  }

  // ログ追加ヘルパー
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

  // ニューゲーム
  newGame() {
    this.state = this.createInitialState();
    this.addLog('新しいゲームを開始しました', 'important');
    this.notify();
  }
}
