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
  window.game.ui = ui; // グローバルからアクセス可能にする

  // 3. UIの初期設定
  ui.initTabMenu();

  // 4. エンジンからの更新通知を受け取ってUIを描画
  engine.subscribe((state) => {
    ui.render(state);
  });

  // 5. 初回描画
  ui.render(engine.state);

  // 6. ゲームループ開始
  engine.startGameLoop();
  
  // 開始時はポーズ状態なので、ログを出して誘導
  engine.addLog('「▶️ 再開」ボタンを押して時間を進めてください', 'important');
});
