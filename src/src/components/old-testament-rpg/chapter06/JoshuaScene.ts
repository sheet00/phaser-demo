import Phaser from 'phaser';

const TILES = 'joshua_tiles';
const FONT_FAMILY = '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
type Phase = 'march' | 'trumpet' | 'collapse' | 'samson' | 'strength' | 'complete';
type Page = { speaker: string; body: string };
const ROUTE = [[200, 520], [200, 206], [760, 206], [760, 520], [480, 566]];

export default class JoshuaScene extends Phaser.Scene {
  private phase: Phase = 'march';
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerLabel!: Phaser.GameObjects.Text;
  private scenery!: Phaser.GameObjects.Container;
  private wall: Phaser.GameObjects.Image[] = [];
  private people: Phaser.GameObjects.Image[] = [];
  private trail: Phaser.Math.Vector2[] = [];
  private obstacle?: Phaser.GameObjects.Zone;
  private wallCollider?: Phaser.Physics.Arcade.Collider;
  private lion?: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Text;
  private command!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Text;
  private actionButton!: Phaser.GameObjects.Text;
  private dialogue!: Phaser.GameObjects.Container;
  private speaker!: Phaser.GameObjects.Text;
  private speech!: Phaser.GameObjects.Text;
  private pages: Page[] = [];
  private afterDialogue: (() => void) | null = null;
  private destination: Phaser.Math.Vector2 | null = null;
  private waypoint = 0;
  private target = new Phaser.Math.Vector2();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private soundContext: AudioContext | null = null;
  private readonly onNextChapter?: () => void;

  constructor(onNextChapter?: () => void) {
    super('joshua');
    this.onNextChapter = onNextChapter;
  }

