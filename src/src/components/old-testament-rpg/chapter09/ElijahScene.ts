import Phaser from 'phaser';
import ChronicleScene from '../ChronicleScene';

export default class ElijahScene extends ChronicleScene {
  private phase: 'division' | 'water' | 'rain' = 'division';
  private pours = 0;
  private altar: Phaser.GameObjects.Image[] = [];
  private trench: Phaser.GameObjects.Image[] = [];

  constructor(onNextChapter?: () => void) {
    super('elijah', '第9章　王国の分裂と預言者エリヤ', onNextChapter);
  }

  protected startChapter() {
    this.playerLabel.setText('エリヤ');
    this.floor(8);
    for (let row = 3; row < 6; row++) for (const start of [2, 12]) for (let col = start; col < start + 6; col++) this.tile(col, row, 121);
    for (const col of [4, 14]) this.tile(col, 5, 37);
    this.caption('北王国イスラエル', 240, 198, 17);
    this.caption('南王国ユダ', 720, 198, 17);
    this.person(630, 490, 594, 'アハブ王');
    this.tree(0, 1, true); this.tree(18, 1, true);
    this.progress.setText('1 / 3　分裂');
    this.objective.setText('アハブ王に会い、カルメル山へ向かおう');
    this.setTarget(630, 530, 'アハブ王');
    this.talk([
      { speaker: '分裂した王国', body: 'ソロモンの死後、王国は北のイスラエルと南のユダに分裂。\n北のアハブ王の時代、バアル崇拝が広がり、干ばつが続いた。' },
      { speaker: 'エリヤ', body: 'いつまで二つのものの間で迷うのか。\n主が神なら、主に従え。カルメル山で確かめよう。' },
    ]);
  }

  protected interact() {
    if (this.phase === 'division') {
      this.talk([{ speaker: 'アハブ王', body: '民とバアルの預言者を集めよう。\n火をもって答える神こそ、本当の神だ。' }], () => this.enterMountain());
    } else if (this.phase === 'water') this.pourWater();
    else this.revealRain();
  }

