/* ui.js - 画面描画とイベントハンドリング（完全版） */
import { BUILDINGS, TECHNOLOGIES, MAGICS } from './data.js';
import { Calcs } from './engine.js';

const LOG_STYLES = {
  important: { color: 'text-red-400', icon: '🚨', bgColor: 'bg-red-900/30' },
  domestic: { color: 'text-green-400', icon: '📈', bgColor: '' },
  military: { color: 'text-orange-400', icon: '⚔️', bgColor: '' },
  diplomatic: { color: 'text-blue-400', icon: '💬', bgColor: '' },
  tech: { color: 'text-purple-400', icon: '🔬', bgColor: '' },
};

const CATEGORY_NAMES = {
  agriculture: '農業',
  military: '軍事',
  economy: '経済',
  magic: '魔法',
  industry: '工業',
};

const PERSONALITY_NAMES = {
  aggressive: '攻撃的',
  cautious: '慎重',
  commercial: '商業的',
  isolationist: '孤立主義',
  scientific: '科学至上',
};

export class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.activeTab = 'domestic';
    this.renderedTab = null;

    this.els = {
      statusBar: document.getElementById('status-bar'),
      mainContent: document.getElementById('main-content'),
      logList: document.getElementById('log-list'),
      tabMenu: document.getElementById('tab-menu'),
      logToggle: document.getElementById('log-toggle-btn'),
      logWindow: document.getElementById('log-window'),
    };

    this.domCache = {
      statusBar: null,
      domestic: null,
      military: null,
      technology: null,
      diplomacy: null,
      magic: null,
      info: null,
    };

    this.lastLogId = 0;
    this.setupGlobalEvents();
  }

  setupGlobalEvents() {
    let isLogExpanded = false;
    this.els.logToggle.addEventListener('click', () => {
      isLogExpanded = !isLogExpanded;
      this.els.logWindow.style.height = isLogExpanded ? '300px' : '96px';
      this.els.logToggle.textContent = isLogExpanded ? '▲ 閉じる' : '▼ 展開';
    });
  }

  render(state) {
    // 勝敗画面チェック
    if (state.gameOver || state.victory) {
      this.renderGameEndScreen(state);
      return;
    }

    // 戦闘画面チェック（情報タブ以外の場合のみ）
    if (state.currentBattle && this.activeTab !== 'info') {
      this.renderBattleScreen(state);
      return;
    }

    this.renderStatusBar(state);
    this.renderMainContent(state);
    this.renderLog(state);
  }

  // --- ステータスバー ---
  renderStatusBar(state) {
    if (!this.domCache.statusBar) {
      this.initStatusBar();
    }
    this.updateStatusBar(state);
  }

  initStatusBar() {
    this.els.statusBar.innerHTML = `
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <div class="flex items-center gap-1">
          <span>👑</span><span class="text-gray-400 text-xs">人口:</span>
          <span id="sb-population" class="font-medium text-white">0</span>
        </div>
        <div class="flex items-center gap-1">
          <span>💰</span>
          <span id="sb-gold" class="font-medium">0G</span>
        </div>
        <div class="flex items-center gap-1">
          <span>🌾</span>
          <span id="sb-food" class="font-medium">0</span>
        </div>
        <div class="flex items-center gap-1">
          <span>😊</span>
          <span id="sb-satisfaction" class="font-medium">0%</span>
        </div>
        <div class="flex items-center gap-1">
          <span>⚔️</span>
          <span id="sb-soldiers" class="font-medium text-orange-400">0</span>
        </div>
      </div>
      
      <div class="flex items-center justify-between mt-1">
        <div class="flex items-center gap-2 text-sm">
          <span>⏱️</span><span id="sb-day" class="font-medium text-white">1日目</span>
          <span id="sb-status" class="text-xs text-gray-500"></span>
        </div>
        <div class="flex gap-1">
           <button id="btn-pause" class="px-2 py-0.5 rounded text-xs text-white"></button>
           <button id="btn-speed" class="px-2 py-0.5 rounded text-xs bg-gray-700 text-white">x1</button>
           <button id="btn-save" class="px-2 py-0.5 rounded text-xs bg-blue-600 text-white">💾</button>
        </div>
      </div>
    `;

    this.domCache.statusBar = {
      population: document.getElementById('sb-population'),
      gold: document.getElementById('sb-gold'),
      food: document.getElementById('sb-food'),
      satisfaction: document.getElementById('sb-satisfaction'),
      soldiers: document.getElementById('sb-soldiers'),
      day: document.getElementById('sb-day'),
      status: document.getElementById('sb-status'),
      btnPause: document.getElementById('btn-pause'),
      btnSpeed: document.getElementById('btn-speed'),
      btnSave: document.getElementById('btn-save'),
    };

    this.domCache.statusBar.btnPause.onclick = () => this.engine.togglePause();
    this.domCache.statusBar.btnSpeed.onclick = () => {
      const speeds = [1, 2, 5, 10, 20];
      const nextIdx = (speeds.indexOf(this.engine.state.gameSpeed) + 1) % speeds.length;
      this.engine.setSpeed(speeds[nextIdx]);
    };
    this.domCache.statusBar.btnSave.onclick = () => {
      if (this.engine.saveGame()) {
        this.showToast('セーブしました', 'success');
      }
    };
  }

  updateStatusBar(state) {
    const el = this.domCache.statusBar;

    el.population.textContent = state.population.total;
    el.gold.textContent = `${Math.floor(state.resources.gold)}G`;
    el.food.textContent = Math.floor(state.resources.food);
    el.satisfaction.textContent = `${state.satisfaction}%`;
    el.soldiers.textContent = state.military.totalSoldiers;

    const totalHours = (state.day % 1) * 24;
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours % 1) * 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    el.day.textContent = `${Math.floor(state.day)}日目 ${timeStr}`;
    el.status.textContent = state.isPaused ? '(停止中)' : '進行中';

    el.gold.className = `font-medium ${state.resources.gold < 0 ? 'text-red-400' : 'text-yellow-400'}`;
    el.food.className = `font-medium ${state.resources.food < 30 ? 'text-red-400' : 'text-green-400'}`;

    const satColor = state.satisfaction < 40 ? 'text-red-400' :
      state.satisfaction < 70 ? 'text-yellow-400' : 'text-green-400';
    el.satisfaction.className = `font-medium ${satColor}`;

    el.btnPause.textContent = state.isPaused ? '▶️ 再開' : '⏸️ 停止';
    el.btnPause.className = `px-2 py-0.5 rounded text-xs ${state.isPaused ? 'bg-green-600' : 'bg-yellow-600'} text-white`;
    el.btnSpeed.textContent = `x${state.gameSpeed}`;
  }

  // --- メインコンテンツ ---
  renderMainContent(state) {
    if (this.renderedTab !== this.activeTab) {
      this.els.mainContent.innerHTML = '';
      this.domCache.domestic = null;
      this.domCache.military = null;
      this.domCache.technology = null;
      this.domCache.diplomacy = null;
      this.domCache.info = null;

      switch (this.activeTab) {
        case 'domestic':
          this.initDomesticTab();
          break;
        case 'military':
          this.initMilitaryTab(state);
          break;
        case 'technology':
          this.initTechnologyTab(state);
          break;
        case 'diplomacy':
          this.initDiplomacyTab(state);
          break;
        case 'magic':
          this.initMagicTab(state);
          break;
        case 'info':
          this.initInfoTab();
          break;
        default:
          this.els.mainContent.innerHTML = `
            <div class="p-8 text-center text-gray-500">
              <p class="text-xl mb-2">🚧 工事中</p>
            </div>`;
      }
      this.renderedTab = this.activeTab;
    }

    switch (this.activeTab) {
      case 'domestic': this.updateDomesticTab(state); break;
      case 'military': this.updateMilitaryTab(state); break;
      case 'technology': this.updateTechnologyTab(state); break;
      case 'diplomacy': this.updateDiplomacyTab(state); break;
      case 'magic': this.updateMagicTab(state); break;
      case 'info': this.updateInfoTab(state); break;
    }
  }

  // --- 内政タブ ---
  initDomesticTab() {
    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full" id="domestic-container">
        <h2 class="text-lg font-bold text-gray-200 mb-3 border-b border-gray-700 pb-2">内政管理</h2>
        
        <!-- 人口配分 -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">人口配分 (総人口: <span id="dom-total-pop">0</span>人)</div>
          <div class="space-y-2" id="dom-pop-sliders"></div>
        </div>

        <!-- 税率 -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-300">税率: <span id="dom-tax-rate">15</span>%</span>
            <div class="flex items-center gap-2">
              <button id="btn-tax-down" class="px-2 py-1 bg-gray-700 rounded text-xs">-5%</button>
              <button id="btn-tax-up" class="px-2 py-1 bg-gray-700 rounded text-xs">+5%</button>
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-1">高税率は満足度を下げます</div>
        </div>

        <!-- 資源状況 -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">資源状況</div>
          <div class="grid grid-cols-3 gap-2 text-xs" id="dom-res-list"></div>
          <div class="mt-2 text-xs text-gray-500" id="dom-production"></div>
        </div>

        <div id="dom-built-area"></div>
        <div id="dom-queue-area"></div>

        <h3 class="text-sm font-bold text-gray-400 mb-2">施設建設</h3>
        <div id="dom-building-list"></div>
      </div>
    `;

    // 人口スライダーの初期化
    const sliderContainer = document.getElementById('dom-pop-sliders');
    const jobs = [
      { id: 'farmers', label: '👨‍🌾 農民', color: 'green' },
      { id: 'miners', label: '⛏️ 鉱夫', color: 'orange' },
      { id: 'craftsmen', label: '🔧 職人', color: 'blue' },
      { id: 'soldiers', label: '⚔️ 兵士', color: 'red' },
    ];

    jobs.forEach(job => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2';
      row.innerHTML = `
        <span class="w-20 text-xs">${job.label}</span>
        <button class="pop-btn-minus px-2 py-0.5 bg-gray-700 rounded text-xs" data-job="${job.id}">-</button>
        <span id="pop-val-${job.id}" class="w-8 text-center text-sm font-medium">0</span>
        <button class="pop-btn-plus px-2 py-0.5 bg-gray-700 rounded text-xs" data-job="${job.id}">+</button>
      `;
      sliderContainer.appendChild(row);
    });

    // 無職表示
    const unemployedRow = document.createElement('div');
    unemployedRow.className = 'flex items-center gap-2 mt-2 pt-2 border-t border-gray-700';
    unemployedRow.innerHTML = `
      <span class="w-20 text-xs text-gray-500">🤷 無職</span>
      <span id="pop-val-unemployed" class="text-sm font-medium text-gray-400">0</span>
    `;
    sliderContainer.appendChild(unemployedRow);

    // イベント設定
    sliderContainer.querySelectorAll('.pop-btn-minus').forEach(btn => {
      btn.onclick = () => {
        const job = btn.dataset.job;
        const current = this.engine.state.population[job];
        if (current > 0) {
          this.engine.assignPopulation(job, current - 1);
        }
      };
    });

    sliderContainer.querySelectorAll('.pop-btn-plus').forEach(btn => {
      btn.onclick = () => {
        const job = btn.dataset.job;
        const current = this.engine.state.population[job];
        if (this.engine.state.population.unemployed > 0) {
          this.engine.assignPopulation(job, current + 1);
        }
      };
    });

    // 税率ボタン
    document.getElementById('btn-tax-down').onclick = () => {
      this.engine.setTaxRate(this.engine.state.taxRate - 0.05);
    };
    document.getElementById('btn-tax-up').onclick = () => {
      this.engine.setTaxRate(this.engine.state.taxRate + 0.05);
    };

    // 建物リスト
    const listContainer = document.getElementById('dom-building-list');
    const buildingRows = {};

    BUILDINGS.forEach(b => {
      const row = document.createElement('div');
      row.className = "bg-gray-800 p-3 rounded mb-2 border border-gray-700 flex justify-between items-center";
      row.innerHTML = `
        <div class="flex-1">
          <div class="font-bold text-sm text-blue-300" id="bld-name-${b.id}">${b.name}</div>
          <div class="text-xs text-gray-400">${b.description}</div>
          <div class="text-xs text-yellow-500 mt-1" id="bld-cost-${b.id}"></div>
        </div>
        <button id="bld-btn-${b.id}" class="px-3 py-1.5 rounded text-xs font-bold bg-gray-700 text-gray-500">建設</button>
      `;
      listContainer.appendChild(row);

      const btn = row.querySelector(`#bld-btn-${b.id}`);
      btn.onclick = () => this.triggerBuild(b.id);

      buildingRows[b.id] = {
        row: row,
        name: row.querySelector(`#bld-name-${b.id}`),
        cost: row.querySelector(`#bld-cost-${b.id}`),
        btn: btn
      };
    });

    this.domCache.domestic = {
      totalPop: document.getElementById('dom-total-pop'),
      taxRate: document.getElementById('dom-tax-rate'),
      resList: document.getElementById('dom-res-list'),
      production: document.getElementById('dom-production'),
      builtArea: document.getElementById('dom-built-area'),
      queueArea: document.getElementById('dom-queue-area'),
      buildingRows: buildingRows,
      popValues: {
        farmers: document.getElementById('pop-val-farmers'),
        miners: document.getElementById('pop-val-miners'),
        craftsmen: document.getElementById('pop-val-craftsmen'),
        soldiers: document.getElementById('pop-val-soldiers'),
        unemployed: document.getElementById('pop-val-unemployed'),
      }
    };
  }

  updateDomesticTab(state) {
    const c = this.domCache.domestic;
    if (!c) return;

    c.totalPop.textContent = state.population.total;
    c.taxRate.textContent = Math.round(state.taxRate * 100);

    // 人口値更新
    c.popValues.farmers.textContent = state.population.farmers;
    c.popValues.miners.textContent = state.population.miners;
    c.popValues.craftsmen.textContent = state.population.craftsmen;
    c.popValues.soldiers.textContent = state.population.soldiers;
    c.popValues.unemployed.textContent = state.population.unemployed;

    // 資源
    c.resList.innerHTML = `
      <span class="text-yellow-400">💰 ${Math.floor(state.resources.gold)}G</span>
      <span class="text-green-400">🌾 ${Math.floor(state.resources.food)}</span>
      <span class="text-orange-400">⚫ ${Math.floor(state.resources.ore)}</span>
      <span class="text-purple-400">✨ ${Math.floor(state.resources.mana)}</span>
      <span class="text-red-400">🗡️ ${Math.floor(state.resources.weapons)}</span>
      <span class="text-blue-400">🛡️ ${Math.floor(state.resources.armor)}</span>
    `;

    // 生産量表示
    const foodProd = Calcs.foodProduction(state);
    const foodCons = Calcs.foodConsumption(state);
    const foodNet = foodProd - foodCons;
    c.production.innerHTML = `食糧: +${foodProd.toFixed(1)}/日 -${foodCons.toFixed(1)}/日 = <span class="${foodNet >= 0 ? 'text-green-400' : 'text-red-400'}">${foodNet >= 0 ? '+' : ''}${foodNet.toFixed(1)}/日</span>`;

    // 建設済み
    if (state.buildings.length > 0) {
      c.builtArea.innerHTML = `
        <div class="mb-4 bg-green-900/30 p-2 rounded border border-green-800">
          <div class="text-xs text-green-400 mb-1">✓ 建設済み施設:</div>
          <div class="text-sm text-gray-300">${state.buildings.map(b => b.name).join(', ')}</div>
        </div>`;
    } else {
      c.builtArea.innerHTML = '';
    }

    // キュー
    if (state.constructionQueue.length > 0) {
      c.queueArea.innerHTML = `
        <div class="mb-4 bg-gray-800 p-2 rounded">
          <div class="text-xs text-gray-400 mb-1">🔨 建設中:</div>
          ${state.constructionQueue.map(q => `
            <div class="text-sm flex justify-between">
              <span>${q.name}</span>
              <span class="text-blue-400">${Math.ceil(q.remainingTime)}秒</span>
            </div>
          `).join('')}
        </div>`;
    } else {
      c.queueArea.innerHTML = '';
    }

    // 建物リスト更新
    BUILDINGS.forEach(b => {
      const rowCache = c.buildingRows[b.id];
      if (!rowCache) return;

      const canAfford = state.resources.gold >= b.cost.gold &&
        (!b.cost.ore || state.resources.ore >= b.cost.ore);

      let hasPrereq = true;
      if (b.prerequisite) {
        hasPrereq = b.prerequisite.every(prereqId => {
          const tech = state.technologies.find(t => t.id === prereqId);
          if (tech) return tech.isResearched;
          return state.buildings.some(bld => bld.id === prereqId);
        });
      }

      let atMaxCount = false;
      if (b.maxCount) {
        const currentCount = state.buildings.filter(bld => bld.id === b.id).length;
        atMaxCount = currentCount >= b.maxCount;
      }

      const isBuilding = state.constructionQueue.some(q => q.buildingId === b.id);
      const canBuild = canAfford && hasPrereq && !atMaxCount && !isBuilding;

      rowCache.row.className = `bg-gray-800 p-3 rounded mb-2 border border-gray-700 flex justify-between items-center ${canBuild ? 'opacity-100' : 'opacity-50'}`;

      const costText = b.cost.ore ? `💰 ${b.cost.gold}G ⚫ ${b.cost.ore}鉱石` : `💰 ${b.cost.gold}G`;

      let statusText = '';
      if (!hasPrereq) statusText = ' (前提未達成)';
      else if (atMaxCount) statusText = ' (上限)';
      else if (isBuilding) statusText = ' (建設中)';

      rowCache.name.textContent = `${b.name}${statusText}`;
      rowCache.cost.innerHTML = `${costText} <span class="text-gray-500">⏳ ${b.buildTime}s</span>`;

      rowCache.btn.className = `px-3 py-1.5 rounded text-xs font-bold ${canBuild ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`;
      rowCache.btn.disabled = !canBuild;
    });
  }

  // --- 軍事タブ ---
  initMilitaryTab(state) {
    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-3 border-b border-gray-700 pb-2">軍事</h2>
        
        <!-- 軍事概要 -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">軍事概要</div>
          <div class="grid grid-cols-2 gap-2 text-xs" id="mil-overview"></div>
        </div>

        <!-- 装備状況 -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">装備状況</div>
          <div id="mil-equipment" class="text-xs"></div>
        </div>

        <!-- 他国への侵攻 -->
        <h3 class="text-sm font-bold text-gray-400 mb-2">侵攻可能な国家</h3>
        <div id="mil-nations-list"></div>
      </div>
    `;

    // 国家リスト
    const nationList = document.getElementById('mil-nations-list');
    const nationCards = {};

    state.aiNations.forEach(nation => {
      const card = document.createElement('div');
      card.className = "bg-gray-800 p-3 rounded mb-2 border border-gray-700";
      card.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-bold text-sm text-orange-300" id="mil-n-${nation.id}-name">${nation.name}</div>
            <div class="text-xs text-gray-400" id="mil-n-${nation.id}-power">軍事力: ${nation.militaryPower}</div>
          </div>
          <button id="mil-n-${nation.id}-btn" class="px-3 py-1.5 rounded text-xs font-bold bg-red-600 text-white">侵攻</button>
        </div>
      `;
      nationList.appendChild(card);

      const btn = card.querySelector(`#mil-n-${nation.id}-btn`);
      btn.onclick = () => this.triggerAttack(nation.id);

      nationCards[nation.id] = {
        card: card,
        name: card.querySelector(`#mil-n-${nation.id}-name`),
        power: card.querySelector(`#mil-n-${nation.id}-power`),
        btn: btn
      };
    });

    this.domCache.military = {
      overview: document.getElementById('mil-overview'),
      equipment: document.getElementById('mil-equipment'),
      nationCards: nationCards
    };
  }

  updateMilitaryTab(state) {
    const c = this.domCache.military;
    if (!c) return;

    const combatPower = Calcs.combatPower(state, false);
    const equipRate = Calcs.equipmentRate(state);

    c.overview.innerHTML = `
      <div><span class="text-gray-500">総兵力:</span> <span class="text-white">${state.military.totalSoldiers}人</span></div>
      <div><span class="text-gray-500">戦闘力:</span> <span class="text-orange-400">${combatPower}</span></div>
      <div><span class="text-gray-500">装備率:</span> <span class="${equipRate >= 80 ? 'text-green-400' : equipRate >= 50 ? 'text-yellow-400' : 'text-red-400'}">${equipRate}%</span></div>
      <div><span class="text-gray-500">士気:</span> <span class="${state.military.morale >= 70 ? 'text-green-400' : 'text-yellow-400'}">${state.military.morale}%</span></div>
    `;

    const soldiers = state.military.totalSoldiers;
    const weapons = state.resources.weapons;
    const armor = state.resources.armor;
    c.equipment.innerHTML = `
      <div>武器: ${Math.floor(weapons)} / ${soldiers}必要 (${soldiers > 0 ? Math.min(100, Math.floor(weapons / soldiers * 100)) : 100}%)</div>
      <div>鎧: ${Math.floor(armor)} / ${soldiers}必要 (${soldiers > 0 ? Math.min(100, Math.floor(armor / soldiers * 100)) : 100}%)</div>
    `;

    // 国家リスト更新
    state.aiNations.forEach(nation => {
      const nc = c.nationCards[nation.id];
      if (!nc) return;

      if (nation.isDefeated) {
        nc.card.className = "bg-gray-800 p-3 rounded mb-2 border border-gray-700 opacity-50";
        nc.name.textContent = `${nation.name} (征服済み)`;
        nc.btn.style.display = 'none';
      } else {
        nc.card.className = "bg-gray-800 p-3 rounded mb-2 border border-gray-700";
        nc.name.textContent = nation.name;
        nc.power.textContent = `軍事力: ${nation.militaryPower}`;
        nc.btn.style.display = 'block';

        const canAttack = state.military.totalSoldiers >= 10;
        nc.btn.className = `px-3 py-1.5 rounded text-xs font-bold ${canAttack ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`;
        nc.btn.disabled = !canAttack;
      }
    });
  }

  // --- 技術タブ ---
  initTechnologyTab(state) {
    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full" id="tech-container">
        <h2 class="text-lg font-bold text-gray-200 mb-3 border-b border-gray-700 pb-2">技術研究</h2>
        <div id="tech-queue-area"></div>
        <div id="tech-researched-area"></div>
        <div id="tech-list-area"></div>
      </div>
    `;

    const categories = {};
    state.technologies.forEach(tech => {
      if (!categories[tech.category]) categories[tech.category] = [];
      categories[tech.category].push(tech);
    });

    const listArea = document.getElementById('tech-list-area');
    const techCards = {};

    Object.entries(categories).forEach(([category, techs]) => {
      const sortedTechs = techs.sort((a, b) => a.tier - b.tier);

      const catDiv = document.createElement('div');
      catDiv.className = "mb-4";
      catDiv.innerHTML = `
        <h3 class="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-${this.getCategoryColor(category)}-500"></span>
          ${CATEGORY_NAMES[category] || category}
        </h3>
        <div class="space-y-2" id="cat-list-${category}"></div>
      `;
      listArea.appendChild(catDiv);
      const catList = catDiv.querySelector(`#cat-list-${category}`);

      sortedTechs.forEach(tech => {
        const card = document.createElement('div');
        card.innerHTML = `
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="font-bold text-sm text-purple-300 flex items-center gap-2">
                ${tech.name} <span class="text-xs text-gray-500">Tier ${tech.tier}</span>
              </div>
              <div class="text-xs text-gray-400 mt-1">${tech.description}</div>
              <div class="text-xs mt-1" id="tech-cost-${tech.id}"></div>
              <div class="text-xs mt-1 text-gray-500" id="tech-status-${tech.id}"></div>
            </div>
            <button id="tech-btn-${tech.id}" class="px-3 py-1.5 rounded text-xs font-bold bg-gray-700 text-gray-500">研究</button>
          </div>
        `;
        catList.appendChild(card);

        const btn = card.querySelector(`#tech-btn-${tech.id}`);
        btn.onclick = () => this.triggerResearch(tech.id);

        techCards[tech.id] = {
          card: card,
          cost: card.querySelector(`#tech-cost-${tech.id}`),
          status: card.querySelector(`#tech-status-${tech.id}`),
          btn: btn
        };
      });
    });

    this.domCache.technology = {
      queueArea: document.getElementById('tech-queue-area'),
      researchedArea: document.getElementById('tech-researched-area'),
      techCards: techCards
    };
  }

  updateTechnologyTab(state) {
    const c = this.domCache.technology;
    if (!c) return;

    if (state.researchQueue.length > 0) {
      c.queueArea.innerHTML = `
        <div class="mb-4 bg-purple-900/30 p-3 rounded border border-purple-800">
          <div class="text-xs text-purple-400 mb-1">🔬 研究中:</div>
          ${state.researchQueue.map(r => `
            <div class="text-sm flex justify-between">
              <span class="text-white">${r.name}</span>
              <span class="text-purple-400">${Math.ceil(r.remainingTime)}秒</span>
            </div>`).join('')}
        </div>`;
    } else {
      c.queueArea.innerHTML = '';
    }

    const researchedTechs = state.technologies.filter(t => t.isResearched);
    if (researchedTechs.length > 0) {
      c.researchedArea.innerHTML = `
        <div class="mb-4 bg-green-900/30 p-2 rounded border border-green-800">
          <div class="text-xs text-green-400 mb-1">✓ 研究済み:</div>
          <div class="text-sm text-gray-300">${researchedTechs.map(t => t.name).join(', ')}</div>
        </div>`;
    } else {
      c.researchedArea.innerHTML = '';
    }

    state.technologies.forEach(tech => {
      const cardCache = c.techCards[tech.id];
      if (!cardCache) return;

      const isResearched = tech.isResearched;
      const isResearching = state.researchQueue.some(r => r.techId === tech.id);

      let hasPrereq = true;
      let prereqText = '';
      if (tech.prerequisite) {
        hasPrereq = tech.prerequisite.every(prereqId => {
          const pt = state.technologies.find(t => t.id === prereqId);
          return pt && pt.isResearched;
        });
        if (!hasPrereq) {
          const names = tech.prerequisite.map(id => {
            const t = state.technologies.find(t => t.id === id);
            return t ? t.name : id;
          }).join(', ');
          prereqText = `前提: ${names}`;
        }
      }

      const canAfford = state.resources.gold >= tech.cost.gold &&
        (!tech.cost.mana || state.resources.mana >= tech.cost.mana);
      const canResearch = !isResearched && !isResearching && hasPrereq && canAfford;

      let statusMsg = '';
      let statusClass = 'border-gray-700 bg-gray-800';
      let statusTextClass = 'text-gray-500';

      if (isResearched) {
        statusClass = 'border-green-600 bg-green-900/20';
        statusMsg = '✓ 研究済み';
        statusTextClass = 'text-green-400';
      } else if (isResearching) {
        statusClass = 'border-purple-600 bg-purple-900/20';
        statusMsg = '🔬 研究中';
      } else if (!hasPrereq) {
        statusClass = 'border-gray-700 opacity-50';
        statusMsg = `🔒 ${prereqText}`;
      } else if (!canAfford) {
        statusClass = 'border-gray-700 opacity-60';
        statusMsg = '💰 資金不足';
      }

      cardCache.card.className = `p-3 rounded border mb-2 ${statusClass}`;
      cardCache.status.textContent = statusMsg;
      cardCache.status.className = `text-xs mt-1 ${statusTextClass}`;

      const costText = tech.cost.mana ? `💰 ${tech.cost.gold}G ✨ ${tech.cost.mana}魔力` : `💰 ${tech.cost.gold}G`;
      cardCache.cost.innerHTML = `<span class="text-yellow-500">${costText}</span> <span class="text-gray-500 ml-2">⏳ ${tech.researchTime}s</span>`;

      if (isResearched || isResearching) {
        cardCache.btn.style.display = 'none';
      } else {
        cardCache.btn.style.display = 'block';
        cardCache.btn.className = `px-3 py-1.5 rounded text-xs font-bold ${canResearch ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`;
        cardCache.btn.disabled = !canResearch;
      }
    });
  }

  // --- 外交タブ ---
  initDiplomacyTab(state) {
    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-3 border-b border-gray-700 pb-2">外交</h2>
        
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300">あなたの評判</div>
          <div class="flex items-center gap-2 mt-1">
            <span id="dip-reputation" class="text-2xl font-bold">0</span>
            <span id="dip-rep-text" class="text-xs text-gray-500"></span>
          </div>
        </div>

        <h3 class="text-sm font-bold text-gray-400 mb-2">他国一覧</h3>
        <div id="dip-nations-list"></div>
      </div>
    `;

    const nationCache = {};
    const list = document.getElementById('dip-nations-list');

    state.aiNations.forEach(nation => {
      const card = document.createElement('div');
      card.className = "bg-gray-800 p-3 rounded mb-3 border border-gray-700";
      card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="font-bold text-blue-300" id="dip-n-${nation.id}-name">${nation.name}</div>
            <div class="text-xs text-gray-400">${nation.description}</div>
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-500">性格</div>
            <div class="text-sm text-gray-300">${PERSONALITY_NAMES[nation.personality] || nation.personality}</div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs mb-2">
          <div><span class="text-gray-500">人口:</span> <span id="dip-n-${nation.id}-pop" class="text-white"></span></div>
          <div><span class="text-gray-500">軍事力:</span> <span id="dip-n-${nation.id}-mil" class="text-orange-400"></span></div>
          <div><span class="text-gray-500">関係:</span> <span id="dip-n-${nation.id}-rel"></span></div>
        </div>
        <div id="dip-n-${nation.id}-status" class="text-xs text-green-400 mb-2"></div>
        <div class="flex gap-2">
          <button id="dip-n-${nation.id}-btn-trade" class="flex-1 px-3 py-1.5 rounded text-xs font-bold bg-gray-700"></button>
        </div>
      `;
      list.appendChild(card);

      const btnTrade = card.querySelector(`#dip-n-${nation.id}-btn-trade`);
      btnTrade.onclick = () => this.triggerTradeAgreement(nation.id);

      nationCache[nation.id] = {
        card: card,
        name: card.querySelector(`#dip-n-${nation.id}-name`),
        pop: card.querySelector(`#dip-n-${nation.id}-pop`),
        mil: card.querySelector(`#dip-n-${nation.id}-mil`),
        rel: card.querySelector(`#dip-n-${nation.id}-rel`),
        status: card.querySelector(`#dip-n-${nation.id}-status`),
        btnTrade: btnTrade
      };
    });

    this.domCache.diplomacy = {
      reputation: document.getElementById('dip-reputation'),
      repText: document.getElementById('dip-rep-text'),
      nations: nationCache
    };
  }

  updateDiplomacyTab(state) {
    const c = this.domCache.diplomacy;
    if (!c) return;

    c.reputation.textContent = state.reputation;
    const repColor = state.reputation > 20 ? 'text-green-400' : state.reputation < -20 ? 'text-red-400' : 'text-yellow-400';
    c.reputation.className = `text-2xl font-bold ${repColor}`;
    c.repText.textContent = state.reputation >= 50 ? '名君' : state.reputation >= 0 ? '普通' : '悪評';

    state.aiNations.forEach(nation => {
      const nc = c.nations[nation.id];
      if (!nc) return;

      if (nation.isDefeated) {
        nc.card.className = "bg-gray-800 p-3 rounded mb-3 border border-gray-700 opacity-50";
        nc.name.textContent = `${nation.name} (征服済み)`;
        nc.btnTrade.style.display = 'none';
        nc.status.textContent = '';
        return;
      }

      nc.card.className = "bg-gray-800 p-3 rounded mb-3 border border-gray-700";
      nc.pop.textContent = nation.population;
      nc.mil.textContent = nation.militaryPower;
      nc.rel.textContent = Math.floor(nation.relationWithPlayer);

      const relColor = nation.relationWithPlayer > 20 ? 'text-green-400' :
        nation.relationWithPlayer < -20 ? 'text-red-400' : 'text-yellow-400';
      nc.rel.className = relColor;

      const hasTrade = nation.treaties.some(t => t.type === 'trade');
      const tradeDuration = nation.treaties.find(t => t.type === 'trade')?.duration || 0;

      if (hasTrade) {
        nc.status.textContent = `✓ 貿易協定締結中（残り${tradeDuration}ヶ月）`;
        nc.btnTrade.style.display = 'none';
      } else {
        nc.status.textContent = '';
        nc.btnTrade.style.display = 'block';

        const baseCost = 200;
        const relationModifier = nation.relationWithPlayer < 0 ? 1.5 : 1.0;
        const tradeCost = Math.floor(baseCost * relationModifier);
        const canAfford = state.resources.gold >= tradeCost;

        nc.btnTrade.textContent = `貿易協定（${tradeCost}G）`;
        nc.btnTrade.className = `flex-1 px-3 py-1.5 rounded text-xs font-bold ${canAfford ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`;
        nc.btnTrade.disabled = !canAfford;
      }
    });
  }

  // --- 魔法タブ ---
  initMagicTab(state) {
    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-3 border-b border-gray-700 pb-2">魔法</h2>

        <!-- 持続中の効果 -->
        <div id="magic-active-area" class="mb-4"></div>

        <!-- 内政魔法 -->
        <div class="mb-4">
          <h3 class="text-sm font-bold text-green-400 mb-2">内政魔法</h3>
          <div id="magic-list-domestic" class="space-y-2"></div>
        </div>

        <!-- 戦略魔法 -->
        <div class="mb-4">
          <h3 class="text-sm font-bold text-purple-400 mb-2">戦略魔法</h3>
          <div class="mb-2">
            <label class="text-xs text-gray-400 block mb-1">対象国家:</label>
            <select id="magic-target-select" class="w-full bg-gray-700 text-white rounded p-2 text-sm border border-gray-600">
              <option value="">選択してください</option>
              ${state.aiNations.filter(n => !n.isDefeated).map(n => `<option value="${n.id}">${n.name}</option>`).join('')}
            </select>
          </div>
          <div id="magic-list-strategic" class="space-y-2"></div>
        </div>
      </div>
    `;

    // 魔法リスト生成
    const lists = {
      domestic: document.getElementById('magic-list-domestic'),
      strategic: document.getElementById('magic-list-strategic')
    };

    // キャッシュ準備
    const magicCards = {};

    MAGICS.forEach(magic => {
      if (magic.type === 'battle') return; // 戦闘魔法はここには表示しない（あるいは表示のみで無効?）

      const container = lists[magic.type];
      if (!container) return;

      const card = document.createElement('div');
      card.className = "bg-gray-800 p-3 rounded border border-gray-700 flex justify-between items-center";
      card.innerHTML = `
        <div class="flex-1">
          <div class="font-bold text-sm text-purple-300">${magic.name}</div>
          <div class="text-xs text-gray-400 mb-1">${magic.description}</div>
          <div class="text-xs text-yellow-500">消費魔力: ${magic.manaCost}</div>
        </div>
        <button id="magic-btn-${magic.id}" class="px-3 py-1.5 rounded text-xs font-bold bg-purple-600 text-white ml-2">発動</button>
      `;
      container.appendChild(card);

      const btn = card.querySelector(`#magic-btn-${magic.id}`);
      btn.onclick = () => {
        const targetId = magic.type === 'strategic' ? document.getElementById('magic-target-select').value : null;
        if (magic.type === 'strategic' && magic.id !== 'major_barrier' && !targetId) {
          this.showToast('対象国家を選択してください', 'error');
          return;
        }
        this.triggerMagic(magic.id, targetId);
      };

      magicCards[magic.id] = { btn, magic };
    });

    this.domCache.magic = {
      activeArea: document.getElementById('magic-active-area'),
      magicCards,
      targetSelect: document.getElementById('magic-target-select')
    };
  }

  updateMagicTab(state) {
    const c = this.domCache.magic;
    if (!c) return;

    // 持続効果表示
    if (state.activeEffects && state.activeEffects.length > 0) {
      c.activeArea.innerHTML = `
        <div class="bg-purple-900/30 p-3 rounded border border-purple-800">
          <div class="text-xs text-purple-400 mb-2">✨ 発動中の効果:</div>
          <div class="space-y-1">
            ${state.activeEffects.map(eff => `
              <div class="flex justify-between text-sm">
                <span class="text-white">${eff.name}</span>
                <span class="text-purple-300">残り ${eff.duration.toFixed(1)}日</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      c.activeArea.innerHTML = '';
    }

    // 各魔法ボタンの状態更新
    Object.values(c.magicCards).forEach(({ btn, magic }) => {
      const canCast = state.resources.mana >= magic.manaCost;
      btn.disabled = !canCast;
      btn.className = `px-3 py-1.5 rounded text-xs font-bold ml-2 ${canCast ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`;
    });
  }

  updateInfoTab(state) {
    const c = this.domCache.info;
    if (!c) return;

    const researchedCount = state.technologies.filter(t => t.isResearched).length;
    const totalTechs = state.technologies.length;
    const buildingsCount = state.buildings.length;
    const tradeCount = state.aiNations.reduce((sum, n) => sum + n.treaties.filter(t => t.type === 'trade').length, 0);
    const conqueredCount = state.aiNations.filter(n => n.isDefeated).length;

    c.stats.innerHTML = `
      <div><span class="text-gray-500">経過日数:</span> <span class="text-white ml-1">${Math.floor(state.day)}日</span></div>
      <div><span class="text-gray-500">総人口:</span> <span class="text-white ml-1">${state.population.total}人</span></div>
      <div><span class="text-gray-500">研究済み技術:</span> <span class="text-purple-400 ml-1">${researchedCount}/${totalTechs}</span></div>
      <div><span class="text-gray-500">建設済み施設:</span> <span class="text-blue-400 ml-1">${buildingsCount}件</span></div>
      <div><span class="text-gray-500">貿易協定数:</span> <span class="text-green-400 ml-1">${tradeCount}件</span></div>
      <div><span class="text-gray-500">征服した国:</span> <span class="text-red-400 ml-1">${conqueredCount}/5</span></div>
    `;

    const activeNations = state.aiNations.filter(n => !n.isDefeated).length;
    const dimMagic = state.technologies.find(t => t.id === 'dimensional_magic');
    const allTrade = state.aiNations.every(n => n.isDefeated || n.treaties.some(t => t.type === 'trade'));

    c.victory.innerHTML = `
      <div class="${activeNations === 0 ? 'text-green-400' : 'text-gray-400'}">⚔️ 軍事統一: 全国家を征服 (${5 - activeNations}/5)</div>
      <div class="${dimMagic?.isResearched && state.resources.gold >= 100000 ? 'text-green-400' : 'text-gray-400'}">🔬 技術勝利: 次元魔法 + 100,000G (${dimMagic?.isResearched ? '✓' : '✗'} / ${Math.floor(state.resources.gold)}/100,000G)</div>
      <div class="${state.resources.gold >= 50000 && allTrade ? 'text-green-400' : 'text-gray-400'}">💰 経済勝利: 全国と貿易 + 50,000G (${allTrade ? '✓' : '✗'} / ${Math.floor(state.resources.gold)}/50,000G)</div>
    `;
  }

  // --- 戦闘画面 ---
  renderBattleScreen(state) {
    const battle = state.currentBattle;
    if (!battle) return;

    const battleType = battle.isDefense ? '防衛戦' : '侵攻戦';
    const resultText = battle.result === 'victory' ? '勝利！' : battle.result === 'defeat' ? '敗北...' : '戦闘中';
    const resultColor = battle.result === 'victory' ? 'text-green-400' : battle.result === 'defeat' ? 'text-red-400' : 'text-yellow-400';

    this.els.mainContent.innerHTML = `
      <div class="p-4 h-full flex flex-col">
        <div class="text-center mb-4">
          <h2 class="text-xl font-bold text-orange-400">⚔️ ${battleType}</h2>
          <div class="text-lg text-gray-300">vs ${battle.enemyName}</div>
          <div class="text-2xl font-bold ${resultColor} mt-2">${resultText}</div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="bg-blue-900/30 p-3 rounded border border-blue-700">
            <div class="text-sm text-blue-300 mb-2">味方軍</div>
            <div class="text-xs space-y-1">
              <div>兵力: ${battle.playerForces.current}/${battle.playerForces.initial}</div>
              <div>戦闘力: ${battle.playerForces.power}</div>
              <div>士気: ${battle.playerForces.morale}%</div>
            </div>
            <div class="mt-2 bg-gray-700 h-2 rounded">
              <div class="bg-blue-500 h-2 rounded" style="width: ${(battle.playerForces.current / battle.playerForces.initial) * 100}%"></div>
            </div>
          </div>

            </div>
          </div>

          <div class="bg-red-900/30 p-3 rounded border border-red-700">
            <div class="text-sm text-red-300 mb-2">敵軍</div>
            <div class="text-xs space-y-1">
              <div>兵力: ${battle.enemyForces.current}/${battle.enemyForces.initial}</div>
              <div>戦闘力: ${battle.enemyForces.power}</div>
              <div>士気: ${battle.enemyForces.morale}%</div>
            </div>
            <div class="mt-2 bg-gray-700 h-2 rounded">
              <div class="bg-red-500 h-2 rounded" style="width: ${(battle.enemyForces.current / battle.enemyForces.initial) * 100}%"></div>
            </div>
          </div>
        </div>

        <!-- 戦闘魔法 -->
        <div class="grid grid-cols-3 gap-2 mb-4">
          ${MAGICS.filter(m => m.type === 'battle').map(m => {
      const canCast = state.resources.mana >= m.manaCost;
      return `
              <button onclick="window.game.ui.triggerMagic('${m.id}')" 
                class="px-2 py-2 rounded text-xs font-bold ${canCast ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}"
                ${!canCast ? 'disabled' : ''}>
                ${m.name}<br>(${m.manaCost}MP)
              </button>
            `;
    }).join('')}
        </div>

        <div class="flex-1 bg-gray-800 p-3 rounded border border-gray-700 overflow-y-auto">
          <div class="text-xs text-gray-400 mb-2">戦闘ログ</div>
          <div class="text-xs space-y-1 font-mono">
            ${battle.log.slice(-10).map(l => `<div class="text-gray-300">${l}</div>`).join('')}
          </div>
        </div>

        ${battle.result ? `
          <button onclick="window.game.ui.closeBattle()" class="mt-4 w-full py-3 rounded font-bold bg-blue-600 hover:bg-blue-500 text-white">
            戦闘結果を確認して閉じる
          </button>
        ` : ''}
      </div>
    `;
  }

  closeBattle() {
    this.engine.closeBattle();
    this.renderedTab = null;
  }

  // --- 勝利/敗北画面 ---
  renderGameEndScreen(state) {
    const isVictory = state.victory;
    const bgColor = isVictory ? 'bg-green-900/50' : 'bg-red-900/50';
    const borderColor = isVictory ? 'border-green-600' : 'border-red-600';
    const title = isVictory ? '🎉 勝利！' : '💀 ゲームオーバー';

    let reason = '';
    if (isVictory) {
      switch (state.victoryType) {
        case 'military': reason = '全国家を征服し、軍事統一を達成しました！'; break;
        case 'technology': reason = '次元門を建設し、技術勝利を達成しました！'; break;
        case 'economic': reason = '経済的覇権を確立し、経済勝利を達成しました！'; break;
      }
    } else {
      switch (state.gameOverReason) {
        case 'population': reason = '人口が0になり、国家が消滅しました。'; break;
        case 'bankruptcy': reason = '30日間の破産状態により国家が崩壊しました。'; break;
        case 'coup': reason = '民衆の不満によりクーデターが発生しました。'; break;
      }
    }

    this.els.mainContent.innerHTML = `
      <div class="p-8 h-full flex flex-col items-center justify-center ${bgColor}">
        <div class="text-center ${borderColor} border-2 rounded-lg p-8 bg-gray-900/80">
          <h1 class="text-4xl font-bold ${isVictory ? 'text-green-400' : 'text-red-400'} mb-4">${title}</h1>
          <p class="text-lg text-gray-300 mb-6">${reason}</p>
          <div class="text-sm text-gray-400 mb-6">
            <div>経過日数: ${Math.floor(state.day)}日</div>
            <div>最終人口: ${state.population.total}人</div>
            <div>最終資金: ${Math.floor(state.resources.gold)}G</div>
          </div>
          <button onclick="window.game.ui.triggerNewGame()" class="px-6 py-3 rounded font-bold bg-blue-600 hover:bg-blue-500 text-white">
            🔄 ニューゲーム
          </button>
        </div>
      </div>
    `;
  }

  // --- ログ ---
  renderLog(state) {
    if (state.eventLog.length === 0) return;

    const latestId = state.eventLog[0].id;
    if (this.lastLogId === latestId) return;
    this.lastLogId = latestId;

    this.els.logList.innerHTML = state.eventLog.map(log => {
      const style = LOG_STYLES[log.type] || LOG_STYLES.domestic;
      return `
        <div class="flex gap-2 py-1 border-b border-gray-800 last:border-0 ${style.bgColor}">
          <span class="opacity-60 text-xs min-w-[40px]">${log.time}</span>
          <span class="text-xs">${style.icon}</span>
          <span class="text-sm ${style.color}">${log.message}</span>
        </div>
      `;
    }).join('');
  }

  getCategoryColor(category) {
    const colors = { agriculture: 'green', military: 'red', economy: 'yellow', magic: 'purple', industry: 'blue' };
    return colors[category] || 'gray';
  }

  // --- トリガーメソッド ---
  triggerBuild(buildingId) {
    const result = this.engine.startConstruction(buildingId);
    if (!result.success) this.showToast(result.message, 'error');
  }

  triggerResearch(techId) {
    const result = this.engine.startResearch(techId);
    if (!result.success) this.showToast(result.message, 'error');
  }

  triggerTradeAgreement(nationId) {
    const result = this.engine.proposeTradeAgreement(nationId);
    if (result.success) {
      this.showToast('貿易協定を締結しました！', 'success');
    } else {
      this.showToast(result.message, 'error');
    }
  }

  triggerAttack(nationId) {
    this.showConfirmModal('本当にこの国家に侵攻しますか？', () => {
      const result = this.engine.attackNation(nationId);
      if (!result.success) {
        this.showToast(result.message, 'error');
      }
    });
  }

  triggerMagic(magicId, targetId = null) {
    const result = this.engine.castMagic(magicId, targetId);
    if (result.success) {
      this.showToast('魔法を発動しました', 'success');
    } else {
      this.showToast(result.message, 'error');
    }
  }

  triggerSave() {
    if (this.engine.saveGame()) {
      this.showToast('セーブしました', 'success');
    } else {
      this.showToast('セーブに失敗しました', 'error');
    }
  }

  triggerLoad() {
    if (this.engine.hasSaveData()) {
      if (this.engine.loadGame()) {
        this.showToast('ロードしました', 'success');
        this.renderedTab = null;
        this.render(this.engine.state);
      } else {
        this.showToast('ロードに失敗しました', 'error');
      }
    } else {
      this.showToast('セーブデータがありません', 'error');
    }
  }

  triggerNewGame() {
    this.showConfirmModal('本当に新しいゲームを開始しますか？\n現在のデータは全て失われます。', () => {
      // ローカルストレージを完全にクリアしてリロード
      localStorage.clear();
      location.reload();
    });
  }

  showConfirmModal(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 m-4 max-w-sm border border-gray-600">
        <p class="text-white text-sm mb-4 whitespace-pre-line">${message}</p>
        <div class="flex gap-2">
          <button class="flex-1 px-4 py-2 rounded text-sm font-bold bg-gray-600 hover:bg-gray-500 text-white" id="modal-cancel">キャンセル</button>
          <button class="flex-1 px-4 py-2 rounded text-sm font-bold bg-red-600 hover:bg-red-500 text-white" id="modal-confirm">実行</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#modal-cancel').onclick = () => modal.remove();
    modal.querySelector('#modal-confirm').onclick = () => {
      modal.remove();
      onConfirm();
    };
  }

  showToast(message, type = 'info') {
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' };
    const toast = document.createElement('div');
    toast.className = `fixed top-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded ${colors[type]} text-white text-sm z-50 shadow-lg`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  initTabMenu() {
    const tabs = [
      { id: 'domestic', icon: '🏠', label: '内政' },
      { id: 'military', icon: '⚔️', label: '軍事' },
      { id: 'diplomacy', icon: '🤝', label: '外交' },
      { id: 'technology', icon: '🔬', label: '技術' },
      { id: 'magic', icon: '✨', label: '魔法' },
      { id: 'info', icon: '📊', label: '情報' },
    ];

    this.els.tabMenu.innerHTML = tabs.map(tab => `
      <button data-tab="${tab.id}" class="flex-1 flex flex-col items-center justify-center py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
        <span class="text-xl">${tab.icon}</span>
        <span class="text-xs mt-1">${tab.label}</span>
      </button>
    `).join('');

    this.els.tabMenu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.els.tabMenu.querySelectorAll('button').forEach(b => {
          b.classList.remove('text-blue-400', 'bg-gray-800');
          b.classList.add('text-gray-400');
        });
        btn.classList.remove('text-gray-400');
        btn.classList.add('text-blue-400', 'bg-gray-800');
        this.render(this.engine.state);
      });
    });

    const initialBtn = this.els.tabMenu.querySelector(`[data-tab="domestic"]`);
    if (initialBtn) initialBtn.click();
  }
}
