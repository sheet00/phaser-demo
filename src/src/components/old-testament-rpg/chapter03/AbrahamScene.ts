import { FONT_FAMILY } from '../typography';
import Phaser from 'phaser';
import { buildAbrahamMap, createBush, createSheep } from './map';


type Phase = 'stars' | 'travel' | 'altar' | 'ram' | 'offering' | 'complete';

export default class AbrahamScene extends Phaser.Scene {
  private phase: Phase = 'stars';
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerLabel!: Phaser.GameObjects.Text;
  private isaac!: Phaser.GameObjects.Sprite;
  private isaacLabel!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private destination: Phaser.Math.Vector2 | null = null;
  private scenery!: Phaser.GameObjects.Container;
  private command!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private dialogue!: Phaser.GameObjects.Container;
  private speaker!: Phaser.GameObjects.Text;
  private speech!: Phaser.GameObjects.Text;
  private pages: { speaker: string; body: string }[] = [];
  private afterDialogue: (() => void) | null = null;
  private sheep?: Phaser.GameObjects.Container;
  private sheepLabel?: Phaser.GameObjects.Text;
  private angel?: Phaser.GameObjects.Sprite;
  private angelLabel?: Phaser.GameObjects.Text;
  private angelGlow?: Phaser.GameObjects.Graphics;
  private nextChapter?: () => void;

  constructor(nextChapter?: () => void) {
    super('abraham');
    this.nextChapter = nextChapter;
  }

