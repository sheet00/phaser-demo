import Phaser from 'phaser';
import ChronicleScene from '../ChronicleScene';

export default class ReturnScene extends ChronicleScene {
  private phase: 'return' | 'building' | 'hope' = 'return';
  private workers: Phaser.GameObjects.Image[] = [];
  private wall: Phaser.GameObjects.Image[] = [];
  private builtSections = 0;

  constructor() { super('return', '第12章　帰還とメシア待望'); }

  protected startChapter() {
    this.playerLabel.setText('帰還した民');
    this.floor(8);
    for (let row = 7; row < 10; row++) for (let col = 0; col < 20; col++) this.tile(col, row, 6);
    for (const [x, y] of [[1, 2], [4, 1], [16, 2], [18, 6]]) this.tree(x, y, true);
    for (let i = 0; i < 5; i++) this.person(100 + i * 50, 430, i % 2 ? 486 : 325);
    for (const col of [9, 10, 11, 13, 14, 15]) this.tile(col, 5, 121);
    this.tile(12, 5, 37);
    this.caption('故郷エルサレムへの道', 480, 135, 17);
    this.caption('帰還した民', 200, 370);
    this.setTarget(650, 520, '故郷へ入る');
    this.progress.setText('1 / 3　帰還');
    this.objective.setText('ペルシア王の許可を受け、エルサレムへ帰ろう');
    this.talk([
      { speaker: 'キュロス王の帰還の勅令', body: '捕囚から70年。ペルシアのキュロス王が神に動かされ、奇跡の勅令を出した。\n「エルサレムに上り、主の神殿を再建せよ！」民は歓喜の涙とともに故郷へと帰還した。' },
      { speaker: '荒廃した都と崩れた城壁', body: 'ゼルバベルらの指導で神殿（第二神殿）は再建されたが、周囲の敵からの妨害はやまず、\n都を守る城壁は崩れたまま、焼き払われた門も放置されていた。' },
      { speaker: '総督ネヘミヤの奮起', body: 'ペルシア王宮で側近を務めていたユダヤ人ネヘミヤは、故郷の荒廃を聞いて断食祈祷。\n王の許しを得て総督として赴任し、民を一つに束ねて城壁再建に立ち上がる！' },
    ]);
  }

  protected interact() {
    if (this.phase === 'return') this.enterRebuilding();
    else if (this.phase === 'building') this.buildSection();
    else this.revealDawn();
  }

  private temple() {
    for (let row = 2; row <= 5; row++) for (let col = 7; col <= 12; col++) this.tile(col, row, 121, 0xd8c8aa);
    this.tile(9, 0, 1210); this.tile(10, 0, 1211);
    this.tile(8, 1, 1210); this.tile(9, 1, 1215); this.tile(10, 1, 1215); this.tile(11, 1, 1211);
    for (let col = 7; col <= 12; col++) this.tile(col, 2, 1269);
    for (const col of [7, 12]) { this.tile(col, 3, 1096); this.tile(col, 4, 1153); }
    this.tile(9, 5, 37); this.tile(10, 5, 37);
  }

