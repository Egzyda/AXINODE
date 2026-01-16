/* ui.js - 画面描画とイベントハンドリング */
import { BUILDINGS } from './data.js';

export class UIManager {
  constructor(engine) {
    this.engine = engine;
    this.activeTab = 'domestic'; // 初期タブ
    
    // DOM要素のキャッシュ
    this.els = {
      statusBar: document.getElementById('status-bar'),
      mainContent: document.getElementById('main-content'),
      logList: document.getElementById('log-list'),
      tabMenu: document.getElementById('tab-menu'),
      logToggle: document.getElementById('log-toggle-btn'),
      logWindow: document.getElementById('log-window'),
    };

    // イベント設定
    this.setupGlobalEvents();
  }

  setupGlobalEvents() {
    // ログウィンドウの開閉
    let isLogExpanded = false;
    this.els.logToggle.addEventListener('click', () => {
      isLogExpanded = !isLogExpanded;
      this.els.logWindow.style.height = isLogExpanded ? '300px' : '96px'; // h-72 vs h-24
      this.els.logToggle.textContent = isLogExpanded ? '▲ 閉じる' : '▼ 展開';
    });
  }

  // --- メイン描画ループ (Engineから呼ばれる) ---
  render(state) {
    this.renderStatusBar(state);
    this.renderMainContent(state);
    this.renderLog(state);
    // タブメニューは静的なので初期化時のみでも良いが、バッジなどつけるならここ
  }

  // 1. ステータスバーの描画
  renderStatusBar(state) {
    // 資金の増減計算（簡易表示用）
    const maintenance = state.military.totalSoldiers * 5;
    // 注: 本来はEngineで計算済みの値を参照すべきだが、ここでは簡易計算
    const netGold = -maintenance; // 税収は月次で入るため、普段の表示は支出のみになりがち
    
    const foodStatusColor = state.resources.food < 10 ? 'text-red-400' : 'text-green-400';
    const goldStatusColor = state.resources.gold < 0 ? 'text-red-400' : 'text-yellow-400';

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
        </div>
      </div>
    `;

    // ボタンイベントの再設定（innerHTMLで書き換えるため毎回必要）
    // ※最適化するならID指定でテキストだけ書き換える方式が良いが、今回は手軽さ優先
    document.getElementById('btn-pause').onclick = () => this.engine.togglePause();
    document.getElementById('btn-speed').onclick = () => {
      const speeds = [1, 10, 20];
      const nextIdx = (speeds.indexOf(this.engine.state.gameSpeed) + 1) % speeds.length;
      this.engine.setSpeed(speeds[nextIdx]);
    };
  }

  // 2. メインコンテンツ（タブの中身）の描画
  renderMainContent(state) {
    if (this.activeTab === 'domestic') {
      this.renderDomesticTab(state);
    } else {
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
    // 建設リストの生成
    const buildingListHTML = BUILDINGS.map(b => {
      const canAfford = state.resources.gold >= b.cost.gold;
      const opacity = canAfford ? 'opacity-100' : 'opacity-50';
      // 既に建設中か？
      const isBuilding = state.constructionQueue.some(q => q.buildingId === b.id);
      
      return `
        <div class="bg-gray-800 p-3 rounded mb-2 border border-gray-700 flex justify-between items-center ${opacity}">
          <div>
            <div class="font-bold text-sm text-blue-300">${b.name}</div>
            <div class="text-xs text-gray-400">${b.description}</div>
            <div class="text-xs text-yellow-500 mt-1">💰 ${b.cost.gold}G <span class="text-gray-500">⏳ ${b.buildTime}s</span></div>
          </div>
          <button 
            onclick="window.game.ui.triggerBuild('${b.id}')"
            class="px-3 py-1.5 rounded text-xs font-bold ${canAfford && !isBuilding ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}"
            ${!canAfford || isBuilding ? 'disabled' : ''}
          >
            ${isBuilding ? '建設中...' : '建設'}
          </button>
        </div>
      `;
    }).join('');

    // 建設キューの表示
    const queueHTML = state.constructionQueue.length > 0 ? `
      <div class="mb-4 bg-gray-800 p-2 rounded">
        <div class="text-xs text-gray-400 mb-1">現在建設中:</div>
        ${state.constructionQueue.map(q => `
          <div class="text-sm flex justify-between">
            <span>${q.name}</span>
            <span class="text-blue-400">${Math.ceil(q.remainingTime)}秒</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">内政管理</h2>
        
        <div class="mb-6 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300">現在の人口構成</div>
          <div class="flex justify-between text-xs mt-2">
            <span>👨‍🌾 農民: ${state.population.farmers}</span>
            <span>⚔️ 兵士: ${state.population.soldiers}</span>
            <span>🤷 無職: ${state.population.unemployed}</span>
          </div>
        </div>

        ${queueHTML}

        <h3 class="text-sm font-bold text-gray-400 mb-2">施設建設</h3>
        ${buildingListHTML}
      </div>
    `;
  }

  // HTMLのonclickから呼ぶためのブリッジ
  triggerBuild(buildingId) {
    this.engine.startConstruction(buildingId);
  }

  // 3. ログの描画
  renderLog(state) {
    // 差分更新せず毎回書き換える（簡易実装）
    // ※パフォーマンスが気になるならID管理が必要だが、テキストなら高速
    this.els.logList.innerHTML = state.eventLog.map(log => `
      <div class="flex gap-2 py-1 border-b border-gray-800 last:border-0 ${log.priority === 'high' ? 'text-yellow-200' : 'text-gray-400'}">
        <span class="opacity-60 text-xs min-w-[40px]">${log.time}</span>
        <span class="text-sm">${log.message}</span>
      </div>
    `).join('');
  }

  // 4. タブメニューの初期化（一度だけ呼ぶ）
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

    // クリックイベント
    this.els.tabMenu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        // アクティブスタイルの切り替え
        this.els.tabMenu.querySelectorAll('button').forEach(b => {
           b.classList.remove('text-blue-400', 'bg-gray-800');
           b.classList.add('text-gray-400');
        });
        btn.classList.remove('text-gray-400');
        btn.classList.add('text-blue-400', 'bg-gray-800');
        
        // 即時再描画
        this.renderMainContent(this.engine.state);
      });
    });
    
    // 初期アクティブ設定
    const initialBtn = this.els.tabMenu.querySelector(`[data-tab="domestic"]`);
    if(initialBtn) initialBtn.click();
  }
}
