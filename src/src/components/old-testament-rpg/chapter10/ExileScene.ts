import Phaser from 'phaser';
import ChronicleScene from '../ChronicleScene';

export default class ExileScene extends ChronicleScene {
  private phase: 'fall' | 'river' = 'fall';
  private captives: Phaser.GameObjects.Image[] = [];
  private chains!: Phaser.GameObjects.Graphics;

  constructor(onNextChapter?: () => void) { super('exile', '第10章　エルサレム陥落とバビロン捕囚', onNextChapter); }

  protected startChapter() {
    this.playerLabel.setText('捕囚の民');
    this.floor(6, 0x8b8588);
    for (let row = 1; row <= 5; row++) for (let col = 5; col < 15; col++) {
      if ((col + row) % 5 !== 0) this.tile(col, row, row === 1 ? 698 : 121, 0x786868);
    }
    for (const col of [5, 14]) {
      this.tile(col, 4, 1096, 0x8d7b74).setAngle(col === 5 ? -12 : 18);
      this.tile(col, 5, 1153, 0x8d7b74);
    }
    for (const [col, row] of [[1, 2], [3, 4], [17, 2], [18, 6]]) this.tree(col, row, true);
    for (const col of [4, 7, 11, 15]) this.tile(col, 6, 1137);
    for (const col of [6, 9, 13]) {
      const fire = this.tile(col, 4, 398).setTint(0xffae70);
      this.tweens.add({ targets: fire, alpha: .45, scaleY: 3.6, duration: 220 + col * 12, yoyo: true, repeat: -1 });
      const smoke = this.add.graphics().setPosition(col * 48 + 24, 280);
      smoke.fillStyle(0xaaa0a0, .4).fillEllipse(0, 0, 75, 40);
      this.scenery.add(smoke);
      this.tweens.add({ targets: smoke, y: 170, x: smoke.x + 30, alpha: 0, duration: 1800, delay: col * 70, repeat: -1 });
    }
    this.caption('エルサレム ─ 神殿と城壁が崩れる', 480, 132, 17);
    for (let i = 0; i < 5; i++) this.captives.push(this.person(230 + i * 65, 560, i % 2 ? 486 : 325).setTint(0xc0a9a0));
    this.chains = this.add.graphics();
    this.scenery.add(this.chains);
    this.person(780, 540, 594, 'バビロン兵');
    this.setTarget(670, 550, '捕囚の列へ');
    this.progress.setText('1 / 2　陥落');
    this.objective.setText('燃える都を離れ、捕囚の民とともに歩もう');
    this.talk([
      { speaker: '預言者エレミヤの涙', body: '北イスラエル滅亡後も、南ユダ王国は神との契約を破り続けた。\n預言者エレミヤが涙ながらに「主に立ち返らねば滅びる」と叫んだが、王も民も嘲笑した。' },
      { speaker: 'エルサレム包囲と神殿炎上', body: '紀元前586年、大国新バビロニアのネブカドネザル王がエルサレムを包囲。\n都は破られ、ソロモンの栄光を誇った黄金神殿は無残に焼き払われてしまった。' },
      { speaker: '鎖につながれたバビロン捕囚', body: '生き残った民は首に鎖をかけられ、何千キロも離れた異国バビロンへと強制連行された。\nこれがイスラエル史上最大の悲劇「バビロン捕囚」である。' },
    ]);
  }

  protected interact() {
    if (this.phase === 'fall') this.marchIntoExile();
    else this.prayByRiver();
  }

  private marchIntoExile() {
    this.busy = true;
    this.stop(); this.marker.setVisible(false);
    this.objective.setText('鎖につながれた民は、バビロンへの道を進む……');
    this.tweens.add({ targets: this.player, x: 890, duration: 1800 });
    this.captives.forEach(person => this.tweens.add({ targets: person, x: person.x + 450, duration: 2300 }));
    this.time.delayedCall(2500, () => this.enterRiver());
  }

  private enterRiver() {
    this.clearStage();
    this.captives = [];
    this.phase = 'river';
    this.floor(5, 0x839493);
    for (let row = 0; row < 12; row++) {
      this.tile(11, row, 59); this.tile(12, row, 0); this.tile(13, row, 0); this.tile(14, row, 61);
    }
    for (const [col, row] of [[0, 1], [3, 2], [6, 0], [17, 1], [18, 7]]) this.tree(col, row);
    for (const col of [1, 4, 8]) { this.tile(col, 8, 140); this.tile(col, 9, 23); }
    this.caption('バビロン ─ ユーフラテス川のほとり', 480, 132, 17);
    for (let i = 0; i < 4; i++) this.person(310 + i * 55, 425, i % 2 ? 486 : 325).setScale(3, 2.4).setTint(0xb1bcca);
    this.player.setPosition(250, 540);
    this.setTarget(490, 540, '川辺で祈る');
    this.progress.setText('2 / 2　祈り');
    this.objective.setText('川のほとりに座り、故郷シオン（エルサレム）を思って祈ろう');
    this.talk([{ speaker: '哀歌・バビロンの川のほとりで', body: '「バビロンの川のほとり、そこに私たちは座り、シオン（故郷エルサレム）を思い出して泣いた。」\n国も神殿も失った民は、異国の地で初めて、自分たちが神を捨てた罪の深さを悟った。' }]);
  }

  private prayByRiver() {
    this.busy = true;
    this.stop(); this.marker.setVisible(false);
    this.tweens.add({ targets: this.player, scaleY: 2.5, y: this.player.y + 9, duration: 500 });
    const tear = this.add.image(this.player.x + 13, this.player.y - 8, this.tileKey, 0).setDisplaySize(4, 9).setAlpha(.85);
    this.scenery.add(tear);
    this.tweens.add({ targets: tear, y: tear.y + 35, alpha: 0, duration: 750, repeat: 1 });
    this.time.delayedCall(1700, () => this.talk([
      { speaker: '捕囚の民の祈り', body: 'シオン（エルサレム）を思って涙が溢れる。\n主よ、私たちの罪を赦し、いつの日か故郷へ立ち返らせてください！' },
      { speaker: '異国の王宮に灯る希望', body: '苦難の捕囚期、主は民を完全に見捨ててはおられなかった。\nバビロンの王宮で仕えるユダヤ人たちの中に、信仰を守り抜く青年「ダニエル」がいた。' },
      { speaker: 'バビロニア帝国の滅亡', body: '捕囚から約70年後、バビロンの王は神殿から奪った金の杯で大宴会を開いた夜、壁に謎の文字が現れた。\n「あなたの王国は終わった」——神の裁きだった。その夜、ペルシアのキュロス大王の軍がユーフラテス川の水をせき止め、川底から城壁内へ侵入。大帝国バビロニアは一夜にして崩壊した。' },
      { speaker: '新たな帝国と試練の夜へ', body: '覇権は新興メド・ペルシア帝国へと移り、ダニエルは新たな王の宮廷に仕えることになる。\n大帝国の王宮を舞台に、ダニエルの命がけの信仰の戦いが始まる──' },
    ], () => this.complete('第10章 完 ─ 捕囚の地から、悔い改めの祈り', '第11章 獅子の穴のダニエルへ')));
  }

  update() {
    super.update();
    if (this.phase !== 'fall' || !this.chains) return;
    this.chains.clear().lineStyle(2, 0xc5c9cd, .9);
    for (let i = 1; i < this.captives.length; i++) {
      const previous = this.captives[i - 1];
      const current = this.captives[i];
      for (let x = previous.x + 12; x < current.x - 10; x += 9) this.chains.strokeEllipse(x, current.y + 10, 11, 6);
    }
  }
}
