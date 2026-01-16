/* main.js - エントリーポイント（完全版） */
import { GameEngine } from './engine.js';
import { UIManager } from './ui.js';

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

  // 8. オートセーブの開始
  engine.startAutosave();
  console.log("オートセーブを有効化しました（1分間隔）");

  // 開始時はポーズ状態
  if (engine.state.isPaused && !engine.state.gameOver && !engine.state.victory) {
    engine.addLog('「▶️ 再開」ボタンを押して時間を進めてください', 'important');
  }

  // 9. ページを離れる前にセーブ
  window.addEventListener('beforeunload', () => {
    if (!engine.state.isPaused && !engine.state.gameOver) {
      engine.saveGame();
    }
  });

  // 10. デバッグ用コマンド
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
    addWeapons: (amount) => {
      engine.state.resources.weapons += amount;
      engine.notify();
      console.log(`武器を ${amount} 追加しました`);
    },
    addArmor: (amount) => {
      engine.state.resources.armor += amount;
      engine.notify();
      console.log(`鎧を ${amount} 追加しました`);
    },
    addPopulation: (amount) => {
      engine.addPopulation(amount);
      engine.notify();
      console.log(`人口を ${amount} 追加しました`);
    },
    addSoldiers: (amount) => {
      if (engine.state.population.unemployed >= amount) {
        engine.assignPopulation('soldiers', engine.state.population.soldiers + amount);
        console.log(`兵士を ${amount} 追加しました`);
      } else {
        console.log('無職の人口が不足しています');
      }
    },
    skipDays: (days) => {
      engine.state.day += days;
      engine.notify();
      console.log(`${days}日 進めました`);
    },
    win: (type = 'military') => {
      engine.state.victory = true;
      engine.state.victoryType = type;
      engine.notify();
      console.log(`${type}勝利を強制発動しました`);
    },
    lose: (reason = 'population') => {
      engine.state.gameOver = true;
      engine.state.gameOverReason = reason;
      engine.notify();
      console.log(`ゲームオーバーを強制発動しました: ${reason}`);
    },
    defeatNation: (index = 0) => {
      if (engine.state.aiNations[index]) {
        engine.state.aiNations[index].isDefeated = true;
        engine.notify();
        console.log(`国家${index}を征服しました`);
      }
    },
    newGame: () => {
      engine.deleteSave();
      engine.newGame();
      ui.renderedTab = null;
      console.log('新しいゲームを開始しました');
    },
    save: () => engine.saveGame(),
    load: () => {
      engine.loadGame();
      ui.renderedTab = null;
    },
    state: () => engine.state,
  };

  console.log("AXINODE 完全版 起動完了");
  console.log("デバッグコマンド: window.game.debug.addGold(1000) など");
  console.log("ヒント: 農民を増やして食糧を確保し、技術研究を進めましょう！");
});
