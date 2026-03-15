import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export default function UfoPopperGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    let score = 0;
    let scoreText: Phaser.GameObjects.Text;
    let ufoGroup: Phaser.GameObjects.Group;

    const ufoKeys = ['shipBlue_manned', 'shipGreen_manned', 'shipPink_manned', 'shipYellow_manned', 'shipBeige_manned'];

    function preload(this: Phaser.Scene) {
      // 背景
      this.load.image('ufo_bg', '/assets/universe_space04.png');
      // UFO (乗組員ありバージョン)
      this.load.image('shipBlue_manned', '/assets/alien-ufo-pack/PNG/shipBlue_manned.png');
      this.load.image('shipGreen_manned', '/assets/alien-ufo-pack/PNG/shipGreen_manned.png');
      this.load.image('shipPink_manned', '/assets/alien-ufo-pack/PNG/shipPink_manned.png');
      this.load.image('shipYellow_manned', '/assets/alien-ufo-pack/PNG/shipYellow_manned.png');
      this.load.image('shipBeige_manned', '/assets/alien-ufo-pack/PNG/shipBeige_manned.png');
      // 爆発エフェクト
      this.load.image('burst', '/assets/alien-ufo-pack/PNG/laserBlue_burst.png');
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;

      // 背景の配置 (画面いっぱいに広げる)
      const bg = this.add.image(width / 2, height / 2, 'ufo_bg');
      const scaleX = width / bg.width;
      const scaleY = height / bg.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale).setScrollFactor(0);
      bg.setAlpha(0.3); // 背景を薄くする

      ufoGroup = this.add.group();

      // スコア表示
      scoreText = this.add.text(20, 20, 'SCORE: 0', {
        fontSize: '32px',
        color: '#fff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4
      });

      // UFOを出現させるタイマー
      this.time.addEvent({
        delay: 800,
        callback: spawnUfo,
        callbackScope: this,
        loop: true
      });
    }

    function spawnUfo(this: Phaser.Scene) {
      const { width, height } = this.scale;
      const x = Phaser.Math.Between(100, width - 100);
      const y = Phaser.Math.Between(100, height - 100);
      const key = Phaser.Utils.Array.GetRandom(ufoKeys);

      const ufo = this.add.sprite(x, y, key);
      ufo.setInteractive({ useHandCursor: true });
      ufo.setScale(0); // 最初はサイズ0

      // 出現アニメーション
      this.tweens.add({
        targets: ufo,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut'
      });

      // クリックイベント
      ufo.on('pointerdown', () => {
        popUfo.call(this, ufo);
      });

      // 2.5秒後に自動消滅（クリックされなかった場合）
      this.time.delayedCall(2500, () => {
        if (ufo.active) {
          this.tweens.add({
            targets: ufo,
            scale: 0,
            alpha: 0,
            duration: 400, // 少しゆっくり消えるように
            onComplete: () => ufo.destroy()
          });
        }
      });
    }

    function popUfo(this: Phaser.Scene, ufo: Phaser.GameObjects.Sprite) {
      // スコア加算
      score += 100;
      scoreText.setText('SCORE: ' + score);

      // 爆発エフェクト
      const burst = this.add.sprite(ufo.x, ufo.y, 'burst');
      burst.setScale(0.5);
      this.tweens.add({
        targets: burst,
        scale: 1.5,
        alpha: 0,
        duration: 300,
        onComplete: () => burst.destroy()
      });

      // UFO消滅
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
