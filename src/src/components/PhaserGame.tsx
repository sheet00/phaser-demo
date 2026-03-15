import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    // ゲーム内の状態を保持するための変数
    let player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    let lasers: Phaser.Physics.Arcade.Group;
    let lastFiredTime = 0;
    let background: Phaser.GameObjects.TileSprite;

    function preload(this: Phaser.Scene) {
      // 背景、宇宙船、レーザーの画像を読み込む
      this.load.image('background', '/assets/space-shooter/Backgrounds/darkPurple.png');
      this.load.image('player', '/assets/space-shooter/PNG/playerShip2_blue.png');
      this.load.image('laser', '/assets/space-shooter/PNG/Lasers/laserBlue01.png');
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;

      // 背景を敷き詰める (TileSprite)
      background = this.add.tileSprite(0, 0, width, height, 'background');
      background.setOrigin(0, 0);
      background.setScrollFactor(0); // 画面に固定

      // レーザーのグループを作成（物理演算を有効化）
      lasers = this.physics.add.group({
        defaultKey: 'laser',
        maxSize: 30 // 同時に画面に出る最大弾数
      });

      // プレイヤーを配置
      player = this.physics.add.sprite(width / 2, height - 100, 'player');
      player.setCollideWorldBounds(true);

      // キーボード設定
      if (this.input.keyboard) {
        cursors = this.input.keyboard.createCursorKeys();
      }
    }

    function update(this: Phaser.Scene, time: number) {
      if (!cursors || !player || !background) return;

      // 背景をスクロールさせる
      background.tilePositionY -= 2;

      // --- 移動処理 ---
      player.setVelocity(0);

      if (cursors.left.isDown) {
        player.setVelocityX(-400);
      } else if (cursors.right.isDown) {
        player.setVelocityX(400);
      }

      if (cursors.up.isDown) {
        player.setVelocityY(-400);
      } else if (cursors.down.isDown) {
        player.setVelocityY(400);
      }

      // --- 発射処理 ---
      // スペースキーが押されており、前回の発射から0.25秒以上経過している場合
      if (cursors.space.isDown && time > lastFiredTime) {
        const laser = lasers.get(player.x, player.y - 20) as Phaser.Physics.Arcade.Sprite;

        if (laser) {
          laser.setActive(true);
          laser.setVisible(true);
          laser.setVelocityY(-600); // 上方向に飛ばす
          lastFiredTime = time + 250; // 0.25秒のクールタイム
        }
      }

      // 画面外（上端）に出たレーザーを無効化・非表示にする
      lasers.children.iterate((child) => {
        const laser = child as Phaser.Physics.Arcade.Sprite;
        if (laser.active && laser.y < 0) {
          laser.setActive(false);
          laser.setVisible(false);
          laser.body?.stop(); // 物理挙動を停止
        }
        return true;
      });
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
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scene: {
        preload: preload,
        create: create,
        update: update
      }
    };

    const game = new Phaser.Game(config);

    const handleResize = () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} style={{ width: '100vw', height: '100vh', background: '#000' }} />;
}
