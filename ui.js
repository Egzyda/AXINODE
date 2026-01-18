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

        <!-- 財政収支 -->
        <div id="dom-income-info"></div>

        <!-- 市場取引 -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">市場取引 (買値/売値)</div>
          <div class="space-y-2" id="dom-market-list"></div>
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
      incomeInfo: document.getElementById('dom-income-info'),
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

    // 市場UI初期化
    const marketContainer = document.getElementById('dom-market-list');
    const marketRows = {};
    const resNames = { food: '食糧', ore: '鉱石', weapons: '武器', armor: '鎧' };

    ['food', 'ore', 'weapons', 'armor'].forEach(res => {
      if (!this.engine.CONSTANTS.MARKET_PRICES[res]) return;

      const row = document.createElement('div');
      row.className = 'flex justify-between items-center text-xs border-b border-gray-700 pb-1 last:border-0';
      row.innerHTML = `
        <div class="w-16 text-gray-400">${resNames[res]}</div>
        <div class="text-yellow-500 w-20 text-center" id="mkt-price-${res}"></div>
        <div class="flex gap-1">
          <button id="mkt-buy-${res}" class="px-2 py-1 bg-green-900 text-green-200 rounded hover:bg-green-800 text-[10px]">買(10)</button>
          <button id="mkt-sell-${res}" class="px-2 py-1 bg-red-900 text-red-200 rounded hover:bg-red-800 text-[10px]">売(10)</button>
        </div>
      `;
      marketContainer.appendChild(row);

      const btnBuy = row.querySelector(`#mkt-buy-${res}`);
      const btnSell = row.querySelector(`#mkt-sell-${res}`);

      // 10個単位で取引
      btnBuy.onclick = () => this.engine.buyResource(res, 10);
      btnSell.onclick = () => this.engine.sellResource(res, 10);

      marketRows[res] = {
        price: row.querySelector(`#mkt-price-${res}`),
        btnBuy,
        btnSell
      };
    });
    this.domCache.domestic.marketRows = marketRows;
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

    // 市場更新
    if (c.marketRows) {
      Object.entries(c.marketRows).forEach(([res, els]) => {
        const price = this.engine.CONSTANTS.MARKET_PRICES[res];
        const buyPrice = price;
        const sellPrice = Math.floor(price * 0.5);

        els.price.textContent = `${buyPrice}G / ${sellPrice}G`;

        // 買えるか（10個分）
        const canBuy = state.resources.gold >= buyPrice * 10;
        els.btnBuy.disabled = !canBuy;
        els.btnBuy.className = `px-2 py-1 rounded text-xs ${canBuy ? 'bg-green-900 text-green-200 hover:bg-green-800' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`;

        // 売れるか（10個分）
        const canSell = state.resources[res] >= 10;
        els.btnSell.disabled = !canSell;
        els.btnSell.className = `px-2 py-1 rounded text-xs ${canSell ? 'bg-red-900 text-red-200 hover:bg-red-800' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`;
      });
    }

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

    // 資金収支（日次）
    const dailyTax = Calcs.taxIncome(state) / 30;
    const dailyExpenses = Calcs.maintenance(state) / 30;
    const dailyProfit = dailyTax - dailyExpenses;

    c.incomeInfo.innerHTML = `
      <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
         <div class="text-sm text-yellow-500 font-bold mb-2">💰 財政収支 (日次)</div>
         <div class="text-xs text-gray-300 space-y-1">
           <div class="flex justify-between"><span>収入(税):</span> <span class="text-green-400">+${dailyTax.toFixed(1)}G/日</span></div>
           <div class="flex justify-between"><span>支出(軍):</span> <span class="text-red-400">-${dailyExpenses.toFixed(1)}G/日</span></div>
           <div class="border-t border-gray-600 my-1 pt-1 flex justify-between font-bold">
             <span>収支:</span> 
             <span class="${dailyProfit >= 0 ? 'text-green-400' : 'text-red-400'}">${dailyProfit >= 0 ? '+' : ''}${dailyProfit.toFixed(1)}G / 日</span>
           </div>
           <div class="text-gray-500 mt-1">※人口と満足度、税率(${Math.round(state.taxRate * 100)}%)に依存</div>
         </div>
      </div>
    `;

    // 建設済み
    if (state.buildings.length > 0) {
      const counts = {};
      state.buildings.forEach(b => {
        counts[b.name] = (counts[b.name] || 0) + 1;
      });
      const builtList = Object.entries(counts).map(([name, count]) => `${name}${count > 1 ? ' x' + count : ''}`).join(', ');

      c.builtArea.innerHTML = `
        <div class="mb-4 bg-green-900/30 p-2 rounded border border-green-800">
          <div class="text-xs text-green-400 mb-1">✓ 建設済み施設:</div>
          <div class="text-sm text-gray-300">${builtList}</div>
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

        <!-- 兵種編成 -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">部隊編成</div>
          <div class="text-xs text-gray-500 mb-2">※未割り当ての兵士を各兵種に配属できます</div>
          <div id="mil-formation" class="space-y-2"></div>
        </div>

        <div class="mb-4">
          <h3 class="text-sm font-bold text-yellow-400 mb-2">英雄・将軍</h3>
          <div id="hero-list" class="space-y-2">
            <div class="text-xs text-gray-500">英雄はイベントで雇用できます</div>
          </div>
        </div>

        <!-- 他国への侵攻 -->
        <h3 class="text-sm font-bold text-red-400 mb-2">作戦行動</h3>
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
      formation: document.getElementById('mil-formation'),
      heroList: document.getElementById('hero-list'),
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

    // 兵種編成UI更新
    const m = state.military;
    const infantry = m.infantry || 0;
    const archers = m.archers || 0;
    const cavalry = m.cavalry || 0;
    const assignedTotal = infantry + archers + cavalry;
    let unassigned = Math.max(0, m.totalSoldiers - assignedTotal);

    // 技術チェック
    // データ構造が変わったかもしれないので安全に取得
    const hasArchery = state.technologies.some(t => t.id === 'archery' && t.isResearched);
    const hasRiding = state.technologies.some(t => t.id === 'horse_riding' && t.isResearched);
    // 槍兵訓練は歩兵強化とするため編成要件ではないとするが、将来のためにチェック
    // const hasSpear = state.technologies.some(t => t.id === 'spear_training' && t.isResearched);

    const types = [
      { id: 'infantry', name: '歩兵', count: infantry, icon: '⚔️', desc: '対騎兵◎', enabled: true },
      { id: 'archers', name: '弓兵', count: archers, icon: '🏹', desc: '防衛◎', enabled: hasArchery, req: '弓術' },
      { id: 'cavalry', name: '騎兵', count: cavalry, icon: '🐎', desc: '野戦◎', enabled: hasRiding, req: '騎兵' }
    ];

    c.formation.innerHTML = `
      <div class="mb-2 text-xs text-center p-1 bg-gray-900 rounded">
        未割り当て: <span class="${unassigned > 0 ? 'text-green-400 font-bold' : 'text-gray-500'}">${unassigned}人</span>
      </div>
      ${types.map(t => `
        <div class="flex items-center justify-between p-2 bg-gray-900/50 rounded ${t.enabled ? '' : 'opacity-50'}">
          <div class="flex-1">
            <div class="text-sm font-bold text-gray-200">${t.icon} ${t.name}</div>
            <div class="text-[10px] text-gray-400">${t.desc}</div>
            ${!t.enabled ? `<div class="text-[10px] text-red-400">要: ${t.req}</div>` : ''}
          </div>
          <div class="flex items-center gap-1">
            <button onclick="window.game.ui.changeFormation('${t.id}', -10)" class="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded text-xs" ${t.count < 10 ? 'disabled' : ''}>-</button>
            <button onclick="window.game.ui.changeFormation('${t.id}', -1)" class="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded text-xs" ${t.count < 1 ? 'disabled' : ''}>-</button>
            <span class="w-10 text-center font-bold text-white">${t.count}</span>
            <button onclick="window.game.ui.changeFormation('${t.id}', 1)" class="w-6 h-6 bg-blue-700 hover:bg-blue-600 rounded text-xs" ${!t.enabled || unassigned < 1 ? 'disabled' : ''}>+</button>
            <button onclick="window.game.ui.changeFormation('${t.id}', 10)" class="w-6 h-6 bg-blue-700 hover:bg-blue-600 rounded text-xs" ${!t.enabled || unassigned < 10 ? 'disabled' : ''}>+</button>
          </div>
        </div>
      `).join('')}
    `;

    // 英雄リスト更新
    const heroes = state.heroes || [];
    if (heroes.length > 0) {
      c.heroList.innerHTML = heroes.map(h => `
            <div class="bg-gray-800 p-2 rounded border border-yellow-700">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-yellow-500">${h.name}</span>
                    <span class="text-xs text-gray-400">給与: ${h.salary}G</span>
                </div>
                <div class="text-xs text-gray-300 mt-1">戦闘力+${h.combatPower} / ${h.specialAbility.description}</div>
            </div>
        `).join('');
    } else {
      c.heroList.innerHTML = '<div class="text-xs text-gray-500">英雄はイベントで雇用できます</div>';
    }

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
              <span class="text-purple-300">残り ${r.remainingTime.toFixed(1)}秒</span>
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
    state.aiNations.forEach(nation => {
      const card = document.createElement('div');
      card.className = "bg-gray-800 p-3 rounded mb-2 border border-gray-700";
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-bold text-sm text-yellow-300 flex items-center gap-2">
              ${nation.name}
              <span class="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 status-badge" id="dip-status-${nation.id}"></span>
            </div>
            <div class="text-xs text-gray-400 mt-1">性格: ${nation.personality}</div>
            <div class="text-xs mt-1 relation-text" id="dip-relation-${nation.id}"></div>
          </div>
          <div class="flex flex-col gap-1 w-24">
            <div class="flex space-x-1 mt-2">
              <button class="btn-trade flex-1 px-2 py-1 rounded text-xs font-bold bg-blue-900 text-blue-200 border border-blue-700">貿易協定</button>
              <button class="btn-treaty flex-1 px-2 py-1 rounded text-xs font-bold bg-purple-900 text-purple-200 border border-purple-700">条約交渉</button>
            </div>
            <div class="flex space-x-1 mt-1">
              <button class="btn-spy flex-1 px-2 py-1 rounded text-xs font-bold bg-gray-700 text-gray-300 border border-gray-600">諜報</button>
              <button class="btn-war flex-1 px-2 py-1 rounded text-xs font-bold bg-red-900 text-red-200 border border-red-700">宣戦布告</button>
            </div>
          </div>
        </div>
      `;
      this.els.mainContent.querySelector('#dip-nations-list').appendChild(card);

      // イベント
      const btns = {
        trade: card.querySelector('.btn-trade'),
        treaty: card.querySelector('.btn-treaty'),
        spy: card.querySelector('.btn-spy'),
        war: card.querySelector('.btn-war')
      };

      btns.trade.onclick = () => this.engine.processDiplomaticAction(nation);
      btns.treaty.onclick = () => this.showTreatyModal(nation);
      btns.spy.onclick = () => this.showSpyModal(nation); // Assuming showSpyModal will be implemented or triggerEspionage will be renamed
      btns.war.onclick = () => this.engine.declareWar(nation);

      nationCache[nation.id] = {
        status: card.querySelector('.status-badge'),
        relation: card.querySelector('.relation-text'),
        btns: btns
      };
    });
    this.domCache.diplomacy = {
      reputation: document.getElementById('dip-reputation'),
      repText: document.getElementById('dip-rep-text'),
      nations: nationCache
    };
  }

  // 諜報メニュー表示
  triggerEspionage(nationId) {
    const nation = this.engine.state.aiNations.find(n => n.id === nationId);
    if (!nation) return;

    this.showEventModal({
      title: `${nation.name}への諜報活動`,
      description: '実行する作戦を選択してください。',
      choices: [
        {
          text: 'スパイ派遣 (500G)',
          description: '軍事・経済情報を収集します (成功率:高)',
          effect: () => this.engine.executeEspionage('spy', nationId)
        },
        {
          text: '破壊工作 (1000G)',
          description: '軍事施設を妨害し戦力を低下させます (成功率:中)',
          effect: () => this.engine.executeEspionage('sabotage', nationId)
        },
        {
          text: '流言飛語 (800G)',
          description: '国内を混乱させ外交・軍事行動を封じます (成功率:中)',
          effect: () => this.engine.executeEspionage('rumor', nationId)
        },
        {
          text: '中止',
          description: '何もせず戻ります',
          effect: () => { }
        }
      ]
    }, (idx) => {
      // 選択後のコールバック（ログはengine側で出る）
      const choices = [
        () => this.engine.executeEspionage('spy', nationId),
        () => this.engine.executeEspionage('sabotage', nationId),
        () => this.engine.executeEspionage('rumor', nationId),
        () => { }
      ];
      if (choices[idx]) choices[idx]();
    });
  }
  // 不要なコードを削除し、updateDiplomacyTabを実装


  updateDiplomacyTab(state) {
    const c = this.domCache.diplomacy;
    if (!c) return;

    // 評判更新
    const rep = state.reputation || 0;
    c.reputation.textContent = rep;
    c.reputation.className = `text-2xl font-bold ${rep > 20 ? 'text-green-400' : rep < -20 ? 'text-red-400' : 'text-yellow-400'}`;

    // 評判ランク判定
    let repLabel = '普通';
    const R = this.engine.CONSTANTS.REPUTATION;
    if (rep >= R.LEGEND) repLabel = '伝説の英雄';
    else if (rep >= R.GREAT) repLabel = '名君';
    else if (rep >= R.NORMAL) repLabel = '普通';
    else if (rep >= R.NEUTRAL) repLabel = '無名';
    else if (rep >= R.BAD) repLabel = '悪評';
    else if (rep >= R.TYRANT) repLabel = '暴君';
    else repLabel = '大悪党';
    c.repText.textContent = repLabel;

    state.aiNations.forEach(nation => {
      const nc = c.nations[nation.id];
      if (!nc) return;

      if (nation.isDefeated) {
        nc.status.parentElement.parentElement.parentElement.parentElement.className = "bg-gray-800 p-3 rounded mb-2 border border-gray-700 opacity-50";
        nc.status.textContent = '征服済み';
        nc.status.className = "text-xs px-1.5 py-0.5 rounded bg-gray-800 text-red-500 border border-red-900";
        nc.btns.trade.style.display = 'none';
        nc.btns.spy.style.display = 'none';
        nc.btns.war.style.display = 'none';
        return;
      }

      nc.relation.textContent = `友好度: ${Math.floor(nation.relationWithPlayer)}`;
      const relColor = nation.relationWithPlayer > 20 ? 'text-green-400' :
        nation.relationWithPlayer < -20 ? 'text-red-400' : 'text-yellow-400';
      nc.relation.className = `text-xs mt-1 ${relColor}`;

      // 貿易ボタン
      const hasTrade = nation.treaties.some(t => t.type === 'trade');
      if (hasTrade) {
        nc.btns.trade.disabled = true;
        nc.btns.trade.textContent = '協定済';
        nc.btns.trade.className = "w-full text-xs font-bold bg-gray-700 text-green-500 border border-green-700 cursor-not-allowed";
      } else {
        const canAffordTrade = state.resources.gold >= 200; // 仮コスト
        nc.btns.trade.disabled = !canAffordTrade;
        nc.btns.trade.textContent = '貿易協定';
        nc.btns.trade.className = `w-full text-xs font-bold ${canAffordTrade ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`;
      }

      // 戦争状態更新
      if (nation.isAtWar) {
        nc.status.textContent = '戦争中';
        nc.status.className = "text-xs px-1.5 py-0.5 rounded bg-red-900 text-red-200";
        nc.btns.trade.style.display = 'none';
        nc.btns.treaty.style.display = 'none'; // 戦時中は条約不可
        nc.btns.war.style.display = 'none';
      } else {
        nc.status.textContent = '平和';
        nc.status.className = "text-xs px-1.5 py-0.5 rounded bg-gray-700 text-green-400";
        nc.btns.war.style.display = 'block';
        nc.btns.treaty.style.display = 'block';
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

  // --- 情報タブ ---
  initInfoTab() {
    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-3 border-b border-gray-700 pb-2">国家情報</h2>
        
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <h3 class="text-sm font-bold text-gray-400 mb-2">統計情報</h3>
          <div id="info-stats" class="space-y-1 text-sm"></div>
        </div>

        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <h3 class="text-sm font-bold text-gray-400 mb-2">勝利条件状況</h3>
          <div id="info-victory" class="space-y-2 text-sm"></div>
        </div>

        <div class="mb-4">
          <button id="btn-save" class="w-full mb-2 bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">手動セーブ</button>
          <button id="btn-load" class="w-full mb-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">手動ロード</button>
          <button id="btn-newgame" class="w-full bg-red-900/50 hover:bg-red-800 text-white font-bold py-2 px-4 rounded border border-red-700">NEW GAME（停止してから行ってください）</button>
        </div>
        
        <div class="text-center text-xs text-gray-600 mt-8">
          AXINODE v1.0.0
        </div>
      </div>
    `;

    this.domCache.info = {
      stats: document.getElementById('info-stats'),
      victory: document.getElementById('info-victory')
    };

    // ボタンイベントの設定
    document.getElementById('btn-save').onclick = () => this.triggerSave();
    document.getElementById('btn-load').onclick = () => this.triggerLoad();
    document.getElementById('btn-newgame').onclick = () => this.triggerNewGame();
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

  // --- イベントハンドラ ---
  triggerSave() {
    if (this.engine.saveGame()) {
      this.showToast('セーブしました', 'success');
    } else {
      this.showToast('セーブできませんでした', 'error');
    }
  }

  triggerLoad() {
    if (this.engine.loadGame()) {
      this.showToast('ロードしました', 'success');
      // 描画更新
      this.renderedTab = null;
      this.render(this.engine.state);
    } else {
      this.showToast('ロード失敗またはデータなし', 'error');
    }
  }
  triggerNewGame() {
    if (confirm('現在のデータを削除して最初から始めますか？')) {
      // 進行中の処理と競合しないよう、まずゲームを停止させる
      this.engine.state.isPaused = true;
      // ニューゲーム処理中フラグを立てる（unload時のセーブ防止）
      window.isNewGameProcessing = true;

      // 念には念を入れて、削除 -> 初期化 -> 保存 -> リロードを行う
      this.engine.deleteSave();
      this.engine.newGame(); // ここで初期化
      this.engine.saveGame(); // 明示的に初期状態を保存

      this.showToast('データを初期化しています...', 'important');

      // 書き込み完了を確実に待つために少し遅延させる
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
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
          <button onclick="window.game.engine.deleteSave(); window.game.engine.newGame(); window.game.ui.renderedTab=null;" class="px-6 py-3 rounded font-bold bg-blue-600 hover:bg-blue-500 text-white">
            🔄 ニューゲーム
          </button>
        </div>
      </div>
    `;
  }

  // --- イベントモーダル ---
  showEventModal(event, onChoice) {
    const existing = document.getElementById('event-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'event-modal';
    modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-[100] animate-fade-in';

    // 選択肢ボタンの生成
    const choicesHtml = event.choices.map((choice, index) => {
      // コストチェック（簡易版: engine側で判定した結果を受け取るのが理想だが、ここでは表示のみ）
      // 実際はonChoiceでインデックスを返し、エンジン側で処理する
      return `
        <button data-index="${index}" class="w-full text-left p-4 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-purple-500 transition-colors group">
          <div class="font-bold text-white group-hover:text-purple-300">▶ ${choice.text}</div>
          ${choice.description ? `<div class="text-xs text-gray-400 mt-1 pl-4">${choice.description}</div>` : ''}
        </button>
      `;
    }).join('');

    modal.innerHTML = `
      <div class="bg-gray-800 rounded-xl p-6 max-w-md w-full border-2 border-purple-500 shadow-2xl relative overflow-hidden">
        <!-- 背景装飾 -->
        <div class="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <span class="text-9xl">📜</span>
        </div>

        <div class="relative z-10">
          <h3 class="text-2xl font-bold text-center text-purple-300 mb-2 border-b border-gray-700 pb-4">${event.title}</h3>
          
          <div class="min-h-[100px] flex items-center justify-center my-4 text-gray-200 leading-relaxed text-sm">
            ${event.description}
          </div>

          <div class="space-y-3 mt-6">
            ${choicesHtml}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベントハンドラ登録
    modal.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        const index = parseInt(btn.dataset.index);
        this.closeEventModal();
        onChoice(index);
      };
    });
  }

  showTreatyModal(nation) {
    this.showEventModal({
      title: `${nation.name}との条約交渉`,
      description: `現在の友好度: ${Math.floor(nation.relationWithPlayer)}\n条約を提案しますか？`,
      choices: [
        {
          text: '不可侵条約 (500G)',
          description: '1年間、相互不可侵を約束します (必要友好度: 20)',
          effect: () => this.engine.signTreaty(nation.id, 'non_aggression')
        },
        {
          text: '軍事同盟 (2000G)',
          description: '2年間、強固な同盟を結びます (必要友好度: 60)',
          effect: () => this.engine.signTreaty(nation.id, 'alliance')
        },
        {
          text: 'キャンセル',
          effect: () => { }
        }
      ]
    });
  }

  showSpyModal(nation) {
    this.showEventModal({
      title: `${nation.name}への諜報活動`,
      description: `対象国家: ${nation.name}\n諜報活動を行いますか？`,
      choices: [
        {
          text: '情報収集 (500G)',
          description: '戦力や経済状況を調査します (成功率: 高)',
          effect: () => this.handleEspionage(nation.id, 'spy')
        },
        {
          text: '破壊工作 (1000G)',
          description: '軍事施設を妨害し戦力を削ぎます (成功率: 中)',
          effect: () => this.handleEspionage(nation.id, 'sabotage')
        },
        {
          text: '流言の流布 (800G)',
          description: '国内を混乱させます (成功率: 中)',
          effect: () => this.handleEspionage(nation.id, 'rumor')
        },
        {
          text: 'キャンセル',
          effect: () => { }
        }
      ]
    });
  }

  handleEspionage(nationId, type) {
    const result = this.engine.executeEspionage(type, nationId);
    if (result.success) {
      if (result.message) {
        this.showEventModal({
          title: '報告',
          description: result.message,
          choices: [{ text: '閉じる', effect: () => { } }]
        });
      } else {
        this.showToast('作戦が成功しました', 'success');
      }
    } else {
      this.showToast(result.message || '作戦に失敗しました', 'error');
    }
  }

  closeEventModal() {
    const modal = document.getElementById('event-modal');
    if (modal) {
      modal.remove();
    }
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
      // 周回ボーナス選択へ
      this.showPrestigeModal();
    });
  }

  showPrestigeModal(onComplete = null) {
    const prestige = this.engine.getPrestige();
    const costs = this.engine.CONSTANTS.PRESTIGE_COSTS;

    // モーダル作成
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-[210] animate-fade-in';

    modal.innerHTML = `
      <div class="bg-gray-800 rounded-xl p-6 m-4 max-w-md w-full border-2 border-yellow-500 shadow-2xl relative">
        <h3 class="text-2xl font-bold text-center text-yellow-300 mb-2 border-b border-gray-700 pb-4">
           New Game +
        </h3>
        <div class="text-center mb-4">
           <div class="text-gray-400 text-sm">現在の周回ポイント</div>
           <div class="text-3xl font-bold text-yellow-500" id="current-prestige">${prestige} pt</div>
        </div>
        
        <div class="space-y-3 mb-6 bg-gray-900/50 p-4 rounded max-h-[300px] overflow-y-auto">
           ${Object.entries(costs).map(([key, cost]) => `
             <label class="flex justify-between items-center p-2 rounded hover:bg-gray-700 cursor-pointer border border-gray-700">
               <div class="flex items-center gap-3">
                 <input type="checkbox" value="${key}" data-cost="${cost}" class="w-4 h-4 rounded border-gray-500 bg-gray-700 text-yellow-500 focus:ring-yellow-500 prestige-check">
                 <span class="text-sm font-bold text-gray-200">${this.getBonusName(key)}</span>
               </div>
               <span class="text-xs text-yellow-500 font-mono">${cost}pt</span>
             </label>
           `).join('')}
        </div>

        <div class="flex flex-col gap-2">
           <div class="flex justify-between text-sm text-gray-400 px-2">
             <span>合計コスト:</span>
             <span id="total-cost" class="text-white">0 pt</span>
           </div>
           <button id="start-new-game-btn" class="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded shadow-lg transform active:scale-95 transition-all">
             この設定で開始
           </button>
           <button id="cancel-new-game-btn" class="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded text-sm">
             キャンセル
           </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // イベント処理
    const checks = modal.querySelectorAll('.prestige-check');
    const totalDisplay = modal.querySelector('#total-cost');
    const currentDisplay = modal.querySelector('#current-prestige');
    const startBtn = modal.querySelector('#start-new-game-btn');

    const update = () => {
      let total = 0;
      checks.forEach(c => {
        if (c.checked) total += parseInt(c.dataset.cost);
      });
      totalDisplay.textContent = `${total} pt`;

      const remaining = prestige - total;
      currentDisplay.textContent = `${remaining} pt`;

      if (remaining < 0) {
        currentDisplay.classList.add('text-red-500');
        currentDisplay.classList.remove('text-yellow-500');
        startBtn.disabled = true;
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        currentDisplay.classList.remove('text-red-500');
        currentDisplay.classList.add('text-yellow-500');
        startBtn.disabled = false;
        startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    };

    checks.forEach(c => c.onchange = update);

    modal.querySelector('#cancel-new-game-btn').onclick = () => modal.remove();

    startBtn.onclick = () => {
      const bonuses = {};
      checks.forEach(c => {
        if (c.checked) bonuses[c.value] = true;
      });

      const totalCost = Array.from(checks).filter(c => c.checked).reduce((sum, c) => sum + parseInt(c.dataset.cost), 0);
      this.engine.savePrestige(-totalCost); // ポイント消費

      modal.remove();
      this.engine.state.isPaused = true;
      window.isNewGameProcessing = true;

      // newGame自体は呼び出さず、エンジン側で処理させるか、コールバックで処理する
      this.engine.newGame(bonuses);

      if (onComplete) {
        onComplete();
      } else {
        this.showToast('データを初期化しています...', 'important');
        setTimeout(() => window.location.reload(), 500);
      }
    };
  }

  showHomeScreen() {
    this.els.mainContent.innerHTML = '';
    // 全画面オーバーレイ
    const container = document.createElement('div');
    container.className = 'fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black animate-fade-in';
    container.style.backgroundImage = 'url("assets/title_bg.png")';
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';

    container.innerHTML = `
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative z-10 flex flex-col items-center">
        <h1 class="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-8 drop-shadow-lg text-center leading-tight" style="font-family: serif; text-shadow: 0 4px 10px rgba(0,0,0,0.8);">
          AXINODE<br>
          <span class="text-2xl md:text-3xl text-gray-300 tracking-[0.3em] font-light">STRATEGY OF KINGS</span>
        </h1>
        
        <div class="space-y-4 w-72 mt-8">
           ${this.engine.hasSaveData() ? `
             <button id="home-continue-btn" class="w-full py-3.5 bg-blue-900/80 hover:bg-blue-800 text-blue-100 font-bold rounded border border-blue-500 backdrop-blur-sm transition-all transform hover:scale-105 shadow-xl">
               つづきから
             </button>
           ` : ''}
           <button id="home-newgame-btn" class="w-full py-3.5 bg-yellow-900/80 hover:bg-yellow-800 text-yellow-100 font-bold rounded border border-yellow-500 backdrop-blur-sm transition-all transform hover:scale-105 shadow-xl">
             はじめから
           </button>
        </div>
        
        <div class="mt-20 text-xs text-gray-500 text-center">
           AXINODE Project ver 1.0.0<br>
           Powered by Gemini 2.0
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const btnNew = container.querySelector('#home-newgame-btn');
    const btnCont = container.querySelector('#home-continue-btn');

    if (btnCont) {
      btnCont.onclick = () => {
        if (this.engine.loadGame()) {
          container.style.transition = 'opacity 1s';
          container.style.opacity = '0';
          setTimeout(() => {
            container.remove();
            this.engine.startGameLoop();
            this.engine.startAutosave(); // オートセーブ開始
            console.log("オートセーブを有効化しました（1分間隔）");
            this.initTabMenu(); // タブメニュー初期化（main.jsでやってないならここ）
            const initialBtn = this.els.tabMenu.querySelector(`[data-tab="domestic"]`); // load処理でrenderされるがタブ選択が必要
            if (initialBtn) initialBtn.click();
            this.showToast('ゲームを再開します', 'success');
          }, 1000);
        } else {
          this.showToast('セーブデータのロードに失敗しました', 'error');
        }
      };
    }

    btnNew.onclick = () => {
      // 周回ボーナス選択画面へ
      // onCompleteコールバックで画面を閉じてゲーム開始
      this.showPrestigeModal(() => {
        container.style.transition = 'opacity 1s';
        container.style.opacity = '0';
        setTimeout(() => {
          container.remove();
          this.engine.startGameLoop();
          this.engine.startAutosave(); // オートセーブ開始
          console.log("オートセーブを有効化しました");
          this.initTabMenu();
          // initTabMenu内でdomesticクリックされる
          this.engine.addLog('新たな治世が始まりました', 'important');
        }, 1000);
      });
    };
  }

  getBonusName(key) {
    const names = {
      initial_gold_500: '初期資金 +500G',
      initial_gold_1000: '初期資金 +1000G',
      initial_pop_5: '初期人口 +5人',
      initial_soldier_10: '初期兵士 +10人',
      research_speed_20: '研究速度 +20% (未実装)',
      hero_rate_10: '英雄出現率 +10% (未実装)',
    };
    return names[key] || key;
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
  // --- 兵種編成 ---
  changeFormation(type, amount) {
    const state = this.engine.state;
    const m = state.military;

    // 現在値
    const current = m[type] || 0;

    // 減らす場合
    if (amount < 0) {
      if (current + amount < 0) return; // 足りない
      m[type] = current + amount;
      this.render(state);
      return;
    }

    // 増やす場合
    const infantry = m.infantry || 0;
    const archers = m.archers || 0;
    const cavalry = m.cavalry || 0;
    const assignedTotal = infantry + archers + cavalry;
    const unassigned = Math.max(0, m.totalSoldiers - assignedTotal);

    if (unassigned >= amount) {
      m[type] = (m[type] || 0) + amount;
      this.render(state);
    } else {
      this.showToast('割り当て可能な兵士がいません', 'error');
    }
  }
}
