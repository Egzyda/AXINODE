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
  INITIAL_FOOD: 200,
  INITIAL_POPULATION: 20,
  // 戦闘関連
  BATTLE_TICK_INTERVAL: 3, // 戦闘更新間隔（秒）- ゲーム内時間で3秒ごと
  ATTACKER_DAMAGE_RATE: 0.10, // 攻撃側が受けるダメージ率
  DEFENDER_DAMAGE_RATE: 0.08, // 防御側が受けるダメージ率
  DEFEAT_THRESHOLD: 0.30, // 兵力がこの割合以下で敗北
};

// ------------------------------------------------------------------
// 1.5. 戦闘計算 (Battle Calculations)
// ------------------------------------------------------------------
const BattleCalcs = {
  // 装備率係数
  getEquipmentCoefficient(equipmentRate) {
    if (equipmentRate >= 1.0) return 1.0;
    if (equipmentRate >= 0.8) return 0.9;
    if (equipmentRate >= 0.6) return 0.75;
    if (equipmentRate >= 0.4) return 0.5;
    return 0.3;
  },

  // 士気係数
  getMoraleCoefficient(morale) {
    if (morale >= 100) return 1.15;
    if (morale >= 80) return 1.0;
    if (morale >= 60) return 0.85;
    if (morale >= 40) return 0.65;
    return 0.4;
  },

  // 戦闘力計算
  calculateCombatPower(soldiers, equipmentRate, morale, techBonus = 1.0) {
    const equipCoef = this.getEquipmentCoefficient(equipmentRate);
    const moraleCoef = this.getMoraleCoefficient(morale);
    return Math.floor(soldiers * equipCoef * moraleCoef * techBonus);
  }
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
    // AI国家の初期化
    const aiNations = this.initializeAINations();

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
        farmers: 10,  // 50%
        miners: 0,
        craftsmen: 0,
        soldiers: 5,  // 25%
        unemployed: 5 // 25%
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
        totalSoldiers: 5, // 初期兵士5人
        morale: 80,
        equipmentRate: 0.6 // 装備率60%
      },
      // AI国家
      aiNations: aiNations,
      // 戦闘状態
      battle: null // { enemy, playerSoldiers, enemySoldiers, playerMorale, enemyMorale, log, tickTimer }
    };
  }

  // AI国家の初期化
  initializeAINations() {
    return NATION_TEMPLATES.map((template, index) => ({
      id: `nation_${index}`,
      name: template.name,
      personality: template.personality,
      description: template.description,
      population: template.initialPopulation,
      soldiers: Math.floor(template.initialMilitaryPower * 0.5),
      combatPower: template.initialMilitaryPower,
      morale: 80,
      equipmentRate: 0.8,
      aggressiveness: template.aggressiveness,
      expansionDesire: template.expansionDesire,
      relation: 0, // -100～+100の関係値
      isDefeated: false
    }));
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

    // 戦闘処理
    if (this.state.battle && !this.state.battle.result) {
      this.state.battle.tickTimer += deltaSeconds;
      // 10秒ごとに戦闘ティック
      if (this.state.battle.tickTimer >= CONSTANTS.BATTLE_TICK_INTERVAL) {
        this.state.battle.tickTimer = 0;
        this.processBattleTick();
      }
    }
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

  // ------------------------------------------------------------------
  // 戦闘システム
  // ------------------------------------------------------------------

  // 戦闘開始
  startBattle(enemyId) {
    const enemy = this.state.aiNations.find(n => n.id === enemyId);
    if (!enemy || enemy.isDefeated) {
      this.addLog('無効な攻撃対象です', 'important');
      return false;
    }

    if (this.state.battle) {
      this.addLog('既に戦闘中です', 'important');
      return false;
    }

    if (this.state.military.totalSoldiers <= 0) {
      this.addLog('兵士がいないため攻撃できません', 'important');
      return false;
    }

    // 戦闘状態を初期化
    this.state.battle = {
      enemyId: enemy.id,
      enemyName: enemy.name,
      // 初期兵力（戦闘開始時の値を保存）
      initialPlayerSoldiers: this.state.military.totalSoldiers,
      initialEnemySoldiers: enemy.soldiers,
      // 現在兵力
      playerSoldiers: this.state.military.totalSoldiers,
      enemySoldiers: enemy.soldiers,
      // 士気
      playerMorale: this.state.military.morale,
      enemyMorale: enemy.morale,
      // 装備率
      playerEquipment: this.state.military.equipmentRate,
      enemyEquipment: enemy.equipmentRate,
      // 戦闘ログ
      battleLog: [],
      // タイマー
      tickTimer: 0,
      // 戦闘結果
      result: null // 'victory', 'defeat', 'retreat'
    };

    this.addLog(`${enemy.name} との戦闘を開始しました！`, 'military');
    this.addBattleLog(`⚔️ 戦闘開始: プレイヤー ${this.state.battle.playerSoldiers}人 vs ${enemy.name} ${this.state.battle.enemySoldiers}人`);
    this.notify();
    return true;
  }

  // 戦闘ログ追加
  addBattleLog(message) {
    if (this.state.battle) {
      this.state.battle.battleLog.unshift({
        id: Date.now(),
        message,
        time: `${Math.floor(this.state.day)}日`
      });
      // 戦闘ログは最新20件まで
      if (this.state.battle.battleLog.length > 20) {
        this.state.battle.battleLog.pop();
      }
    }
  }

  // 戦闘ティック処理（10秒ごと）
  processBattleTick() {
    const battle = this.state.battle;
    if (!battle || battle.result) return;

    // 1. 戦闘力計算
    const playerPower = BattleCalcs.calculateCombatPower(
      battle.playerSoldiers,
      battle.playerEquipment,
      battle.playerMorale
    );
    const enemyPower = BattleCalcs.calculateCombatPower(
      battle.enemySoldiers,
      battle.enemyEquipment,
      battle.enemyMorale
    );

    // 2. ダメージ計算（仕様書準拠）
    // 攻撃側（プレイヤー）が受けるダメージ = 敵戦闘力 × 10%
    // 防御側（敵）が受けるダメージ = 攻撃側戦闘力 × 8%
    const playerDamage = Math.ceil(enemyPower * CONSTANTS.ATTACKER_DAMAGE_RATE);
    const enemyDamage = Math.ceil(playerPower * CONSTANTS.DEFENDER_DAMAGE_RATE);

    // 3. 兵士数減少
    battle.playerSoldiers = Math.max(0, battle.playerSoldiers - playerDamage);
    battle.enemySoldiers = Math.max(0, battle.enemySoldiers - enemyDamage);

    // 4. 士気変動
    if (playerPower > enemyPower) {
      battle.playerMorale = Math.min(100, battle.playerMorale + 2);
      battle.enemyMorale = Math.max(0, battle.enemyMorale - 3);
    } else if (playerPower < enemyPower) {
      battle.playerMorale = Math.max(0, battle.playerMorale - 3);
      battle.enemyMorale = Math.min(100, battle.enemyMorale + 2);
    }

    // ログ出力
    this.addBattleLog(`💥 交戦: プレイヤー -${playerDamage}人 (残${battle.playerSoldiers}) / ${battle.enemyName} -${enemyDamage}人 (残${battle.enemySoldiers})`);

    // 5. 勝敗判定
    const playerRatio = battle.playerSoldiers / battle.initialPlayerSoldiers;
    const enemyRatio = battle.enemySoldiers / battle.initialEnemySoldiers;

    // 敵の敗北判定
    if (enemyRatio <= CONSTANTS.DEFEAT_THRESHOLD || battle.enemyMorale <= 0) {
      this.endBattle('victory');
      return;
    }

    // プレイヤーの敗北判定
    if (playerRatio <= CONSTANTS.DEFEAT_THRESHOLD || battle.playerMorale <= 0) {
      this.endBattle('defeat');
      return;
    }

    // 壊走判定（士気30%以下で20%確率）
    if (battle.enemyMorale <= 30 && Math.random() < 0.2) {
      this.addBattleLog(`🏃 ${battle.enemyName} の軍が壊走！`);
      this.endBattle('victory');
      return;
    }

    if (battle.playerMorale <= 30 && Math.random() < 0.2) {
      this.addBattleLog(`🏃 我が軍が壊走！`);
      this.endBattle('defeat');
      return;
    }
  }

  // 戦闘終了
  endBattle(result) {
    const battle = this.state.battle;
    if (!battle) return;

    battle.result = result;

    const enemy = this.state.aiNations.find(n => n.id === battle.enemyId);

    if (result === 'victory') {
      // 勝利処理
      const loot = Math.floor(100 + Math.random() * 200); // 略奪金
      this.state.resources.gold += loot;

      // 敵国にダメージを反映
      if (enemy) {
        enemy.soldiers = battle.enemySoldiers;
        enemy.morale = battle.enemyMorale;

        // 兵力が0なら敗北フラグ
        if (enemy.soldiers <= 0) {
          enemy.isDefeated = true;
          this.addLog(`${enemy.name} を撃破しました！`, 'important');
        }
      }

      // プレイヤー側の兵力を更新
      this.state.military.totalSoldiers = battle.playerSoldiers;
      this.state.military.morale = Math.min(100, battle.playerMorale + 5); // 勝利で士気回復

      this.addBattleLog(`🎉 勝利！ ${loot}Gを獲得`);
      this.addLog(`${battle.enemyName} に勝利しました！ 略奪金 ${loot}G`, 'military');

    } else if (result === 'defeat') {
      // 敗北処理
      // 敵国の兵力を更新
      if (enemy) {
        enemy.soldiers = battle.enemySoldiers;
        enemy.morale = Math.min(100, battle.enemyMorale + 5);
      }

      // プレイヤー側の兵力を更新
      this.state.military.totalSoldiers = battle.playerSoldiers;
      this.state.military.morale = Math.max(20, battle.playerMorale - 10); // 敗北で士気低下

      this.addBattleLog(`💀 敗北...`);
      this.addLog(`${battle.enemyName} に敗北しました...`, 'important');

    } else if (result === 'retreat') {
      // 撤退処理
      // 撤退時は追加損害（10%）
      const retreatLoss = Math.ceil(battle.playerSoldiers * 0.1);
      this.state.military.totalSoldiers = Math.max(0, battle.playerSoldiers - retreatLoss);
      this.state.military.morale = Math.max(20, battle.playerMorale - 5);

      if (enemy) {
        enemy.soldiers = battle.enemySoldiers;
      }

      this.addBattleLog(`🏃 撤退 (追加損害: ${retreatLoss}人)`);
      this.addLog(`${battle.enemyName} との戦闘から撤退しました`, 'military');
    }

    // 人口から兵士数を同期
    this.state.population.soldiers = this.state.military.totalSoldiers;

    this.notify();
  }

  // 撤退コマンド
  retreatFromBattle() {
    if (!this.state.battle || this.state.battle.result) {
      return false;
    }
    this.endBattle('retreat');
    return true;
  }

  // プレイヤーの戦闘力を取得
  getPlayerCombatPower() {
    return BattleCalcs.calculateCombatPower(
      this.state.military.totalSoldiers,
      this.state.military.equipmentRate,
      this.state.military.morale
    );
  }

  // 兵士を増やす（無職から徴兵）
  recruitSoldiers(amount) {
    const available = this.state.population.unemployed;
    const actual = Math.min(amount, available);

    if (actual <= 0) {
      this.addLog('徴兵可能な人口がいません', 'domestic');
      return false;
    }

    this.state.population.unemployed -= actual;
    this.state.population.soldiers += actual;
    this.state.military.totalSoldiers += actual;

    this.addLog(`${actual}人を兵士として徴兵しました`, 'military');
    this.notify();
    return true;
  }

  // 兵士を解雇（無職に戻す）
  disbandSoldiers(amount) {
    const current = this.state.military.totalSoldiers;
    const actual = Math.min(amount, current);

    if (actual <= 0) return false;

    this.state.population.soldiers -= actual;
    this.state.population.unemployed += actual;
    this.state.military.totalSoldiers -= actual;

    this.addLog(`${actual}人の兵士を解雇しました`, 'military');
    this.notify();
    return true;
  }
}
