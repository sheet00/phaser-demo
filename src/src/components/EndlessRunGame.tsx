import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function EndlessRunGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    let background: Phaser.GameObjects.TileSprite;
    let groundTop: Phaser.GameObjects.TileSprite;
    let groundCenter: Phaser.GameObjects.TileSprite;
    let groundBottom: Phaser.GameObjects.TileSprite;
    let player: Phaser.GameObjects.Sprite;

    function preload(this: Phaser.Scene) {
      // 丘の背景
      this.load.image('hills_bg', '/assets/platformer-pack/Sprites/Backgrounds/Double/background_color_hills.png');
      // 地面タイル (3層)
      this.load.image('ground_grass', '/assets/platformer-pack/Sprites/Tiles/Default/terrain_grass_block_top.png');
      this.load.image('sand_center', '/assets/platformer-pack/Sprites/Tiles/Default/terrain_sand_block_center.png');
      this.load.image('sand_bottom', '/assets/platformer-pack/Sprites/Tiles/Default/terrain_sand_block_bottom.png');
      // プレイヤー (歩行アニメーション用2枚)
      this.load.image('player_walk1', '/assets/platformer-pack/Sprites/Characters/Default/character_green_walk_a.png');
      this.load.image('player_walk2', '/assets/platformer-pack/Sprites/Characters/Default/character_green_walk_b.png');
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;

      // 背景
      background = this.add.tileSprite(0, 0, width, height, 'hills_bg');
      background.setOrigin(0, 0);
      const bgTexture = this.textures.get('hills_bg').getSourceImage() as HTMLImageElement;
      background.setTileScale(height / bgTexture.height);

      // 3層地面の配置 (タイルサイズ 64x64)
      const tileSize = 64;
      const groundY = Math.floor(height - (tileSize * 3));

      groundTop = this.add.tileSprite(0, groundY, width, tileSize, 'ground_grass');
      groundTop.setOrigin(0, 0);

      groundCenter = this.add.tileSprite(0, groundY + tileSize, width, tileSize, 'sand_center');
      groundCenter.setOrigin(0, 0);

      groundBottom = this.add.tileSprite(0, groundY + (tileSize * 2), width, tileSize, 'sand_bottom');
      groundBottom.setOrigin(0, 0);

      // 走りアニメーションの作成
      this.anims.create({
        key: 'run',
        frames: [
          { key: 'player_walk1' },
          { key: 'player_walk2' }
        ],
        frameRate: 10,
        repeat: -1
      });

      // プレイヤーの配置 (さらに右側へ)
      player = this.add.sprite(400, groundY, 'player_walk1');
      player.setOrigin(0.5, 1);
      player.play('run');
    }

    function update(this: Phaser.Scene) {
      if (!background || !groundTop || !groundCenter || !groundBottom) return;
      const scrollSpeed = 5;
      
      background.tilePositionX += 1;
      groundTop.tilePositionX += scrollSpeed;
      groundCenter.tilePositionX += scrollSpeed;
      groundBottom.tilePositionX += scrollSpeed;
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
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
      if (background) background.setSize(window.innerWidth, window.innerHeight);
      const h = window.innerHeight;
      if (groundTop) groundTop.setY(h - 192);
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
