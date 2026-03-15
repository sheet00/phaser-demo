import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

/**
 * RPG ADVENTURE ゲーム画面
 * ポケモン風UI - 修正版
 */
export default function RpgGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    // 定数データ
    const playerDataBase = { name: 'ゆうしゃ', lv: 1, hp: 20, maxHp: 20, atk: 5, exp: 0, maxExp: 10, gold: 0 };
    const enemyList = [
      { name: 'コウモリ', key: 'enemy_bat', lv: 1, hp: 15, maxHp: 15, atk: 3, scale: 1.5, rewardExp: 10, rewardGold: 10 },
      { name: 'スライム', key: 'enemy_slime', lv: 1, hp: 20, maxHp: 20, atk: 2, scale: 1.5, rewardExp: 12, rewardGold: 15 },
      { name: 'トカゲ', key: 'enemy_lizard', lv: 2, hp: 25, maxHp: 25, atk: 4, scale: 1.5, rewardExp: 25, rewardGold: 30 }
    ];

    function preload(this: Phaser.Scene) {
      // 影なし画像に戻す
      this.load.image('enemy_bat', '/assets/pipoya-rpg-monster-pack/without-shadow/pipo-enemy001.png');
      this.load.image('enemy_slime', '/assets/pipoya-rpg-monster-pack/without-shadow/pipo-enemy009.png');
      this.load.image('enemy_lizard', '/assets/pipoya-rpg-monster-pack/without-shadow/pipo-enemy016.png');
      this.load.audio('se_hit_p', '/assets/sounds/maou_se_battle17.ogg');
      this.load.audio('se_hit_e', '/assets/sounds/maou_se_battle12.ogg');
    }

    function create(this: Phaser.Scene) {
      const { width, height } = this.scale;
      this.cameras.main.setBackgroundColor('#cceeff');

      // --- 変数初期化 ---
      const player = { ...playerDataBase };
      // ランダム出現
      const enemyData = Phaser.Math.RND.pick(enemyList);
      let enemy = { ...enemyData };
      let isPlayerTurn = true;

      // プレート座標
      const pX = width - 360;
      const pY = height - 330;

      // UI参照用
      let logText: Phaser.GameObjects.Text;
      let phText: Phaser.GameObjects.Text;
      let pBar: Phaser.GameObjects.Rectangle;
      let pExpBar: Phaser.GameObjects.Rectangle;
      let eBar: Phaser.GameObjects.Rectangle;
      let enemyNameText: Phaser.GameObjects.Text;
      let enemyLvText: Phaser.GameObjects.Text;
      let pLvText: Phaser.GameObjects.Text;
      let pExpText: Phaser.GameObjects.Text;
      let pGoldText: Phaser.GameObjects.Text;

      // --- 演出用：ダメージ数字の表示 ---
      const showDamage = (x: number, y: number, amount: number, color: string) => {
        const dmgText = this.add.text(x, y, `-${amount}`, {
          fontSize: '48px',
          color: color,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 6
        }).setOrigin(0.5);

        this.tweens.add({
          targets: dmgText,
          y: y - 100,
          alpha: 0,
          duration: 800,
          ease: 'Cubic.out',
          onComplete: () => dmgText.destroy()
        });
      };

      // --- UI更新 ---
      const updatePlayerUI = () => {
        pLvText.setText(`Lv${player.lv}`);
        phText.setText(`${player.hp}/ ${player.maxHp}`);
        pBar.width = 240 * (player.hp / player.maxHp);
        pExpBar.width = 240 * Math.min(1, player.exp / player.maxExp);
        pExpText.setText(`${player.exp}/ ${player.maxExp}`);
        pGoldText.setText(`GOLD: ${player.gold} G`);
      };

      // --- 次の敵を探す ---
      const findNextEnemy = () => {
        const nextData = Phaser.Math.RND.pick(enemyList);
        enemy = { ...nextData };
        
        // 敵UIの更新
        enemyNameText.setText(enemy.name);
        enemyLvText.setText(`Lv${enemy.lv}`);
        eBar.width = 240;
        eBar.setFillStyle(0x00ff00);
        
        // モンスター画像の更新
        monster.setTexture(enemy.key);
        monster.setAlpha(1);
        monster.setScale(enemy.scale);
        
        logText.setText(`${enemy.name} が あらわれた！`);
        
        this.time.delayedCall(1000, () => {
          isPlayerTurn = true;
          logText.setText(`どうする？`);
        });
      };

      // --- 勝利後の選択肢を表示 ---
      const showPostBattleMenu = () => {
        const mx = width / 2;
        const my = height / 2;
        
        const sBtn = this.add.rectangle(mx - 100, my, 160, 60, 0x333333).setInteractive({ useHandCursor: true });
        const sTxt = this.add.text(mx - 100, my, 'ショップへ', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
        
        const nBtn = this.add.rectangle(mx + 100, my, 160, 60, 0x333333).setInteractive({ useHandCursor: true });
        const nTxt = this.add.text(mx + 100, my, 'つぎの敵へ', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

        sBtn.on('pointerdown', () => {
          sBtn.destroy(); sTxt.destroy(); nBtn.destroy(); nTxt.destroy();
          logText.setText('ショップは準備中です...');
          this.time.delayedCall(1500, () => showPostBattleMenu());
        });

        nBtn.on('pointerdown', () => {
          sBtn.destroy(); sTxt.destroy(); nBtn.destroy(); nTxt.destroy();
          findNextEnemy();
        });
      };

      // --- 全滅時のリトライ表示 ---
      const showGameOverMenu = () => {
        const mx = width / 2;
        const my = height / 2;

        const overTxt = this.add.text(mx, my - 60, 'ぜんめつしてしまった...', { 
          fontSize: '48px', color: '#ff0000', fontStyle: 'bold' 
        }).setOrigin(0.5);

        const retryBtn = this.add.rectangle(mx, my + 40, 160, 60, 0x333333).setInteractive({ useHandCursor: true });
        const retryTxt = this.add.text(mx, my + 40, 'リトライ', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

        retryBtn.on('pointerdown', () => {
          overTxt.destroy(); retryBtn.destroy(); retryTxt.destroy();

          // ステータス初期化
          player.lv = playerDataBase.lv;
          player.hp = playerDataBase.maxHp;
          player.maxHp = playerDataBase.maxHp;
          player.atk = playerDataBase.atk;
          player.exp = 0;
          player.maxExp = 10;
          player.gold = 0;

          updatePlayerUI();
          findNextEnemy();
        });
      };

      // --- 敵のターン処理 ---
      const startEnemyTurn = () => {
        isPlayerTurn = false;
        this.time.delayedCall(1200, () => {
          if (enemy.hp <= 0) return;
          logText.setText(`${enemy.name} の こうげき！`);
          this.time.delayedCall(800, () => {
            const isMiss = Math.random() < 0.1;
            
            if (isMiss) {
              logText.setText(`${player.name} は こうげきを かわした！`);
            } else {
              const isCritical = Math.random() < 0.2;
              let damage = Math.floor(enemy.atk * (0.5 + Math.random() * 1.0));
              if (isCritical) damage *= 2;
              if (damage <= 0) damage = 1;

              this.sound.play('se_hit_e');
              player.hp = Math.max(0, player.hp - damage);
              showDamage(pX + 160, pY + 50, damage, '#ff0000');
              phText.setText(`${player.hp}/ ${player.maxHp}`);
              pBar.width = 240 * (player.hp / player.maxHp);
              if (player.hp / player.maxHp < 0.3) pBar.setFillStyle(0xff0000);

              if (isCritical) {
                logText.setText('つうこんのいちげき！');
                this.time.delayedCall(800, () => {
                  logText.setText(`${player.name} は ${damage} の ダメージを うけた！`);
                });
              } else {
                logText.setText(`${player.name} は ${damage} の ダメージを うけた！`);
              }
              this.cameras.main.shake(200, 0.01);
            }

            this.time.delayedCall(1000, () => {
              if (player.hp <= 0) {
                logText.setText(`${player.name} は たおれてしまった...`);
                this.time.delayedCall(1500, () => showGameOverMenu());
              } else {
                isPlayerTurn = true;
                logText.setText(`どうする？`);
              }
            });
          });
        });
      };

      // --- UIプレート描画 ---
      const uiGraphics = this.add.graphics();
      uiGraphics.fillStyle(0xffffff, 1);
      uiGraphics.lineStyle(4, 0x555555, 1);
      
      // 敵プレート (左上)
      uiGraphics.fillRoundedRect(40, 60, 280, 80, 10);
      uiGraphics.strokeRoundedRect(40, 60, 280, 80, 10);
      enemyNameText = this.add.text(60, 75, enemy.name, { fontSize: '22px', color: '#333333', fontStyle: 'bold' });
      enemyLvText = this.add.text(260, 78, `Lv${enemy.lv}`, { fontSize: '18px', color: '#333333', fontStyle: 'bold' });
      this.add.rectangle(60, 110, 240, 10, 0xdddddd).setOrigin(0);
      eBar = this.add.rectangle(60, 110, 240, 10, 0x00ff00).setOrigin(0);

      // プレイヤープレート
      uiGraphics.fillRoundedRect(pX, pY, 320, 150, 10);
      uiGraphics.strokeRoundedRect(pX, pY, 320, 150, 10);
      this.add.text(pX + 20, pY + 15, player.name, { fontSize: '22px', color: '#333333', fontStyle: 'bold' });
      pLvText = this.add.text(pX + 240, pY + 18, `Lv${player.lv}`, { fontSize: '18px', color: '#333333', fontStyle: 'bold' });
      
      // HP表示 (統一形式: ラベル, バー, 数値)
      this.add.text(pX + 20, pY + 50, 'HP', { fontSize: '16px', color: '#333333', fontStyle: 'bold' });
      this.add.rectangle(pX + 60, pY + 55, 240, 10, 0xdddddd).setOrigin(0);
      pBar = this.add.rectangle(pX + 60, pY + 55, 240, 10, 0x00ff00).setOrigin(0);
      phText = this.add.text(pX + 220, pY + 70, `${player.hp}/ ${player.maxHp}`, { 
        fontSize: '16px', color: '#333333', fontStyle: 'bold' 
      }).setOrigin(0.5, 0);

      // EXP表示 (統一形式: ラベル, バー, 数値)
      this.add.text(pX + 20, pY + 90, 'EX', { fontSize: '16px', color: '#333333', fontStyle: 'bold' });
      this.add.rectangle(pX + 60, pY + 95, 240, 8, 0xdddddd).setOrigin(0);
      pExpBar = this.add.rectangle(pX + 60, pY + 95, 0, 8, 0xffcc00).setOrigin(0);
      pExpText = this.add.text(pX + 220, pY + 108, `${player.exp}/ ${player.maxExp}`, { 
        fontSize: '14px', color: '#333333', fontStyle: 'bold' 
      }).setOrigin(0.5, 0);

      // ゴールド表示
      pGoldText = this.add.text(pX + 20, pY + 125, `GOLD: ${player.gold} G`, { 
        fontSize: '16px', color: '#333333', fontStyle: 'bold' 
      });

      // --- モンスター ---
      // 画面中央より200px上に配置
      const monster = this.add.image(width / 2, height / 2 - 200, enemy.key);
      monster.setOrigin(0.5); // 中心を基準にする
      monster.setScale(enemy.scale);

      // --- メッセージ & コマンド ---
      const bY = height - 150;
      uiGraphics.fillStyle(0xffffff, 1);
      uiGraphics.fillRect(0, bY, width, 150);
      uiGraphics.lineStyle(6, 0x333333, 1);
      uiGraphics.strokeRect(0, bY, width, 150);

      logText = this.add.text(40, bY + 45, `${enemy.name} が あらわれた！`, { 
        fontSize: '28px', color: '#333333', padding: { top: 10, bottom: 10 } 
      });

      // --- デバッグ機能: レベル変更ボタン ---
      [{ label: 'Lv+1', dy: 0 }, { label: 'Lv-1', dy: 40 }].forEach((btnData, i) => {
        const bx = width - 200;
        const by = 20 + btnData.dy;
        const btn = this.add.rectangle(bx, by, 80, 30, 0x333333, 0.7).setInteractive({ useHandCursor: true });
        this.add.text(bx, by, btnData.label, { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);

        btn.on('pointerdown', () => {
          if (btnData.label === 'Lv+1') {
            player.lv++;
            player.maxHp += 10;
            player.atk += 2;
          } else if (player.lv > 1) {
            player.lv--;
            player.maxHp -= 10;
            player.atk -= 2;
          }
          player.hp = player.maxHp;
          player.maxExp = Math.floor(10 * Math.pow(1.2, player.lv - 1));
          updatePlayerUI();
          logText.setText(`デバッグ: レベルを ${player.lv} に変更しました`);
        });
      });

      ['たたかう', 'ぼうぎょ'].forEach((cmd, i) => {
        const cx = (width - 350) + (i * 160);
        const cy = bY + 40;
        const btn = this.add.rectangle(cx, cy, 140, 60, 0xeeeeee).setOrigin(0).setInteractive({ useHandCursor: true });
        btn.setStrokeStyle(3, 0x444444);
        this.add.text(cx + 70, cy + 30, cmd, { fontSize: '24px', color: '#333333', fontStyle: 'bold' }).setOrigin(0.5);

        btn.on('pointerdown', () => {
          if (!isPlayerTurn || cmd !== 'たたかう') return;
          isPlayerTurn = false;

          // 回避判定 (10%)
          const isMiss = Math.random() < 0.1;

          if (isMiss) {
            logText.setText(`${player.name} の こうげきは はずれた！`);
            this.time.delayedCall(1000, () => {
              startEnemyTurn();
            });
          } else {
            const isCritical = Math.random() < 0.2;
            let damage = Math.floor(player.atk * (0.5 + Math.random() * 1.0));
            if (isCritical) damage *= 2;
            if (damage <= 0) damage = 1;

            this.sound.play('se_hit_p');
            enemy.hp = Math.max(0, enemy.hp - damage);
            
            // ダメージ表示 (モンスター付近)
            showDamage(width / 2, height / 2 - 200, damage, isCritical ? '#ffff00' : '#ffffff');

            eBar.width = 240 * (enemy.hp / enemy.maxHp);
            if (enemy.hp / enemy.maxHp < 0.3) eBar.setFillStyle(0xff0000);

            if (isCritical) {
              logText.setText('かいしんのいちげき！');
              this.time.delayedCall(800, () => {
                logText.setText(`${enemy.name} に ${damage} の ダメージを あたえた！`);
              });
            } else {
              logText.setText(`${enemy.name} に ${damage} の ダメージを あたえた！`);
            }
            this.tweens.add({ targets: monster, x: monster.x + 10, duration: 50, yoyo: true, repeat: 3 });

            if (enemy.hp <= 0) {
              this.time.delayedCall(500, () => {
                logText.setText(`${enemy.name} を たおした！`);
                this.tweens.add({ 
                  targets: monster, 
                  alpha: 0, 
                  scale: 0, 
                  duration: 500,
                  onComplete: () => {
                    this.time.delayedCall(800, () => {
                      const actualExp = Math.floor(enemy.rewardExp * (0.5 + Math.random() * 2.0));
                      logText.setText(`${actualExp} の けいけんちを かくとく！`);
                      player.exp += actualExp;

                      // 経験値UI更新
                      pExpBar.width = 240 * Math.min(1, player.exp / player.maxExp);
                      pExpText.setText(`${player.exp}/ ${player.maxExp}`);

                      this.time.delayedCall(1200, () => {
                        const actualGold = Math.floor(enemy.rewardGold * (0.5 + Math.random() * 2.0));
                        logText.setText(`${actualGold} ゴールドを かくとく！`);
                        player.gold += actualGold;
                        updatePlayerUI();

                        this.time.delayedCall(1200, () => {
                          if (player.exp >= player.maxExp) {
                            // レベルアップ処理
                            player.lv++;
                            player.exp -= player.maxExp;
                            player.maxExp = Math.floor(player.maxExp * 1.2);
                            player.maxHp += 10;
                            player.hp = player.maxHp;
                            player.atk += 2;

                            logText.setText('レベルアップ！');
                            this.sound.play('se_hit_p'); // 演出用SE

                            // レベルアップUI更新
                            pLvText.setText(`Lv${player.lv}`);
                            phText.setText(`${player.hp}/ ${player.maxHp}`);
                            pBar.width = 240;
                            pBar.setFillStyle(0x00ff00);
                            pExpBar.width = 240 * Math.min(1, player.exp / player.maxExp);
                            pExpText.setText(`${player.exp}/ ${player.maxExp}`);

                            this.time.delayedCall(1500, () => {
                              logText.setText(`${player.name} は レベル ${player.lv} に なった！`);
                              this.time.delayedCall(1500, () => showPostBattleMenu());
                            });
                          } else {
                            showPostBattleMenu();
                          }
                        });
                      });
                    });
                  }
                });
              });
            } else {
              startEnemyTurn();
            }
          }
        });
      });
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: { preload: preload, create: create }
    };

    const game = new Phaser.Game(config);
    return () => { game.destroy(true); };
  }, []);

  return <div ref={gameRef} style={{ width: '100vw', height: '100vh', background: '#000' }} />;
}
