import Phaser from 'phaser';
import ChronicleScene from '../ChronicleScene';

export default class ElijahScene extends ChronicleScene {
  private phase: 'division' | 'water' | 'rain' = 'division';
  private pours = 0;
  private altar: Phaser.GameObjects.Image[] = [];
  private trench: Phaser.GameObjects.Image[] = [];
  private baalAltar?: Phaser.GameObjects.Image;
  private mountainFloors: Phaser.GameObjects.Image[] = [];
  private treePositions: { col: number; row: number }[] = [];

  constructor(onNextChapter?: () => void) {
    super('elijah', '第9章　王国の分裂と預言者エリヤ', onNextChapter);
  }

  preload() {
    super.preload();
    this.load.image('baal_alien', '/assets/platformer-pack/Sprites/Characters/Default/character_purple_idle.png');
    this.load.image('rain_cloud', '/assets/platformer-pack/Sprites/Backgrounds/Default/background_clouds.png');
  }

  protected startChapter() {
    this.playerLabel.setText('エリヤ');
    this.floor(8);

    // 南王国ユダ（左側：エルサレムの宮殿と神殿の柱）
    for (let row = 3; row < 6; row++) for (let col = 2; col < 8; col++) this.tile(col, row, 121, 0xdfd2b5);
    this.tile(4, 5, 37); // 扉
    this.tile(2, 3, 1096, 0xd4af37); this.tile(2, 4, 1153, 0xd4af37);
    this.tile(7, 3, 1096, 0xd4af37); this.tile(7, 4, 1153, 0xd4af37);
    this.caption('南王国ユダ（エルサレム）', 240, 198, 16);

    // 北王国イスラエル（右側：アハブ王のサマリア宮殿・異教バアル神殿）
    for (let row = 3; row < 6; row++) for (let col = 12; col < 18; col++) this.tile(col, row, 121, 0x8c7094);
    this.tile(14, 5, 37); // 扉
    this.tile(12, 3, 1096, 0xa855f7); this.tile(12, 4, 1153, 0xa855f7);
    this.tile(17, 3, 1096, 0xa855f7); this.tile(17, 4, 1153, 0xa855f7);
    this.caption('北王国イスラエル（サマリア）', 720, 198, 16);

    // アハブ王とバアル偶像
    this.person(630, 460, 594, 'アハブ王');
    const baalStatue = this.add.image(740, 440, 'baal_alien').setScale(1.3).setTint(0xba68c8);
    this.scenery.add(baalStatue);
    this.caption('異教のバアル像', 740, 396, 13);
    this.tweens.add({ targets: baalStatue, y: 432, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.tree(0, 1, true); this.tree(19, 1, true);
    this.progress.setText('1 / 3　分裂');
    this.objective.setText('アハブ王に会い、カルメル山へ向かおう');
    this.setTarget(630, 560, '対決を迫る');
    this.talk([
      {
        speaker: '引き裂かれた南北王国',
        body: '栄華を極めたソロモン王の死後、過酷な重税に反発した10部族が反乱を起こし、\n王国は「北イスラエル」と「南ユダ」の二つに分裂してしまった。'
      },
      {
        speaker: '最悪の暴君アハブと嵐の神バアル',
        body: '特に北イスラエルのアハブ王と王妃イゼベルは神を捨て、異形の「嵐と雨の神バアル」を国教にしてしまう。\n民は「バアルが雨を降らせて豊作にしてくれる」と騙され、偶像崇拝に溺れていった。'
      },
      {
        speaker: '炎の預言者エリヤの宣告',
        body: 'そこへ神から遣わされたのが、孤高の預言者「エリヤ」！\n「雨を降らせるのはそのバアル像ではなく主だ！ 我が言葉なき限り雨は降らない！」と宣告し、\nその言葉通り、国中は3年半もの間、一滴の雨も降らない過酷な大干ばつに見舞われた！'
      },
      {
        speaker: 'エリヤ',
        body: '「バアルが雨の神なら、なぜ3年半も雨を降らせられぬのか！\nアハブ王よ、バアルの預言者たちを集めよ！ カルメル山の頂で、天から火をもって答える神こそ真の神だと白黒つけよう！」'
      }
    ]);
  }

  protected interact() {
    if (this.phase === 'division') {
      this.talk([
        {
          speaker: 'アハブ王',
          body: '「お前がイスラエルを干ばつで苦しめる元凶エリヤか！\nよかろう、カルメル山にバアルの預言者850人を集めてやる。\nどちらの神が本物か、民の前で白黒つけてくれるわ！」'
        }
      ], () => this.enterMountain());
    } else if (this.phase === 'water') this.pourWater();
    else this.revealRain();
  }

  private enterMountain() {
    this.clearStage();
    this.phase = 'water';
    this.mountainFloors = [];

    // 1. 地面ベース（乾いたカルメル山の砂地・土）
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 20; col++) {
        const t = this.tile(col, row, 8, 0xd2bc99);
        this.mountainFloors.push(t);
      }
    }

    // 2. 最上部の山頂岩稜（カルメル山の険しい岩峰シルエット）
    for (let col = 0; col < 20; col++) {
      this.tile(col, 0, 1137, 0x8a7e6b);
      if (col % 3 !== 0) this.tile(col, 1, 1138, 0xa39682);
    }

    // 3. 枯れ木（3年半の干ばつで枯れ果てた木々）
    this.treePositions = [[0, 2], [1, 5], [18, 2], [19, 6]].map(([col, row]) => ({ col, row }));
    for (const { col, row } of this.treePositions) this.tree(col, row, true);

    // 4. 左側：バアル陣営の高台（石畳・柱・篝火・偶像）
    for (let row = 3; row <= 5; row++) {
      for (let col = 2; col <= 6; col++) {
        this.tile(col, row, 121, 0x8c7094); // 紫がかった石畳
      }
    }
    // バアル高台の柱
    this.tile(2, 3, 1096, 0xb89ec0); this.tile(2, 4, 1153, 0xb89ec0);
    this.tile(6, 3, 1096, 0xb89ec0); this.tile(6, 4, 1153, 0xb89ec0);
    // 紫色の怪しい篝火
    this.tile(2, 5, 398, 0xd8b4e2);
    this.tile(6, 5, 398, 0xd8b4e2);

    // バアル偶像（奥・壇上）
    for (let i = 0; i < 3; i++) this.tile(3 + i, 4, 1137, 0x6e5275);
    this.baalAltar = this.add.image(216, 290, 'baal_alien').setScale(1.3).setTint(0xc084fc);
    this.scenery.add(this.baalAltar);
    this.caption('バアルの偶像', 216, 244, 13);

    // 手前で踊り狂う預言者たち（上下に完全に分離）
    for (let i = 0; i < 3; i++) {
      const p = this.person(146 + i * 70, 430, 325);
      this.tweens.add({ targets: p, y: 416, duration: 280 + i * 50, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.caption('バアルの預言者たち', 216, 474, 13);

    // 5. 右側：主の祭壇側の溝と十二の石
    for (const [x, y] of [[11, 4], [12, 4], [13, 4], [14, 4], [11, 5], [14, 5], [11, 6], [12, 6], [13, 6], [14, 6]]) {
      this.trench.push(this.tile(x, y, 0).setAlpha(.12));
    }
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
      const stone = this.add.image(588 + col * 27, 353 + row * 23, this.tileKey, 1137).setScale(2);
      this.scenery.add(stone); this.altar.push(stone);
    }
    this.altar.push(this.tile(12, 5, 179));
    this.altar.push(this.tile(13, 5, 179));
    this.caption('十二の石と主の祭壇', 638, 277);

    // 乾いた山肌の小岩・装飾
    for (const [cx, cy] of [[8, 3], [10, 8], [9, 10], [16, 8], [17, 3]]) {
      this.tile(cx, cy, 1137, 0x9c8f7a);
    }

    this.person(850, 550, 594, 'アハブ王');
    this.caption('カルメル山 ─ 二つの祭壇の決戦', 480, 136, 17);
    this.setTarget(630, 505, '水を注ぐ');
    this.progress.setText('2 / 3　水 0 / 3');
    this.objective.setText('【対決ルール】天から火を降らせた神が勝利！ 水を三度注いで奇跡に備えよう');
    this.talk([
      {
        speaker: 'カルメル山の対決の掟',
        body: '「ルールは一つ！ 互いに薪の上にいけにえを置き、人間が火をつけてはならない！\n神に祈り、天から火を降らせていけにえを焼き尽くした神こそが【真の神】だ！」'
      },
      {
        speaker: 'バアル側の失格と敗北',
        body: 'バアルの預言者たちは朝から夕方まで踊り狂い、体を刃物で傷つけて叫ぶも、火は一筋も降らず敗北した……。'
      },
      {
        speaker: '疑いを断つ聖なる水かけ',
        body: 'エリヤは十二部族を表す十二の石で、崩れていた主の祭壇を築き直した。\nそして手品や火種の疑いを完全に断つため、絶対に火がつかないよう祭壇をビショ濡れにし、溝まで水で満たすよう命じた！'
      },
      {
        speaker: 'エリヤの勝利への挑戦',
        body: '「祭壇へ近づき、いけにえと薪に水を三度注ぎなさい！\n水浸しの祭壇に天から火が降れば、人知を超えた主なる神の完全勝利だ！」'
      }
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
    this.objective.setText('天からの激しい業火が、祭壇と溝の水を焼き尽くす！！');

    // 天空から降り注ぐ巨大な火柱ビーム
    const beam = this.add.graphics();
    beam.fillStyle(0xfff7c2, 0.95).fillRect(625, 0, 30, 375);
    beam.fillStyle(0xff7700, 0.65).fillRect(612, 0, 56, 375);
    this.scenery.add(beam);

    const fireHead = this.add.image(640, 50, this.tileKey, 398).setScale(6).setTint(0xffea00);
    this.scenery.add(fireHead);

    this.tweens.add({
      targets: fireHead,
      y: 365,
      duration: 420,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        beam.destroy();
        fireHead.destroy();

        // 激震と大爆発フラッシュ
        this.cameras.main.flash(600, 255, 210, 110);
        this.cameras.main.shake(1400, 0.02);

        // 祭壇を覆い尽くす激しい業火（燃え盛る火炎群）
        const fireFlames: Phaser.GameObjects.Image[] = [];
        for (let i = 0; i < 10; i++) {
          const fx = 555 + i * 18;
          const fy = 370 + (i % 3) * 12;
          const flame = this.add.image(fx, fy, this.tileKey, 398)
            .setScale(3.6 + Math.random() * 1.6)
            .setTint([0xff2200, 0xff6600, 0xffcc00][i % 3])
            .setDepth(40);
          this.scenery.add(flame);
          fireFlames.push(flame);

          this.tweens.add({
            targets: flame,
            y: fy - 26 - Math.random() * 20,
            scaleY: flame.scaleY * 1.45,
            alpha: 0.85,
            duration: 160 + Math.random() * 90,
            yoyo: true,
            repeat: 8,
            ease: 'Sine.easeInOut'
          });
        }

        // 爆炎の光彩オーラ
        const blastGlow = this.add.graphics().setPosition(640, 375);
        blastGlow.fillStyle(0xff3700, 0.55).fillCircle(0, 0, 145);
        blastGlow.fillStyle(0xffd700, 0.75).fillCircle(0, 0, 95);
        this.scenery.add(blastGlow);
        this.tweens.add({ targets: blastGlow, scale: 1.4, alpha: 0, duration: 1600, ease: 'Cubic.easeOut' });

        // 水浸しの溝から瞬時に激しく噴き出す白煙・水蒸気
        for (let i = 0; i < 12; i++) {
          const steam = this.add.graphics();
          const sx = 580 + (i % 6) * 24;
          const sy = 380 + Math.floor(i / 6) * 20;
          steam.fillStyle(0xffffff, 0.7).fillCircle(0, 0, 16 + (i % 3) * 8);
          steam.setPosition(sx, sy);
          this.scenery.add(steam);
          this.tweens.add({
            targets: steam,
            y: sy - 120 - Math.random() * 60,
            x: sx + (Math.random() - 0.5) * 50,
            scale: 2.2,
            alpha: 0,
            duration: 1200 + i * 80,
            ease: 'Quad.easeOut',
            onComplete: () => steam.destroy()
          });
        }

        // 四方八方に飛び散る無数の火の粉（炎タイルスプライト）
        for (let i = 0; i < 22; i++) {
          const spark = this.add.image(640, 370, this.tileKey, 398)
            .setDisplaySize(12, 12)
            .setTint([0xfff000, 0xff5500, 0xffaa00][i % 3])
            .setDepth(45);
          this.scenery.add(spark);
          const angle = Math.random() * Math.PI * 2;
          const dist = 70 + Math.random() * 120;
          this.tweens.add({
            targets: spark,
            x: 640 + Math.cos(angle) * dist,
            y: 370 + Math.sin(angle) * dist - 40,
            alpha: 0,
            scale: 0.2,
            duration: 600 + Math.random() * 400,
            ease: 'Cubic.easeOut',
            onComplete: () => spark.destroy()
          });
        }

        // 祭壇と溝の水が瞬時に焼き尽くされて消滅
        this.tweens.add({ targets: this.altar, alpha: 0, duration: 800 });
        this.tweens.add({ targets: this.trench, alpha: 0, duration: 800 });

        // 祭壇の跡地が黒焦げの大地へ変色し、炭・黒焦げの瓦礫が残る（タイル素材で構築）
        this.mountainFloors.forEach((tile) => {
          if (tile.x >= 520 && tile.x <= 720 && tile.y >= 280 && tile.y <= 420) {
            tile.setTint(0x261912);
          }
        });
        const scorchDebris: [number, number, number][] = [
          [580, 370, 1137], [610, 385, 1138], [640, 375, 1137],
          [670, 380, 1138], [700, 365, 1137], [625, 360, 1137],
          [655, 395, 1138], [595, 395, 1137]
        ];
        for (const [dx, dy, frame] of scorchDebris) {
          const debris = this.add.image(dx, dy, this.tileKey, frame)
            .setScale(2.2)
            .setTint(0x1f140e)
            .setDepth(12);
          this.scenery.add(debris);
        }

        // バアル像が神の火の熱気で黒焦げになり縮む
        if (this.baalAltar) {
          this.tweens.add({
            targets: this.baalAltar,
            tint: 0x332233,
            scale: 0.9,
            duration: 600
          });
        }

        // 炎が激しく燃え盛ったあと収まる
        this.tweens.add({
          targets: fireFlames,
          alpha: 0,
          scaleY: 0,
          duration: 850,
          delay: 1200,
          onComplete: () => fireFlames.forEach(f => f.destroy())
        });
      }
    });

    this.time.delayedCall(2700, () => {
      this.talk([
        {
          speaker: '主の完全勝利！',
          body: '勝負あり！ 天からの火が、ビショ濡れの薪も石も、溝の水までも一瞬で焼き尽くした！\n火をもって答えられた主こそ、唯一まことの生ける神だ！'
        },
        {
          speaker: 'イスラエルの民',
          body: '「主こそ神です！ 主こそ真の神です！ バアルは偽りだった！」\n民は全員地面にひれ伏し、神への信仰を取り戻した。'
        },
        {
          speaker: 'エリヤ',
          body: '偽りのバアル像は退けられた！\n主よ、悔い改めたこの大地に、3年半ぶりの恵みの大雨を降らせてください！'
        },
      ], () => {
        this.phase = 'rain'; this.busy = false;
        this.progress.setText('3 / 3　雨の約束');
        this.objective.setText('エリヤとともに、海の方から来る雲を見よう');
        this.setTarget(380, 510, '雨を待つ');
      });
    });
  }

  private revealRain() {
    this.busy = true; this.stop(); this.marker.setVisible(false);
    this.objective.setText('恵みの大雨が降り注ぎ、枯れた大地が緑豊かに蘇る！');

    // 1. スプライト素材による雨雲（海の方から湧き上がり空を覆う）と雨粒
    const cloud1 = this.add.image(360, 220, 'rain_cloud').setScale(0.3).setAlpha(0).setTint(0x4a5568).setDepth(20);
    const cloud2 = this.add.image(580, 200, 'rain_cloud').setScale(0.3).setAlpha(0).setTint(0x3a4556).setDepth(20);
    const cloud3 = this.add.image(470, 240, 'rain_cloud').setScale(0.3).setAlpha(0).setTint(0x55637a).setDepth(20);
    this.scenery.add([cloud1, cloud2, cloud3]);
    this.tweens.add({
      targets: [cloud1, cloud2, cloud3],
      alpha: 0.88,
      scale: 1.6,
      duration: 1300,
      ease: 'Cubic.easeOut'
    });

    for (let i = 0; i < 40; i++) {
      const drop = this.add.image(80 + i * 21, 280 + i % 4 * 30, this.tileKey, 0).setDisplaySize(3, 17).setAlpha(0.65).setDepth(21);
      this.scenery.add(drop);
      this.tweens.add({ targets: drop, x: '-=32', y: '+=240', alpha: 0.15, duration: 700, delay: i * 32, repeat: -1 });
    }

    // 2. 地面タイルが茶褐色から瑞々しい新緑グリーンへ変化
    this.mountainFloors.forEach((tile) => {
      this.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 1400,
        delay: 450 + (tile.x + tile.y) * 0.7,
        onUpdate: (tw) => {
          const v = (tw.getValue() ?? 0) / 100;
          const r = Math.round(210 * (1 - v) + 118 * v);
          const g = Math.round(188 * (1 - v) + 207 * v);
          const b = Math.round(153 * (1 - v) + 104 * v);
          tile.setTint((r << 16) | (g << 8) | b);
        }
      });
    });

    // 3. 枯れ木が青々とした緑の大樹へと一斉に芽吹いて蘇る
    this.treePositions.forEach(({ col, row }, i) => {
      const top = this.tile(col, row, 583).setAlpha(0).setDepth(15);
      const btm = this.tile(col, row + 1, 640).setAlpha(0).setDepth(15);
      this.tweens.add({
        targets: [top, btm],
        alpha: 1,
        scale: 3.2,
        duration: 800,
        delay: 850 + i * 140,
        ease: 'Back.easeOut'
      });
    });

    // 4. 雨を吸った大地から花々・若草（roguelikeSheet スプライトタイル）がポンポンと芽吹く
    const flowerFrames = [513, 514, 570, 571, 684, 685, 533, 651];
    for (let i = 0; i < 28; i++) {
      const fx = 50 + (i % 9) * 105 + Math.random() * 25;
      const fy = 290 + Math.floor(i / 9) * 95 + Math.random() * 25;
      if (fx > 540 && fx < 740 && fy > 340 && fy < 430) continue;
      const frame = flowerFrames[i % flowerFrames.length];
      const flower = this.add.image(fx, fy, this.tileKey, frame)
        .setScale(0)
        .setDepth(16);
      this.scenery.add(flower);
      this.tweens.add({
        targets: flower,
        scale: 2.8,
        duration: 450,
        delay: 1100 + i * 45,
        ease: 'Back.easeOut'
      });
    }

    // 5. 雨上がりの神の祝福の光が大地に降り注ぐ
    const sunlight = this.add.graphics().setPosition(480, 220).setAlpha(0).setDepth(18);
    sunlight.fillStyle(0xfffae6, 0.22).fillCircle(0, 0, 420);
    this.scenery.add(sunlight);
    this.tweens.add({ targets: sunlight, alpha: 1, duration: 1600, delay: 1500 });

    this.time.delayedCall(2700, () => this.talk([
      {
        speaker: 'エリヤ',
        body: '海の方に小さな雲が湧き上がり、恵みの大雨が地を潤す！\n見よ！ 3年半死に絶えていた大地が、みるみる瑞々しい緑と花々で息を吹き返していく！'
      },
      {
        speaker: '主の完全な勝利と緑の再生',
        body: '嵐と雨の神と偽られたバアルには一滴の雨も降らせられなかったが、\n真の神・主は天から火を下し、そして乾ききった大地に豊かな雨を注いで命を蘇らせられた！\n天地の真の創造主が誰であるかが完全に示されたのである。'
      },
      {
        speaker: '預言者たちの警告と滅亡への道',
        body: '民は奇跡に驚いたが、その後の歴代の王たちも再び神に背き続けた。\n預言者たちが涙ながらに「主に立ち返れ」と警告したが、民は耳を塞いだ。'
      },
      {
        speaker: 'やがて迫る帝国の鉄槌',
        body: 'やがて北イスラエルはアッシリアに滅ぼされ、\n南ユダ王国にも、大帝国バビロニアによる破滅の時が迫っていた──'
      },
    ], () => this.complete('第9章 完 ─ 火の奇跡と恵みの雨', '第10章 バビロン捕囚へ')));
  }
}
