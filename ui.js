/* ui.js - 画面描画とイベントハンドリング */
import { BUILDINGS, TECHNOLOGIES } from './data.js';

// ログタイプに応じた色とアイコン
const LOG_STYLES = {
  important: { color: 'text-red-400', icon: '🚨', bgColor: 'bg-red-900/30' },
  domestic: { color: 'text-green-400', icon: '📈', bgColor: '' },
  military: { color: 'text-orange-400', icon: '⚔️', bgColor: '' },
  diplomatic: { color: 'text-blue-400', icon: '💬', bgColor: '' },
  tech: { color: 'text-purple-400', icon: '🔬', bgColor: '' },
};

// カテゴリ名の日本語対応
const CATEGORY_NAMES = {
  agriculture: '農業',
  military: '軍事',
  economy: '経済',
  magic: '魔法',
  industry: '工業',
};

// 性格タイプの日本語対応
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
    
    this.els = {
      statusBar: document.getElementById('status-bar'),
      mainContent: document.getElementById('main-content'),
      logList: document.getElementById('log-list'),
      tabMenu: document.getElementById('tab-menu'),
      logToggle: document.getElementById('log-toggle-btn'),
      logWindow: document.getElementById('log-window'),
    };

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
    const foodStatusColor = state.resources.food < 10 ? 'text-red-400' : 'text-green-400';
    const goldStatusColor = state.resources.gold < 0 ? 'text-red-400' : 'text-yellow-400';
    const satisfactionColor = state.satisfaction < 40 ? 'text-red-400' : 
                              state.satisfaction < 70 ? 'text-yellow-400' : 'text-green-400';

    this.els.statusBar.innerHTML = `
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <div class="flex items-center gap-1">
          <span>👑</span><span class="text-gray-400 text-xs">人口:</span>
          <span class="font-medium text-white">${state.population.total}</span>
        </div>
        <div class="flex items-center gap-1">
          <span>💰</span><span class="text-gray-400 text-xs">資金:</span>
          <span class="font-medium ${goldStatusColor}">${Math.floor(state.resources.gold)}G</span>
        </div>
        <div class="flex items-center gap-1">
          <span>🌾</span><span class="text-gray-400 text-xs">食糧:</span>
          <span class="font-medium ${foodStatusColor}">${Math.floor(state.resources.food)}</span>
        </div>
        <div class="flex items-center gap-1">
          <span>😊</span><span class="text-gray-400 text-xs">満足:</span>
          <span class="font-medium ${satisfactionColor}">${state.satisfaction}%</span>
        </div>
      </div>
      
      <div class="flex items-center justify-between mt-1">
        <div class="flex items-center gap-2 text-sm">
          <span>⏱️</span><span class="font-medium text-white">${Math.floor(state.day)}日目</span>
          <span class="text-xs text-gray-500">${state.isPaused ? '(停止中)' : '進行中'}</span>
        </div>
        <div class="flex gap-1">
           <button id="btn-pause" class="px-2 py-0.5 rounded text-xs ${state.isPaused ? 'bg-green-600' : 'bg-yellow-600'} text-white">
             ${state.isPaused ? '▶️ 再開' : '⏸️ 停止'}
           </button>
           <button id="btn-speed" class="px-2 py-0.5 rounded text-xs bg-gray-700 text-white">
             x${state.gameSpeed}
           </button>
           <button id="btn-save" class="px-2 py-0.5 rounded text-xs bg-blue-600 text-white">
             💾
           </button>
        </div>
      </div>
    `;

    document.getElementById('btn-pause').onclick = () => this.engine.togglePause();
    document.getElementById('btn-speed').onclick = () => {
      const speeds = [1, 10, 20];
      const nextIdx = (speeds.indexOf(this.engine.state.gameSpeed) + 1) % speeds.length;
      this.engine.setSpeed(speeds[nextIdx]);
    };
    document.getElementById('btn-save').onclick = () => this.engine.saveGame();
  }

  // 2. メインコンテンツ（タブの中身）の描画
  renderMainContent(state) {
    switch (this.activeTab) {
      case 'domestic':
        this.renderDomesticTab(state);
        break;
      case 'technology':
        this.renderTechnologyTab(state);
        break;
      case 'diplomacy':
        this.renderDiplomacyTab(state);
        break;
      case 'info':
        this.renderInfoTab(state);
        break;
      default:
        this.els.mainContent.innerHTML = `
          <div class="p-8 text-center text-gray-500">
            <p class="text-xl mb-2">🚧 工事中</p>
            <p>「${this.activeTab}」タブはまだ実装されていません。</p>
          </div>
        `;
    }
  }

  // 内政タブの描画
  renderDomesticTab(state) {
    const buildingListHTML = BUILDINGS.map(b => {
      const canAfford = state.resources.gold >= b.cost.gold && 
                        (!b.cost.ore || state.resources.ore >= b.cost.ore);
      
      // 前提条件チェック
      let hasPrereq = true;
      if (b.prerequisite) {
        hasPrereq = b.prerequisite.every(prereqId => {
          const tech = state.technologies.find(t => t.id === prereqId);
          if (tech) return tech.isResearched;
          return state.buildings.some(bld => bld.id === prereqId);
        });
      }

      // 最大数チェック
      let atMaxCount = false;
      if (b.maxCount) {
        const currentCount = state.buildings.filter(bld => bld.id === b.id).length;
        atMaxCount = currentCount >= b.maxCount;
      }

      const isBuilding = state.constructionQueue.some(q => q.buildingId === b.id);
      const canBuild = canAfford && hasPrereq && !atMaxCount && !isBuilding;
      const opacity = canBuild ? 'opacity-100' : 'opacity-50';
      
      const costText = b.cost.ore 
        ? `💰 ${b.cost.gold}G ⚫ ${b.cost.ore}鉱石` 
        : `💰 ${b.cost.gold}G`;

      let statusText = '';
      if (!hasPrereq) statusText = '(前提未達成)';
      else if (atMaxCount) statusText = '(上限)';
      else if (isBuilding) statusText = '(建設中)';
      
      return `
        <div class="bg-gray-800 p-3 rounded mb-2 border border-gray-700 flex justify-between items-center ${opacity}">
          <div class="flex-1">
            <div class="font-bold text-sm text-blue-300">${b.name} ${statusText}</div>
            <div class="text-xs text-gray-400">${b.description}</div>
            <div class="text-xs text-yellow-500 mt-1">${costText} <span class="text-gray-500">⏳ ${b.buildTime}s</span></div>
          </div>
          <button 
            onclick="window.game.ui.triggerBuild('${b.id}')"
            class="px-3 py-1.5 rounded text-xs font-bold ${canBuild ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}"
            ${!canBuild ? 'disabled' : ''}
          >
            建設
          </button>
        </div>
      `;
    }).join('');

    const queueHTML = state.constructionQueue.length > 0 ? `
      <div class="mb-4 bg-gray-800 p-2 rounded">
        <div class="text-xs text-gray-400 mb-1">🔨 建設中:</div>
        ${state.constructionQueue.map(q => `
          <div class="text-sm flex justify-between">
            <span>${q.name}</span>
            <span class="text-blue-400">${Math.ceil(q.remainingTime)}秒</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    // 建設済み施設
    const builtHTML = state.buildings.length > 0 ? `
      <div class="mb-4 bg-green-900/30 p-2 rounded border border-green-800">
        <div class="text-xs text-green-400 mb-1">✓ 建設済み施設:</div>
        <div class="text-sm text-gray-300">${state.buildings.map(b => b.name).join(', ')}</div>
      </div>
    ` : '';

    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">内政管理</h2>
        
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">現在の人口構成</div>
          <div class="grid grid-cols-3 gap-2 text-xs">
            <span>👨‍🌾 農民: ${state.population.farmers}</span>
            <span>⛏️ 鉱夫: ${state.population.miners}</span>
            <span>🔧 職人: ${state.population.craftsmen}</span>
            <span>⚔️ 兵士: ${state.population.soldiers}</span>
            <span>🤷 無職: ${state.population.unemployed}</span>
          </div>
        </div>

        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">資源状況</div>
          <div class="grid grid-cols-3 gap-2 text-xs">
            <span class="text-yellow-400">💰 ${Math.floor(state.resources.gold)}G</span>
            <span class="text-green-400">🌾 ${Math.floor(state.resources.food)}</span>
            <span class="text-orange-400">⚫ ${Math.floor(state.resources.ore)}</span>
            <span class="text-purple-400">✨ ${Math.floor(state.resources.mana)}</span>
            <span class="text-red-400">🗡️ ${Math.floor(state.resources.weapons)}</span>
            <span class="text-blue-400">🛡️ ${Math.floor(state.resources.armor)}</span>
          </div>
        </div>

        ${builtHTML}
        ${queueHTML}

        <h3 class="text-sm font-bold text-gray-400 mb-2">施設建設</h3>
        ${buildingListHTML}
      </div>
    `;
  }

  // 技術タブの描画
  renderTechnologyTab(state) {
    // カテゴリごとにグループ化
    const categories = {};
    state.technologies.forEach(tech => {
      if (!categories[tech.category]) {
        categories[tech.category] = [];
      }
      categories[tech.category].push(tech);
    });

    // 研究キューの表示
    const researchQueueHTML = state.researchQueue.length > 0 ? `
      <div class="mb-4 bg-purple-900/30 p-3 rounded border border-purple-800">
        <div class="text-xs text-purple-400 mb-1">🔬 研究中:</div>
        ${state.researchQueue.map(r => `
          <div class="text-sm flex justify-between">
            <span class="text-white">${r.name}</span>
            <span class="text-purple-400">${Math.ceil(r.remainingTime)}秒</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    // 研究済み技術
    const researchedTechs = state.technologies.filter(t => t.isResearched);
    const researchedHTML = researchedTechs.length > 0 ? `
      <div class="mb-4 bg-green-900/30 p-2 rounded border border-green-800">
        <div class="text-xs text-green-400 mb-1">✓ 研究済み:</div>
        <div class="text-sm text-gray-300">${researchedTechs.map(t => t.name).join(', ')}</div>
      </div>
    ` : '';

    // カテゴリごとの技術リスト
    let techListHTML = '';
    Object.entries(categories).forEach(([category, techs]) => {
      const sortedTechs = techs.sort((a, b) => a.tier - b.tier);
      
      techListHTML += `
        <div class="mb-4">
          <h3 class="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-${this.getCategoryColor(category)}-500"></span>
            ${CATEGORY_NAMES[category] || category}
          </h3>
          <div class="space-y-2">
            ${sortedTechs.map(tech => this.renderTechCard(tech, state)).join('')}
          </div>
        </div>
      `;
    });

    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">技術研究</h2>
        
        ${researchQueueHTML}
        ${researchedHTML}
        
        ${techListHTML}
      </div>
    `;
  }

  // 技術カードのレンダリング
  renderTechCard(tech, state) {
    const isResearched = tech.isResearched;
    const isResearching = state.researchQueue.some(r => r.techId === tech.id);
    
    // 前提条件チェック
    let hasPrereq = true;
    let prereqText = '';
    if (tech.prerequisite) {
      hasPrereq = tech.prerequisite.every(prereqId => {
        const prereqTech = state.technologies.find(t => t.id === prereqId);
        return prereqTech && prereqTech.isResearched;
      });
      if (!hasPrereq) {
        const prereqNames = tech.prerequisite.map(id => {
          const t = state.technologies.find(t => t.id === id);
          return t ? t.name : id;
        }).join(', ');
        prereqText = `前提: ${prereqNames}`;
      }
    }

    const canAfford = state.resources.gold >= tech.cost.gold && 
                      (!tech.cost.mana || state.resources.mana >= tech.cost.mana);
    
    const canResearch = !isResearched && !isResearching && hasPrereq && canAfford;

    let statusClass = '';
    let statusText = '';
    if (isResearched) {
      statusClass = 'border-green-600 bg-green-900/20';
      statusText = '✓ 研究済み';
    } else if (isResearching) {
      statusClass = 'border-purple-600 bg-purple-900/20';
      statusText = '🔬 研究中';
    } else if (!hasPrereq) {
      statusClass = 'border-gray-700 opacity-50';
      statusText = `🔒 ${prereqText}`;
    } else if (!canAfford) {
      statusClass = 'border-gray-700 opacity-60';
      statusText = '💰 資金不足';
    } else {
      statusClass = 'border-gray-700';
    }

    const costText = tech.cost.mana 
      ? `💰 ${tech.cost.gold}G ✨ ${tech.cost.mana}魔力` 
      : `💰 ${tech.cost.gold}G`;

    return `
      <div class="bg-gray-800 p-3 rounded border ${statusClass}">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-bold text-sm text-purple-300 flex items-center gap-2">
              ${tech.name}
              <span class="text-xs text-gray-500">Tier ${tech.tier}</span>
            </div>
            <div class="text-xs text-gray-400 mt-1">${tech.description}</div>
            <div class="text-xs mt-1">
              <span class="text-yellow-500">${costText}</span>
              <span class="text-gray-500 ml-2">⏳ ${tech.researchTime}s</span>
            </div>
            ${statusText ? `<div class="text-xs mt-1 ${isResearched ? 'text-green-400' : 'text-gray-500'}">${statusText}</div>` : ''}
          </div>
          ${!isResearched && !isResearching ? `
            <button 
              onclick="window.game.ui.triggerResearch('${tech.id}')"
              class="px-3 py-1.5 rounded text-xs font-bold ${canResearch ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}"
              ${!canResearch ? 'disabled' : ''}
            >
              研究
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  // 外交タブの描画
  renderDiplomacyTab(state) {
    const nationsHTML = state.aiNations.map(nation => {
      const relationColor = nation.relationWithPlayer > 20 ? 'text-green-400' :
                           nation.relationWithPlayer < -20 ? 'text-red-400' : 'text-yellow-400';
      
      const hasTrade = nation.treaties.some(t => t.type === 'trade');
      const tradeDuration = nation.treaties.find(t => t.type === 'trade')?.duration || 0;

      // 貿易協定のコスト計算
      const baseCost = 200;
      const relationModifier = nation.relationWithPlayer < 0 ? 1.5 : 1.0;
      const tradeCost = Math.floor(baseCost * relationModifier);
      const canAffordTrade = state.resources.gold >= tradeCost;

      return `
        <div class="bg-gray-800 p-3 rounded mb-3 border border-gray-700">
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
            <div>
              <span class="text-gray-500">人口:</span>
              <span class="text-white">${nation.population}</span>
            </div>
            <div>
              <span class="text-gray-500">軍事力:</span>
              <span class="text-orange-400">${nation.militaryPower}</span>
            </div>
            <div>
              <span class="text-gray-500">関係:</span>
              <span class="${relationColor}">${Math.floor(nation.relationWithPlayer)}</span>
            </div>
          </div>

          ${hasTrade ? `
            <div class="text-xs text-green-400 mb-2">
              ✓ 貿易協定締結中（残り${tradeDuration}ヶ月）
            </div>
          ` : ''}

          <div class="flex gap-2">
            ${!hasTrade ? `
              <button 
                onclick="window.game.ui.triggerTradeAgreement('${nation.id}')"
                class="flex-1 px-3 py-1.5 rounded text-xs font-bold ${canAffordTrade ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}"
                ${!canAffordTrade ? 'disabled' : ''}
              >
                貿易協定（${tradeCost}G）
              </button>
            ` : ''}
            <button 
              class="px-3 py-1.5 rounded text-xs font-bold bg-gray-700 text-gray-500 cursor-not-allowed"
              disabled
            >
              不可侵条約（未実装）
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">外交</h2>
        
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300">あなたの評判</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-2xl font-bold ${state.reputation > 20 ? 'text-green-400' : state.reputation < -20 ? 'text-red-400' : 'text-yellow-400'}">
              ${state.reputation}
            </span>
            <span class="text-xs text-gray-500">
              ${state.reputation >= 50 ? '名君' : state.reputation >= 0 ? '普通' : '悪評'}
            </span>
          </div>
        </div>

        <h3 class="text-sm font-bold text-gray-400 mb-2">他国一覧</h3>
        ${nationsHTML}
      </div>
    `;
  }

  // 情報タブの描画
  renderInfoTab(state) {
    // 統計情報の計算
    const researchedCount = state.technologies.filter(t => t.isResearched).length;
    const totalTechs = state.technologies.length;
    const buildingsCount = state.buildings.length;
    const tradeCount = state.aiNations.reduce((sum, n) => 
      sum + n.treaties.filter(t => t.type === 'trade').length, 0);

    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">情報・設定</h2>
        
        <!-- ゲーム統計 -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">📊 ゲーム統計</div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span class="text-gray-500">経過日数:</span>
              <span class="text-white ml-1">${Math.floor(state.day)}日</span>
            </div>
            <div>
              <span class="text-gray-500">総人口:</span>
              <span class="text-white ml-1">${state.population.total}人</span>
            </div>
            <div>
              <span class="text-gray-500">研究済み技術:</span>
              <span class="text-purple-400 ml-1">${researchedCount}/${totalTechs}</span>
            </div>
            <div>
              <span class="text-gray-500">建設済み施設:</span>
              <span class="text-blue-400 ml-1">${buildingsCount}件</span>
            </div>
            <div>
              <span class="text-gray-500">貿易協定数:</span>
              <span class="text-green-400 ml-1">${tradeCount}件</span>
            </div>
            <div>
              <span class="text-gray-500">評判:</span>
              <span class="${state.reputation >= 0 ? 'text-green-400' : 'text-red-400'} ml-1">${state.reputation}</span>
            </div>
          </div>
        </div>

        <!-- リソース詳細 -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">📦 リソース詳細</div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="flex justify-between">
              <span class="text-yellow-400">💰 資金:</span>
              <span class="text-white">${Math.floor(state.resources.gold)}G</span>
            </div>
            <div class="flex justify-between">
              <span class="text-green-400">🌾 食糧:</span>
              <span class="text-white">${Math.floor(state.resources.food)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-orange-400">⚫ 鉱石:</span>
              <span class="text-white">${Math.floor(state.resources.ore)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-purple-400">✨ 魔力:</span>
              <span class="text-white">${Math.floor(state.resources.mana)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-red-400">🗡️ 武器:</span>
              <span class="text-white">${Math.floor(state.resources.weapons)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-blue-400">🛡️ 鎧:</span>
              <span class="text-white">${Math.floor(state.resources.armor)}</span>
            </div>
          </div>
        </div>

        <!-- セーブ・ロード -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-3">💾 セーブ・ロード</div>
          <div class="space-y-2">
            <button 
              onclick="window.game.ui.triggerSave()"
              class="w-full px-4 py-2 rounded text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white"
            >
              💾 手動セーブ
            </button>
            <button 
              onclick="window.game.ui.triggerLoad()"
              class="w-full px-4 py-2 rounded text-sm font-bold bg-green-600 hover:bg-green-500 text-white"
            >
              📂 ロード
            </button>
            <button 
              onclick="window.game.ui.triggerNewGame()"
              class="w-full px-4 py-2 rounded text-sm font-bold bg-red-600 hover:bg-red-500 text-white"
            >
              🔄 ニューゲーム
            </button>
          </div>
          <div class="text-xs text-gray-500 mt-2">
            ※ オートセーブは1分ごとに自動実行されます
          </div>
        </div>

        <!-- ゲーム説明 -->
        <div class="mb-4 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">📖 ゲームガイド</div>
          <div class="text-xs text-gray-400 space-y-1">
            <p>• 農民を増やして食糧を確保しましょう</p>
            <p>• 施設を建設して生産効率を上げましょう</p>
            <p>• 技術研究で新しい能力を解放しましょう</p>
            <p>• 他国と貿易協定を結んでボーナスを得ましょう</p>
          </div>
        </div>
      </div>
    `;
  }

  // カテゴリに応じた色を返す
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

  // HTMLのonclickから呼ぶブリッジメソッド
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

  // セーブ
  triggerSave() {
    const result = this.engine.saveGame();
    if (result) {
      this.showToast('セーブしました', 'success');
    } else {
      this.showToast('セーブに失敗しました', 'error');
    }
  }

  // ロード
  triggerLoad() {
    if (this.engine.hasSaveData()) {
      const result = this.engine.loadGame();
      if (result) {
        this.showToast('ロードしました', 'success');
      } else {
        this.showToast('ロードに失敗しました', 'error');
      }
    } else {
      this.showToast('セーブデータがありません', 'error');
    }
  }

  // ニューゲーム
  triggerNewGame() {
    // モーダル確認
    this.showConfirmModal(
      '本当に新しいゲームを開始しますか？\n現在のデータは全て失われます。',
      () => {
        this.engine.deleteSave();
        this.engine.newGame();
        this.showToast('新しいゲームを開始しました', 'success');
      }
    );
  }

  // 確認モーダル
  showConfirmModal(message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 m-4 max-w-sm border border-gray-600">
        <p class="text-white text-sm mb-4 whitespace-pre-line">${message}</p>
        <div class="flex gap-2">
          <button class="flex-1 px-4 py-2 rounded text-sm font-bold bg-gray-600 hover:bg-gray-500 text-white" id="modal-cancel">
            キャンセル
          </button>
          <button class="flex-1 px-4 py-2 rounded text-sm font-bold bg-red-600 hover:bg-red-500 text-white" id="modal-confirm">
            実行
          </button>
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

  // トースト通知
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

  // 3. ログの描画（色分け強化）
  renderLog(state) {
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

  // 4. タブメニューの初期化
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
        
        this.renderMainContent(this.engine.state);
      });
    });
    
    const initialBtn = this.els.tabMenu.querySelector(`[data-tab="domestic"]`);
    if(initialBtn) initialBtn.click();
  }
}
