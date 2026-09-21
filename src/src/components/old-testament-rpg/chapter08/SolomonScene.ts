import Phaser from 'phaser';
import ChronicleScene from '../ChronicleScene';

export default class SolomonScene extends ChronicleScene {
  private phase: 'judgment' | 'building' | 'glory' = 'judgment';
  private mother!: Phaser.GameObjects.Image;
  private baby!: Phaser.GameObjects.Image;
  private temple: Phaser.GameObjects.Image[] = [];

  constructor(onNextChapter?: () => void) { super('solomon', '第8章　知恵の王ソロモンと黄金神殿', onNextChapter); }

  protected startChapter() {
    this.playerLabel.setText('ソロモン');
    this.player.setFrame(594).setTint(0xffdf8f);
    this.floor(121);
    for (let col = 0; col < 20; col++) for (let row = 0; row < 3; row++) this.tile(col, row, 121, 0xe4d7b4);
    for (const col of [1, 5, 14, 18]) { this.tile(col, 2, 1096); this.tile(col, 3, 1153); }
    this.caption('知恵の法廷', 480, 135, 17);
    this.person(600, 420, 486, '母親A').setTint(0xe4b5ba);
    this.mother = this.person(770, 420, 486, '母親B').setTint(0xa7d9ef);
    this.baby = this.person(685, 455, 486).setScale(1.4);
    this.caption('赤子', 685, 485, 13);
    this.setTarget(640, 540, '訴えを聞く');
    this.objective.setText('二人の母親のもとへ進み、知恵をもって裁こう');
    this.progress.setText('1 / 3　知恵');
    this.talk([
      { speaker: 'ギブオンの夜の祈り', body: '偉大な父ダビデ王の跡を継ぎ、第3代イスラエル王となった青年ソロモン。\nある夜、ギブオンで主に祈りを捧げると、夢の中に神が現れた。' },
      { speaker: '神', body: 'ソロモンよ、あなたに何を授けようか。何でも願いなさい。' },
      { speaker: 'ソロモン', body: '私はまだ若く、善悪を判断できません。多くの民を正しく導くため、\n長寿や富ではなく「聞き分ける心（知恵）」を私にください。' },
      { speaker: '知恵と富の約束', body: '神はその謙虚な願いを喜ばれ、前代未聞の知恵に加え、\n求めなかった富と誉れをもソロモンに授けられた。' },
    ]);
  }

  protected interact() {
    if (this.phase === 'judgment') this.judge();
    else if (this.phase === 'building') this.buildTemple();
    else this.talk([
      { speaker: 'シェバの女王', body: 'あなたの知恵を聞き、遠い国から来ました。\nその知恵と、民を治める姿に驚かされます。' },
      { speaker: 'ソロモン', body: '主よ、天さえあなたを収めきれません。\nそれでも、ここで捧げる民の祈りを聞いてください。' },
    ], () => this.gloryCloud());
  }

  private judge() {
    this.talk([
      { speaker: '二人の母親の訴え', body: 'どちらも「この赤子は私の子だ」と訴えている。\nソロモンは二人の心を確かめようとした。' },
      { speaker: 'ソロモン', body: '二人とも我が子だと言うなら、赤子を二つに分けよ。' },
      { speaker: '母親B', body: 'それだけはおやめください！\nどうか生かしてください。その人に渡してください。' },
    ], () => {
      this.busy = true;
      this.tweens.add({ targets: this.baby, x: this.mother.x - 18, y: this.mother.y + 5, duration: 750,
        onComplete: () => this.talk([
          { speaker: '名裁判と神の知恵', body: '本当の母親は我が子の命を奪えない。生かそうとした母親Bに返しなさい。\nこの名裁断に全イスラエルは驚嘆し、王に神の知恵が宿っていることを知った。' },
          { speaker: '父ダビデの悲願へ', body: '知恵による平和のもと、ソロモンは父ダビデの悲願であった\n「契約の箱を納める黄金の神殿」の建設へと乗り出す！' },
        ], () => this.enterBuilding()),
      });
    });
  }

