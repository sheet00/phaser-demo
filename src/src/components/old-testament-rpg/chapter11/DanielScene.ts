import Phaser from 'phaser';
import ChronicleScene from '../ChronicleScene';

export default class DanielScene extends ChronicleScene {
  private phase: 'palace' | 'den' = 'palace';
  private prayers = 0;
  private lions: Phaser.GameObjects.Image[] = [];

  constructor(onNextChapter?: () => void) { super('daniel', '第11章　獅子の穴のダニエル', onNextChapter); }

  preload() {
    super.preload();
    this.load.image('daniel_lion', '/assets/cube-pets/Previews/animal-lion.png');
    this.load.image('daniel_angel', '/assets/platformer-pack/Sprites/Characters/Default/character_yellow_idle.png');
  }

  protected startChapter() {
    this.playerLabel.setText('ダニエル');
    this.player.setFrame(379);
    this.floor(121);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 20; col++) this.tile(col, row, 121, 0xc2b699);
    for (const col of [1, 5, 14, 18]) { this.tile(col, 2, 1096); this.tile(col, 3, 1153); }
    this.tile(12, 2, 98); this.tile(13, 2, 98);
    this.person(300, 380, 594, 'ダレイオス王');
    this.caption('メド・ペルシア ─ エルサレムに向く窓', 480, 136, 17);
    this.setTarget(650, 500, '窓辺で祈る');
    this.progress.setText('祈り 0 / 3');
    this.objective.setText('禁令に屈せず、朝・昼・夕の祈りを捧げよう');
    this.talk([
      { speaker: '王の禁令', body: '王以外の神や人に祈ってはならない。\n逆らった者は、獅子の穴に投げ込まれる。' },
      { speaker: 'ダニエル', body: 'それでも私は、いつものように一日三度、\nエルサレムに向かって神に祈ります。' },
    ]);
  }

  protected interact() {
    if (this.phase === 'palace') this.prayAtWindow();
    else this.protection();
  }

  private prayAtWindow() {
    this.busy = true;
    this.stop();
    this.prayers++;
    const hour = ['朝', '昼', '夕'][this.prayers - 1];
    this.progress.setText(`${hour}の祈り ${this.prayers} / 3`);
    this.tweens.add({ targets: this.player, scaleY: 2.8, duration: 250, yoyo: true, hold: 350 });
    this.time.delayedCall(900, () => {
      if (this.prayers < 3) {
        this.busy = false;
        this.hint.setText(`${hour}の祈りを捧げた。SPACE / 目印をタップ：次の祈り`);
      } else this.talk([
        { speaker: '王に訴える人々', body: 'ダニエルは禁令を守らず、神に祈っています。\n王よ、ご自分の定めた法に従ってください。' },
        { speaker: 'ダレイオス王', body: 'ダニエルよ、お前の神が救ってくださるように。\n王は悲しみながら、獅子の穴へ連れて行かせた。' },
      ], () => this.enterDen());
    });
  }

  private enterDen() {
    this.clearStage(); this.phase = 'den'; this.busy = true;
    this.floor(6, 0x5b626e);
    for (let row = 2; row < 11; row++) for (let col = 2; col < 18; col++) this.tile(col, row, 121, 0x667185);
    for (let col = 1; col < 19; col++) { this.tile(col, 2, 698, 0x727983); this.tile(col, 10, 698, 0x727983); }
    for (let row = 3; row < 10; row++) { this.tile(1, row, 121, 0x404955); this.tile(18, row, 121, 0x404955); }
    this.caption('獅子の穴 ─ 信仰の夜', 480, 136, 17);
    for (const [x, y] of [[220, 505], [760, 505], [660, 370]]) {
      const lion = this.add.image(x, y, 'daniel_lion').setDisplaySize(105, 105);
      this.scenery.add(lion); this.lions.push(lion);
    }
    this.player.setCollideWorldBounds(false).setPosition(480, 235).setFrame(379);
    this.objective.setText('獅子の穴へ……。恐れの中でも神を信頼する');
    this.progress.setText('獅子の穴');
    this.tweens.add({ targets: this.player, y: 530, duration: 750, ease: 'Cubic.easeIn', onComplete: () => {
      this.player.setCollideWorldBounds(true);
      this.cameras.main.shake(200, .003);
      this.busy = false;
      this.setTarget(480, 530, '主に祈る');
      this.objective.setText('SPACE / タップで祈り、神の守りを待とう');
    } });
  }

  private protection() {
    this.busy = true; this.stop(); this.marker.setVisible(false);
    this.lions.forEach((lion, index) => this.tweens.add({
      targets: lion, x: this.player.x + (index === 0 ? -70 : 70), y: this.player.y - index * 30,
      duration: 1500, ease: 'Sine.easeInOut',
    }));
    this.time.delayedCall(750, () => {
      this.tweens.killTweensOf(this.lions);
      const angel = this.add.image(480, 320, 'daniel_angel').setScale(.65).setTint(0xffeab1).setAlpha(0);
      this.scenery.add(angel);
      this.caption('神の御使い', 480, 272);
      const light = this.add.graphics().setPosition(480, 390).setAlpha(0);
      light.fillStyle(0xffe8aa, .2).fillCircle(0, 0, 125);
      this.scenery.add(light);
      this.tweens.add({ targets: [angel, light], alpha: 1, duration: 700 });
      this.lions.forEach(lion => {
        const seal = this.add.graphics().setPosition(lion.x + 5, lion.y - 5);
        seal.lineStyle(3, 0xffe7a0).strokeEllipse(0, 0, 28, 13);
        this.scenery.add(seal);
        this.tweens.add({ targets: seal, alpha: .35, duration: 600, yoyo: true, repeat: -1 });
      });
      this.time.delayedCall(1000, () => this.talk([{ speaker: '神の守り', body: '神は御使いを送り、獅子の口を塞がれた。\nダニエルは傷つけられず、信頼のうちに夜を過ごした。' }], () => this.morning()));
    });
  }

  private morning() {
    this.busy = true;
    const dawn = this.add.graphics().setAlpha(0);
    dawn.fillStyle(0xffe3b1, .2).fillRect(0, 104, 960, 576);
    this.scenery.add(dawn);
    this.tweens.add({ targets: dawn, alpha: 1, duration: 1000 });
    this.person(740, 460, 594, 'ダレイオス王');
    this.time.delayedCall(1100, () => this.talk([
      { speaker: '朝、王が駆けつけた', body: 'ダニエルよ！　お前の仕える神は、\n獅子からお前を救うことがおできになったか？' },
      { speaker: 'ダニエル', body: '神が御使いを送り、獅子の口を塞いでくださいました。\n私は無傷です。王よ、いつまでも生きられますように。' },
      { speaker: 'ダレイオス王の布告', body: 'ダニエルの神は、生ける神である。\n私の国のすべての民は、この神を畏れ敬うように。' },
    ], () => this.complete('第11章 完 ─ 揺るがぬ信仰と神の保護', '第12章 帰還とメシア待望へ')));
  }
}