  preload() {
    this.load.spritesheet(TILES, '/assets/roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet('joshua_characters', '/assets/roguelike-characters/Spritesheet/roguelikeChar_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.image('joshua_lion', '/assets/cube-pets/Previews/animal-lion.png');
  }

  create() {
    this.updateCamera();
    this.scale.on('resize', this.updateCamera, this);
    this.scenery = this.add.container(0, 0);
    this.buildJericho();
    this.physics.world.setBounds(35, 176, 890, 482);
    this.player = this.physics.add.sprite(350, 566, 'joshua_characters', 325).setScale(3.5).setDepth(30);
    this.player.setCollideWorldBounds(true).body!.setSize(10, 9).setOffset(3, 7);
    this.playerLabel = this.add.text(350, 520, 'ヨシュア', this.style(14, '#fff0c2', '#263b4d')).setOrigin(.5).setDepth(35);
    this.obstacle = this.add.zone(480, 348, 432, 216);
    this.physics.add.existing(this.obstacle, true);
    this.wallCollider = this.physics.add.collider(this.player, this.obstacle);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE') as typeof this.keys;
    this.input.keyboard!.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.createUi();
    this.marker = this.add.text(0, 0, '▼ ここへ', this.style(15, '#fff1ad', '#344734')).setOrigin(.5).setDepth(40);
    this.setWaypoint();
    for (let i = 0; i < 5; i++) this.people.push(this.add.image(395 + i * 36, 566, 'joshua_characters', i < 2 ? 594 : 486).setScale(3).setDepth(25));
    for (let i = 0; i < 90; i++) this.trail.push(new Phaser.Math.Vector2(350 + i * 4, 566));
    this.input.on('pointerdown', this.onPointer, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.updateCamera, this);
      this.input.off('pointerdown', this.onPointer, this);
      this.input.keyboard?.removeCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
      this.wallCollider?.destroy();
      if (this.soundContext) void this.soundContext.close().catch(() => {});
      this.soundContext = null;
    });
    this.talk([
      { speaker: 'ヨシュア', body: 'モーセの後を継ぎ、民はヨルダン川を渡った。\n約束の地カナンで、エリコの城壁が立ちはだかる。' },
      { speaker: '七日目の行進', body: '六日間は一日に一周、七日目は七周する。\nいまは最後の一周。祭司と民を率いて、光る目印を回ろう。' },
    ]);
  }

  private style(size: number, color = '#ffffff', backgroundColor?: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, resolution: 3,
      padding: { top: 6, bottom: 4, left: 6, right: 6 }, ...(backgroundColor ? { backgroundColor } : {}) };
  }

  private tile(col: number, row: number, frame: number, tint?: number) {
    const image = this.add.image(col * 48, 104 + row * 48, TILES, frame).setOrigin(0).setScale(3);
    if (tint !== undefined) image.setTint(tint);
    this.scenery.add(image);
    return image;
  }

  private tree(col: number, row: number) {
    this.tile(col, row, 583);
    this.tile(col, row + 1, 640);
  }

  private buildJericho() {
    for (let row = 0; row < 12; row++) for (let col = 0; col < 20; col++) {
      this.tile(col, row, col >= 3 && col <= 16 && row >= 1 && row <= 10 ? 6 : 5);
    }
    for (const [x, y] of [[0, 1], [18, 1], [1, 6], [18, 8], [0, 9]]) this.tree(x, y);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
      const frame = (row === 0 ? 697 : row === 3 ? 811 : 754) + (col === 0 ? 0 : col === 7 ? 2 : 1);
      this.wall.push(this.tile(6 + col, 3 + row, frame));
    }
    for (const col of [5, 14]) for (let row = 2; row < 7; row++) this.wall.push(this.tile(col, row, row === 2 ? 698 : 121));
    this.wall.push(this.tile(9, 6, 37));
    this.wall.push(this.tile(10, 6, 37));
    this.scenery.add(this.add.text(480, 132, 'エリコ ─ 七日目、最後の一周', this.style(16, '#fff0c2', '#374231')).setOrigin(.5));
  }

  private createUi() {
    this.add.rectangle(480, 52, 936, 94, 0x111b30, .98).setStrokeStyle(1, 0xb79a56).setDepth(100);
    this.add.text(28, 12, '第6章　約束の地カナンと士師たち', { ...this.style(20, '#e5c77e'), fontStyle: 'bold' }).setDepth(101);
    this.progress = this.add.text(930, 15, '', this.style(14, '#fff0c2')).setOrigin(1, 0).setDepth(101);
    this.command = this.add.text(28, 51, '', this.style(17, '#fff2d0')).setDepth(101);
    this.actionButton = this.add.text(480, 698, '', this.style(14, '#fff0c2', '#19273b')).setOrigin(.5).setDepth(102).setInteractive({ useHandCursor: true });
    this.dialogue = this.add.container(0, 0).setDepth(200).setVisible(false);
    this.dialogue.add(this.add.rectangle(480, 580, 920, 206, 0x11182d, .98).setStrokeStyle(2, 0xb79a56));
    this.speaker = this.add.text(38, 488, '', { ...this.style(20, '#e5c77e'), fontStyle: 'bold', padding: { top: 8, bottom: 4, left: 4, right: 4 } });
    this.speech = this.add.text(38, 530, '', { ...this.style(19), lineSpacing: 8, wordWrap: { width: 874 }, padding: { top: 8, bottom: 6, left: 4, right: 4 } });
    this.dialogue.add([this.speaker, this.speech, this.add.text(916, 646, 'SPACE / タップ：次へ', this.style(14, '#d5c9a7')).setOrigin(1, 0)]);
  }

  private setWaypoint() {
    const [x, y] = ROUTE[this.waypoint];
    this.target.set(x, y);
    this.marker.setPosition(x, y - 38).setVisible(true);
    this.command.setText('矢印 / WASD / 地面をタップ：祭司と民を率いて城壁を回ろう');
    this.progress.setText(`行進 ${this.waypoint} / ${ROUTE.length}`);
    this.actionButton.setText('▼ の目印へ移動しよう');
  }

  private stop() { this.destination = null; this.player.setVelocity(0, 0); }

  private onPointer(pointer: Phaser.Input.Pointer) {
    if (this.pages.length) { this.advanceDialogue(); return; }
    if (this.phase === 'collapse' || this.phase === 'strength') return;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (this.phase === 'complete' || point.y >= 680) { this.action(); return; }
    if (this.phase !== 'march' && Phaser.Math.Distance.BetweenPoints(point, this.target) < 95
      && Phaser.Math.Distance.BetweenPoints(this.player, this.target) < 145) { this.action(); return; }
    this.destination = new Phaser.Math.Vector2(Phaser.Math.Clamp(point.x, 55, 905), Phaser.Math.Clamp(point.y, 190, 640));
  }

  private action() {
    if (this.pages.length) { this.advanceDialogue(); return; }
    if (this.phase === 'complete') { this.events.emit('next-chapter'); this.onNextChapter?.(); return; }
    if (this.phase !== 'trumpet' && this.phase !== 'samson') return;
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.target) > 145) {
      this.actionButton.setText('▼ の目印に近づいてから、SPACE / タップ');
      return;
    }
    if (this.phase === 'trumpet') this.collapseWalls();
    else this.showStrength();
  }

  private collapseWalls() {
    this.stop();
    this.phase = 'collapse';
    this.marker.setVisible(false);
    this.command.setText('角笛が響く！　民の歓声とともに城壁が崩れていく');
    this.actionButton.setText('「主がこの町を与えてくださった！」');
    this.playHorn();
    this.cameras.main.shake(1400, .007);
    this.people.forEach((person, i) => this.tweens.add({ targets: person, y: person.y - 14, duration: 180, delay: i * 50, yoyo: true, repeat: 3 }));
    this.wallCollider?.destroy();
    this.wallCollider = undefined;
    this.obstacle?.destroy();
    this.wall.forEach((piece, index) => this.tweens.add({
      targets: piece, y: piece.y + 40 + index % 4 * 15, angle: (index % 2 ? 1 : -1) * (12 + index % 5 * 8),
      alpha: .18, duration: 800, delay: index % 8 * 65, ease: 'Bounce.easeOut',
    }));
    this.time.delayedCall(1600, () => this.talk([
      { speaker: 'ヨシュア', body: '城壁が崩れた！　主の約束が道を開いた。\nイスラエルの民は、約束の地で暮らし始めた。' },
      { speaker: '士師たちの時代へ', body: 'やがて民は神を忘れ、敵に苦しめられる。\n悔い改めて助けを求めるたび、神は士師を立てられた。' },
    ], () => this.enterSamson()));
  }

  private enterSamson() {
    this.tweens.killAll();
    this.stop();
    this.people.forEach(person => person.destroy());
    this.people = [];
    this.scenery.removeAll(true);
    this.wall = [];
    for (let row = 0; row < 12; row++) for (let col = 0; col < 20; col++) this.tile(col, row, row >= 7 && row <= 9 ? 6 : 8);
    for (const [x, y] of [[0, 2], [3, 1], [16, 1], [18, 5], [1, 9]]) {
      this.tile(x, y, 540);
      this.tile(x, y + 1, 597);
    }
    for (const [x, y] of [[4, 4], [15, 3], [2, 6], [17, 10]]) this.tile(x, y, 1137);
    for (const col of [5, 10]) {
      this.tile(col, 2, 618); this.tile(col + 1, 2, 619);
      this.tile(col, 3, 675); this.tile(col + 1, 3, 676);
      this.tile(col + 2, 4, 23);
    }
    this.scenery.add(this.add.text(480, 132, 'ペリシテの荒野 ─ 士師サムソン', this.style(16, '#fff0c2', '#54452b')).setOrigin(.5));
    this.player.setPosition(255, 520).setFrame(487);
    this.playerLabel.setText('サムソン');
    this.lion = this.add.image(800, 520, 'joshua_lion').setDisplaySize(112, 112).setDepth(25);
    for (let i = 0; i < 3; i++) this.people.push(this.add.image(130 + i * 40, 590, 'joshua_characters', 486).setScale(3).setDepth(25));
    this.target.set(580, 520);
    this.marker.setPosition(580, 455).setText('▼ ライオンを制する').setVisible(true);
    this.progress.setText('士師サムソン');
    this.command.setText('ライオンの前へ進み、SPACE / タップで神に力を求めよう');
    this.actionButton.setText('矢印 / WASD / タップ：移動　SPACE：アクション');
    this.phase = 'samson';
    this.tweens.add({ targets: this.lion, x: 670, duration: 1000, ease: 'Sine.easeOut' });
  }

  private showStrength() {
    this.stop();
    this.phase = 'strength';
    this.marker.setVisible(false);
    this.tweens.killTweensOf(this.lion!);
    this.command.setText('主の霊がサムソンに力を与える！');
    this.cameras.main.flash(350, 255, 235, 175);
    const light = this.add.graphics().setPosition(this.player.x, this.player.y).setDepth(29);
    light.fillStyle(0xffe3a0, .3).fillCircle(0, 0, 66);
    this.tweens.add({ targets: light, alpha: 0, scale: 1.12, duration: 700, onComplete: () => light.destroy() });
    this.tweens.add({ targets: this.player, x: 585, duration: 250, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: this.lion, x: 880, y: 435, angle: 12, duration: 950, delay: 260, ease: 'Cubic.easeOut', onComplete: () => {
      this.lion!.setFlipX(true).setAngle(0);
      this.talk([
        { speaker: 'サムソン', body: '主が力を与えてくださった！\nライオンを制したサムソンは、ペリシテ人に立ち向かう士師となる。' },
        { speaker: '第6章 完', body: '神を忘れる、苦しむ、悔い改める、救いを受ける。\n士師たちの時代に繰り返された歩みは、王国の時代へ続く。' },
      ], () => {
        this.phase = 'complete';
        this.command.setText('第6章 完 ─ 約束の地と、士師たちによる救い');
        this.progress.setText('次はダビデ');
        this.actionButton.setText('SPACE / ここをタップ：第7章 少年ダビデと巨人ゴリアテへ');
      });
    } });
  }

  private playHorn() {
    try {
      this.soundContext ??= new AudioContext();
      const context = this.soundContext;
      void context.resume().catch(() => {});
      const tone = context.createOscillator();
      const volume = context.createGain();
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(196, context.currentTime);
      tone.frequency.linearRampToValueAtTime(294, context.currentTime + .7);
      volume.gain.setValueAtTime(.001, context.currentTime);
      volume.gain.linearRampToValueAtTime(.09, context.currentTime + .08);
      volume.gain.exponentialRampToValueAtTime(.001, context.currentTime + 1.5);
      tone.connect(volume).connect(context.destination);
      tone.start(); tone.stop(context.currentTime + 1.6);
      tone.onended = () => { tone.disconnect(); volume.disconnect(); };
    } catch {
      // 音声が使えない場合も、歓声の表示と城壁の演出で進行を伝える。
    }
  }

  private talk(pages: Page[], after?: () => void) {
    this.stop();
    this.pages = [...pages];
    this.afterDialogue = after ?? null;
    this.speaker.setText(this.pages[0].speaker);
    this.speech.setText(this.pages[0].body);
    this.dialogue.setVisible(true);
  }

  private advanceDialogue() {
    if (!this.pages.length) return;
    this.pages.shift();
    if (this.pages.length) {
      this.speaker.setText(this.pages[0].speaker);
      this.speech.setText(this.pages[0].body);
      return;
    }
    this.dialogue.setVisible(false);
    const after = this.afterDialogue;
    this.afterDialogue = null;
    after?.();
  }

  update(_time: number, delta: number) {
    if (!this.player || !this.keys) return;
    this.playerLabel.setPosition(this.player.x, this.player.y - 43);
    const action = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    if (this.pages.length) { if (action) this.advanceDialogue(); return; }
    if (action) this.action();
    if (!['march', 'trumpet', 'samson'].includes(this.phase)) return;
    const movement = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown || this.keys.D.isDown) - Number(this.cursors.left.isDown || this.keys.A.isDown),
      Number(this.cursors.down.isDown || this.keys.S.isDown) - Number(this.cursors.up.isDown || this.keys.W.isDown),
    );
    if (movement.lengthSq()) this.destination = null;
    else if (this.destination) {
      movement.copy(this.destination).subtract(this.player);
      if (movement.length() < 9) { movement.set(0, 0); this.destination = null; }
    }
    movement.normalize().scale(315);
    this.player.setVelocity(movement.x, movement.y);
    if (movement.x) this.player.setFlipX(movement.x < 0);
    if (this.phase === 'march') {
      if (Phaser.Math.Distance.BetweenPoints(this.trail[0], this.player) > 5) {
        this.trail.unshift(new Phaser.Math.Vector2(this.player.x, this.player.y));
        this.trail.length = Math.min(100, this.trail.length);
      }
      this.people.forEach((person, index) => {
        const point = this.trail[Math.min(this.trail.length - 1, (index + 1) * 7)];
        person.x = Phaser.Math.Linear(person.x, point.x, 1 - Math.exp(-delta / 70));
        person.y = Phaser.Math.Linear(person.y, point.y, 1 - Math.exp(-delta / 70));
      });
      if (Phaser.Math.Distance.BetweenPoints(this.player, this.target) < 38) {
        this.waypoint++;
        if (this.waypoint < ROUTE.length) this.setWaypoint();
        else {
          this.stop();
          this.phase = 'trumpet';
          this.progress.setText('七周目 完了');
          this.marker.setText('▼ 角笛と歓声');
          this.command.setText('行進完了！　SPACE / タップで角笛を鳴らし、歓声を上げよう');
          this.actionButton.setText('SPACE / ここをタップ：角笛と歓声');
        }
      }
    }
  }

  private updateCamera() {
    this.cameras.main.setZoom(Math.min(this.scale.width / 960, this.scale.height / 720)).centerOn(480, 360);
  }
}
