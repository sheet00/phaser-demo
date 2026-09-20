import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function FallingGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    let player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    let itemsGroup: Phaser.Physics.Arcade.Group;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    let keyA: Phaser.Input.Keyboard.Key;
    let keyD: Phaser.Input.Keyboard.Key;
    let keySpace: Phaser.Input.Keyboard.Key;

    let bgClouds: Phaser.GameObjects.TileSprite;
    let ground: Phaser.GameObjects.TileSprite;
    let groundCollider: Phaser.Physics.Arcade.Body;

    let score = 0;
    let lives = 3;
    let isGameOver = false;
    let isInvincible = false;

    let scoreText: Phaser.GameObjects.Text;
    let heartIcons: Phaser.GameObjects.Image[] = [];
    let spawnTimerEvent: Phaser.Time.TimerEvent | null = null;
    let gameOverContainer: Phaser.GameObjects.Container | null = null;

    let sndCoin: Phaser.Sound.BaseSound;
    let sndGem: Phaser.Sound.BaseSound;
    let sndHurt: Phaser.Sound.BaseSound;
    let sndBomb: Phaser.Sound.BaseSound;

    let targetPointerX: number | null = null;

    type ItemType = {
      key: string;
      score: number;
      isBomb: boolean;
      scale: number;
      sound: 'coin' | 'gem' | 'bomb';
    };

    const ITEM_DEFINITIONS: ItemType[] = [
      { key: 'coin_bronze', score: 10, isBomb: false, scale: 0.8, sound: 'coin' },
      { key: 'coin_silver', score: 20, isBomb: false, scale: 0.85, sound: 'coin' },
      { key: 'coin_gold', score: 50, isBomb: false, scale: 0.9, sound: 'coin' },
      { key: 'gem_blue', score: 100, isBomb: false, scale: 0.9, sound: 'gem' },
      { key: 'gem_green', score: 100, isBomb: false, scale: 0.9, sound: 'gem' },
      { key: 'gem_red', score: 100, isBomb: false, scale: 0.9, sound: 'gem' },
      { key: 'star', score: 200, isBomb: false, scale: 0.9, sound: 'gem' },
      { key: 'bomb', score: 0, isBomb: true, scale: 0.9, sound: 'bomb' }
    ];

    function preload(this: Phaser.Scene) {
      this.load.image('bg_sky', '/assets/platformer-pack/Sprites/Backgrounds/Default/background_solid_sky.png');
      this.load.image('bg_clouds', '/assets/platformer-pack/Sprites/Backgrounds/Default/background_clouds.png');
      this.load.image('ground_grass', '/assets/platformer-pack/Sprites/Tiles/Default/terrain_grass_block_top.png');

      this.load.image('char_idle', '/assets/platformer-pack/Sprites/Characters/Default/character_pink_idle.png');
      this.load.image('char_walk_a', '/assets/platformer-pack/Sprites/Characters/Default/character_pink_walk_a.png');
      this.load.image('char_walk_b', '/assets/platformer-pack/Sprites/Characters/Default/character_pink_walk_b.png');
      this.load.image('char_hit', '/assets/platformer-pack/Sprites/Characters/Default/character_pink_hit.png');

      this.load.image('coin_bronze', '/assets/platformer-pack/Sprites/Tiles/Default/coin_bronze.png');
      this.load.image('coin_silver', '/assets/platformer-pack/Sprites/Tiles/Default/coin_silver.png');
      this.load.image('coin_gold', '/assets/platformer-pack/Sprites/Tiles/Default/coin_gold.png');
      this.load.image('gem_blue', '/assets/platformer-pack/Sprites/Tiles/Default/gem_blue.png');
      this.load.image('gem_green', '/assets/platformer-pack/Sprites/Tiles/Default/gem_green.png');
      this.load.image('gem_red', '/assets/platformer-pack/Sprites/Tiles/Default/gem_red.png');
      this.load.image('star', '/assets/platformer-pack/Sprites/Tiles/Default/star.png');
      this.load.image('bomb', '/assets/platformer-pack/Sprites/Tiles/Default/bomb.png');

      this.load.image('hud_heart', '/assets/platformer-pack/Sprites/Tiles/Default/hud_heart.png');
      this.load.image('hud_heart_empty', '/assets/platformer-pack/Sprites/Tiles/Default/hud_heart_empty.png');

      this.load.audio('snd_coin', '/assets/platformer-pack/Sounds/sfx_coin.ogg');
      this.load.audio('snd_gem', '/assets/platformer-pack/Sounds/sfx_gem.ogg');
      this.load.audio('snd_hurt', '/assets/platformer-pack/Sounds/sfx_hurt.ogg');
      this.load.audio('snd_bomb', '/assets/platformer-pack/Sounds/sfx_disappear.ogg');
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;
      const groundHeight = 64;
      const groundY = height - groundHeight / 2;

      // 背景と視差スクロール用の雲
      this.add.tileSprite(0, 0, width, height, 'bg_sky').setOrigin(0, 0).setDisplaySize(width, height);
      bgClouds = this.add.tileSprite(0, 0, width, 256, 'bg_clouds').setOrigin(0, 0).setDisplaySize(width, 256);

      // 地面
      ground = this.add.tileSprite(width / 2, groundY, width, groundHeight, 'ground_grass');
      this.physics.add.existing(ground, true);
      groundCollider = ground.body as Phaser.Physics.Arcade.Body;

      // サウンド
      sndCoin = this.sound.add('snd_coin');
      sndGem = this.sound.add('snd_gem');
      sndHurt = this.sound.add('snd_hurt');
      sndBomb = this.sound.add('snd_bomb');

      // プレイヤーアニメーション
      this.anims.create({
        key: 'idle',
        frames: [{ key: 'char_idle' }],
        frameRate: 1
      });
      this.anims.create({
        key: 'walk',
        frames: [{ key: 'char_walk_a' }, { key: 'char_walk_b' }],
        frameRate: 8,
        repeat: -1
      });

      // プレイヤー生成（地面の上に配置）
      player = this.physics.add.sprite(width / 2, groundY - 60, 'char_idle');
      player.setCollideWorldBounds(true);
      player.setBounce(0);
      player.setScale(0.9);
      this.physics.add.collider(player, ground);

      // アイテムグループ
      itemsGroup = this.physics.add.group();

      // アイテムとプレイヤーの衝突判定
      this.physics.add.overlap(player, itemsGroup, (p, itemObj) => {
        handleItemCatch.call(this, itemObj as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);
      });

      // キーボード入力
      if (this.input.keyboard) {
        cursors = this.input.keyboard.createCursorKeys();
        keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      }

      // マウス・タッチ入力（ドラッグまたはタップ位置への追従）
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!isGameOver) targetPointerX = pointer.x;
      });
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown && !isGameOver) targetPointerX = pointer.x;
      });
      this.input.on('pointerup', () => {
        targetPointerX = null;
      });

      // UI表示
      scoreText = this.add.text(24, 24, 'SCORE: 0', {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#2c3e50',
        strokeThickness: 5
      });

      // ライフ表示（右上のMENUボタンを避けて配置）
      heartIcons = [];
      const heartStartX = width - 180;
      for (let i = 0; i < 3; i++) {
        const heart = this.add.image(heartStartX + i * 36, 38, 'hud_heart').setScale(0.8);
        heartIcons.push(heart);
      }

      // 操作説明テキスト（開始時に少し表示してフェードアウト）
      const guideText = this.add.text(width / 2, height / 2 - 40, '← → キー または クリックで移動！\nアイテムを集めて爆弾を避けよう', {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#2c3e50',
        strokeThickness: 4
      }).setOrigin(0.5);

      this.tweens.add({
        targets: guideText,
        alpha: 0,
        delay: 2500,
        duration: 1000,
        onComplete: () => guideText.destroy()
      });

      startSpawning.call(this);
    }

    function startSpawning(this: Phaser.Scene) {
      if (spawnTimerEvent) spawnTimerEvent.destroy();

      const getSpawnDelay = () => {
        // スコア上昇に応じてスポーン間隔を 800ms から最短 320ms まで短縮
        return Math.max(320, 800 - Math.floor(score / 150) * 50);
      };

      const spawnNext = () => {
        if (isGameOver) return;
        spawnItem.call(this);
        spawnTimerEvent = this.time.delayedCall(getSpawnDelay(), spawnNext);
      };

      spawnTimerEvent = this.time.delayedCall(800, spawnNext);
    }

    function spawnSingleItem(this: Phaser.Scene, forcedBomb = false) {
      const { width } = this.scale;
      const x = Phaser.Math.Between(40, width - 40);

      // 爆弾の出現率（初期35%、最大55%まで増加）
      const bombChance = Math.min(0.55, 0.35 + (score / 2500) * 0.20);
      const isBombRoll = forcedBomb || Math.random() < bombChance;

      let itemDef: ItemType;
      if (isBombRoll) {
        itemDef = ITEM_DEFINITIONS.find(it => it.isBomb)!;
      } else {
        const nonBombItems = ITEM_DEFINITIONS.filter(it => !it.isBomb);
        const roll = Math.random();
        if (roll < 0.35) {
          itemDef = nonBombItems[0];
        } else if (roll < 0.6) {
          itemDef = nonBombItems[1];
        } else if (roll < 0.8) {
          itemDef = nonBombItems[2];
        } else if (roll < 0.95) {
          const gemIndex = Phaser.Math.Between(3, 5);
          itemDef = nonBombItems[gemIndex];
        } else {
          itemDef = nonBombItems[6];
        }
      }

      const item = itemsGroup.create(x, -30, itemDef.key) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      item.setScale(itemDef.scale);
      item.setData('def', itemDef);

      // 爆弾は他のアイテムより1.2倍高速で落下
      const baseVelocity = Phaser.Math.Between(180, 260);
      const speedBoost = Math.min(250, Math.floor(score / 100) * 15);
      const totalSpeed = (baseVelocity + speedBoost) * (itemDef.isBomb ? 1.2 : 1.0);
      item.setVelocityY(totalSpeed);

      if (!itemDef.isBomb) {
        this.tweens.add({
          targets: item,
          angle: { from: -10, to: 10 },
          duration: 400,
          yoyo: true,
          repeat: -1
        });
      }
    }

    function spawnItem(this: Phaser.Scene) {
      spawnSingleItem.call(this);

      // 一定確率で追加の爆弾を同時投下
      if (Math.random() < 0.30) {
        spawnSingleItem.call(this, true);
      }
    }

    function handleItemCatch(this: Phaser.Scene, itemObj: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
      if (isGameOver) return;

      const itemDef = itemObj.getData('def') as ItemType;
      const itemX = itemObj.x;
      const itemY = itemObj.y;
      itemObj.destroy();

      if (itemDef.isBomb) {
        if (isInvincible) return;

        // 被弾処理
        lives -= 1;
        sndBomb.play();
        sndHurt.play();
        updateHeartsUI();

        // プレイヤー被弾演出（赤色フラッシュと点滅無敵）
        isInvincible = true;
        this.cameras.main.shake(200, 0.015);
        player.setTexture('char_hit');

        this.tweens.add({
          targets: player,
          alpha: 0.3,
          duration: 100,
          yoyo: true,
          repeat: 6,
          onComplete: () => {
            player.clearAlpha();
            player.setTexture('char_idle');
            isInvincible = false;
          }
        });

        if (lives <= 0) {
          triggerGameOver.call(this);
        }
      } else {
        // スコア加算
        score += itemDef.score;
        scoreText.setText(`SCORE: ${score}`);

        if (itemDef.sound === 'coin') {
          sndCoin.play();
        } else {
          sndGem.play();
        }

        // 獲得スコアのポップアップ演出
        showScorePopup.call(this, itemX, itemY, `+${itemDef.score}`);
      }
    }

    function showScorePopup(this: Phaser.Scene, x: number, y: number, text: string) {
      const popup = this.add.text(x, y, text, {
        fontSize: '20px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);

      this.tweens.add({
        targets: popup,
        y: y - 40,
        alpha: 0,
        duration: 600,
        ease: 'Cubic.easeOut',
        onComplete: () => popup.destroy()
      });
    }

    function updateHeartsUI() {
      for (let i = 0; i < heartIcons.length; i++) {
        if (i < lives) {
          heartIcons[i].setTexture('hud_heart');
        } else {
          heartIcons[i].setTexture('hud_heart_empty');
        }
      }
    }

    function triggerGameOver(this: Phaser.Scene) {
      isGameOver = true;
      if (spawnTimerEvent) spawnTimerEvent.destroy();

      player.setVelocity(0, 0);
      player.setTexture('char_hit');
      player.anims.stop();

      const { width, height } = this.scale;

      gameOverContainer = this.add.container(0, 0);

      // 暗転幕
      const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0, 0);
      gameOverContainer.add(overlay);

      const titleText = this.add.text(width / 2, height / 2 - 80, 'GAME OVER', {
        fontSize: '52px',
        color: '#e74c3c',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }).setOrigin(0.5);
      gameOverContainer.add(titleText);

      const finalScoreText = this.add.text(width / 2, height / 2 - 10, `FINAL SCORE: ${score}`, {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#2c3e50',
        strokeThickness: 4
      }).setOrigin(0.5);
      gameOverContainer.add(finalScoreText);

      const retryBtn = this.add.text(width / 2, height / 2 + 70, 'RESTART', {
        fontSize: '26px',
        color: '#2ecc71',
        backgroundColor: '#ffffff',
        padding: { x: 24, y: 12 },
        fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      retryBtn.on('pointerdown', () => restartGame.call(this));
      retryBtn.on('pointerover', () => retryBtn.setScale(1.08));
      retryBtn.on('pointerout', () => retryBtn.setScale(1.0));
      gameOverContainer.add(retryBtn);

      const hintText = this.add.text(width / 2, height / 2 + 130, 'または SPACE キーで再挑戦', {
        fontSize: '16px',
        color: '#bdc3c7'
      }).setOrigin(0.5);
      gameOverContainer.add(hintText);
    }

    function restartGame(this: Phaser.Scene) {
      if (gameOverContainer) {
        gameOverContainer.destroy();
        gameOverContainer = null;
      }

      // 画面上のアイテムを全消去
      itemsGroup.clear(true, true);

      // 状態リセット
      score = 0;
      lives = 3;
      isGameOver = false;
      isInvincible = false;
      targetPointerX = null;

      scoreText.setText('SCORE: 0');
      updateHeartsUI();

      const { width, height } = this.scale;
      player.setPosition(width / 2, height - 64 - 60);
      player.setTexture('char_idle');
      player.clearAlpha();

      startSpawning.call(this);
    }

    function update(this: Phaser.Scene) {
      if (bgClouds) {
        bgClouds.tilePositionX += 0.3;
      }

      if (isGameOver) {
        if (keySpace && Phaser.Input.Keyboard.JustDown(keySpace)) {
          restartGame.call(this);
        }
        return;
      }

      // 画面外（地面下）に落下したアイテムの回収
      const { height } = this.scale;
      itemsGroup.children.each((child) => {
        const item = child as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        if (item && item.y > height + 50) {
          item.destroy();
        }
        return null;
      });

      // プレイヤーの移動制御
      const speed = 460;
      let moving = false;

      const isLeft = cursors?.left?.isDown || keyA?.isDown;
      const isRight = cursors?.right?.isDown || keyD?.isDown;

      if (isLeft) {
        player.setVelocityX(-speed);
        player.setFlipX(true);
        moving = true;
      } else if (isRight) {
        player.setVelocityX(speed);
        player.setFlipX(false);
        moving = true;
      } else if (targetPointerX !== null) {
        // ポインタ追従
        const diff = targetPointerX - player.x;
        if (Math.abs(diff) > 10) {
          const dir = Math.sign(diff);
          player.setVelocityX(dir * speed);
          player.setFlipX(dir < 0);
          moving = true;
        } else {
          player.setVelocityX(0);
        }
      } else {
        player.setVelocityX(0);
      }

      // アニメーション制御（被弾点滅中でない場合）
      if (!isInvincible) {
        if (moving) {
          player.anims.play('walk', true);
        } else {
          player.anims.play('idle', true);
        }
      }
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
        preload,
        create,
        update
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 }, // アイテム個別に落下速度を設定するため全体重力は0
          debug: false
        }
      }
    };

    const game = new Phaser.Game(config);

    const handleResize = () => {
      if (!game) return;
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      game.scale.resize(newWidth, newHeight);
      if (ground && groundCollider) {
        const groundHeight = 64;
        const groundY = newHeight - groundHeight / 2;
        ground.setPosition(newWidth / 2, groundY);
        ground.setSize(newWidth, groundHeight);
        groundCollider.updateFromGameObject();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.destroy(true);
    };
  }, []);

  return (
    <div
      ref={gameRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
        padding: 0
      }}
    />
  );
}
