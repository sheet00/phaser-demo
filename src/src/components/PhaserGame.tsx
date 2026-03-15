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
    let bgMeteors: Phaser.GameObjects.Group; // 背景用メテオグループ
    let lastFiredTime = 0;
    let background: Phaser.GameObjects.TileSprite;
    let score = 0;
    let scoreText: Phaser.GameObjects.Text;
    let zKey: Phaser.Input.Keyboard.Key | undefined;

    // メテオ画像のアセット名リスト
    const meteorKeys = [
      'meteorBrown_big1', 'meteorBrown_big2', 'meteorBrown_big3', 'meteorBrown_big4',
      'meteorBrown_med1', 'meteorBrown_med3', 'meteorBrown_small1', 'meteorBrown_small2',
      'meteorBrown_tiny1', 'meteorBrown_tiny2',
      'meteorGrey_big1', 'meteorGrey_big2', 'meteorGrey_big3', 'meteorGrey_big4',
      'meteorGrey_med1', 'meteorGrey_med2', 'meteorGrey_small1', 'meteorGrey_small2',
      'meteorGrey_tiny1', 'meteorGrey_tiny2'
    ];

    function preload(this: Phaser.Scene) {
      // 背景、宇宙船、レーザー、敵機、エフェクトの画像を読み込む
      this.load.image('background', '/assets/space-shooter/Backgrounds/darkPurple.png');
      this.load.image('player', '/assets/space-shooter/PNG/playerShip2_blue.png');
      this.load.image('laser', '/assets/space-shooter/PNG/Lasers/laserBlue01.png');
      this.load.image('enemy', '/assets/space-shooter/PNG/Enemies/enemyBlack1.png');
      this.load.image('star', '/assets/space-shooter/PNG/Effects/star3.png');

      // メテオ画像をすべて読み込む
      meteorKeys.forEach(key => {
        this.load.image(key, `/assets/space-shooter/PNG/Meteors/${key}.png`);
      });
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;

      // 背景を敷き詰める (TileSprite)
      background = this.add.tileSprite(0, 0, width, height, 'background');
      background.setOrigin(0, 0);
      background.setScrollFactor(0); // 画面に固定
      background.setDepth(-10); // 一番背面に配置

      // 背景用メテオグループの作成
      bgMeteors = this.add.group();

      // 背景メテオを生成する関数
      const spawnBgMeteor = () => {
        const x = Phaser.Math.Between(0, width);
        const key = Phaser.Utils.Array.GetRandom(meteorKeys);
        const meteor = this.add.sprite(x, -100, key);
        
        // 回転のみランダム（向きを自然にするため）
        meteor.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        meteor.setAlpha(0.8); // 透明度を固定
        meteor.setDepth(-5); // 背景画像とゲーム要素の間に配置

        // 速度を2に固定（背景スクロールと同期）
        meteor.setData('speed', 2);
        
        bgMeteors.add(meteor);
      };

      // 0.8秒ごとに背景メテオを生成
      this.time.addEvent({
        delay: 800,
        callback: spawnBgMeteor,
        callbackScope: this,
        loop: true
      });

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

      // 敵を生成する関数
      const spawnEnemy = () => {
        const x = Phaser.Math.Between(50, width - 50);
        const enemy = enemies.get(x, -50, 'enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (enemy) {
          enemy.enableBody(true, x, -50, true, true);
          // 速度を150から400の間でランダムに設定
          const speed = Phaser.Math.Between(150, 400);
          enemy.setVelocityY(speed); 
        }
      };

      // 1秒ごとに敵を生成するタイマー
      this.time.addEvent({
        delay: 1000,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
      });

      // 当たり判定：プレイヤーと敵機が衝突した場合
      this.physics.add.overlap(player, enemies, (p, enemy) => {
        const playerSprite = p as Phaser.Physics.Arcade.Sprite;
        const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;

        // プレイヤーの爆発演出（Starを大きく出し、オレンジに光らせる）
        const hitEffect = this.add.sprite(playerSprite.x, playerSprite.y, 'star');
        hitEffect.setScale(4); // プレイヤーなので大きめに！
        hitEffect.setTint(0xffa500); // オレンジ色！

        this.tweens.add({
          targets: hitEffect,
          scale: 6,
          alpha: 0,
          duration: 300,
          onComplete: () => hitEffect.destroy()
        });

        // 敵機を消去
        enemySprite.disableBody(true, true);

        // 自機を一瞬無効化して、位置をリセット
        playerSprite.disableBody(true, true);
        
        // 1秒後に復活
        this.time.delayedCall(1000, () => {
          playerSprite.enableBody(true, width / 2, height - 100, true, true);
        });
      });

      // 当たり判定：レーザーと敵機が重なった場合
      this.physics.add.overlap(lasers, enemies, (laser, enemy) => {
        const e = enemy as Phaser.Physics.Arcade.Sprite;
        
        // 【演出】当たった場所に星を表示し、トゥイーンでアニメーションさせる
        const hitEffect = this.add.sprite(e.x, e.y, 'star');
        hitEffect.setAlpha(1);
        hitEffect.setScale(0.5); // 最初は小さく
        hitEffect.setTint(0xffa500); // オレンジ色！

        this.tweens.add({
          targets: hitEffect,
          scale: 2.5,    // 大きくしながら
          alpha: 0,      // 透明にしていく
          duration: 100, // 0.1秒で
          onComplete: () => hitEffect.destroy() // 終わったら消す
        });

        // スコアを加算
        score += 10;
        scoreText.setText('SCORE: ' + score);

        // レーザーと敵機の両方を消滅させる
        (laser as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
        e.disableBody(true, true);
      });

      // スコア表示の作成 (左上)
      scoreText = this.add.text(16, 16, 'SCORE: 0', {
        fontSize: '32px',
        color: '#fff',
        fontStyle: 'bold'
      });
      scoreText.setDepth(100); // 最前面に表示

      // キーボード設定
      if (this.input.keyboard) {
        cursors = this.input.keyboard.createCursorKeys();
        // スペースキーがブラウザのスクロールなどを引き起こさないようにする（同時押し制限の緩和）
        this.input.keyboard.addCapture('SPACE');
        
        // Zキーを登録
        zKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
      }
    }

    function update(this: Phaser.Scene, time: number) {
      if (!cursors || !player || !background || !bgMeteors) return;

      // 背景をスクロールさせる
      background.tilePositionY -= 2;

      // 背景メテオの移動と削除 (安全なループ処理)
      bgMeteors.getChildren().forEach((child) => {
        const meteor = child as Phaser.GameObjects.Sprite;
        const speed = meteor.getData('speed') || 1;
        meteor.y += speed;

        // 画面下端（マージン込み）を超えたら削除
        if (meteor.y > this.scale.height + 100) {
          meteor.destroy();
        }
      });

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
      // スペースキー または Zキー が押されており、前回の発射から0.25秒以上経過している場合
      const isFiring = cursors.space.isDown || zKey?.isDown;

      if (isFiring && time > lastFiredTime) {
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
