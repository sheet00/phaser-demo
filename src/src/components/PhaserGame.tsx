import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

class DemoScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('DemoScene');
  }

  preload() {
    // Use an existing asset or a placeholder
    this.load.image('hero', '/src/assets/hero.png');
    this.load.image('react', '/src/assets/react.svg');
    this.load.image('vite', '/src/assets/vite.svg');
  }

  create() {
    this.add.text(10, 10, 'Phaser + React Demo', { color: '#ffffff', fontSize: '20px' });
    
    // Create a player
    this.player = this.physics.add.sprite(400, 300, 'hero');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(0.5);

    // Some jumping react icons
    const reacts = this.physics.add.group({
        key: 'react',
        repeat: 5,
        setXY: { x: 100, y: 0, stepX: 120 }
    });

    reacts.children.iterate((child) => {
        const c = child as Phaser.Physics.Arcade.Sprite;
        c.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        c.setCollideWorldBounds(true);
        c.setVelocity(Phaser.Math.Between(-100, 100), 20);
        return true;
    });

    if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
    }
  }

  update() {
    if (!this.cursors || !this.player) return;

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
    } else {
      this.player.setVelocityX(0);
    }

    if (this.cursors.up.isDown && this.player.body.blocked.down) {
      this.player.setVelocityY(-330);
    }
  }
}

export default function PhaserGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 300, x: 0 },
          debug: false,
        },
      },
      scene: DemoScene,
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={gameRef} style={{ width: '800px', height: '600px', margin: 'auto' }} />;
}
