import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

/**
 * RPG ADVENTURE ゲーム画面
 * ドラクエ風のターン制UIを実装
 */
export default function RpgGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    // ゲームデータ（簡易版）
    const player = {
      lv: 1,
      hp: 20,
      maxHp: 20,
      gold: 0,
      exp: 0,
      atk: 5
    };

    const enemy = {
      name: 'スライムっぽいもの',
      hp: 15,
      maxHp: 15
    };

    function preload(this: Phaser.Scene) {
      this.load.image('enemy', '/assets/Pipoya RPG Monster Pack/陰影効果なし/pipo-enemy001.png');
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;

      // 背景色（真っ黒）
      this.cameras.main.setBackgroundColor('#000000');

      // --- 1. ウィンドウ描画関数 ---
      const drawWindow = (x: number, y: number, w: number, h: number) => {
        const graphics = this.add.graphics();
        // 背景（濃い青）
        graphics.fillStyle(0x000088, 1);
        graphics.fillRoundedRect(x, y, w, h, 8);
        // 枠線（白）
        graphics.lineStyle(3, 0xffffff, 1);
        graphics.strokeRoundedRect(x, y, w, h, 8);
        return graphics;
      };

      // --- 2. ステータスウィンドウ (上部) ---
      const statusW = 600;
      const statusH = 60;
      const statusX = (width - statusW) / 2;
      const statusY = 20;
      drawWindow(statusX, statusY, statusW, statusH);

      const statusText = this.add.text(statusX + 20, statusY + 15, 
        `Lv: ${player.lv}  HP: ${player.hp}/${player.maxHp}  GOLD: ${player.gold}  EXP: ${player.exp}`, 
        { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }
      );

      // --- 3. メインエリア (モンスター) ---
      const monster = this.add.image(width / 2, height / 2 - 20, 'enemy');
      monster.setScale(3);

      // --- 4. メッセージウィンドウ (下部) ---
      const msgW = width - 40;
      const msgH = 120;
      const msgX = 20;
      const msgY = height - msgH - 20;
      drawWindow(msgX, msgY, msgW, msgH);

      const logText = this.add.text(msgX + 30, msgY + 30, 
        `${enemy.name} が あらわれた！`, 
        { 
          fontSize: '24px', 
          color: '#ffffff', 
          lineSpacing: 10,
          padding: { top: 12, bottom: 4 }
        }
      );

      // --- 5. コマンドウィンドウ (左中央) ---
      const cmdW = 160;
      const cmdH = 180;
      const cmdX = 40;
      const cmdY = height / 2 - 40;
      drawWindow(cmdX, cmdY, cmdW, cmdH);

      const commands = ['たたかう', 'じゅもん', 'ぼうぎょ', 'にげる'];
      commands.forEach((cmd, i) => {
        const cmdBtn = this.add.text(cmdX + 30, cmdY + 25 + (i * 40), cmd, {
          fontSize: '22px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setInteractive({ useHandCursor: true });

        cmdBtn.on('pointerover', () => cmdBtn.setColor('#ffff00'));
        cmdBtn.on('pointerout', () => cmdBtn.setColor('#ffffff'));

        if (cmd === 'たたかう') {
          cmdBtn.on('pointerdown', () => {
            logText.setText(`${enemy.name} に ${player.atk} の ダメージ！`);
            // モンスターを少し揺らす演出
            this.tweens.add({
              targets: monster,
              x: monster.x + 10,
              duration: 50,
              yoyo: true,
              repeat: 3
            });
          });
        }
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

  return (
    <div ref={gameRef} style={{ width: '100vw', height: '100vh', background: '#000' }} />
  );
}
