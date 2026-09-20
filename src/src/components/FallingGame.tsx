import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

/**
 * FALLING GAME (落ち物ゲーム) - 骨格
 */
export default function FallingGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    function preload(this: Phaser.Scene) {
      // アセットのプリロード（今後追加）
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;
      this.cameras.main.setBackgroundColor('#2c3e50');

      this.add.text(width / 2, height / 2, 'FALLING GAME\n(UNDER CONSTRUCTION)', {
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5);

      this.add.text(width / 2, height / 2 + 100, '上から降ってくるアイテムをキャッチせよ！', {
        fontSize: '24px',
        color: '#ecf0f1',
        align: 'center'
      }).setOrigin(0.5);
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: {
        preload: preload,
        create: create
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 300 },
          debug: false
        }
      }
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} style={{ width: '100vw', height: '100vh' }} />;
}
