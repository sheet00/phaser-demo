import Phaser from 'phaser';

const FONT_FAMILY = '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
export type ChroniclePage = { speaker: string; body: string };

export default abstract class ChronicleScene extends Phaser.Scene {
  protected readonly tileKey: string;
  protected readonly peopleKey: string;
  protected scenery!: Phaser.GameObjects.Container;
  protected player!: Phaser.Physics.Arcade.Sprite;
  protected playerLabel!: Phaser.GameObjects.Text;
  protected objective!: Phaser.GameObjects.Text;
  protected hint!: Phaser.GameObjects.Text;
  protected progress!: Phaser.GameObjects.Text;
  protected marker!: Phaser.GameObjects.Text;
  protected target = new Phaser.Math.Vector2(650, 500);
  protected busy = false;
  protected finished = false;
  private destination: Phaser.Math.Vector2 | null = null;
  private pages: ChroniclePage[] = [];
  private afterDialogue?: () => void;
  private panel!: Phaser.GameObjects.Container;
  private speaker!: Phaser.GameObjects.Text;
  private speech!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE', Phaser.Input.Keyboard.Key>;

  private readonly title: string;
  protected readonly onNextChapter?: () => void;

  constructor(key: string, title: string, onNextChapter?: () => void) {
    super(key);
    this.title = title;
    this.onNextChapter = onNextChapter;
    this.tileKey = `${key}_tiles`;
    this.peopleKey = `${key}_people`;
  }

