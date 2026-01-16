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
};

// ------------------------------------------------------------------
// 2. 計算関数 (Calculations)
// ------------------------------------------------------------------
const Calcs = {
  // 食糧生産
  foodProduction(state) {
    const base = state.population.farmers * CONSTANTS.BASE_FOOD_PRODUCTION;
    
    // ボーナス計算 (施設 + 技術)
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

    return base * (1 + bonusPercent / 100);
  },

  // 食糧消費
  foodConsumption(state) {
    const civilians = state.population.total - state.military.totalSoldiers;
    return (civilians * CONSTANTS.BASE_FOOD_CONSUMPTION_CIVILIAN) +
           (state.military.totalSoldiers * CONSTANTS.BASE_FOOD_CONSUMPTION_SOLDIER);
  },

  // 税収 (月次)
  taxIncome(state) {
    const baseTax = state.population.total * CONSTANTS.BASE_TAX_PER_POPULATION;
    const satisfactionCoef = state.satisfaction / 100; // 満足度がそのまま係数
    const taxRate = 0.15; // 固定税率 15%

    // ボーナス
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
    let score = 50; // 基礎値

    // 食糧事情
    const consumption = Math.max(1, this.foodConsumption(state));
    const foodDays = state.resources.food / consumption;
    
    if (foodDays >= 7) score += 20;
    else if (foodDays >= 3) score += 10;
    else if (foodDays < 1) score -= 30;
    
    // 範囲制限 0-100
    return Math.max(0, Math.min(100, score));
  }
};

// ------------------------------------------------------------------
// 3. ゲームエンジンクラス (GameEngine)
// ------------------------------------------------------------------
export class GameEngine {
  constructor() {
    this.state = this.createInitialState();
    this.lastTime = 0;
    this.listeners = []; // 画面更新用の通知先
  }

  // 初期状態の作成
  createInitialState() {
    return {
      day: 1,
      gameSpeed: 1,
      isPaused: true,
      resources: {
        gold: CONSTANTS.INITIAL_GOLD,
        food: CONSTANTS.INITIAL_FOOD,
        ore: 20,
        mana: 0,
        weapons: 5
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
      buildings: [], // 建設済みリスト
      constructionQueue: [], // 建設待ち行列
      technologies: JSON.parse(JSON.stringify(TECHNOLOGIES)), // 技術ツリー（コピーして使用）
      researchQueue: [],
      eventLog: [
        { id: 1, type: 'important', message: '人口1人から国家を築き上げましょう。', day: 1, time: '00:00' }
      ],
      military: {
        totalSoldiers: Math.floor(CONSTANTS.INITIAL_POPULATION * 0.2)
      }
    };
  }

  // 状態更新の購読（UI更新用）
  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.state));
  }

  // --- ゲームループ ---
  tick(currentTime) {
    if (this.state.isPaused) {
      this.lastTime = currentTime;
      requestAnimationFrame((t) => this.tick(t));
      return;
    }

    // 経過時間の計算 (秒)
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // ゲーム内時間の進行 (倍速反映)
    const daysToAdvance = (deltaTime * this.state.gameSpeed) / (60 * 60 * 24); // 1日 = 24時間(リアル24秒とした場合)
    // 補正: 仕様書では「30秒で建設」などの記述があるため、リアル1秒 = ゲーム内いくらかを決める必要がある
    // ここでは「リアル1秒 = ゲーム内 1/60 日 (つまり1分で1日)」のベース進行に対し、speed倍すると仮定
    // もしくは単純に deltaTime * speed を秒として加算
    
    const prevDay = Math.floor(this.state.day);
    this.state.day += deltaTime * this.state.gameSpeed * 0.1; // 0.1は調整係数（早すぎないように）
    const currentDay = Math.floor(this.state.day);

    // 日次更新 (日付が変わった瞬間)
    if (currentDay > prevDay) {
      this.processDailyUpdate();
    }

    // 月次更新 (30日ごと)
    if (Math.floor(currentDay / 30) > Math.floor(prevDay / 30)) {
      this.processMonthlyUpdate();
    }

    // 建設・研究の進行
    this.updateProgress(deltaTime * this.state.gameSpeed);

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
    const oreProd = this.state.population.miners * CONSTANTS.BASE_ORE_PRODUCTION; // 簡易計算
    
    // 消費
    const foodCons = Calcs.foodConsumption(this.state);

    // 反映
    this.state.resources.food += (foodProd - foodCons);
    this.state.resources.ore += oreProd;

    // 餓死判定
    if (this.state.resources.food < 0) {
      this.state.resources.food = 0;
      this.addLog('食糧不足により住民が苦しんでいます', 'domestic');
      // 人口減少処理は月次にまとめるか、ここでやるか（仕様書では月次だが即時性もアリ）
    }
  }

  processMonthlyUpdate() {
    // 税収
    const tax = Calcs.taxIncome(this.state);
    const maintenance = this.state.military.totalSoldiers * 5; // 兵士維持費
    
    this.state.resources.gold += (tax - maintenance);

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

    // 破産判定
    if (this.state.resources.gold < 0) {
      this.addLog('国庫が破産状態です！', 'important');
    }
  }

  updateProgress(deltaSeconds) {
    // 建設キューの処理
    const queue = this.state.constructionQueue;
    for (let i = queue.length - 1; i >= 0; i--) {
      queue[i].remainingTime -= deltaSeconds;
      if (queue[i].remainingTime <= 0) {
        // 完了
        const completed = queue.splice(i, 1)[0];
        const buildingData = BUILDINGS.find(b => b.id === completed.buildingId);
        
        // 建物リストに追加
        this.state.buildings.push({ ...buildingData, builtAt: this.state.day });
        this.addLog(`${buildingData.name} の建設が完了しました`, 'domestic');
      }
    }
    
    // 研究キューの処理（同様に実装可能）
  }

  // --- アクション (UIから呼ばれる) ---
  togglePause() {
    this.state.isPaused = !this.state.isPaused;
    this.lastTime = performance.now(); // 再開時に時間が飛ばないようにリセット
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
      // 減少時は無職から減らす
      const actualLoss = Math.min(this.state.population.unemployed, Math.abs(amount));
      this.state.population.unemployed -= actualLoss;
      // 足りなければ他から減らすロジックが必要（省略）
    }
  }

  // 建設開始
  startConstruction(buildingId) {
    const building = BUILDINGS.find(b => b.id === buildingId);
    if (!building) return;

    // コスト確認
    if (this.state.resources.gold >= building.cost.gold) {
      this.state.resources.gold -= building.cost.gold;
      
      this.state.constructionQueue.push({
        buildingId: building.id,
        name: building.name,
        remainingTime: building.buildTime / 10 // 10倍速前提の調整なら /10 するなど
      });
      
      this.addLog(`${building.name} の建設を開始しました`, 'domestic');
      this.notify();
    } else {
      console.log("資金不足");
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
    // ログは最新50件まで
    if (this.state.eventLog.length > 50) this.state.eventLog.pop();
  }
}
