import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function EndlessRunGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const JUMP_VELOCITY = -1500;
    const GRAVITY = 3000;

    let background: Phaser.GameObjects.TileSprite;
    let groundTop: Phaser.GameObjects.TileSprite;
    let groundCenter: Phaser.GameObjects.TileSprite;
    let groundBottom: Phaser.GameObjects.TileSprite;
    let player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    let obstacles: Phaser.Physics.Arcade.Group;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    let jumpSound: Phaser.Sound.BaseSound;
    let hurtSound: Phaser.Sound.BaseSound;
    let isInvincible = false;

    function preload(this: Phaser.Scene) {
      this.load.image('hills_bg', '/assets/platformer-pack/Sprites/Backgrounds/Double/background_color_hills.png');
      this.load.image('ground_grass', '/assets/platformer-pack/Sprites/Tiles/Default/terrain_grass_block_top.png');
      this.load.image('sand_center', '/assets/platformer-pack/Sprites/Tiles/Default/terrain_sand_block_center.png');
      this.load.image('sand_bottom', '/assets/platformer-pack/Sprites/Tiles/Default/terrain_sand_block_bottom.png');

      this.load.image('player_walk1', '/assets/platformer-pack/Sprites/Characters/Default/character_green_walk_a.png');
      this.load.image('player_walk2', '/assets/platformer-pack/Sprites/Characters/Default/character_green_walk_b.png');
      this.load.image('player_jump', '/assets/platformer-pack/Sprites/Characters/Default/character_green_jump.png');

      this.load.image('hill_top', '/assets/platformer-pack/Sprites/Tiles/Default/hill_top_smile.png');
      this.load.image('hill_base', '/assets/platformer-pack/Sprites/Tiles/Default/hill.png');

      this.load.audio('jump_snd', '/assets/platformer-pack/Sounds/sfx_jump.ogg');
      this.load.audio('hurt_snd', '/assets/platformer-pack/Sounds/sfx_hurt.ogg');
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;

      jumpSound = this.sound.add('jump_snd');
      hurtSound = this.sound.add('hurt_snd');

      background = this.add.tileSprite(0, 0, width, height, 'hills_bg').setOrigin(0, 0);
      const bgTexture = this.textures.get('hills_bg').getSourceImage() as HTMLImageElement;
      background.setTileScale(height / bgTexture.height);

      const tileSize = 64;
      const groundY = Math.floor(height - (tileSize * 3));

      groundTop = this.add.tileSprite(0, groundY, width, tileSize, 'ground_grass').setOrigin(0, 0);
      this.physics.add.existing(groundTop, true);

      groundCenter = this.add.tileSprite(0, groundY + tileSize, width, tileSize, 'sand_center').setOrigin(0, 0);
      groundBottom = this.add.tileSprite(0, groundY + (tileSize * 2), width, tileSize, 'sand_bottom').setOrigin(0, 0);

      this.anims.create({
        key: 'run',
        frames: [{ key: 'player_walk1' }, { key: 'player_walk2' }],
        frameRate: 12,
        repeat: -1
      });

      player = this.physics.add.sprite(400, groundY - 50, 'player_walk1');
      player.setOrigin(0.5, 1).setCollideWorldBounds(true).play('run');

      this.physics.add.collider(player, groundTop);

      obstacles = this.physics.add.group();

      this.physics.add.overlap(player, obstacles, () => {
        if (!isInvincible) {
          hurtSound.play();
          isInvincible = true;
          player.setTint(0xff0000);

          this.time.delayedCall(500, () => {
            player.clearTint();
            isInvincible = false;
          });
        }
      });

      this.time.addEvent({
        delay: Phaser.Math.Between(1500, 3000),
        callback: spawnObstacle,
        callbackScope: this,
        loop: true
      });

      if (this.input.keyboard) {
        cursors = this.input.keyboard.createCursorKeys();
      }
    }

    function spawnObstacle(this: Phaser.Scene) {
      const { width } = this.scale;
      const tileSize = 64;
      const groundY = this.scale.height - (tileSize * 3);
      const heightInBlocks = Phaser.Math.Between(1, 3);

      for (let i = 0; i < heightInBlocks; i++) {
        const x = width + 100;
        const y = groundY - (i * tileSize);
        const key = (i === heightInBlocks - 1) ? 'hill_top' : 'hill_base';

        const block = obstacles.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
        block.setOrigin(0.5, 1);

        if (block.body instanceof Phaser.Physics.Arcade.Body) {
          block.body.allowGravity = false;
          block.body.immovable = true;
        }
        block.setVelocityX(-450);
      }
    }

    function update(this: Phaser.Scene) {
      if (!background || !groundTop || !player || !cursors) return;

      const scrollSpeed = 7.5;

      background.tilePositionX += 1.5;
      groundTop.tilePositionX += scrollSpeed;
      groundCenter.tilePositionX += scrollSpeed;
      groundBottom.tilePositionX += scrollSpeed;

      const isGrounded = player.body.touching.down;

      if (cursors.space.isDown && isGrounded) {
        jumpSound.play();
        player.setVelocityY(JUMP_VELOCITY);
        player.setTexture('player_jump');
        player.anims.stop();
      }

      if (!isGrounded) {
        player.setTexture('player_jump');
      } else if (player.body.velocity.y === 0 && !player.anims.isPlaying) {
        player.play('run');
      }

      obstacles.getChildren().forEach((obs) => {
        const obstacle = obs as Phaser.Physics.Arcade.Sprite;
        if (obstacle.x < -100) {
          obstacle.destroy();
        }
      });
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      pixelArt: true,
      roundPixels: true,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: GRAVITY },
          debug: false
        }
      },
      scene: { preload, create, update }
    };

    const game = new Phaser.Game(config);

    const handleResize = () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
      if (background) background.setSize(window.innerWidth, window.innerHeight);
      const h = window.innerHeight;
      if (groundTop) {
        groundTop.setY(h - 192);
        (groundTop.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      }
      if (groundCenter) groundCenter.setY(h - 128);
      if (groundBottom) groundBottom.setY(h - 64);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} style={{ width: '100vw', height: '100vh', background: '#000' }} />;
}