  private enterMountain() {
    this.clearStage();
    this.phase = 'water';
    this.floor(8, 0xd2bc99);
    for (const [x, y] of [[0, 2], [2, 4], [17, 2], [18, 6]]) this.tree(x, y, true);
    for (const col of [1, 3, 16, 18]) this.tile(col, 8, 1137);
    this.caption('カルメル山 ─ 二つの祭壇', 480, 136, 17);
    for (let i = 0; i < 3; i++) this.person(180 + i * 70, 370, 325);
    this.caption('バアルの預言者たち', 250, 280);
    for (let i = 0; i < 3; i++) this.tile(4 + i, 5, 1137);
    for (const [x, y] of [[11, 4], [12, 4], [13, 4], [14, 4], [11, 5], [14, 5], [11, 6], [12, 6], [13, 6], [14, 6]]) {
      this.trench.push(this.tile(x, y, 0).setAlpha(.12));
    }
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
      const stone = this.add.image(588 + col * 27, 353 + row * 23, this.tileKey, 1137).setScale(2);
      this.scenery.add(stone); this.altar.push(stone);
    }
    this.altar.push(this.tile(12, 5, 179));
    this.altar.push(this.tile(13, 5, 179));
    this.caption('十二の石とたきぎ', 638, 277);
    this.person(850, 550, 594, 'アハブ王');
    this.setTarget(630, 505, '水を注ぐ');
    this.progress.setText('2 / 3　水 0 / 3');
    this.objective.setText('主の祭壇へ近づき、SPACE / タップで三度、水を注ごう');
    this.talk([
      { speaker: 'バアルの預言者たち', body: 'バアルよ、答えてくれ！\n朝から叫び続けても、火は来なかった。' },
      { speaker: 'エリヤ', body: '十二の石で主の祭壇を直した。\nいけにえとたきぎに水を注ぎ、周りの溝も満たしなさい。' },
    ]);
  }

  private pourWater() {
    this.busy = true;
    this.stop();
    this.pours++;
    this.progress.setText(`2 / 3　水 ${this.pours} / 3`);
    for (let i = 0; i < 10; i++) {
      const drop = this.add.image(580 + i * 12, 310, this.tileKey, 0).setDisplaySize(8, 15).setAlpha(.8);
      this.scenery.add(drop);
      this.tweens.add({ targets: drop, y: 410, alpha: 0, duration: 550, delay: i * 25, onComplete: () => drop.destroy() });
    }
    this.tweens.add({ targets: this.trench, alpha: .2 + this.pours * .25, duration: 700 });
    this.time.delayedCall(850, () => {
      if (this.pours < 3) {
        this.busy = false;
        this.hint.setText(`水を注いだ！　SPACE / 目印をタップ：あと${3 - this.pours}回`);
      } else {
        this.talk([{ speaker: 'エリヤの祈り', body: 'アブラハム、イサク、イスラエルの神、主よ。\nあなたこそ神であり、民の心を立ち返らせる方だと示してください。' }], () => this.heavenlyFire());
      }
    });
  }

  private heavenlyFire() {
    this.marker.setVisible(false);
    this.objective.setText('天からの火が、祭壇と溝の水を焼き尽くす！');
    const fire = this.add.image(640, 168, this.tileKey, 398).setScale(5);
    this.scenery.add(fire);
    const glow = this.add.graphics().setPosition(640, 375);
    glow.fillStyle(0xffb742, .3).fillCircle(0, 0, 100);
    this.scenery.add(glow);
    this.tweens.add({ targets: fire, y: 365, duration: 650, ease: 'Cubic.easeIn', onComplete: () => {
      this.cameras.main.flash(380, 255, 223, 151);
      this.cameras.main.shake(650, .006);
      this.tweens.add({ targets: this.altar, alpha: 0, y: '+=18', duration: 900 });
      this.tweens.add({ targets: this.trench, alpha: 0, duration: 900 });
      this.tweens.add({ targets: [fire, glow], alpha: 0, duration: 1300 });
    } });
    this.time.delayedCall(2100, () => {
      this.talk([{ speaker: '民たち', body: '主こそ神です！　主こそ神です！\n祭壇もたきぎも石も、水までも焼き尽くされた。' }], () => {
        this.phase = 'rain'; this.busy = false;
        this.progress.setText('3 / 3　雨の約束');
        this.objective.setText('エリヤとともに、海の方から来る雲を見よう');
        this.setTarget(380, 510, '雨を待つ');
      });
    });
  }

  private revealRain() {
    this.busy = true; this.stop(); this.marker.setVisible(false);
    const cloud = this.add.graphics().setPosition(500, 245).setAlpha(0);
    cloud.fillStyle(0x637385, .65);
    for (let i = 0; i < 5; i++) cloud.fillEllipse(i * 80 - 160, i % 2 * 12, 150, 65);
    this.scenery.add(cloud);
    this.tweens.add({ targets: cloud, alpha: 1, scale: 1.4, duration: 1200 });
    for (let i = 0; i < 40; i++) {
      const drop = this.add.image(80 + i * 21, 280 + i % 4 * 30, this.tileKey, 0).setDisplaySize(3, 17).setAlpha(.65);
      this.scenery.add(drop);
      this.tweens.add({ targets: drop, x: '-=32', y: '+=240', alpha: .15, duration: 700, delay: i * 32, repeat: -1 });
    }
    this.time.delayedCall(1900, () => this.talk([
      { speaker: 'エリヤ', body: '海の方に小さな雲が見える。\n長い干ばつが終わり、恵みの雨が地を潤す！' },
      { speaker: '第9章 完', body: '民は偶像から、生ける神へ心を向けた。\n預言者は王にも民にも、主に立ち返るよう語り続けた。' },
    ], () => this.complete('第9章 完 ─ 火の奇跡と恵みの雨', '第10章 バビロン捕囚へ')));
  }
}