  private enterRebuilding() {
    this.clearStage();
    this.phase = 'building';
    this.playerLabel.setText('ネヘミヤ');
    this.floor(8);
    this.temple();
    this.caption('第二神殿と、再建される城壁', 480, 145, 16);
    this.wall = [];
    for (const start of [1, 7, 13]) {
      for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
        const piece = this.tile(start + col, 6 + row, row === 0 ? 698 : 121).setAlpha(.1);
        this.wall.push(piece);
      }
    }
    for (let i = 0; i < 4; i++) {
      const worker = this.person(230 + i * 145, 578, 594);
      this.workers.push(worker);
      const tool = this.add.image(worker.x + 22, 580, this.tileKey, 415).setScale(2.6).setOrigin(.5, 1);
      this.scenery.add(tool);
      this.tweens.add({ targets: tool, angle: -28, duration: 350, yoyo: true, repeat: -1, delay: i * 100 });
    }
    this.caption('工具を手に働き、武器を携えて守る民', 480, 628);
    this.player.setPosition(170, 520);
    this.setTarget(240, 520, '西の城壁を積む');
    this.progress.setText('2 / 3　1日目');
    this.objective.setText('三つの現場で石を積み、民とともに城壁を再建しよう');
    this.talk([{ speaker: 'ネヘミヤ', body: '敵の妨害や武力攻撃の脅しがあっても決して恐れるな！\n片手で工具を持ち、もう一方の手で武器を握り、愛する家族と都を守り抜くのだ！' }]);
  }

  private buildSection() {
    this.busy = true;
    this.stop(); this.marker.setVisible(false);
    const section = this.wall.slice(this.builtSections * 15, (this.builtSections + 1) * 15);
    // 下段から積み上げ、最後に城壁の上端が揃う。
    const pieces = [...section.slice(10), ...section.slice(5, 10), ...section.slice(0, 5)];
    pieces.forEach((piece, index) => {
      const finalY = piece.y;
      piece.setY(finalY - 36).setAlpha(0);
      this.tweens.add({ targets: piece, y: finalY, alpha: 1, delay: index * 65, duration: 330, ease: 'Bounce.easeOut' });
    });
    const fromDay = [1, 18, 35][this.builtSections];
    const toDay = [18, 35, 52][this.builtSections];
    this.tweens.addCounter({ from: fromDay, to: toDay, duration: 1450,
      onUpdate: tween => this.progress.setText(`2 / 3　${Math.round(tween.getValue() ?? fromDay)}日目`),
    });
    this.tweens.add({ targets: this.workers, y: '-=8', duration: 220, repeat: 2, yoyo: true });
    this.time.delayedCall(1600, () => {
      this.builtSections++;
      this.busy = false;
      if (this.builtSections < 3) {
        this.setTarget([240, 480, 720][this.builtSections], 520, this.builtSections === 1 ? '中央の城壁を積む' : '東の城壁を積む');
      } else {
        this.talk([{ speaker: '五十二日目の奇跡', body: '奇跡的にもわずか52日間で、周囲の城壁が完全に修復された！\n周囲の敵国も、これがイスラエルの神の助けによって成し遂げられた御業だと悟った。' }], () => this.enterHope());
      }
    });
  }

  private enterHope() {
    this.clearStage();
    this.workers = []; this.wall = [];
    this.phase = 'hope';
    this.floor(5, 0x67778f);
    this.temple();
    for (let col = 1; col < 19; col++) {
      this.tile(col, 6, 698, 0xa6acb9);
      this.tile(col, 7, col === 9 || col === 10 ? 37 : 121, 0xa6acb9);
    }
    for (const [col, row] of [[0, 2], [3, 1], [16, 1], [18, 3]]) this.tree(col, row);
    for (let i = 0; i < 5; i++) this.person(260 + i * 80, 586, i % 2 ? 486 : 325);
    this.person(740, 460, 325, '預言者マラキ');
    this.playerLabel.setText('帰還した民');
    this.progress.setText('3 / 3　希望');
    this.objective.setText('再建された都で、マラキの約束を聞こう');
    this.setTarget(735, 520, 'マラキのことば');
  }

  private revealDawn() {
    this.busy = true;
    this.stop(); this.marker.setVisible(false);
    this.talk([
      { speaker: '預言者マラキ', body: '「見よ、わたしの名を恐れるあなたがたには、義の太陽が昇り、その翼に癒やしがある！」' },
      { speaker: '真の救い主を待ち望んで', body: '神殿と城壁は再建されたが、民が本当に待ち望むのは、罪から世界を救う真の王「メシア（救い主）」であった。' },
    ], () => {
      const dawn = this.add.graphics().setDepth(40).setAlpha(0);
      dawn.fillStyle(0xffd28c, .2).fillRect(0, 104, 960, 576);
      for (let radius = 280; radius >= 40; radius -= 40) dawn.fillStyle(0xffe3a4, .045).fillCircle(480, 215, radius);
      this.scenery.add(dawn);
      this.tweens.add({ targets: dawn, alpha: 1, duration: 2400 });
      const promise = this.add.text(480, 230, '400年後、ベツレヘムの星へ……', {
        ...this.textStyle(24, '#fff2cf', '#26334d'), fontStyle: 'bold', padding: { top: 12, bottom: 10, left: 18, right: 18 },
      }).setOrigin(.5).setDepth(80).setAlpha(0);
      this.scenery.add(promise);
      this.tweens.add({ targets: promise, alpha: 1, duration: 1400, delay: 1000 });
      this.time.delayedCall(3000, () => this.talk([
        { speaker: '四百年の沈黙と約束の継承', body: '天地創造から始まり、アブラハムの契約、出エジプト、ダビデ王国の栄光、\nそして捕囚と帰還を経て──神の救いの約束は世代を超えて受け継がれた。' },
        { speaker: 'ベツレヘムの星へ・新約聖書へ', body: 'マラキの預言から約400年後、暗闇の世を照らすベツレヘムの星が輝く──\n物語は新約聖書、イエス・キリストの降誕へと受け継がれていく！' },
      ], () => this.complete('旧約聖書の旅 ─ 帰還と、救い主を待ち望む希望', '第12章をもう一度')));
    });
  }

  protected finishAction() {
    this.phase = 'return';
    this.builtSections = 0;
    this.finished = false;
    this.clearStage();
    this.startChapter();
  }
}
