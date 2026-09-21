import Phaser from 'phaser';
import ChronicleScene from '../ChronicleScene';

export default class DavidScene extends ChronicleScene {
  private phase: 'brook' | 'battle' | 'kingdom' = 'brook';
  private stone?: Phaser.GameObjects.Image;
  private goliath!: Phaser.GameObjects.Image;

  constructor(onNextChapter?: () => void) { super('david', '第7章　少年ダビデと巨人ゴリアテ', onNextChapter); }

  protected startChapter() {
    this.playerLabel.setText('少年ダビデ');
    this.player.setFrame(379).setScale(2.8);
    this.floor(5, 0xd7e6b3);
    this.landscape.patch(1, 4, 10, 7, 'earth', 0xdfcfac);
    this.landscape.patch(16, 4, 4, 7, 'earth', 0xdfcfac);
    for (let row = 0; row < 12; row++) {
      this.tile(12, row, 59); this.tile(13, row, 0); this.tile(14, row, 0); this.tile(15, row, 61);
    }
    for (const [x, y] of [[1, 1], [4, 2], [18, 1], [19, 7]]) this.tree(x, y);
    for (const col of [6, 9, 17]) {
      this.tile(col, 1, 618); this.tile(col + 1, 1, 619);
      this.tile(col, 2, 675); this.tile(col + 1, 2, 676);
    }
    this.landscape.supplies(7, 3);
    this.landscape.plants([[0, 4], [1, 10], [10, 2], [11, 5], [11, 9], [16, 2], [18, 10]]);
    for (const row of [2, 6, 10]) this.tile(14, row, 652);

    // イスラエル陣営
    this.caption('イスラエル陣営', 250, 310, 13);
    this.person(200, 390, 594);
    this.person(260, 380, 594, 'サウル王');
    this.person(320, 400, 594);

    // 対岸のペリシテ陣営と巨人ゴリアテ
    this.caption('ペリシテ陣営', 810, 310, 13);
    this.person(740, 420, 594).setTint(0xcf9380);
    this.person(880, 420, 594).setTint(0xcf9380);
    const startGoliath = this.person(810, 470, 594).setScale(7).setTint(0xceaaa1);
    this.caption('巨人ゴリアテ', 810, 390, 16);
    this.caption('「誰か俺と一騎打ちできる奴はいないのか！」', 780, 345, 12);
    this.tweens.add({ targets: startGoliath, y: '-=8', yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' });

    this.stone = this.add.image(558, 510, this.tileKey, 1137).setScale(1.3);
    this.scenery.add(this.stone);
    this.caption('エラの谷 ─ イスラエルとペリシテの戦い', 480, 136, 17);
    this.setTarget(535, 530, '小川の小石');
    this.progress.setText('1 / 3　小石');
    this.objective.setText('小川の岸へ進み、小石を拾って投石器に備えよう');
    this.talk([
      { speaker: 'エラの谷の脅威', body: '民の願いで初代王となったサウル。だが強国ペリシテが再び襲来！\n敵の身長3mの巨人ゴリアテに脅され、サウル王と全軍は恐怖で震え上がっていた。' },
      { speaker: '羊飼いダビデの志願', body: 'そこへ兄たちに弁当を届けに来た羊飼いの少年ダビデ。\n巨人の罵倒と怯える軍を見たダビデは、「僕が戦います！」とサウル王に名乗り出た。' },
      { speaker: 'サウル王', body: '大人の兵士すら恐れる巨人に、羊飼いのお前が立ち向かえるというのか……！？' },
      { speaker: 'ダビデ', body: '熊や狼から羊を守ってくださった主が、巨人の手からも僕を救われます！\n鎧はいりません。小川で小石を拾い、いつもの投石器で立ち向かいます！' },
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
      { speaker: 'イスラエルの民', body: '主があなたをイスラエルの牧者として立てられました。\n苦難の逃亡を乗り越えたダビデ様、全イスラエルの王として私たちを導いてください！' },
      { speaker: '王ダビデ', body: '主よ、私のような羊飼いを王に立ててくださり感謝します。\nエルサレムを都と定め、神の箱を迎え入れて主をほめたたえる国を築こう！' },
      { speaker: '少年の信仰から統一王国へ', body: '神は外見ではなく、心を見られる。\n少年の信仰による勝利から、全イスラエルを治める統一王国の栄光が始まる。' },
    ], () => this.complete('第7章 完 ─ 信仰による勝利と王ダビデ', '第8章 ソロモンと黄金神殿へ'));
  }

  private enterBattle() {
    this.clearStage(); this.phase = 'battle';
    this.player.setFrame(379).setScale(2.8);
    this.floor(8);
    this.landscape.patch(0, 5, 20, 6, 'earth', 0xe1ceac);
    this.landscape.ridge(20, 0xc4b89e);
    this.landscape.plants([[0, 4], [5, 4], [14, 3], [19, 5], [1, 11], [18, 11]], true);
    this.landscape.supplies(1, 4);
    this.landscape.supplies(17, 4);
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
          onComplete: () => this.talk([
            { speaker: 'イスラエルの民', body: '石が額に命中した！　ゴリアテが倒れた！\n主がこの戦いに勝利を与えてくださった。' },
            { speaker: 'エラの谷の勝利と英雄', body: 'ゴリアテを倒し一躍英雄となったダビデ。\n民は「サウルは千を討ち、ダビデは万を討った！」と歌い称えた。' },
            { speaker: 'サウル王の嫉妬と逃亡', body: 'だが激しい嫉妬に狂ったサウル王から命を狙われ、\nダビデは長年、荒野や洞窟を逃亡する苦難の日々を送ることになる。' },
            { speaker: '試練を越えて王座へ', body: 'やがてサウル王が戦死したのち、神と民の願いによって\nダビデは全イスラエルの王として油を注がれ、即位した──' },
          ], () => this.enterKingdom()),
        });
      } });
    } });
  }

  private enterKingdom() {
    this.clearStage(); this.phase = 'kingdom';
    this.floor(5, 0xd5dfb3);
    this.landscape.terrace(2, 5, 16, 7, 0xe7dcc4);
    this.landscape.facade(3, 1, 14, 5, 0xead9b6);
    this.landscape.patch(12, 6, 5, 6, 'rug', 0xc0d7c8);
    for (const col of [3, 7, 12, 16]) this.landscape.column(col, 4, 0xf3dfad);
    for (const col of [0, 18]) {
      this.landscape.tree(col, 2);
      this.landscape.tree(col, 7);
    }
    this.tile(14, 6, 133);
    for (const col of [12, 16]) { this.tile(col, 6, 475); this.landscape.glow(col, 6); }
    this.caption('統一王国 ─ 都エルサレム', 480, 136, 17);

    // プレイヤー自身が成長し「王ダビデ」に即位
    this.playerLabel.setText('王ダビデ');
    this.player.setFrame(594).setTint(0xffdc96).setScale(3.5).setPosition(180, 520);

    // 歓呼するイスラエルの民衆たち
    this.person(360, 430, 487, '民衆');
    this.person(450, 410, 378, '民衆');
    this.person(540, 430, 325, '民衆');
    this.caption('「ダビデ王万歳！主が選ばれた王！」', 450, 340, 13);

    this.caption('エルサレムの玉座', 700, 430, 14);
    this.setTarget(700, 520, '玉座へ即位');
    this.objective.setText('玉座へ進み、イスラエル統一王国の即位を宣言しよう');
    this.progress.setText('3 / 3　王国');
  }
}
