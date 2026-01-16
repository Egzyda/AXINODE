/* ui.js - 画面描画とイベントハンドリング (Refactored) */
import { BUILDINGS, TECHNOLOGIES } from './data.js';

// ログタイプに応じた色とアイコン
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

    // DOM要素のキャッシュ
    this.domCache = {
      statusBar: null,
      domestic: null,
      technology: null,
      diplomacy: null,
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

  // --- メイン描画ループ ---
  render(state) {
    this.renderStatusBar(state);
    this.renderMainContent(state);
    this.renderLog(state);
  }

  // 1. ステータスバーの描画
  renderStatusBar(state) {
    if (!this.domCache.statusBar) {
      this.initStatusBar();
    }
    this.updateStatusBar(state);
  }

  initStatusBar() {
    this.els.statusBar.innerHTML = `
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <div class="flex items-center gap-1">
          <span>👑</span><span class="text-gray-400 text-xs">人口:</span>
          <span id="sb-population" class="font-medium text-white">0</span>
        </div>
        <div class="flex items-center gap-1">
          <span>💰</span><span class="text-gray-400 text-xs">資金:</span>
          <span id="sb-gold" class="font-medium">0G</span>
        </div>
        <div class="flex items-center gap-1">
          <span>🌾</span><span class="text-gray-400 text-xs">食糧:</span>
          <span id="sb-food" class="font-medium">0</span>
        </div>
        <div class="flex items-center gap-1">
          <span>😊</span><span class="text-gray-400 text-xs">満足:</span>
          <span id="sb-satisfaction" class="font-medium">0%</span>
        </div>
      </div>
      
      <div class="flex items-center justify-between mt-1">
        <div class="flex items-center gap-2 text-sm">
          <span>⏱️</span><span id="sb-day" class="font-medium text-white">1日目</span>
          <span id="sb-status" class="text-xs text-gray-500"></span>
        </div>
        <div class="flex gap-1">
           <button id="btn-pause" class="px-2 py-0.5 rounded text-xs text-white">
             
           </button>
           <button id="btn-speed" class="px-2 py-0.5 rounded text-xs bg-gray-700 text-white">
             x1
           </button>
           <button id="btn-save" class="px-2 py-0.5 rounded text-xs bg-blue-600 text-white">
             💾
           </button>
        </div>
      </div>
    `;

    this.domCache.statusBar = {
      population: document.getElementById('sb-population'),
      gold: document.getElementById('sb-gold'),
      food: document.getElementById('sb-food'),
      satisfaction: document.getElementById('sb-satisfaction'),
      day: document.getElementById('sb-day'),
      status: document.getElementById('sb-status'),
      btnPause: document.getElementById('btn-pause'),
      btnSpeed: document.getElementById('btn-speed'),
      btnSave: document.getElementById('btn-save'),
    };

    // イベント設定（一度だけ）
    this.domCache.statusBar.btnPause.onclick = () => this.engine.togglePause();
    this.domCache.statusBar.btnSpeed.onclick = () => {
      const speeds = [1, 2, 5, 10, 20];
      const nextIdx = (speeds.indexOf(this.engine.state.gameSpeed) + 1) % speeds.length;
      this.engine.setSpeed(speeds[nextIdx]);
    };
    this.domCache.statusBar.btnSave.onclick = () => this.engine.saveGame();
  }

  updateStatusBar(state) {
    const el = this.domCache.statusBar;

    // 数値更新
    el.population.textContent = state.population.total;
    el.gold.textContent = `${Math.floor(state.resources.gold)}G`;
    el.food.textContent = Math.floor(state.resources.food);
    el.satisfaction.textContent = `${state.satisfaction}%`;
    // 時間計算 (HH:MM)
    const totalHours = (state.day % 1) * 24;
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours % 1) * 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    el.day.textContent = `${Math.floor(state.day)}日目 ${timeStr}`;
    el.status.textContent = state.isPaused ? '(停止中)' : '進行中';

    // クラス/スタイル更新
    el.gold.className = `font-medium ${state.resources.gold < 0 ? 'text-red-400' : 'text-yellow-400'}`;
    el.food.className = `font-medium ${state.resources.food < 10 ? 'text-red-400' : 'text-green-400'}`;

    const satColor = state.satisfaction < 40 ? 'text-red-400' :
      state.satisfaction < 70 ? 'text-yellow-400' : 'text-green-400';
    el.satisfaction.className = `font-medium ${satColor}`;

    // ボタン更新
    el.btnPause.textContent = state.isPaused ? '▶️ 再開' : '⏸️ 停止';
    el.btnPause.className = `px-2 py-0.5 rounded text-xs ${state.isPaused ? 'bg-green-600' : 'bg-yellow-600'} text-white`;

    el.btnSpeed.textContent = `x${state.gameSpeed}`;
  }


  // 2. メインコンテンツ（タブの中身）の描画
  renderMainContent(state) {
    // タブが変わった場合のみ初期化
    if (this.renderedTab !== this.activeTab) {
      this.els.mainContent.innerHTML = '';
      this.domCache.domestic = null;
      this.domCache.technology = null;
      this.domCache.diplomacy = null;
      this.domCache.info = null;

      switch (this.activeTab) {
        case 'domestic':
          this.initDomesticTab();
          break;
        case 'technology':
          this.initTechnologyTab(state);
          break;
        case 'diplomacy':
          this.initDiplomacyTab(state);
          break;
        case 'info':
          this.initInfoTab();
          break;
        default:
          this.els.mainContent.innerHTML = `
            <div class="p-8 text-center text-gray-500">
              <p class="text-xl mb-2">🚧 工事中</p>
              <p>「${this.activeTab}」タブはまだ実装されていません。</p>
            </div>`;
      }
      this.renderedTab = this.activeTab;
    }

    // 更新処理
    switch (this.activeTab) {
      case 'domestic':
        this.updateDomesticTab(state);
        break;
      case 'technology':
        this.updateTechnologyTab(state);
        break;
      case 'diplomacy':
        this.updateDiplomacyTab(state);
        break;
      case 'info':
        this.updateInfoTab(state);
        break;
    }
  }

  // --- 内政タブ (Domestic) ---
  initDomesticTab() {
    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full" id="domestic-container">
        <h2 class="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">内政管理</h2>
        
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">現在の人口構成</div>
          <div class="grid grid-cols-3 gap-2 text-xs" id="dom-pop-list">
             <!-- JSで更新 -->
          </div>
        </div>

        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">資源状況</div>
          <div class="grid grid-cols-3 gap-2 text-xs" id="dom-res-list">
             <!-- JSで更新 -->
          </div>
        </div>

        <div id="dom-built-area"></div>
        <div id="dom-queue-area"></div>

        <h3 class="text-sm font-bold text-gray-400 mb-2">施設建設</h3>
        <div id="dom-building-list"></div>
      </div>
    `;

    // 建物リスト生成
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
        <button id="bld-btn-${b.id}" class="px-3 py-1.5 rounded text-xs font-bold bg-gray-700 text-gray-500">
          建設
        </button>
      `;
      listContainer.appendChild(row);

      // イベント
      const btn = row.querySelector(`#bld-btn-${b.id}`);
      btn.onclick = () => this.triggerBuild(b.id);

      // キャッシュ
      buildingRows[b.id] = {
        row: row,
        name: row.querySelector(`#bld-name-${b.id}`),
        cost: row.querySelector(`#bld-cost-${b.id}`),
        btn: btn
      };
    });

    this.domCache.domestic = {
      popList: document.getElementById('dom-pop-list'),
      resList: document.getElementById('dom-res-list'),
      builtArea: document.getElementById('dom-built-area'),
      queueArea: document.getElementById('dom-queue-area'),
      buildingRows: buildingRows
    };
  }

  updateDomesticTab(state) {
    const c = this.domCache.domestic;
    if (!c) return;

    // 人口
    c.popList.innerHTML = `
      <span>👨‍🌾 農民: ${state.population.farmers}</span>
      <span>⛏️ 鉱夫: ${state.population.miners}</span>
      <span>🔧 職人: ${state.population.craftsmen}</span>
      <span>⚔️ 兵士: ${state.population.soldiers}</span>
      <span>🤷 無職: ${state.population.unemployed}</span>
    `;

    // 資源
    c.resList.innerHTML = `
      <span class="text-yellow-400">💰 ${Math.floor(state.resources.gold)}G</span>
      <span class="text-green-400">🌾 ${Math.floor(state.resources.food)}</span>
      <span class="text-orange-400">⚫ ${Math.floor(state.resources.ore)}</span>
      <span class="text-purple-400">✨ ${Math.floor(state.resources.mana)}</span>
      <span class="text-red-400">🗡️ ${Math.floor(state.resources.weapons)}</span>
      <span class="text-blue-400">🛡️ ${Math.floor(state.resources.armor)}</span>
    `;

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

      // 不透明度
      rowCache.row.className = `bg-gray-800 p-3 rounded mb-2 border border-gray-700 flex justify-between items-center ${canBuild ? 'opacity-100' : 'opacity-50'}`;

      // コストテキスト
      const costText = b.cost.ore
        ? `💰 ${b.cost.gold}G ⚫ ${b.cost.ore}鉱石`
        : `💰 ${b.cost.gold}G`;

      // 状態テキスト
      let statusText = '';
      if (!hasPrereq) statusText = ' (前提未達成)';
      else if (atMaxCount) statusText = ' (上限)';
      else if (isBuilding) statusText = ' (建設中)';

      rowCache.name.textContent = `${b.name}${statusText}`;
      rowCache.cost.innerHTML = `${costText} <span class="text-gray-500">⏳ ${b.buildTime}s</span>`;

      // ボタン状態
      rowCache.btn.className = `px-3 py-1.5 rounded text-xs font-bold ${canBuild ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`;
      rowCache.btn.disabled = !canBuild;
    });
  }

  // --- 技術タブ (Technology) ---
  initTechnologyTab(state) {
    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full" id="tech-container">
        <h2 class="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">技術研究</h2>
        <div id="tech-queue-area"></div>
        <div id="tech-researched-area"></div>
        <div id="tech-list-area"></div>
      </div>
    `;

    // カテゴリごとにグループ化してリスト生成
    const categories = {};
    state.technologies.forEach(tech => {
      if (!categories[tech.category]) {
        categories[tech.category] = [];
      }
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
        // 初期スタイル
        card.innerHTML = `
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="font-bold text-sm text-purple-300 flex items-center gap-2">
                ${tech.name}
                <span class="text-xs text-gray-500">Tier ${tech.tier}</span>
              </div>
              <div class="text-xs text-gray-400 mt-1">${tech.description}</div>
              <div class="text-xs mt-1" id="tech-cost-${tech.id}"></div>
              <div class="text-xs mt-1 text-gray-500" id="tech-status-${tech.id}"></div>
            </div>
            <button id="tech-btn-${tech.id}" class="px-3 py-1.5 rounded text-xs font-bold bg-gray-700 text-gray-500">
               研究
            </button>
          </div>
        `;
        catList.appendChild(card);

        // イベント
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

    // キュー更新
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

    // 研究済み更新
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

    // 各カード更新
    state.technologies.forEach(tech => {
      const cardCache = c.techCards[tech.id];
      if (!cardCache) return;

      const isResearched = tech.isResearched;
      const isResearching = state.researchQueue.some(r => r.techId === tech.id);

      // 前提条件
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
      let statusClass = 'border-gray-700 bg-gray-800'; // Default
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

      const costText = tech.cost.mana
        ? `💰 ${tech.cost.gold}G ✨ ${tech.cost.mana}魔力`
        : `💰 ${tech.cost.gold}G`;
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

  // --- 外交タブ (Diplomacy) ---
  initDiplomacyTab(state) {
    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">外交</h2>
        
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
              <div class="font-bold text-blue-300">${nation.name}</div>
              <div class="text-xs text-gray-400">${nation.description}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500">性格</div>
              <div class="text-sm text-gray-300">${PERSONALITY_NAMES[nation.personality] || nation.personality}</div>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs mb-2">
            <div><span class="text-gray-500">人口:</span> <span id="n-${nation.id}-pop" class="text-white"></span></div>
            <div><span class="text-gray-500">軍事力:</span> <span id="n-${nation.id}-mil" class="text-orange-400"></span></div>
            <div><span class="text-gray-500">関係:</span> <span id="n-${nation.id}-rel"></span></div>
        </div>
        <div id="n-${nation.id}-status" class="text-xs text-green-400 mb-2"></div>
        <div class="flex gap-2">
            <button id="n-${nation.id}-btn-trade" class="flex-1 px-3 py-1.5 rounded text-xs font-bold bg-gray-700"></button>
            <button class="px-3 py-1.5 rounded text-xs font-bold bg-gray-700 text-gray-500 cursor-not-allowed" disabled>不可侵条約</button>
        </div>
      `;
      list.appendChild(card);

      const btnTrade = card.querySelector(`#n-${nation.id}-btn-trade`);
      btnTrade.onclick = () => this.triggerTradeAgreement(nation.id);

      nationCache[nation.id] = {
        pop: card.querySelector(`#n-${nation.id}-pop`),
        mil: card.querySelector(`#n-${nation.id}-mil`),
        rel: card.querySelector(`#n-${nation.id}-rel`),
        status: card.querySelector(`#n-${nation.id}-status`),
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

    // 評判
    c.reputation.textContent = state.reputation;
    const repColor = state.reputation > 20 ? 'text-green-400' : state.reputation < -20 ? 'text-red-400' : 'text-yellow-400';
    c.reputation.className = `text-2xl font-bold ${repColor}`;
    c.repText.textContent = state.reputation >= 50 ? '名君' : state.reputation >= 0 ? '普通' : '悪評';

    // 国家リスト
    state.aiNations.forEach(nation => {
      const nc = c.nations[nation.id];
      if (!nc) return;

      nc.pop.textContent = nation.population;
      nc.mil.textContent = nation.militaryPower;
      nc.rel.textContent = Math.floor(nation.relationWithPlayer);

      const relColor = nation.relationWithPlayer > 20 ? 'text-green-400' :
        nation.relationWithPlayer < -20 ? 'text-red-400' : 'text-yellow-400';
      nc.rel.className = relColor;

      // 貿易状態
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

  // --- 情報タブ (Info) ---
  initInfoTab() {
    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">情報・設定</h2>
        
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
           <div class="text-sm text-gray-300 mb-2">📊 ゲーム統計</div>
           <div id="info-stats" class="grid grid-cols-2 gap-2 text-xs"></div>
        </div>

        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
           <div class="text-sm text-gray-300 mb-2">📦 リソース詳細</div>
           <div id="info-resources" class="grid grid-cols-2 gap-2 text-xs"></div>
        </div>

        <!-- セーブ・ロード (これらは静的でよい) -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-3">💾 セーブ・ロード</div>
          <div class="space-y-2">
            <button id="btn-manual-save" class="w-full px-4 py-2 rounded text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white">💾 手動セーブ</button>
            <button id="btn-manual-load" class="w-full px-4 py-2 rounded text-sm font-bold bg-green-600 hover:bg-green-500 text-white">📂 ロード</button>
            <button id="btn-new-game" class="w-full px-4 py-2 rounded text-sm font-bold bg-red-600 hover:bg-red-500 text-white">🔄 ニューゲーム</button>
          </div>
          <div class="text-xs text-gray-500 mt-2">※ オートセーブは1分ごとに自動実行されます</div>
        </div>
      </div>
    `;

    document.getElementById('btn-manual-save').onclick = () => this.triggerSave();
    document.getElementById('btn-manual-load').onclick = () => this.triggerLoad();
    document.getElementById('btn-new-game').onclick = () => this.triggerNewGame();

    this.domCache.info = {
      stats: document.getElementById('info-stats'),
      resources: document.getElementById('info-resources')
    };
  }

  updateInfoTab(state) {
    const c = this.domCache.info;
    if (!c) return;

    const researchedCount = state.technologies.filter(t => t.isResearched).length;
    const totalTechs = state.technologies.length;
    const buildingsCount = state.buildings.length;
    const tradeCount = state.aiNations.reduce((sum, n) =>
      sum + n.treaties.filter(t => t.type === 'trade').length, 0);

    c.stats.innerHTML = `
      <div><span class="text-gray-500">経過日数:</span> <span class="text-white ml-1">${Math.floor(state.day)}日</span></div>
      <div><span class="text-gray-500">総人口:</span> <span class="text-white ml-1">${state.population.total}人</span></div>
      <div><span class="text-gray-500">研究済み技術:</span> <span class="text-purple-400 ml-1">${researchedCount}/${totalTechs}</span></div>
      <div><span class="text-gray-500">建設済み施設:</span> <span class="text-blue-400 ml-1">${buildingsCount}件</span></div>
      <div><span class="text-gray-500">貿易協定数:</span> <span class="text-green-400 ml-1">${tradeCount}件</span></div>
      <div><span class="text-gray-500">評判:</span> <span class="${state.reputation >= 0 ? 'text-green-400' : 'text-red-400'} ml-1">${state.reputation}</span></div>
    `;

    c.resources.innerHTML = `
      <div class="flex justify-between"><span class="text-yellow-400">💰 資金:</span><span class="text-white">${Math.floor(state.resources.gold)}G</span></div>
      <div class="flex justify-between"><span class="text-green-400">🌾 食糧:</span><span class="text-white">${Math.floor(state.resources.food)}</span></div>
      <div class="flex justify-between"><span class="text-orange-400">⚫ 鉱石:</span><span class="text-white">${Math.floor(state.resources.ore)}</span></div>
      <div class="flex justify-between"><span class="text-purple-400">✨ 魔力:</span><span class="text-white">${Math.floor(state.resources.mana)}</span></div>
      <div class="flex justify-between"><span class="text-red-400">🗡️ 武器:</span><span class="text-white">${Math.floor(state.resources.weapons)}</span></div>
      <div class="flex justify-between"><span class="text-blue-400">🛡️ 鎧:</span><span class="text-white">${Math.floor(state.resources.armor)}</span></div>
    `;
  }

  // --- 共通・ヘルパー ---

  renderLog(state) {
    // ログの差分更新（簡易版：ID比較）
    if (state.eventLog.length === 0) return;

    // 最新のログIDが更新されていなければスキップ（ただし、初回は描画）
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
    const colors = {
      agriculture: 'green',
      military: 'red',
      economy: 'yellow',
      magic: 'purple',
      industry: 'blue',
    };
    return colors[category] || 'gray';
  }

  // ブリンジメソッド（HTMLから呼ばれるのではなくクラス内からバインド）
  triggerBuild(buildingId) {
    const result = this.engine.startConstruction(buildingId);
    if (!result.success) {
      this.showToast(result.message, 'error');
    }
  }

  triggerResearch(techId) {
    const result = this.engine.startResearch(techId);
    if (!result.success) {
      this.showToast(result.message, 'error');
    }
  }

  triggerTradeAgreement(nationId) {
    const result = this.engine.proposeTradeAgreement(nationId);
    if (result.success) {
      this.showToast('貿易協定を締結しました！', 'success');
    } else {
      this.showToast(result.message, 'error');
    }
  }

  triggerSave() {
    const result = this.engine.saveGame();
    if (result) {
      this.showToast('セーブしました', 'success');
    } else {
      this.showToast('セーブに失敗しました', 'error');
    }
  }

  triggerLoad() {
    if (this.engine.hasSaveData()) {
      const result = this.engine.loadGame();
      if (result) {
        this.showToast('ロードしました', 'success');
        this.renderedTab = null; // 強制再描画
        this.render(this.engine.state);
      } else {
        this.showToast('ロードに失敗しました', 'error');
      }
    } else {
      this.showToast('セーブデータがありません', 'error');
    }
  }

  triggerNewGame() {
    this.showConfirmModal(
      '本当に新しいゲームを開始しますか？\n現在のデータは全て失われます。',
      () => {
        this.engine.deleteSave();
        this.engine.newGame();
        this.showToast('新しいゲームを開始しました', 'success');
        this.renderedTab = null; // 強制再描画
        this.render(this.engine.state);
      }
    );
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
    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      info: 'bg-blue-600',
    };

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
      { id: 'info', icon: '📊', label: '情報' },
    ];

    this.els.tabMenu.innerHTML = tabs.map(tab => `
      <button 
        data-tab="${tab.id}"
        class="flex-1 flex flex-col items-center justify-center py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
      >
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

        // 即座に再描画
        this.render(this.engine.state);
      });
    });

    const initialBtn = this.els.tabMenu.querySelector(`[data-tab="domestic"]`);
    if (initialBtn) initialBtn.click();
  }
}
