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
    this.player.setFrame(379).setPosition(480, 520);
    this.physics.world.setBounds(190, 260, 580, 360);

    // 外の地面（中庭）
    this.floor(5);
    for (const [col, row] of [[1, 1], [0, 4], [1, 7], [18, 1], [19, 4], [18, 7]]) {
      this.tree(col, row);
    }

    // 建物の床（木板）
    for (let row = 3; row <= 10; row++) {
      for (let col = 3; col <= 16; col++) this.tile(col, row, 119);
    }

    // 北外壁・パラペット天端（row 0）
    this.tile(3, 0, 700);
    for (let col = 4; col <= 15; col++) this.tile(col, 0, 698);
    this.tile(16, 0, 701);

    // 北壁面上部（row 1）
    this.tile(3, 1, 872);
    for (let col = 4; col <= 15; col++) this.tile(col, 1, 873);
    this.tile(16, 1, 874);

    // 北壁面下部（row 2）
    this.tile(3, 2, 869);
    for (let col = 4; col <= 15; col++) this.tile(col, 2, 868);
    this.tile(16, 2, 871);

    // エルサレムに向く大アーチ窓（Sample2.png スタイル: 3連）
    for (const col of [8, 10, 12]) {
      this.tile(col, 1, 159);
      this.tile(col, 2, 216);
    }

    // 左右外壁（row 3〜10）
    for (let row = 3; row <= 10; row++) {
      this.tile(3, row, 756);
      this.tile(16, row, 756);
    }

    // 南外壁・エントランス（row 11）
    this.tile(3, 11, 757);
    for (let col = 4; col <= 8; col++) this.tile(col, 11, 698);
    this.tile(9, 11, 32); // 木製ドア
    this.tile(10, 11, 698);
    for (let col = 11; col <= 15; col++) this.tile(col, 11, 698);
    this.tile(16, 11, 758);

    // 装飾柱
    for (const col of [5, 14]) {
      this.tile(col, 3, 1096);
      this.tile(col, 4, 1153);
    }

    // 緑の絨毯（col 7〜12, row 6〜8）
    const carpet = [
      [922, 923, 923, 923, 923, 924],
      [979, 980, 980, 980, 980, 981],
      [1036, 1037, 1037, 1037, 1037, 1038],
    ];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 6; c++) this.tile(7 + c, 6 + r, carpet[r][c]);
    }

    // 会議机・椅子
    this.tile(9, 6, 190);
    this.tile(10, 6, 190);
    this.tile(9, 7, 197);
    this.tile(10, 7, 198);
    this.tile(9, 8, 191);
    this.tile(10, 8, 191);

    // ダニエルの書斎机・書見台
    this.tile(4, 4, 194);
    this.tile(4, 5, 360);

    // 棚と壺
    this.tile(15, 4, 137);
    this.tile(15, 5, 25);

    this.person(320, 530, 594, 'ダレイオス王');
    this.caption('メド・ペルシア 王宮 ─ エルサレムに向く窓', 480, 136, 17);
    this.setTarget(480, 295, '窓辺で祈る');
    this.progress.setText('祈り 0 / 3');
    this.objective.setText('禁令に屈せず、朝・昼・夕の祈りを捧げよう');
    this.talk([
      { speaker: '捕囚の地の青年ダニエル', body: 'バビロン捕囚の民の中から王宮に召し出されたユダヤ人青年ダニエル。\n神から類まれな知恵を与えられ、バビロニア滅亡後も新王朝メド・ペルシアで重臣となった。' },
      { speaker: '総督たちの嫉妬と罠', body: 'だが異邦人ダニエルの出世を妬んだ同僚たちが罠を仕掛けた。\n「30日間、王以外の神や人に祈る者は獅子の穴に投げる」という禁令を王に作らせたのだ。' },
      { speaker: 'ダニエル', body: '「それでも私は、一日三度、エルサレムに向かって窓を開き、\nひざまずいて感謝と祈りを捧げることを決してやめません。」' },
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

    // 窓から光が差し込み、ダニエルがひざまずいて祈る演出
    const windowGlow = this.add.graphics().setPosition(480, 200).setAlpha(0);
    windowGlow.fillStyle(0xffe8aa, 0.25).fillCircle(0, 0, 70);
    this.scenery.add(windowGlow);
    this.tweens.add({ targets: windowGlow, alpha: 1, duration: 300, yoyo: true, hold: 400 });

    this.tweens.add({ targets: this.player, scaleY: 2.8, duration: 250, yoyo: true, hold: 350 });
    this.time.delayedCall(900, () => {
      if (this.prayers < 3) {
        this.busy = false;
        this.hint.setText(`${hour}の祈りを捧げた。SPACE / 目印をタップ：次の祈り`);
      } else this.talk([
        { speaker: '総督たちの告発', body: 'ダニエルは禁令を守らず、神に祈っています。\n王よ、ご自分の定めた法に従い、獅子の穴へ落としてください！' },
        { speaker: 'ダレイオス王', body: 'ダニエルよ、お前の神が救ってくださるように。\n王は悲しみながら、獅子の穴へ連れて行かせた。' },
      ], () => this.enterDen());
    });
  }

  private enterDen() {
    this.clearStage(); this.phase = 'den'; this.busy = true;
    this.physics.world.setBounds(35, 375, 890, 280);
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
      this.time.delayedCall(1000, () => this.talk([{ speaker: '御使いによる保護', body: '神は御使いを送り、獅子の口を塞がれた。\nダニエルは傷つけられず、信頼のうちに夜を過ごした。' }], () => this.morning()));
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
      { speaker: 'ダレイオス王', body: '「ダニエルよ！ お前の仕える神は、\n獅子からお前を救うことがおできになったか！？」' },
      { speaker: 'ダニエル', body: '「神が御使いを送り、獅子の口を塞いでくださいました。私は無傷です。\n王よ、いつまでも生きられますように！」' },
      { speaker: '生ける神への賛美と老年のダニエル', body: '王は驚嘆し、「ダニエルの神こそ生ける永遠の神である！」と帝国全土に布告を出した。\nダニエルは老境に至るまで、ペルシア帝国の宮廷で絶大な信任を受け続けた。' },
      { speaker: 'エレミヤの書と七十年の発見', body: 'ある日、ダニエルは昔の預言者エレミヤの書を読み、\n「エルサレムの荒廃の時は70年で満ちる」という神の約束を発見する。\n「捕囚の70年が、今まさに終わろうとしている！」とダニエルは悟った。' },
      { speaker: 'ダニエルの断食祈祷', body: 'ダニエルは灰をかぶり、断食して神に叫んだ。\n「主よ、私たちは背きました。しかし大いなる憐れみをもって民の罪を赦し、\n荒れ果てたエルサレムとあなたの聖所を今こそ回復してください！」' },
      { speaker: '祈りが動かした歴史・キュロス王へ', body: '神はこのダニエルの祈りを聞き届けられた。\nこの祈りと信仰が直接のきっかけとなり、神は新皇帝キュロス大王の心を動かし、\nやがて全ユダヤ人を揺るがす奇跡の解放へと歴史を動かしていく──！' },
    ], () => this.complete('第11章 完 ─ 揺るがぬ信仰と神の保護', '第12章 帰還とメシア待望へ')));
  }
}