  preload() {
    this.load.spritesheet(this.tileKey, '/assets/roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet(this.peopleKey, '/assets/roguelike-characters/Spritesheet/roguelikeChar_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
  }

  create() {
    this.fitCamera();
    this.scale.on('resize', this.fitCamera, this);
    this.scenery = this.add.container();
    this.physics.world.setBounds(35, 375, 890, 280);
    this.player = this.physics.add.sprite(160, 530, this.peopleKey, 325).setScale(3.5).setDepth(30).setCollideWorldBounds(true);
    this.player.body!.setSize(10, 9).setOffset(3, 7);
    this.playerLabel = this.add.text(160, 483, '', this.textStyle(14, '#fff0c2', '#263b4d')).setOrigin(.5).setDepth(35);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE') as typeof this.keys;
    this.input.keyboard!.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.add.rectangle(480, 52, 936, 94, 0x111b30, .98).setStrokeStyle(1, 0xb79a56).setDepth(100);
    this.add.text(28, 12, this.title, { ...this.textStyle(20, '#e5c77e'), fontStyle: 'bold' }).setDepth(101);
    this.progress = this.add.text(930, 15, '', this.textStyle(14, '#fff0c2')).setOrigin(1, 0).setDepth(101);
    this.objective = this.add.text(28, 52, '', this.textStyle(17, '#fff2d0')).setDepth(101);
    this.hint = this.add.text(480, 698, '', this.textStyle(14, '#fff0c2', '#19273b')).setOrigin(.5).setDepth(101).setInteractive({ useHandCursor: true });
    this.marker = this.add.text(650, 450, '', this.textStyle(14, '#ffe7a0', '#374434')).setOrigin(.5).setDepth(36);
    this.panel = this.add.container().setDepth(200).setVisible(false);
    this.panel.add(this.add.rectangle(480, 580, 920, 206, 0x11182d, .98).setStrokeStyle(2, 0xb79a56));
    this.speaker = this.add.text(38, 488, '', { ...this.textStyle(20, '#e5c77e'), fontStyle: 'bold', padding: { top: 8, bottom: 4, left: 4, right: 4 } });
    this.speech = this.add.text(38, 530, '', { ...this.textStyle(19), wordWrap: { width: 874 }, lineSpacing: 8, padding: { top: 8, bottom: 6, left: 4, right: 4 } });
    this.panel.add([this.speaker, this.speech, this.add.text(916, 646, 'SPACE / タップ：次へ', this.textStyle(14, '#d5c9a7')).setOrigin(1, 0)]);
    this.input.on('pointerdown', this.handlePointer, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.fitCamera, this);
      this.input.off('pointerdown', this.handlePointer, this);
      this.input.keyboard?.removeCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    });
    this.startChapter();
  }

  protected abstract startChapter(): void;
  protected abstract interact(): void;

  protected textStyle(size: number, color = '#ffffff', backgroundColor?: string): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, resolution: 3,
      padding: { top: 6, bottom: 4, left: 6, right: 6 }, ...(backgroundColor ? { backgroundColor } : {}) };
  }

  protected tile(col: number, row: number, frame: number, tint = 0xffffff) {
    const image = this.add.image(col * 48, 104 + row * 48, this.tileKey, frame).setOrigin(0).setScale(3).setTint(tint);
    this.scenery.add(image);
    return image;
  }

  protected floor(frame: number, tint = 0xffffff) {
    for (let row = 0; row < 12; row++) for (let col = 0; col < 20; col++) this.tile(col, row, frame, tint);
  }

  protected tree(col: number, row: number, dead = false) {
    this.tile(col, row, dead ? 540 : 583);
    this.tile(col, row + 1, dead ? 597 : 640);
  }

  protected person(x: number, y: number, frame = 486, label?: string) {
    const person = this.add.image(x, y, this.peopleKey, frame).setScale(3.2);
    this.scenery.add(person);
    if (label) this.caption(label, x, y - 42);
    return person;
  }

  protected caption(text: string, x: number, y: number, size = 14) {
    const caption = this.add.text(x, y, text, this.textStyle(size, '#fff0c2', '#344236')).setOrigin(.5);
    this.scenery.add(caption);
    return caption;
  }

  protected clearStage() {
    this.stop();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.scenery.removeAll(true);
    this.marker.setVisible(false);
    this.player.clearTint().setAlpha(1).setScale(3.5).setAngle(0).setPosition(160, 530);
    this.busy = false;
  }

  protected setTarget(x: number, y: number, label: string) {
    this.target.set(x, y);
    this.marker.setPosition(x, y - 48).setText(`▼ ${label}`).setVisible(true);
    this.hint.setText('矢印 / WASD / 地面をタップ：移動　SPACE / 目印をタップ：調べる');
  }

  protected stop() { this.destination = null; this.player.setVelocity(0, 0); }

  protected talk(pages: ChroniclePage[], after?: () => void) {
    this.stop();
    this.pages = [...pages];
    this.afterDialogue = after;
    this.speaker.setText(pages[0].speaker);
    this.speech.setText(pages[0].body);
    this.panel.setVisible(true);
  }

  protected complete(summary: string, nextLabel: string) {
    this.stop();
    this.busy = false;
    this.finished = true;
    this.marker.setVisible(false);
    this.objective.setText(summary);
    this.progress.setText('完');
    this.hint.setText(`SPACE / ここをタップ：${nextLabel}`);
  }

  protected finishAction() {
    this.events.emit('next-chapter');
    this.onNextChapter?.();
  }

  private advanceDialogue() {
    this.pages.shift();
    if (this.pages.length) {
      this.speaker.setText(this.pages[0].speaker);
      this.speech.setText(this.pages[0].body);
      return;
    }
    this.panel.setVisible(false);
    const after = this.afterDialogue;
    this.afterDialogue = undefined;
    after?.();
  }

  private action() {
    if (this.pages.length) { this.advanceDialogue(); return; }
    if (this.busy) return;
    if (this.finished) { this.finishAction(); return; }
    if (Phaser.Math.Distance.BetweenPoints(this.player, this.target) > 125) {
      this.hint.setText('▼ の目印に近づいてから、SPACE / タップ');
      return;
    }
    this.stop();
    this.interact();
  }

  private handlePointer(pointer: Phaser.Input.Pointer) {
    if (this.pages.length) { this.advanceDialogue(); return; }
    if (this.busy) return;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (this.finished || point.y >= 680 || Phaser.Math.Distance.BetweenPoints(point, this.target) < 85
      && Phaser.Math.Distance.BetweenPoints(this.player, this.target) < 125) { this.action(); return; }
    this.destination = new Phaser.Math.Vector2(Phaser.Math.Clamp(point.x, 55, 905), Phaser.Math.Clamp(point.y, 398, 632));
  }

  update() {
    if (!this.player || !this.keys) return;
    this.playerLabel.setPosition(this.player.x, this.player.y - 46);
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) { this.action(); return; }
    if (this.pages.length || this.busy || this.finished) return;
    const movement = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown || this.keys.D.isDown) - Number(this.cursors.left.isDown || this.keys.A.isDown),
      Number(this.cursors.down.isDown || this.keys.S.isDown) - Number(this.cursors.up.isDown || this.keys.W.isDown),
    );
    if (movement.lengthSq()) this.destination = null;
    else if (this.destination) {
      movement.copy(this.destination).subtract(this.player);
      if (movement.length() < 9) { movement.set(0, 0); this.destination = null; }
    }
    movement.normalize().scale(300);
    this.player.setVelocity(movement.x, movement.y);
    if (movement.x) this.player.setFlipX(movement.x < 0);
  }

  private fitCamera() {
    this.cameras.main.setZoom(Math.min(this.scale.width / 960, this.scale.height / 720)).centerOn(480, 360);
  }
}
