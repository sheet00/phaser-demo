import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

/**
 * RPG ADVENTURE ゲーム画面
 * ポケモン風UI - 王道ショップ追加版
 */
export default function RpgGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    // 定数データ
    const playerDataBase = { name: 'ゆうしゃ', lv: 1, hp: 20, maxHp: 20, atk: 5, def: 0, exp: 0, maxExp: 10, gold: 0, boughtItems: [] as string[] };
    const enemyList = [
      { name: 'コウモリ', key: 'enemy_bat', lv: 1, hp: 15, maxHp: 15, atk: 3, scale: 1.5, rewardExp: 10, rewardGold: 10 },
      { name: 'スライム', key: 'enemy_slime', lv: 1, hp: 20, maxHp: 20, atk: 2, scale: 1.5, rewardExp: 12, rewardGold: 15 },
      { name: 'トカゲ', key: 'enemy_lizard', lv: 2, hp: 25, maxHp: 25, atk: 4, scale: 1.5, rewardExp: 25, rewardGold: 30 }
    ];

    function preload(this: Phaser.Scene) {
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
      const player = { ...playerDataBase, boughtItems: [] as string[] };
      const enemyData = Phaser.Math.RND.pick(enemyList);
      let enemy = { ...enemyData };
      let isPlayerTurn = true;

      const pX = width - 360;
      const pY = height - 360;

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
      let pAtkText: Phaser.GameObjects.Text;
      let pDefText: Phaser.GameObjects.Text;

      const showDamage = (x: number, y: number, amount: number, color: string) => {
        const dmgText = this.add.text(x, y, `-${amount}`, {
          fontSize: '48px', color: color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);
        this.tweens.add({
          targets: dmgText, y: y - 100, alpha: 0, duration: 800, ease: 'Cubic.out', onComplete: () => dmgText.destroy()
        });
      };

      const updatePlayerUI = () => {
        pLvText.setText(`Lv${player.lv}`);
        phText.setText(`${player.hp}/ ${player.maxHp}`);
        pBar.width = 240 * (player.hp / player.maxHp);
        pExpBar.width = 240 * Math.min(1, player.exp / player.maxExp);
        pExpText.setText(`${player.exp}/ ${player.maxExp}`);
        pGoldText.setText(`GOLD: ${player.gold} G`);
        pAtkText.setText(`こうげき: ${player.atk}`);
        pDefText.setText(`ぼうぎょ: ${player.def}`);
      };

      const findNextEnemy = () => {
        const nextData = Phaser.Math.RND.pick(enemyList);
        enemy = { ...nextData };
        enemyNameText.setText(enemy.name);
        enemyLvText.setText(`Lv${enemy.lv}`);
        eBar.width = 240;
        eBar.setFillStyle(0x00ff00);
        monster.setTexture(enemy.key);
        monster.setAlpha(1);
        monster.setScale(enemy.scale);
        logText.setText(`${enemy.name} が あらわれた！`);
        this.time.delayedCall(1000, () => { isPlayerTurn = true; logText.setText(`どうする？`); });
      };

      // --- ショップ機能 ---
      const showShopMenu = () => {
        const mx = width / 2;
        const my = height / 2;
        const bg = this.add.rectangle(mx, my, 500, 500, 0x000000, 0.8).setOrigin(0.5);
        const shopTitle = this.add.text(mx, my - 210, 'ショップ', { fontSize: '32px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        
        const allItems = [
          { name: '宿屋', price: 10, effect: () => { player.hp = player.maxHp; }, desc: 'HP全回復', once: false },
          { name: 'ひのきのぼう', price: 10, effect: () => { player.atk += 1; }, desc: 'こうげき +1', once: true },
          { name: 'こんぼう', price: 25, effect: () => { player.atk += 3; }, desc: 'こうげき +3', once: true },
          { name: 'ちからのたね', price: 50, effect: () => { player.atk += 2; }, desc: 'こうげき +2', once: false },
          { name: 'てつのたて', price: 60, effect: () => { player.def += 3; }, desc: 'ぼうぎょ +3', once: true },
          { name: 'ロングソード', price: 100, effect: () => { player.atk += 10; }, desc: 'こうげき +10', once: true }
        ];

        const items = allItems.filter(item => !item.once || !player.boughtItems.includes(item.name));
        const itemGroup = this.add.group();
        itemGroup.add(bg); itemGroup.add(shopTitle);

        items.forEach((item, i) => {
          const iy = my - 130 + i * 55;
          const btn = this.add.rectangle(mx, iy, 440, 45, 0x333333).setInteractive({ useHandCursor: true });
          const txt = this.add.text(mx, iy, `${item.name} (${item.price}G) - ${item.desc}`, { fontSize: '18px', color: '#ffffff', padding: { top: 6 } }).setOrigin(0.5);
          
          btn.on('pointerover', () => btn.setFillStyle(0x555555));
          btn.on('pointerout', () => btn.setFillStyle(0x333333));

          btn.on('pointerdown', () => {
            if (player.gold >= item.price) {
              player.gold -= item.price;
              if (item.once) player.boughtItems.push(item.name);
              item.effect();
              updatePlayerUI();
              this.sound.play('se_hit_p');
              logText.setText(`${item.name} を 買った！`);
              itemGroup.destroy(true);
              showShopMenu();
            } else {
              logText.setText('ゴールドが たりない！');
            }
          });
          itemGroup.add(btn); itemGroup.add(txt);
        });

        const exitBtn = this.add.rectangle(mx, my + 210, 160, 50, 0x666666).setInteractive({ useHandCursor: true });
        const exitTxt = this.add.text(mx, my + 210, '店を出る', { fontSize: '24px', color: '#ffffff', padding: { top: 6 } }).setOrigin(0.5);
        itemGroup.add(exitBtn); itemGroup.add(exitTxt);

        exitBtn.on('pointerover', () => exitBtn.setFillStyle(0x888888));
        exitBtn.on('pointerout', () => exitBtn.setFillStyle(0x666666));

        exitBtn.on('pointerdown', () => {
          itemGroup.destroy(true);
          showPostBattleMenu();
        });
      };

      const showPostBattleMenu = () => {
        const mx = width / 2;
        const my = height / 2;
        const sBtn = this.add.rectangle(mx - 100, my, 160, 60, 0x333333).setInteractive({ useHandCursor: true });
        const sTxt = this.add.text(mx - 100, my, 'ショップへ', { fontSize: '24px', color: '#ffffff', padding: { top: 6 } }).setOrigin(0.5);
        const nBtn = this.add.rectangle(mx + 100, my, 160, 60, 0x333333).setInteractive({ useHandCursor: true });
        const nTxt = this.add.text(mx + 100, my, 'つぎの敵へ', { fontSize: '24px', color: '#ffffff', padding: { top: 6 } }).setOrigin(0.5);

        sBtn.on('pointerdown', () => { sBtn.destroy(); sTxt.destroy(); nBtn.destroy(); nTxt.destroy(); showShopMenu(); });
        nBtn.on('pointerdown', () => { sBtn.destroy(); sTxt.destroy(); nBtn.destroy(); nTxt.destroy(); findNextEnemy(); });
      };

      const showGameOverMenu = () => {
        const mx = width / 2;
        const my = height / 2;
        const overTxt = this.add.text(mx, my - 60, 'ぜんめつしてしまった...', { fontSize: '48px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
        const retryBtn = this.add.rectangle(mx, my + 40, 160, 60, 0x333333).setInteractive({ useHandCursor: true });
        const retryTxt = this.add.text(mx, my + 40, 'リトライ', { fontSize: '24px', color: '#ffffff', padding: { top: 6 } }).setOrigin(0.5);

        retryBtn.on('pointerdown', () => {
          overTxt.destroy(); retryBtn.destroy(); retryTxt.destroy();
          player.lv = playerDataBase.lv; player.hp = playerDataBase.maxHp; player.maxHp = playerDataBase.maxHp;
          player.atk = playerDataBase.atk; player.def = playerDataBase.def; player.exp = 0; player.maxExp = 10; player.gold = 0;
          player.boughtItems = [];
          pBar.setFillStyle(0x00ff00);
          updatePlayerUI(); findNextEnemy();
        });
      };

      const startEnemyTurn = () => {
        isPlayerTurn = false;
        this.time.delayedCall(1200, () => {
          if (enemy.hp <= 0) return;
          logText.setText(`${enemy.name} の こうげき！`);
          this.time.delayedCall(800, () => {
            if (Math.random() < 0.1) {
              logText.setText(`${player.name} は こうげきを かわした！`);
            } else {
              const isCrit = Math.random() < 0.2;
              let dmg = Math.floor(enemy.atk * (0.5 + Math.random() * 1.0));
              if (isCrit) dmg *= 2;
              dmg = Math.max(1, dmg - player.def); // 防御適用

              this.sound.play('se_hit_e');
              player.hp = Math.max(0, player.hp - dmg);
              showDamage(pX + 160, pY + 50, dmg, '#ff0000');
              phText.setText(`${player.hp}/ ${player.maxHp}`);
              pBar.width = 240 * (player.hp / player.maxHp);
              if (player.hp / player.maxHp < 0.3) pBar.setFillStyle(0xff0000);

              if (isCrit) {
                logText.setText('つうこんのいちげき！');
                this.time.delayedCall(800, () => logText.setText(`${player.name} は ${dmg} の ダメージを うけた！`));
              } else {
                logText.setText(`${player.name} は ${dmg} の ダメージを うけた！`);
              }
              this.cameras.main.shake(200, 0.01);
            }
            this.time.delayedCall(1000, () => {
              if (player.hp <= 0) {
                logText.setText(`${player.name} は たおれてしまった...`);
                this.time.delayedCall(1500, () => showGameOverMenu());
              } else { isPlayerTurn = true; logText.setText(`どうする？`); }
            });
          });
        });
      };

      // --- UI描画 ---
      const uiGraphics = this.add.graphics();
      uiGraphics.fillStyle(0xffffff, 1); uiGraphics.lineStyle(4, 0x555555, 1);
      uiGraphics.fillRoundedRect(40, 60, 280, 80, 10); uiGraphics.strokeRoundedRect(40, 60, 280, 80, 10);
      enemyNameText = this.add.text(60, 75, enemy.name, { fontSize: '22px', color: '#333333', fontStyle: 'bold' });
      enemyLvText = this.add.text(260, 78, `Lv${enemy.lv}`, { fontSize: '18px', color: '#333333', fontStyle: 'bold' });
      this.add.rectangle(60, 110, 240, 10, 0xdddddd).setOrigin(0);
      eBar = this.add.rectangle(60, 110, 240, 10, 0x00ff00).setOrigin(0);

      uiGraphics.fillRoundedRect(pX, pY, 320, 180, 10); uiGraphics.strokeRoundedRect(pX, pY, 320, 180, 10);
      this.add.text(pX + 20, pY + 15, player.name, { fontSize: '22px', color: '#333333', fontStyle: 'bold' });
      pLvText = this.add.text(pX + 240, pY + 18, `Lv${player.lv}`, { fontSize: '18px', color: '#333333', fontStyle: 'bold' });
      this.add.text(pX + 20, pY + 50, 'HP', { fontSize: '16px', color: '#333333', fontStyle: 'bold' });
      this.add.rectangle(pX + 60, pY + 55, 240, 10, 0xdddddd).setOrigin(0);
      pBar = this.add.rectangle(pX + 60, pY + 55, 240, 10, 0x00ff00).setOrigin(0);
      phText = this.add.text(pX + 220, pY + 70, `${player.hp}/ ${player.maxHp}`, { fontSize: '16px', color: '#333333', fontStyle: 'bold' }).setOrigin(0.5, 0);
      this.add.text(pX + 20, pY + 90, 'EX', { fontSize: '16px', color: '#333333', fontStyle: 'bold' });
      this.add.rectangle(pX + 60, pY + 95, 240, 8, 0xdddddd).setOrigin(0);
      pExpBar = this.add.rectangle(pX + 60, pY + 95, 0, 8, 0xffcc00).setOrigin(0);
      pExpText = this.add.text(pX + 220, pY + 108, `${player.exp}/ ${player.maxExp}`, { fontSize: '14px', color: '#333333', fontStyle: 'bold' }).setOrigin(0.5, 0);
      pGoldText = this.add.text(pX + 20, pY + 125, `GOLD: ${player.gold} G`, { fontSize: '16px', color: '#333333', fontStyle: 'bold' });
      pAtkText = this.add.text(pX + 20, pY + 150, `こうげき: ${player.atk}`, { fontSize: '16px', color: '#333333', fontStyle: 'bold', padding: { top: 6 } });
      pDefText = this.add.text(pX + 160, pY + 150, `ぼうぎょ: ${player.def}`, { fontSize: '16px', color: '#333333', fontStyle: 'bold', padding: { top: 6 } });

      const monster = this.add.image(width / 2, height / 2 - 200, enemy.key).setScale(enemy.scale);
      const bY = height - 150;
      uiGraphics.fillStyle(0xffffff, 1); uiGraphics.fillRect(0, bY, width, 150);
      uiGraphics.lineStyle(6, 0x333333, 1); uiGraphics.strokeRect(0, bY, width, 150);
      logText = this.add.text(40, bY + 45, `${enemy.name} が あらわれた！`, { fontSize: '28px', color: '#333333', padding: { top: 10, bottom: 10 } });
// --- デバッグ機能: レベル変更ボタン (開発環境のみ) ---
if (import.meta.env.DEV) {
  [{ label: 'Lv+1', dy: 0 }, { label: 'Lv-1', dy: 40 }].forEach((btnData) => {
    const bx = width - 200, by = 20 + btnData.dy;
    const btn = this.add.rectangle(bx, by, 80, 30, 0x333333, 0.7).setInteractive({ useHandCursor: true });
    this.add.text(bx, by, btnData.label, { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    btn.on('pointerdown', () => {
      if (btnData.label === 'Lv+1') { player.lv++; player.maxHp += 10; player.atk += 2; }
      else if (player.lv > 1) { player.lv--; player.maxHp -= 10; player.atk -= 2; }
      player.hp = player.maxHp; player.maxExp = Math.floor(10 * Math.pow(1.2, player.lv - 1));
      updatePlayerUI();
    });
  });
}

      ['たたかう', 'ぼうぎょ'].forEach((cmd, i) => {
        const cx = (width - 350) + (i * 160), cy = bY + 40;
        const btn = this.add.rectangle(cx, cy, 140, 60, 0xeeeeee).setOrigin(0).setInteractive({ useHandCursor: true });
        btn.setStrokeStyle(3, 0x444444);
        this.add.text(cx + 70, cy + 30, cmd, { fontSize: '24px', color: '#333333', fontStyle: 'bold' }).setOrigin(0.5);
        btn.on('pointerdown', () => {
          if (!isPlayerTurn || cmd !== 'たたかう') return;
          isPlayerTurn = false;
          if (Math.random() < 0.1) {
            logText.setText(`${player.name} の こうげきは はずれた！`);
            this.time.delayedCall(1000, () => startEnemyTurn());
          } else {
            const isCrit = Math.random() < 0.2;
            let dmg = Math.floor(player.atk * (0.5 + Math.random() * 1.0));
            if (isCrit) dmg *= 2;
            this.sound.play('se_hit_p');
            enemy.hp = Math.max(0, enemy.hp - dmg);
            showDamage(width / 2, height / 2 - 200, dmg, isCrit ? '#ffff00' : '#ffffff');
            eBar.width = 240 * (enemy.hp / enemy.maxHp);
            if (enemy.hp / enemy.maxHp < 0.3) eBar.setFillStyle(0xff0000);
            if (isCrit) { logText.setText('かいしんのいちげき！'); this.time.delayedCall(800, () => logText.setText(`${enemy.name} に ${dmg} の ダメージ！`)); }
            else { logText.setText(`${enemy.name} に ${dmg} の ダメージ！`); }
            this.tweens.add({ targets: monster, x: monster.x + 10, duration: 50, yoyo: true, repeat: 3 });
            if (enemy.hp <= 0) {
              this.time.delayedCall(500, () => {
                logText.setText(`${enemy.name} を たおした！`);
                this.tweens.add({ targets: monster, alpha: 0, scale: 0, duration: 500, onComplete: () => {
                  this.time.delayedCall(800, () => {
                    const actualExp = Math.floor(enemy.rewardExp * (0.5 + Math.random() * 2.0));
                    const actualGold = Math.floor(enemy.rewardGold * (0.5 + Math.random() * 2.0));
                    
                    logText.setText(`${actualExp} の けいけんち！`);
                    player.exp += actualExp;
                    
                    this.time.delayedCall(1200, () => {
                      logText.setText(`${actualGold} ゴールド！`);
                      player.gold += actualGold;
                      
                      // レベルアップ判定（複数レベル対応）
                      let levelUpOccurred = false;
                      while (player.exp >= player.maxExp) {
                        levelUpOccurred = true;
                        player.lv++;
                        player.exp -= player.maxExp;
                        player.maxExp = Math.floor(player.maxExp * 1.2);
                        player.maxHp += 10;
                        player.hp = player.maxHp;
                        player.atk += 2;
                      }

                      updatePlayerUI();

                      if (levelUpOccurred) {
                        logText.setText('レベルアップ！');
                        this.sound.play('se_hit_p');
                        this.time.delayedCall(1500, () => {
                          logText.setText(`${player.name} は Lv${player.lv} になった！`);
                          this.time.delayedCall(1500, () => showPostBattleMenu());
                        });
                      } else {
                        showPostBattleMenu();
                      }
                    });
                  });
                }});
              });
            } else { startEnemyTurn(); }
          }
        });
      });
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight, parent: gameRef.current,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: { preload: preload, create: create }
    };
    const game = new Phaser.Game(config);
    return () => { game.destroy(true); };
  }, []);

  return <div ref={gameRef} style={{ width: '100vw', height: '100vh', background: '#000' }} />;
}
