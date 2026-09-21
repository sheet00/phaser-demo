import Phaser from 'phaser';
import ChronicleScene from '../ChronicleScene';

export default class DavidScene extends ChronicleScene {
  private phase: 'brook' | 'battle' | 'kingdom' = 'brook';
  private stone?: Phaser.GameObjects.Image;
  private goliath!: Phaser.GameObjects.Image;

  constructor(onNextChapter?: () => void) { super('david', '第7章　少年ダビデと巨人ゴリアテ', onNextChapter); }

  protected startChapter() {
    this.playerLabel.setText('少年ダビデ');
    this.floor(5);
    for (let row = 0; row < 12; row++) {
      this.tile(12, row, 59); this.tile(13, row, 0); this.tile(14, row, 0); this.tile(15, row, 61);
    }
    for (const [x, y] of [[1, 1], [4, 2], [17, 2], [18, 6]]) this.tree(x, y);
    this.person(260, 380, 594, 'サウル王');
    this.stone = this.add.image(558, 510, this.tileKey, 1137).setScale(1.3);
    this.scenery.add(this.stone);
    this.caption('エラの谷 ─ イスラエルとペリシテの戦い', 480, 136, 17);
    this.setTarget(535, 530, '小川の小石');
    this.progress.setText('1 / 3　小石');
    this.objective.setText('小川の岸へ進み、小石を拾って投石器に備えよう');
    this.talk([
      { speaker: 'サウル王', body: '兵士たちが巨人ゴリアテを恐れている。\n羊飼いの少年よ、お前に立ち向かえるのか？' },
      { speaker: 'ダビデ', body: '羊を守ってくださった主が、今も守ってくださいます。\n小川で小石を拾い、投石器を手に向かいます。' },
    ]);
  }

  protected interact() {
    if (this.phase === 'brook') {
      this.busy = true;
      this.tweens.add({ targets: this.stone, x: this.player.x, y: this.player.y - 15, alpha: 0, duration: 400,
        onComplete: () => this.talk([{ speaker: 'ダビデ', body: 'この石を投石器に備えよう。\n剣や鎧ではなく、主への信頼をもって進む。' }], () => this.enterBattle()),
      });
    } else if (this.phase === 'battle') {
      this.talk([
        { speaker: 'ゴリアテ', body: '羊飼いの少年が、私に立ち向かうというのか！' },
        { speaker: 'ダビデ', body: 'お前は剣と槍で来る。\n私は万軍の主の名によって立ち向かう！' },
      ], () => this.throwStone());
    } else this.talk([
      { speaker: '王ダビデ', body: 'やがてダビデはイスラエルの王となり、\nエルサレムを都に定めた。' },
      { speaker: '第7章 完', body: '神は外見ではなく、心を見られる。\n少年の信仰による勝利から、統一王国の物語が始まる。' },
    ], () => this.complete('第7章 完 ─ 信仰による勝利と王ダビデ', '第8章 ソロモンと黄金神殿へ'));
  }

  private enterBattle() {
    this.clearStage(); this.phase = 'battle';
    this.floor(8);
    for (let row = 6; row < 10; row++) for (let col = 0; col < 20; col++) this.tile(col, row, 6);
    for (const col of [1, 3, 16, 18]) {
      this.tile(col, 2, 618); this.tile(col + 1, 2, 619);
      this.tile(col, 3, 675); this.tile(col + 1, 3, 676);
    }
    for (let i = 0; i < 4; i++) {
      this.person(80 + i * 65, 375, 594);
      this.person(660 + i * 65, 375, 594).setTint(0xcf9380);
    }
    this.caption('イスラエル陣営', 190, 287);
    this.caption('ペリシテ陣営', 775, 287);
    this.goliath = this.person(790, 482, 594).setScale(7).setTint(0xceaaa1);
    this.caption('巨人ゴリアテ', 790, 408, 17);
    this.setTarget(510, 530, '投石する');
    this.objective.setText('目印へ進み、SPACE / タップで投石器を振ろう');
    this.progress.setText('2 / 3　対決');
  }

  private throwStone() {
    this.busy = true; this.stop(); this.marker.setVisible(false);
    const sling = this.add.container(this.player.x + 15, this.player.y - 20).setDepth(40);
    const cords = this.add.graphics().lineStyle(3, 0x916135);
    cords.lineBetween(0, 0, 38, -10); cords.lineBetween(0, 0, 38, 10);
    const stone = this.add.image(38, 0, this.tileKey, 1137).setScale(.7);
    sling.add([cords, stone]);
    this.tweens.add({ targets: sling, angle: 720, duration: 850, ease: 'Sine.easeIn', onComplete: () => {
      const projectile = this.add.image(sling.x + 38, sling.y, this.tileKey, 1137).setScale(.7).setDepth(40);
      sling.destroy();
      this.tweens.add({ targets: projectile, x: this.goliath.x, y: this.goliath.y - 39, duration: 430, onComplete: () => {
        projectile.destroy();
        this.cameras.main.shake(250, .004);
        this.tweens.add({ targets: this.goliath, angle: 90, y: 585, alpha: .55, duration: 650, ease: 'Cubic.easeIn',
          onComplete: () => this.talk([{ speaker: 'イスラエルの民', body: '石が額に命中した！　ゴリアテが倒れた！\n主がこの戦いに勝利を与えてくださった。' }], () => this.enterKingdom()),
        });
      } });
    } });
  }

  private enterKingdom() {
    this.clearStage(); this.phase = 'kingdom';
    this.floor(5);
    for (let row = 2; row < 7; row++) for (let col = 3; col < 17; col++) this.tile(col, row, row === 2 ? 698 : 121);
    for (const col of [3, 16]) { this.tile(col, 1, 698); this.tile(col, 2, 121); }
    for (const col of [9, 10]) this.tile(col, 6, 37);
    this.caption('統一王国 ─ 都エルサレム', 480, 136, 17);
    this.person(660, 470, 594, '王ダビデ').setTint(0xffdc96);
    this.playerLabel.setText('イスラエルの民');
    this.setTarget(650, 530, '王の歩み');
    this.objective.setText('王ダビデのもとへ進み、その後の歩みを聞こう');
    this.progress.setText('3 / 3　王国');
  }
}
