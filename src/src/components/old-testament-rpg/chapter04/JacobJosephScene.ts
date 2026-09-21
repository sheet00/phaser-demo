import Phaser from 'phaser';
import { drawChapterScenery } from './scenery';

const FONT_FAMILY = '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
type Phase = 'wrestling' | 'sold' | 'dream' | 'famine' | 'complete';
type Page = { speaker: string; body: string };

export default class JacobJosephScene extends Phaser.Scene {
  private phase: Phase = 'wrestling';
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerLabel!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private destination: Phaser.Math.Vector2 | null = null;
  private scenery!: Phaser.GameObjects.Container;
  private command!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private dialogue!: Phaser.GameObjects.Container;
  private speaker!: Phaser.GameObjects.Text;
  private speech!: Phaser.GameObjects.Text;
  private pages: Page[] = [];
  private afterDialogue: (() => void) | null = null;
  private target = new Phaser.Math.Vector2(700, 500);
  private actionLocked = false;
  private readonly onNextChapter?: () => void;

  constructor(onNextChapter?: () => void) {
    super('jacob-joseph');
    this.onNextChapter = onNextChapter;
  }

  preload() {
    this.load.spritesheet('jacob_joseph_tiles', '/assets/roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet('roguelike_characters', '/assets/roguelike-characters/Spritesheet/roguelikeChar_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.image('angel_alien', '/assets/platformer-pack/Sprites/Characters/Default/character_yellow_idle.png');
  }

  create() {
    this.updateCameraView();
    this.scale.on('resize', () => this.updateCameraView());
    this.physics.world.setBounds(24, 170, 912, 492);
    this.scenery = this.add.container(0, 0);
    this.player = this.physics.add.sprite(220, 520, 'roguelike_characters', 325).setScale(4.0).setDepth(25);
    this.player.setCollideWorldBounds(true).body!.setSize(12, 10).setOffset(2, 6);
    this.playerLabel = this.add.text(220, 476, 'ヤコブ', this.textStyle('#fff8e7', '#344f7a', '15px')).setOrigin(0.5).setDepth(30);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE') as typeof this.keys;
    this.add.rectangle(480, 54, 928, 90, 0x101a35, 0.96).setStrokeStyle(1, 0xb79a56).setDepth(100);
    this.add.text(32, 18, '第4章  ヤコブとヨセフ', { ...this.textStyle('#e5c77e', undefined, '20px'), fontStyle: 'bold' }).setDepth(101);
    this.add.text(495, 18, '操作: 矢印 / WASD　調べる: SPACE / タップ', this.textStyle('#fff2d0', undefined, '14px')).setDepth(101);
    this.command = this.add.text(32, 51, '', { ...this.textStyle('#fff2d0', undefined, '17px'), wordWrap: { width: 880 } }).setDepth(101);
    this.hint = this.add.text(480, 696, '', { ...this.textStyle('#ffffff', '#19203b', '14px'), padding: { top: 6, bottom: 4, left: 8, right: 8 } }).setOrigin(0.5).setDepth(101);
    this.createDialogue();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.pages.length) { this.advanceDialogue(); return; }
      if (this.phase === 'complete') { this.onNextChapter?.(); return; }
      if (this.actionLocked) return;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y) < 140 && Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.target.x, this.target.y) < 170) this.doAction();
      else this.destination = new Phaser.Math.Vector2(Phaser.Math.Clamp(pointer.worldX, 45, 915), Phaser.Math.Clamp(pointer.worldY, 390, 650));
    });
    this.setPhase('wrestling');
    this.talk([
      { speaker: '背景と状況', body: 'かつて兄エサウを欺いて故郷を追われたヤコブ。\n20年ぶりの帰郷の途中、「怒りに燃える兄が400人の兵を率いて迫っている」と知らせが入る。' },
      { speaker: 'ヤコブ', body: '家族を先に川の向こうへ逃がしたが、死の恐怖で震えが止まらない……。\n神よ、私は明日、兄に殺されてしまうのでしょうか！' },
      { speaker: 'ヤコブ', body: '……あそこに立っているのは、光をまとう天からの使いか！？\n逃がすものか！ 私を守り、生かすと約束してくださるまで、絶対に離すものか！' }
    ], () => this.setCommand('神の使いのもとへ進み、必死に助け（祝福）を求めなさい。'));
  }

  private textStyle(color: string, backgroundColor: string | undefined, fontSize: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: FONT_FAMILY, fontSize, color, ...(backgroundColor ? { backgroundColor } : {}), resolution: 3, padding: { top: 6, bottom: 4, left: 6, right: 6 } };
  }

  private setCommand(text: string) { this.command.setText(`神からの司令  ${text}`); }

  private setPhase(phase: Phase) {
    this.phase = phase; this.actionLocked = false; this.destination = null; this.player.setVelocity(0, 0); this.scenery.removeAll(true); this.drawStage();
    const labels: Record<Phase, string> = {
      wrestling: '夜のヤボク川で神の使いに必死にしがみつき、助けの約束（祝福）を求めなさい。',
      sold: '兄たちの妬みを越え、ヨセフの旅を見届けなさい。',
      dream: 'ファラオの夢を解き明かし、七年の備えを始めなさい。',
      famine: '穀物倉庫へ進み、食料を求めてひれ伏す兄たちと対面しなさい。',
      complete: '第4章 完 · 神は悪を善に変え、家族を救いへ導かれた。'
    };
    this.setCommand(labels[phase]);
    this.hint.setText(phase === 'complete' ? 'SPACE / タップ：第5章 出エジプトと十戒へ' : '目的地へ移動し、SPACE / タップで調べる');
  }

  private drawStage() {
    drawChapterScenery(this, this.scenery, this.phase);
    const titles: Record<Phase, string> = {
      wrestling: '月夜のヤボク川 ─ 祝福を求めて',
      sold: 'カナンの荒野 ─ エジプトへ続く道',
      dream: 'エジプト王宮 ─ 七年の豊作、七年の飢饉',
      famine: '王の穀物倉庫 ─ 再び出会う兄弟',
      complete: '希望の朝 ─ 神は悪を善に変えられた',
    };
    this.addLabel(titles[this.phase], 480, 126);
    this.target.set(700, 520);
    if (this.phase !== 'complete') {
      const marker = this.add.graphics();
      marker.lineStyle(2, 0xf7d78b, 0.85).strokeEllipse(700, 548, 68, 19);
      marker.fillStyle(0xf7d78b).fillTriangle(694, 562, 706, 562, 700, 568);
      this.scenery.add(marker);
      this.addLabel(this.phase === 'wrestling' ? '神の使いにしがみつく' : this.phase === 'dream' ? 'ファラオに謁見する' : '兄たち', 700, 587);
    }
  }

  private addLabel(text: string, x: number, y: number) { this.scenery.add(this.add.text(x, y, text, this.textStyle('#fff0c2', '#394236', '16px')).setOrigin(0.5).setDepth(10)); }

  private doAction() {
    if (this.actionLocked || this.phase === 'complete') return;
    this.actionLocked = true; this.destination = null; this.player.setVelocity(0, 0);
    if (this.phase === 'wrestling') this.talk([
      { speaker: '神の使い', body: '夜が明ける。恐れるなヤコブよ。\nお前が夜通し必死にしがみつき、叫び求めた祈りは神に届いた。' },
      { speaker: '神の祝福', body: '今日よりお前の名はヤコブ（人を出し抜く者）ではない。\n神にすがり祈り抜いた者「イスラエル」と名乗りなさい。兄を恐れず進め。' },
      { speaker: '和解と新たな旅', body: 'ヤコブは兄エサウと涙の和解を果たした。\nやがて時は流れ、物語はイスラエルの愛する息子「ヨセフ」へと受け継がれていく――' }
    ], () => this.transition('sold'));
    if (this.phase === 'sold') this.talk([
      { speaker: '兄たち', body: '父上は末っ子のヨセフばかり可愛がって、あいつだけに特別な着物を与えた。許せない……！' },
      { speaker: '兄たち', body: 'おい、そのヨセフがやってきたぞ！ 商人に売り飛ばして、エジプトへ追放してしまおう！' },
      { speaker: 'ヨセフ', body: '兄さんたち、まさか僕を奴隷として売るなんて……！ でも神は、この過酷な道の先にも共におられるはずだ。' }
    ], () => this.transition('dream'));
    if (this.phase === 'dream') this.talk([
      {
        speaker: 'ファラオ',
        body: '「やせ細った7頭の牛が、太った7頭の牛を丸呑みにする夢」を見たのだ。\n国中の賢者の誰一人解けぬ……ヨセフよ、お前に解けるか？'
      },
      {
        speaker: 'ヨセフ',
        body: '解くのは私ではなく神です。これは「7年の大豊作」の後に、すべてを飢えさせる「7年の大飢饉」が来るお告げです。\n豊作の今のうちに、国中の穀物を蓄えねばなりません！'
      },
      {
        speaker: 'ファラオ',
        body: '見事だ！ お前ほど神の知恵を持つ者はいない。\nお前をエジプト全土の最高責任者（総理大臣）に任命する。飢饉に備え、穀物を管理せよ！'
      }
    ], () => this.transition('famine'));
    if (this.phase === 'famine') this.talk([
      {
        speaker: '兄たち',
        body: 'エジプトの総理大臣様、どうか穀物をお恵みください！\n故郷の家族が飢え死にしそうなのです……！'
      },
      {
        speaker: 'ヨセフ',
        body: '兄さんたち、顔を上げてください。……僕です、弟のヨセフです！'
      },
      {
        speaker: '兄たち',
        body: 'なっ……！？ お前があの時のヨセフ！？\n復讐される、殺される……！'
      },
      {
        speaker: 'ヨセフ',
        body: '恐れないでください。\n兄さんたちは僕に悪を行いましたが、神はそれを善に変え、\n多くの命を救うために僕を先に行かせたのです。すべてを赦します。'
      },
      {
        speaker: '家族の和解',
        body: '兄弟は抱き合って涙を流し、過去の憎しみを越えて奇跡の和解を果たしました。'
      }
    ], () => this.transition('complete'));
  }

  private transition(phase: Phase) {
    if (this.phase === 'complete') return;
    this.setPhase(phase);
    this.player.setPosition(220, 520);
    const isJoseph = phase === 'famine' || phase === 'complete' || phase === 'sold' || phase === 'dream';
    this.player.setFrame(isJoseph ? 379 : 325);
    this.playerLabel.setText(phase === 'famine' || phase === 'complete' ? 'ヨセフ' : phase === 'sold' || phase === 'dream' ? 'ヨセフ' : 'イスラエル');
    this.actionLocked = false;
    if (phase === 'dream') {
      this.talk([
        {
          speaker: 'ヨセフの数奇な運命',
          body: 'エジプトの貴族へ奴隷として売られたヨセフ。\n誠実に働くも、無実の罪を着せられて牢屋（監獄）へ落とされてしまう。'
        },
        {
          speaker: 'ヨセフの数奇な運命',
          body: 'だがヨセフは絶望せず、牢の中で「不思議な夢を解き明かす才能」を発揮する。\nその評判は、やがて王宮の最高権力者の耳へと届く……。'
        },
        {
          speaker: 'エジプト国王ファラオ',
          body: '「国の占い師が誰も解けぬ不気味な悪夢に悩まされている。\n牢にいるあの若者（ヨセフ）を、今すぐここへ連れてまいれ！」'
        }
      ], () => this.setCommand('ファラオのもとへ進み、誰にも解けぬ悪夢を解き明かしなさい。'));
    }
    if (phase === 'famine') {
      this.talk([
        {
          speaker: '大飢饉と流れる年月',
          body: 'ヨセフの予言通り、7年の豊作ののち、未曾有の大飢饉が世界を襲った。\n多くの国が飢えに苦しむ中、ヨセフの指示により大量の穀物を蓄えたエジプトだけが生き残っていた。'
        },
        {
          speaker: '飢えと兄たちの来訪',
          body: '故郷カナンでも食料が尽き、飢えに苦しむ兄たちがエジプトへ食料を買いにやって来る。\n目の前の総理大臣が、かつて売り飛ばした弟ヨセフだとは夢にも思わずに……。'
        }
      ], () => this.setCommand('穀物倉庫へ進み、食料を求めてひれ伏す兄たちと対面しなさい。'));
    }
  }
  private createDialogue() { this.dialogue = this.add.container(0, 0).setDepth(200).setVisible(false); this.dialogue.add(this.add.rectangle(480, 595, 916, 180, 0x11182d, 0.98).setStrokeStyle(2, 0xb79a56)); this.speaker = this.add.text(42, 517, '', { ...this.textStyle('#e5c77e', undefined, '20px'), fontStyle: 'bold', padding: { top: 8, bottom: 4, left: 4, right: 4 } }); this.speech = this.add.text(42, 556, '', { ...this.textStyle('#ffffff', undefined, '19px'), lineSpacing: 8, wordWrap: { width: 870 }, padding: { top: 8, bottom: 6, left: 4, right: 4 } }); this.dialogue.add([this.speaker, this.speech, this.add.text(906, 648, 'SPACE / タップで次へ', this.textStyle('#d5c9a7', undefined, '14px')).setOrigin(1, 0)]); }
  private talk(pages: Page[], after?: () => void) { this.destination = null; this.player.setVelocity(0, 0); this.pages = pages; this.afterDialogue = after ?? null; this.speaker.setText(pages[0].speaker); this.speech.setText(pages[0].body); this.dialogue.setVisible(true); }
  private advanceDialogue() { if (!this.pages.length) return; this.pages.shift(); if (this.pages.length) { this.speaker.setText(this.pages[0].speaker); this.speech.setText(this.pages[0].body); return; } this.dialogue.setVisible(false); const after = this.afterDialogue; this.afterDialogue = null; after?.(); }
  update() {
    if (!this.player) return;
    this.playerLabel.setPosition(this.player.x, this.player.y - 44);
    const action = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    if (this.pages.length) { if (action) this.advanceDialogue(); return; }
    if (this.phase === 'complete') { if (action) this.onNextChapter?.(); return; }
    if (this.actionLocked) return;
    const movement = new Phaser.Math.Vector2(Number(this.cursors.right.isDown || this.keys.D.isDown) - Number(this.cursors.left.isDown || this.keys.A.isDown), Number(this.cursors.down.isDown || this.keys.S.isDown) - Number(this.cursors.up.isDown || this.keys.W.isDown));
    if (movement.lengthSq()) this.destination = null;
    else if (this.destination) { movement.copy(this.destination).subtract(this.player); if (movement.length() < 9) { movement.set(0, 0); this.destination = null; } }
    movement.normalize().scale(270);
    this.player.setVelocity(movement.x, movement.y);
    const minX = this.phase === 'wrestling' ? 175 : 45;
    this.player.x = Phaser.Math.Clamp(this.player.x, minX, 915);
    this.player.y = Phaser.Math.Clamp(this.player.y, 405, 650);
    if (this.phase === 'wrestling') {
      if (this.player.x < 215) {
        this.hint.setText('背後にエサウの追っ手が迫っている……！ 川を渡り神の使いに助けを求めよ');
      } else {
        this.hint.setText('目的地へ移動し、SPACE / タップで調べる');
      }
    }
    if (movement.x) this.player.setFlipX(movement.x < 0);
    if (action) this.doAction();
  }
  private updateCameraView() { const zoom = Math.min(this.scale.width / 960, this.scale.height / 720); this.cameras.main.setZoom(zoom); this.cameras.main.centerOn(480, 360); }
}