  preload() {
    this.load.spritesheet('abraham_tiles', '/assets/roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet('roguelike_characters', '/assets/roguelike-characters/Spritesheet/roguelikeChar_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.image('angel_alien', '/assets/platformer-pack/Sprites/Characters/Default/character_yellow_idle.png');
    this.load.image('abraham_ram', '/assets/cube-pets/Previews/animal-polar.png');
  }

  create() {
    this.updateCameraView();
    this.scale.on('resize', () => this.updateCameraView());
    this.physics.world.setBounds(24, 170, 912, 492);
    this.scenery = this.add.container(0, 0);
    buildAbrahamMap(this, this.scenery);
    this.createStars();
    this.player = this.physics.add.sprite(280, 560, 'roguelike_characters', 486).setScale(4.0).setDepth(25);
    this.player.setCollideWorldBounds(true).body!.setSize(12, 10).setOffset(2, 6);
    this.playerLabel = this.add.text(280, 508, 'アブラハム（父）', {
      fontFamily: FONT_FAMILY, fontSize: '15px', color: '#fff8e7', backgroundColor: '#344f7a',
      resolution: 3, padding: { top: 6, bottom: 4, left: 6, right: 6 }
    }).setOrigin(0.5).setDepth(30);
    this.isaac = this.add.sprite(235, 564, 'roguelike_characters', 378).setScale(3.3).setDepth(24);
    this.isaacLabel = this.add.text(235, 532, 'イサク（息子）', {
      fontFamily: FONT_FAMILY, fontSize: '13px', color: '#fff0c2', backgroundColor: '#3f463c',
      resolution: 3, padding: { top: 5, bottom: 3, left: 6, right: 6 }
    }).setOrigin(0.5).setDepth(30);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE') as typeof this.keys;
    this.add.rectangle(480, 54, 928, 90, 0x101a35, 0.96).setStrokeStyle(1, 0xb79a56).setDepth(100);
    this.add.text(32, 18, '第3章  アブラハムとイサク', {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: '#e5c77e', fontStyle: 'bold',
      resolution: 3, padding: { top: 6, bottom: 4, left: 4, right: 4 }
    }).setDepth(101);
    this.add.text(650, 18, '操作: アブラハム（父）　同行: イサク（息子）', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: '#fff2d0',
      resolution: 3, padding: { top: 6, bottom: 4, left: 4, right: 4 }
    }).setDepth(101);
    this.command = this.add.text(32, 51, '', {
      fontFamily: FONT_FAMILY, fontSize: '17px', color: '#fff2d0', wordWrap: { width: 880 },
      resolution: 3, padding: { top: 6, bottom: 4, left: 4, right: 4 }
    }).setDepth(101);
    this.hint = this.add.text(480, 696, '矢印 / WASD / タップで移動 · SPACE / タップで調べる', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: '#ffffff', backgroundColor: '#19203b',
      resolution: 3, padding: { top: 6, bottom: 4, left: 8, right: 8 }
    }).setOrigin(0.5).setDepth(101);
    this.createDialogue();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.pages.length) { this.advanceDialogue(); return; }
      if (this.phase === 'travel' && Phaser.Math.Distance.Between(this.player.x, this.player.y, 624, 500) < 125 && Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, 624, 500) < 150) {
        this.altarAction();
        return;
      }
      if (this.phase === 'ram' && this.sheep && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.sheep.x, this.sheep.y) < 100 && Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.sheep.x, this.sheep.y) < 120) {
        this.ramAction();
        return;
      }
      if (this.phase === 'travel' || this.phase === 'altar' || this.phase === 'ram') this.destination = new Phaser.Math.Vector2(Phaser.Math.Clamp(pointer.worldX, 45, 915), Phaser.Math.Clamp(pointer.worldY, 380, 650));
    });
    this.setCommand('天を見上げ、神の約束を聞きなさい。');
    this.talk([
      { speaker: '星空の契約', body: '空を見上げなさい。あなたの子孫を、夜空の星のように増やそう。' },
      { speaker: 'モリアの山への試練', body: 'あなたの子イサクを連れ、モリアの山へ行きなさい。\nそこで、わたしに捧げなさい。' }
    ], () => {
      this.phase = 'travel';
      this.setCommand('イサクとともにモリア山へ行き、神の命令を聞きなさい。');
      this.hint.setText('祭壇へ進み、SPACE / タップで調べる');
    });
  }

  private createStars() {
    const stars = this.add.graphics().setDepth(15);
    for (let i = 0; i < 45; i++) {
      const x = 35 + (i * 83) % 890;
      const y = 155 + (i * 47) % 155;
      stars.fillStyle(i % 4 === 0 ? 0xffe4a3 : 0xffffff, 0.9).fillCircle(x, y, i % 5 === 0 ? 3 : 2);
    }
    this.add.text(480, 185, '数えきれない星の約束', {
      fontFamily: FONT_FAMILY, fontSize: '18px', color: '#ffe7a6', fontStyle: 'bold',
      backgroundColor: '#1a2749', resolution: 3, padding: { top: 6, bottom: 4, left: 8, right: 8 }
    }).setOrigin(0.5).setDepth(30);
  }

  private createDialogue() {
    this.dialogue = this.add.container(0, 0).setDepth(200).setVisible(false);
    this.dialogue.add(this.add.rectangle(480, 595, 916, 180, 0x11182d, 0.98).setStrokeStyle(2, 0xb79a56));
    this.speaker = this.add.text(42, 517, '', {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: '#e5c77e', fontStyle: 'bold',
      resolution: 3, padding: { top: 8, bottom: 4, left: 4, right: 4 }
    });
    this.speech = this.add.text(42, 556, '', {
      fontFamily: FONT_FAMILY, fontSize: '19px', color: '#ffffff', lineSpacing: 8, wordWrap: { width: 870 },
      resolution: 3, padding: { top: 8, bottom: 6, left: 4, right: 4 }
    });
    this.dialogue.add([
      this.speaker,
      this.speech,
      this.add.text(906, 648, 'SPACE / タップで次へ', {
        fontFamily: FONT_FAMILY, fontSize: '14px', color: '#d5c9a7',
        resolution: 3, padding: { top: 6, bottom: 4, left: 4, right: 4 }
      }).setOrigin(1, 0)
    ]);
  }

  private setCommand(text: string) { this.command.setText(`神からの司令  ${text}`); }
  private talk(pages: { speaker: string; body: string }[], after?: () => void) { this.stopMovement(); this.pages = pages; this.afterDialogue = after ?? null; this.speaker.setText(pages[0].speaker); this.speech.setText(pages[0].body); this.dialogue.setVisible(true); }
  private advanceDialogue() { this.pages.shift(); if (this.pages.length) { this.speaker.setText(this.pages[0].speaker); this.speech.setText(this.pages[0].body); return; } this.dialogue.setVisible(false); const after = this.afterDialogue; this.afterDialogue = null; after?.(); }

  stopMovement() { this.destination = null; this.player?.setVelocity(0, 0); this.input.keyboard?.resetKeys(); }
  private altarAction() {
    if (this.phase !== 'travel' || Phaser.Math.Distance.Between(this.player.x, this.player.y, 624, 500) > 125) return;
    this.phase = 'altar';
    this.setCommand('祭壇で神に従おうとした、その時……');
    this.talk([
      { speaker: 'イサク', body: '父さん、火と薪はあります。\nでも、捧げ物の羊はどこですか？' },
      { speaker: 'アブラハム', body: 'イサク、神ご自身が捧げ物を備えてくださる。' }
    ], () => {
      this.createAngel();
      this.tweens.add({ targets: [this.angel, this.angelLabel, this.angelGlow], alpha: 1, y: '-=20', duration: 500, onComplete: () => {
        this.talk([{ speaker: '御使い', body: 'アブラハム！ その子に手を下してはならない。\nあなたが神を恐れることが分かった。' }], () => this.afterAngel());
      } });
    });
  }

  private createAngel() {
    this.angelGlow = this.add.graphics().setDepth(22).setAlpha(0);
    this.angelGlow.fillStyle(0xffe6a1, 0.25).fillCircle(624, 260, 60);
    this.angel = this.add.sprite(624, 260, 'angel_alien').setScale(0.55).setTint(0xffedb0).setDepth(25).setAlpha(0);
    this.angelLabel = this.add.text(624, 205, '御使い（天の使い）', {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: '#fff8d8', backgroundColor: '#705c2b',
      resolution: 3, padding: { top: 6, bottom: 4, left: 6, right: 6 }
    }).setOrigin(0.5).setDepth(30).setAlpha(0);
  }

  private afterAngel() {
    this.tweens.add({ targets: [this.isaac, this.isaacLabel], x: this.player.x - 45, y: this.player.y + 4, duration: 600, onComplete: () => {
      this.angel?.setAlpha(0.85);
      this.angelLabel?.setText('御使い（守り）');
      this.time.delayedCall(500, () => this.revealSheep());
    } });
  }

  private revealSheep() {
    if (this.phase !== 'altar') return;
    this.phase = 'ram';
    createBush(this, 780, 435);
    this.sheep = createSheep(this, 780, 435).setAlpha(0);
    this.sheepLabel = this.add.text(780, 385, '茂みに現れた雄羊', {
      fontFamily: FONT_FAMILY, fontSize: '15px', color: '#fff8e7', backgroundColor: '#38533c',
      resolution: 3, padding: { top: 6, bottom: 4, left: 6, right: 6 }
    }).setOrigin(0.5).setDepth(30).setAlpha(0);
    this.tweens.add({ targets: [this.sheep, this.sheepLabel], alpha: 1, y: '-=12', duration: 550 });
    this.setCommand('角を茂みに取られた雄羊を見つけなさい。');
    this.hint.setText('雄羊に近づき SPACE / タップで調べる');
  }

  private ramAction() {
    if (this.phase !== 'ram' || !this.sheep || Phaser.Math.Distance.Between(this.player.x, this.player.y, this.sheep.x, this.sheep.y) > 100) return;
    this.phase = 'offering';
    this.stopMovement();
    this.talk([
      { speaker: 'アブラハム', body: '神が備えてくださったこの雄羊を、イサクの代わりに捧げよう。\nイサクは神に守られた。' }
    ], () => this.offerSheep());
  }

  private offerSheep() {
    if (this.phase !== 'offering' || !this.sheep) return;
    this.sheepLabel?.setText('身代わりの雄羊');
    this.setCommand('雄羊を祭壇へ導き、身代わりとして捧げなさい。');
    this.hint.setText('神が備えた雄羊が、祭壇へ向かう……');
    this.tweens.add({ targets: [this.sheep, this.sheepLabel], x: 624, y: 500, duration: 850, onComplete: () => {
      this.sheepLabel?.setPosition(624, 457);
      const light = this.add.graphics().setDepth(40).setAlpha(0);
      light.fillStyle(0xffe6a1, 0.65).fillCircle(624, 480, 42);
      this.tweens.add({ targets: light, alpha: 1, scale: 1.35, yoyo: true, duration: 450, onComplete: () => {
        light.destroy();
        this.phase = 'complete';
        this.hint.setText('第3章 完 · 章メニューから遊び直せます');
        this.talk([
          { speaker: 'アブラハム', body: '主が備えてくださった雄羊を、身代わりとして捧げました。' },
          { speaker: '信仰の試練と主の備え', body: '神はイサクを止め、雄羊を備えられた。\n父子は守られ、約束は続いていく。' },
          { speaker: '約束の継承・ヤコブとヨセフへ', body: 'やがて約束はヤコブ、そしてヨセフへと受け継がれていく――。\n第4章「ヤコブとヨセフ」へ続く。' }
        ], this.nextChapter);
      } });
    } });
  }

  update() {
    if (!this.player) return;
    this.playerLabel.setPosition(this.player.x, this.player.y - 44);
    this.isaac.setPosition(this.player.x - (this.player.flipX ? -45 : 45), this.player.y + 4);
    this.isaac.setFlipX(this.player.flipX);
    this.isaacLabel.setPosition(this.isaac.x, this.isaac.y - 32);
    const action = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    if (this.pages.length) { if (action) this.advanceDialogue(); return; }
    if (this.phase !== 'travel' && this.phase !== 'ram') return;
    const movement = new Phaser.Math.Vector2(Number(this.cursors.right.isDown || this.keys.D.isDown) - Number(this.cursors.left.isDown || this.keys.A.isDown), Number(this.cursors.down.isDown || this.keys.S.isDown) - Number(this.cursors.up.isDown || this.keys.W.isDown));
    if (movement.lengthSq()) this.destination = null;
    else if (this.destination) { movement.copy(this.destination).subtract(this.player); if (movement.length() < 9) { movement.set(0, 0); this.destination = null; } }
    movement.normalize().scale(270);
    this.player.setVelocity(movement.x, movement.y);
    this.player.y = Phaser.Math.Clamp(this.player.y, 405, 650);
    if (movement.x) this.player.setFlipX(movement.x < 0);
    if (this.phase === 'travel' && action) this.altarAction();
    if (this.phase === 'ram' && action) this.ramAction();
  }

  private updateCameraView() {
    const zoom = Math.min(this.scale.width / 960, this.scale.height / 720);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(480, 360);
  }
}