  private enterBuilding() {
    this.clearStage(); this.phase = 'building';
    this.player.setFrame(594).setTint(0xffdf8f);
    this.floor(8);
    this.temple = [];
    for (let row = 5; row >= 2; row--) for (let col = 6; col < 14; col++) this.temple.push(this.tile(col, row, 121, 0xf0cb7f));
    for (const col of [6, 13]) {
      this.temple.push(this.tile(col, 3, 1096, 0xffd983));
      this.temple.push(this.tile(col, 4, 1153, 0xffd983));
    }
    for (let col = 6; col < 14; col++) this.temple.push(this.tile(col, 2, 1269, 0xffdf8f));
    this.temple.push(this.tile(9, 0, 1210, 0xffd26d), this.tile(10, 0, 1211, 0xffd26d));
    for (let col = 8; col <= 11; col++) this.temple.push(this.tile(col, 1, col === 8 ? 1210 : col === 11 ? 1211 : 1215, 0xffd26d));
    this.temple.push(this.tile(9, 5, 37), this.tile(10, 5, 37));
    this.temple.forEach(piece => piece.setAlpha(.12));
    for (const col of [2, 3, 16, 17]) { this.tile(col, 7, 179); this.tile(col, 8, 23); }
    this.person(290, 520, 487, '職人');
    this.person(760, 520, 487, '職人');
    this.caption('エルサレム ─ 石とレバノン杉の神殿', 480, 137, 16);
    this.setTarget(490, 530, '神殿を建てる');
    this.progress.setText('2 / 3　建設');
    this.objective.setText('建設現場へ進み、SPACE / タップで神殿を仕上げよう');
  }

  private buildTemple() {
    this.busy = true; this.stop(); this.marker.setVisible(false);
    this.objective.setText('石と杉を組み、黄金に輝く神殿が立ち上がる');
    this.temple.forEach((piece, index) => {
      const finalY = piece.y;
      piece.setY(finalY - 35).setAlpha(0);
      this.tweens.add({ targets: piece, y: finalY, alpha: 1, duration: 350, delay: index * 32, ease: 'Sine.easeOut' });
    });
    this.time.delayedCall(this.temple.length * 32 + 450, () => this.talk([
      { speaker: 'エルサレム黄金神殿の完成', body: '7年の歳月をかけ、石とレバノン杉、そして純金に輝く神殿が完成した！\nソロモンの知恵と王国の繁栄は遠方にも轟き、南のアラビアからシェバの女王が訪れた。' },
    ], () => {
      this.phase = 'glory'; this.busy = false;
      this.person(730, 440, 486, 'シェバの女王').setTint(0xffdfa1);
      this.setTarget(675, 530, '奉献の祈り');
      this.progress.setText('3 / 3　奉献');
      this.objective.setText('シェバの女王を迎え、神殿で祈りを捧げよう');
    }));
  }

  private gloryCloud() {
    this.busy = true; this.marker.setVisible(false);
    const cloud = this.add.graphics().setPosition(480, 305).setAlpha(0);
    cloud.fillStyle(0xfff0cf, .28);
    for (let i = 0; i < 7; i++) cloud.fillEllipse(i * 50 - 150, i % 2 * 23, 115, 90);
    this.scenery.add(cloud);
    this.tweens.add({ targets: cloud, alpha: 1, scale: 1.15, duration: 1600 });
    this.cameras.main.flash(850, 255, 236, 183);
    this.time.delayedCall(1800, () => this.talk([
      { speaker: '主の栄光の雲', body: '主の栄光の雲が神殿を満たした！　主が私たちの真ん中におられる！' },
      { speaker: '栄華の影と偶像礼拝', body: 'しかし絶頂の繁栄の中、ソロモンは晩年に多くの異教の妻たちを迎え、\n偶像礼拝を許し、巨大建築のために民へ重税と過酷な賦役を課してしまった。' },
      { speaker: '王国分裂の暗雲', body: '「必ず王国を引き裂く」という神の警告どおり、\nソロモンの死後、王国は南北真っ二つに分裂することになる──' },
    ], () => this.complete('第8章 完 ─ 知恵の裁きと黄金神殿', '第9章 王国の分裂と預言者エリヤへ')));
  }
}
