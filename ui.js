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

    const battleIndicator = state.battle && !state.battle.result ? '<span class="text-red-400 animate-pulse ml-2">⚔️戦闘中</span>' : '';

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
          <span>⚔️</span><span class="text-gray-400 text-xs">兵力:</span>
          <span class="font-medium text-blue-400">${state.military.totalSoldiers}</span>
        </div>
        ${battleIndicator}
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
    } else if (this.activeTab === 'military') {
      this.renderMilitaryTab(state);
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

  // 軍事タブの描画
  renderMilitaryTab(state) {
    const battle = state.battle;
    const playerPower = this.engine.getPlayerCombatPower();

    // 戦闘中の場合
    if (battle && !battle.result) {
      this.renderBattleScreen(state, battle, playerPower);
      return;
    }

    // 戦闘結果表示
    if (battle && battle.result) {
      this.renderBattleResult(state, battle);
      return;
    }

    // 通常の軍事管理画面
    // AI国家リストの生成
    const nationsHTML = state.aiNations
      .filter(n => !n.isDefeated)
      .map(nation => {
        const threatLevel = nation.combatPower > playerPower * 2 ? 'text-red-400' :
                           nation.combatPower > playerPower ? 'text-yellow-400' : 'text-green-400';
        return `
          <div class="bg-gray-800 p-3 rounded mb-2 border border-gray-700">
            <div class="flex justify-between items-center">
              <div>
                <div class="font-bold text-sm text-blue-300">${nation.name}</div>
                <div class="text-xs text-gray-400">${nation.description}</div>
                <div class="text-xs mt-1">
                  <span class="${threatLevel}">⚔️ 戦力: ${nation.combatPower}</span>
                  <span class="text-gray-500 ml-2">👥 兵士: ${nation.soldiers}</span>
                </div>
              </div>
              <button
                onclick="window.game.ui.triggerAttack('${nation.id}')"
                class="px-3 py-1.5 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white"
              >
                ⚔️ 攻撃
              </button>
            </div>
          </div>
        `;
      }).join('');

    // 撃破済み国家
    const defeatedHTML = state.aiNations
      .filter(n => n.isDefeated)
      .map(nation => `
        <div class="bg-gray-800 p-2 rounded mb-1 border border-gray-700 opacity-50">
          <span class="text-sm text-gray-500">☠️ ${nation.name} (撃破済み)</span>
        </div>
      `).join('');

    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">軍事管理</h2>

        <!-- 軍事力ステータス -->
        <div class="mb-6 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">我が軍の状態</div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>⚔️ 総戦闘力: <span class="text-yellow-400 font-bold">${playerPower}</span></div>
            <div>👥 兵士数: <span class="text-white font-bold">${state.military.totalSoldiers}人</span></div>
            <div>😤 士気: <span class="text-blue-400">${state.military.morale}%</span></div>
            <div>🛡️ 装備率: <span class="text-green-400">${Math.floor(state.military.equipmentRate * 100)}%</span></div>
          </div>
        </div>

        <!-- 徴兵・解雇 -->
        <div class="mb-6 bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">徴兵管理</div>
          <div class="flex gap-2 items-center text-xs mb-2">
            <span class="text-gray-400">無職: ${state.population.unemployed}人</span>
          </div>
          <div class="flex gap-2">
            <button
              onclick="window.game.ui.triggerRecruit(5)"
              class="px-3 py-1.5 rounded text-xs font-bold ${state.population.unemployed >= 5 ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}"
              ${state.population.unemployed < 5 ? 'disabled' : ''}
            >
              徴兵 +5
            </button>
            <button
              onclick="window.game.ui.triggerDisband(5)"
              class="px-3 py-1.5 rounded text-xs font-bold ${state.military.totalSoldiers >= 5 ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}"
              ${state.military.totalSoldiers < 5 ? 'disabled' : ''}
            >
              解雇 -5
            </button>
          </div>
        </div>

        <!-- 攻撃可能な国家 -->
        <h3 class="text-sm font-bold text-gray-400 mb-2">敵対国家</h3>
        ${nationsHTML || '<p class="text-gray-500 text-sm">攻撃可能な国家がありません</p>'}

        ${defeatedHTML ? `
          <h3 class="text-sm font-bold text-gray-400 mb-2 mt-4">撃破済み</h3>
          ${defeatedHTML}
        ` : ''}
      </div>
    `;
  }

  // 戦闘画面の描画
  renderBattleScreen(state, battle, playerPower) {
    // 戦闘ログの生成
    const battleLogHTML = battle.battleLog.map(log => `
      <div class="text-xs py-1 border-b border-gray-700 last:border-0 text-gray-300">
        ${log.message}
      </div>
    `).join('');

    // 進捗バーの計算
    const playerHealthPercent = Math.floor((battle.playerSoldiers / battle.initialPlayerSoldiers) * 100);
    const enemyHealthPercent = Math.floor((battle.enemySoldiers / battle.initialEnemySoldiers) * 100);

    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold text-red-400 mb-4 border-b border-red-700 pb-2">⚔️ 戦闘中</h2>

        <!-- 戦闘ステータス -->
        <div class="bg-gray-800 p-4 rounded border border-red-700 mb-4">
          <div class="text-center text-sm text-gray-300 mb-3">
            <span class="text-blue-400 font-bold">プレイヤー</span>
            <span class="text-gray-500 mx-2">VS</span>
            <span class="text-red-400 font-bold">${battle.enemyName}</span>
          </div>

          <!-- プレイヤー側 -->
          <div class="mb-4">
            <div class="flex justify-between text-xs mb-1">
              <span class="text-blue-400">プレイヤー軍</span>
              <span>${battle.playerSoldiers} / ${battle.initialPlayerSoldiers}人</span>
            </div>
            <div class="w-full bg-gray-700 rounded h-3">
              <div class="bg-blue-500 h-3 rounded transition-all duration-300" style="width: ${playerHealthPercent}%"></div>
            </div>
            <div class="flex justify-between text-xs mt-1 text-gray-400">
              <span>士気: ${battle.playerMorale}%</span>
              <span>戦闘力: ${playerPower}</span>
            </div>
          </div>

          <!-- 敵側 -->
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-red-400">${battle.enemyName}</span>
              <span>${battle.enemySoldiers} / ${battle.initialEnemySoldiers}人</span>
            </div>
            <div class="w-full bg-gray-700 rounded h-3">
              <div class="bg-red-500 h-3 rounded transition-all duration-300" style="width: ${enemyHealthPercent}%"></div>
            </div>
            <div class="flex justify-between text-xs mt-1 text-gray-400">
              <span>士気: ${battle.enemyMorale}%</span>
            </div>
          </div>
        </div>

        <!-- 撤退ボタン -->
        <div class="mb-4">
          <button
            onclick="window.game.ui.triggerRetreat()"
            class="w-full px-4 py-2 rounded text-sm font-bold bg-yellow-600 hover:bg-yellow-500 text-white"
          >
            🏃 撤退（10%の追加損害）
          </button>
        </div>

        <!-- 戦闘ログ -->
        <div class="bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">戦闘ログ</div>
          <div class="max-h-40 overflow-y-auto">
            ${battleLogHTML || '<div class="text-xs text-gray-500">戦闘開始...</div>'}
          </div>
        </div>

        <div class="mt-4 text-xs text-gray-500 text-center">
          10秒ごとに戦闘が更新されます
        </div>
      </div>
    `;
  }

  // 戦闘結果画面の描画
  renderBattleResult(state, battle) {
    const isVictory = battle.result === 'victory';
    const isDefeat = battle.result === 'defeat';
    const isRetreat = battle.result === 'retreat';

    const resultText = isVictory ? '勝利！' : isDefeat ? '敗北...' : '撤退';
    const resultColor = isVictory ? 'text-green-400' : isDefeat ? 'text-red-400' : 'text-yellow-400';
    const borderColor = isVictory ? 'border-green-700' : isDefeat ? 'border-red-700' : 'border-yellow-700';

    // 戦闘ログ
    const battleLogHTML = battle.battleLog.map(log => `
      <div class="text-xs py-1 border-b border-gray-700 last:border-0 text-gray-300">
        ${log.message}
      </div>
    `).join('');

    this.els.mainContent.innerHTML = `
      <div class="p-4 pb-24 overflow-y-auto h-full">
        <h2 class="text-lg font-bold ${resultColor} mb-4 border-b ${borderColor} pb-2">
          ${isVictory ? '🎉' : isDefeat ? '💀' : '🏃'} 戦闘終了 - ${resultText}
        </h2>

        <!-- 結果サマリー -->
        <div class="bg-gray-800 p-4 rounded ${borderColor} border mb-4">
          <div class="text-center text-lg ${resultColor} font-bold mb-4">${resultText}</div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="text-center">
              <div class="text-gray-400 text-xs mb-1">我が軍</div>
              <div class="text-blue-400">${battle.initialPlayerSoldiers} → ${battle.playerSoldiers}人</div>
              <div class="text-xs text-gray-500">損害: ${battle.initialPlayerSoldiers - battle.playerSoldiers}人</div>
            </div>
            <div class="text-center">
              <div class="text-gray-400 text-xs mb-1">${battle.enemyName}</div>
              <div class="text-red-400">${battle.initialEnemySoldiers} → ${battle.enemySoldiers}人</div>
              <div class="text-xs text-gray-500">損害: ${battle.initialEnemySoldiers - battle.enemySoldiers}人</div>
            </div>
          </div>
        </div>

        <!-- 閉じるボタン -->
        <div class="mb-4">
          <button
            onclick="window.game.ui.closeBattleResult()"
            class="w-full px-4 py-2 rounded text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white"
          >
            閉じる
          </button>
        </div>

        <!-- 戦闘ログ -->
        <div class="bg-gray-800 p-3 rounded border border-gray-700">
          <div class="text-sm text-gray-300 mb-2">戦闘ログ</div>
          <div class="max-h-40 overflow-y-auto">
            ${battleLogHTML}
          </div>
        </div>
      </div>
    `;
  }

  // 戦闘結果を閉じる
  closeBattleResult() {
    this.engine.state.battle = null;
    this.engine.notify();
  }

  // 攻撃開始
  triggerAttack(nationId) {
    this.engine.startBattle(nationId);
  }

  // 撤退
  triggerRetreat() {
    this.engine.retreatFromBattle();
  }

  // 徴兵
  triggerRecruit(amount) {
    this.engine.recruitSoldiers(amount);
  }

  // 解雇
  triggerDisband(amount) {
    this.engine.disbandSoldiers(amount);
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
