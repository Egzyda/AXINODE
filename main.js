/* main.js - エントリーポイント */
import { GameEngine } from './engine.js';
import { UIManager } from './ui.js';

// グローバルオブジェクトにゲームインスタンスを保持（HTMLからのonclick呼び出し用）
window.game = {};

document.addEventListener('DOMContentLoaded', () => {
  console.log("Starting AXINODE...");

  // 1. エンジンの初期化
  const engine = new GameEngine();
  window.game.engine = engine;

  // 2. UIマネージャーの初期化
  const ui = new UIManager(engine);
  window.game.ui = ui;

  // 3. UIの初期設定
  ui.initTabMenu();

  // 4. エンジンからの更新通知を受け取ってUIを描画
  engine.subscribe((state) => {
    ui.render(state);
  });

  // 5. セーブデータがあれば自動ロード
  if (engine.hasSaveData()) {
    console.log("セーブデータが見つかりました。ロードを試みます...");
    const loaded = engine.loadGame();
    if (loaded) {
      ui.showToast('セーブデータをロードしました', 'success');
    }
  }

  // 6. 初回描画
  ui.render(engine.state);

  // 7. ゲームループ開始
  engine.startGameLoop();

  // 8. オートセーブの開始（1分ごと）
  engine.startAutosave();
  console.log("オートセーブを有効化しました（1分間隔）");
  
  // 開始時はポーズ状態なので、ログを出して誘導
  if (engine.state.isPaused) {
    engine.addLog('「▶️ 再開」ボタンを押して時間を進めてください', 'important');
  }

  // 9. ページを離れる前にセーブ
  window.addEventListener('beforeunload', () => {
    if (!engine.state.isPaused) {
      engine.saveGame();
    }
  });

  // 10. デバッグ用コマンドをコンソールに公開
  window.game.debug = {
    addGold: (amount) => {
      engine.state.resources.gold += amount;
      engine.notify();
      console.log(`${amount}G を追加しました`);
    },
    addFood: (amount) => {
      engine.state.resources.food += amount;
      engine.notify();
      console.log(`食糧を ${amount} 追加しました`);
    },
    addOre: (amount) => {
      engine.state.resources.ore += amount;
      engine.notify();
      console.log(`鉱石を ${amount} 追加しました`);
    },
    addMana: (amount) => {
      engine.state.resources.mana += amount;
      engine.notify();
      console.log(`魔力を ${amount} 追加しました`);
    },
    addPopulation: (amount) => {
      engine.addPopulation(amount);
      engine.notify();
      console.log(`人口を ${amount} 追加しました`);
    },
    skipDays: (days) => {
      engine.state.day += days;
      engine.notify();
      console.log(`${days}日 進めました`);
    },
    newGame: () => {
      if (confirm('本当に新しいゲームを開始しますか？セーブデータは削除されます。')) {
        engine.deleteSave();
        engine.newGame();
        console.log('新しいゲームを開始しました');
      }
    },
    save: () => {
      engine.saveGame();
    },
    load: () => {
      engine.loadGame();
    },
    state: () => engine.state,
  };

  console.log("AXINODE フェーズ2 起動完了");
  console.log("デバッグコマンド: window.game.debug.addGold(1000) など");
});
