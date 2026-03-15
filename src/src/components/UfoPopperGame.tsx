import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function UfoPopperGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    let score = 0;
    let scoreText: Phaser.GameObjects.Text;

    const ufoData = [
      { key: 'shipBeige_manned', weight: 40, score: 50, color: '#f5f5dc' },
      { key: 'shipBlue_manned', weight: 25, score: 100, color: '#00d2ff' },
      { key: 'shipGreen_manned', weight: 20, score: 150, color: '#00ff00' },
      { key: 'shipPink_manned', weight: 10, score: 300, color: '#ff00ff' },
      { key: 'shipYellow_manned', weight: 5, score: 500, color: '#ffff00' }
    ];

    function preload(this: Phaser.Scene) {
      // 背景
      this.load.image('ufo_bg', '/assets/universe_space04.png');
      // UFO
      ufoData.forEach(data => {
        this.load.image(data.key, `/assets/alien-ufo-pack/PNG/${data.key}.png`);
      });
      // 爆発エフェクト
      this.load.image('burst', '/assets/alien-ufo-pack/PNG/laserBlue_burst.png');
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;

      // 背景の配置
      const bg = this.add.image(width / 2, height / 2, 'ufo_bg');
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale).setScrollFactor(0);
      bg.setAlpha(0.3);

      // スコア表示 (左上)
      scoreText = this.add.text(20, 20, 'SCORE: 0', {
        fontSize: '32px',
        color: '#fff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4
      });

      // スコア凡例 (画面下部)
      createScoreLegend.call(this);

      // UFOを出現させるタイマー
      this.time.addEvent({
        delay: 400,
        callback: spawnUfo,
        callbackScope: this,
        loop: true
      });
    }

    function createScoreLegend(this: Phaser.Scene) {
      const { width, height } = this.scale;
      const spacing = 160;
      const startX = width / 2 - (spacing * 2);
      const bottomY = height - 40;

      // 背景パネル
      const panel = this.add.rectangle(width / 2, bottomY, width, 60, 0x000000, 0.5);
      panel.setOrigin(0.5);

      ufoData.forEach((data, index) => {
        const x = startX + (index * spacing);
        const icon = this.add.sprite(x - 30, bottomY, data.key);
        icon.setScale(0.3);
        
        this.add.text(x, bottomY, `${data.score}pts`, {
          fontSize: '18px',
          color: data.color,
          fontStyle: 'bold',
          stroke: '#000',
          strokeThickness: 2
        }).setOrigin(0, 0.5);
      });
    }

    function spawnUfo(this: Phaser.Scene) {
      const { width, height } = this.scale;
      const x = Phaser.Math.Between(100, width - 100);
      const y = Phaser.Math.Between(100, height - 100);
      
      const totalWeight = ufoData.reduce((acc, curr) => acc + curr.weight, 0);
      let random = Phaser.Math.Between(0, totalWeight);
      let selectedUfo = ufoData[0];
      
      for (const data of ufoData) {
        if (random < data.weight) {
          selectedUfo = data;
          break;
        }
        random -= data.weight;
      }

      const ufo = this.add.sprite(x, y, selectedUfo.key);
      ufo.setData('score', selectedUfo.score);
      ufo.setData('color', selectedUfo.color);
      ufo.setInteractive({ useHandCursor: true });
      ufo.setScale(0);

      this.tweens.add({
        targets: ufo,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut'
      });

      ufo.on('pointerdown', () => {
        popUfo.call(this, ufo);
      });

      this.time.delayedCall(2500, () => {
        if (ufo.active) {
          this.tweens.add({
            targets: ufo,
            scale: 0,
            alpha: 0,
            duration: 400,
            onComplete: () => ufo.destroy()
          });
        }
      });
    }

    function popUfo(this: Phaser.Scene, ufo: Phaser.GameObjects.Sprite) {
      const ufoScore = ufo.getData('score') || 0;
      const ufoColor = ufo.getData('color') || '#ffffff';

      score += ufoScore;
      scoreText.setText('SCORE: ' + score);

      const popup = this.add.text(ufo.x, ufo.y - 20, `+${ufoScore}`, {
        fontSize: '24px',
        color: ufoColor,
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3
      }).setOrigin(0.5);

      this.tweens.add({
        targets: popup,
        y: popup.y - 50,
        alpha: 0,
        duration: 800,
        onComplete: () => popup.destroy()
      });

      const burst = this.add.sprite(ufo.x, ufo.y, 'burst');
      burst.setScale(0.5).setTint(Phaser.Display.Color.HexStringToColor(ufoColor).color);
      this.tweens.add({
        targets: burst,
        scale: 1.5,
        alpha: 0,
        duration: 300,
        onComplete: () => burst.destroy()
      });

      ufo.destroy();
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
