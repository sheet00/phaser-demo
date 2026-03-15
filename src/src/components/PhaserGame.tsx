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
    let enemies: Phaser.Physics.Arcade.Group; // 敵機グループ
    let lastFiredTime = 0;
    let background: Phaser.GameObjects.TileSprite;

    function preload(this: Phaser.Scene) {
      // 背景、宇宙船、レーザー、敵機、エフェクトの画像を読み込む
      this.load.image('background', '/assets/space-shooter/Backgrounds/darkPurple.png');
      this.load.image('player', '/assets/space-shooter/PNG/playerShip2_blue.png');
      this.load.image('laser', '/assets/space-shooter/PNG/Lasers/laserBlue01.png');
      this.load.image('enemy', '/assets/space-shooter/PNG/Enemies/enemyBlack1.png');
      this.load.image('star', '/assets/space-shooter/PNG/Effects/star1.png');
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

      // 敵機のグループを作成
      enemies = this.physics.add.group();

      // プレイヤーを配置
      player = this.physics.add.sprite(width / 2, height - 100, 'player');
      player.setCollideWorldBounds(true);

      // 敵機を1つ配置（画面上部中央）
      const enemy = enemies.create(width / 2, 100, 'enemy');
      enemy.setImmovable(true); // 弾が当たっても動かないようにする

      // 当たり判定：レーザーと敵機が重なった場合
      this.physics.add.overlap(lasers, enemies, (laser, enemy) => {
        const e = enemy as Phaser.Physics.Arcade.Sprite;
        
        // 【演出】当たった場所に星を表示し、トゥイーンでアニメーションさせる
        const hitEffect = this.add.sprite(e.x, e.y, 'star');
        hitEffect.setAlpha(1);
        hitEffect.setScale(0.5); // 最初は小さく

        this.tweens.add({
          targets: hitEffect,
          scale: 2.5,    // 大きくしながら
          alpha: 0,      // 透明にしていく
          duration: 100, // 0.1秒で
          onComplete: () => hitEffect.destroy() // 終わったら消す
        });

        // レーザーと敵機の両方を消滅させる
        (laser as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
        e.disableBody(true, true);
      });

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
          // 物理ボディーを有効化して位置を設定し、表示状態にする
          laser.enableBody(true, player.x, player.y - 20, true, true);
          laser.setVelocityY(-600); // 上方向に飛ばす
          lastFiredTime = time + 250; // 0.25秒のクールタイム
        }
      }

      // 画面外（上端）に出たレーザーを無効化・非表示にする
      lasers.children.iterate((child) => {
        const laser = child as Phaser.Physics.Arcade.Sprite;
        if (laser.active && laser.y < 0) {
          laser.disableBody(true, true); // 物理ボディーを無効化して非表示にする
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
