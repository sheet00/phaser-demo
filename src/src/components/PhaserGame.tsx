import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    // 最もシンプルな関数ベースのシーン定義
    function preload(this: Phaser.Scene) {
      // 指定された画像（publicフォルダ直下から）を読み込む
      this.load.image('player', '/assets/space-shooter/PNG/playerShip2_blue.png');
    }

    function create(this: Phaser.Scene) {
      // 画面中央に画像を配置
      const player = this.add.image(400, 300, 'player');
    }

    function update(this: Phaser.Scene) {
      // 毎フレームの処理（今回は表示のみのため何もしない）
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current, // Reactのdiv要素にゲームを展開
      scene: {
        preload: preload,
        create: create,
        update: update
      }
    };

    const game = new Phaser.Game(config);

    // コンポーネントが破棄される際にPhaserのインスタンスも破棄する
    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} style={{ width: '800px', height: '600px', margin: 'auto' }} />;
}
