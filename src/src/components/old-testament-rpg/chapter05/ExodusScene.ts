import Phaser from 'phaser';
import { buildMountain, buildSea, MOUNTAIN_HEIGHT, MOUNTAIN_WIDTH, SEA_HEIGHT, SEA_WIDTH, TILES } from './map';
import { ExodusHud, textStyle } from './ui';

type Phase = 'shore' | 'parting' | 'crossing' | 'arrival' | 'mountain' | 'receiving' | 'descending' | 'calf' | 'breaking' | 'complete';
type Page = { speaker: string; body: string };

export default class ExodusScene extends Phaser.Scene {
  private phase: Phase = 'shore';
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerLabel!: Phaser.GameObjects.Text;
  private staff!: Phaser.GameObjects.Image;
  private scenery!: Phaser.GameObjects.Container;
  private north!: Phaser.GameObjects.Container;
  private south!: Phaser.GameObjects.Container;
  private people: Phaser.GameObjects.Image[] = [];
  private mountainPeople: Phaser.GameObjects.Image[] = [];
  private calfContainer?: Phaser.GameObjects.Container;
  private trail: Phaser.Math.Vector2[] = [];
  private tablets: Phaser.GameObjects.Image[] = [];
  private hud!: ExodusHud;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private destination: Phaser.Math.Vector2 | null = null;
  private pages: Page[] = [];
  private afterDialogue: (() => void) | null = null;
  private audioContext: AudioContext | null = null;
  private readonly onNextChapter?: () => void;

  constructor(onNextChapter?: () => void) {
    super('exodus');
    this.onNextChapter = onNextChapter;
  }

  init() {
    this.phase = 'shore';
    this.people = [];
    this.mountainPeople = [];
    this.calfContainer = undefined;
    this.trail = [];
    this.tablets = [];
    this.destination = null;
    this.pages = [];
    this.afterDialogue = null;
  }

  preload() {
    this.load.spritesheet(TILES, '/assets/roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet('roguelike_characters', '/assets/roguelike-characters/Spritesheet/roguelikeChar_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.image('golden_calf', '/assets/cube-pets/Previews/animal-cow.png');
  }

  create() {
    this.scenery = this.add.container(0, 0);
    const sea = buildSea(this, this.scenery);
    this.north = sea.north;
    this.south = sea.south;
    this.player = this.physics.add.sprite(345, 530, 'roguelike_characters', 325).setScale(3.5).setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.player.body!.setSize(10, 10).setOffset(3, 6);
    this.playerLabel = this.add.text(345, 481, 'モーセ', { ...textStyle(14, '#fff0c2'), backgroundColor: '#2b4658' }).setOrigin(.5).setDepth(30);
    this.staff = this.add.image(368, 523, TILES, 415).setScale(3).setOrigin(.5, 1).setDepth(21);
    this.physics.world.setBounds(60, 457, 382, 145);
    this.cameras.main.setBounds(0, 0, SEA_WIDTH, SEA_HEIGHT).startFollow(this.player, true, .12, .12);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE') as typeof this.keys;
    this.input.keyboard!.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.hud = new ExodusHud(this, () => this.action(), () => this.advanceDialogue());
    this.hud.setObjective('海辺で杖を掲げ、民のために道を開こう。');
    this.hud.setProgress('1 / 3  紅海のほとり');
    this.hud.setAction('SPACE / ここをタップ：杖を掲げる');
    this.worldLabel(398, 407, '紅海 ─ 杖を掲げる場所');
    this.worldLabel(1800, 417, '対岸の荒野 → シナイ山');
    for (let i = 0; i < 6; i++) {
      this.people.push(this.add.image(275 - i * 27, 532 + i % 2 * 24, 'roguelike_characters', [486, 379, 325][i % 3]).setScale(2.8).setDepth(18));
    }
    for (let i = 0; i < 90; i++) this.trail.push(new Phaser.Math.Vector2(Math.max(100, 345 - i * 5), 530));
    this.input.on('pointerdown', this.onPointer, this);
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onResize, this);
      this.input.off('pointerdown', this.onPointer, this);
      this.input.keyboard?.removeCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
      if (this.audioContext) void this.audioContext.close().catch(() => {});
      this.audioContext = null;
    });
    this.talk([
      { speaker: '紅海の前で震える民', body: '奴隷として苦しんだ地を出たのに、前には海、後ろには追っ手……。\nモーセ、どこへ進めばよいのですか？' },
      { speaker: '主なる神', body: '恐れるな。杖を上げ、海に手を伸ばしなさい。\n民は海の中の乾いた道を進む。' },
    ]);
  }

  private onResize(size: Phaser.Structs.Size) {
    this.hud.resize(size.width, size.height);
  }

  private worldLabel(x: number, y: number, text: string) {
    const label = this.add.text(x, y, text, { ...textStyle(15, '#fff0c2'), backgroundColor: '#263b4d' }).setOrigin(.5);
    this.scenery.add(label);
    return label;
  }

  private stop() {
    this.destination = null;
    this.player.setVelocity(0, 0);
    this.input.keyboard?.resetKeys();
  }

  private talk(pages: Page[], after?: () => void) {
    this.stop();
    this.pages = [...pages];
    this.afterDialogue = after ?? null;
    this.hud.showDialogue(this.pages[0].speaker, this.pages[0].body);
  }

  private advanceDialogue() {
    if (!this.pages.length) return;
    this.pages.shift();
    if (this.pages.length) {
      this.hud.showDialogue(this.pages[0].speaker, this.pages[0].body);
      return;
    }
    this.hud.hideDialogue();
    const after = this.afterDialogue;
    this.afterDialogue = null;
    after?.();
  }

  private onPointer(pointer: Phaser.Input.Pointer) {
    if (this.pages.length) { this.advanceDialogue(); return; }
    if (!['shore', 'crossing', 'mountain', 'descending'].includes(this.phase)) return;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (this.phase === 'shore' && point.x > 330 && point.x < 510 && Math.abs(point.y - 530) < 120) {
      this.action();
    } else if (this.phase === 'mountain' && point.y < 350 && this.player.y < 390) {
      this.action();
    } else {
      this.destination = (this.phase === 'mountain' || this.phase === 'descending')
        ? new Phaser.Math.Vector2(Phaser.Math.Clamp(point.x, 409, 551), Phaser.Math.Clamp(point.y, 285, 1270))
        : new Phaser.Math.Vector2(Phaser.Math.Clamp(point.x, 85, this.phase === 'shore' ? 410 : 1940), Phaser.Math.Clamp(point.y, 478, 583));
    }
  }

  private action() {
    if (this.pages.length) { this.advanceDialogue(); return; }
    if (this.phase === 'shore') {
      if (this.player.x < 305) { this.hud.setAction('海辺のモーセを右へ進めよう →'); return; }
      this.partSea();
    } else if (this.phase === 'mountain') {
      if (this.player.y > 380) { this.hud.setAction('石段を登り、山頂へ進もう ↑'); return; }
      this.receiveTablets();
    } else if (this.phase === 'complete') {
      this.onNextChapter?.();
    }
  }

  private partSea() {
    this.phase = 'parting';
    this.stop();
    this.hud.setObjective('モーセが杖を掲げると、海が左右へ退いていく……');
    this.hud.setAction('乾いた道が現れる……');
    this.rumble();
    this.tweens.add({ targets: this.staff, angle: -35, duration: 450, yoyo: true, hold: 900 });
    this.cameras.main.shake(950, .003);
    this.tweens.add({ targets: this.north, y: -96, duration: 1600, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.south, y: 96, duration: 1600, ease: 'Sine.easeInOut', onComplete: () => {
      this.phase = 'crossing';
      this.physics.world.setBounds(60, 457, SEA_WIDTH - 120, 145);
      this.hud.setObjective('民を率いて、海の中の乾いた道を右へ渡ろう。');
      this.hud.setAction('矢印 / WASD / 地面をタップ：右へ進む →');
    } });
  }

  private arrive() {
    this.phase = 'arrival';
    this.stop();
    this.hud.setProgress('2 / 3  紅海を渡りきった！');
    this.talk([
      { speaker: 'イスラエルの民', body: 'みんな渡れた！ 海の中に道を開いてくださった。\n私たちは、奴隷の地から解放されたのだ！' },
      { speaker: 'シナイ山への旅路', body: '旅を続けた民は、シナイ山のふもとに宿営した。\nモーセは神に呼ばれ、山を登る。' },
    ], () => this.enterMountain());
  }

  private enterMountain() {
    this.stop();
    this.scenery.removeAll(true);
    this.people.forEach(person => person.destroy());
    this.people = [];
    this.mountainPeople = [];
    this.tablets = buildMountain(this, this.scenery);
    this.tablets.forEach(tablet => tablet.setAlpha(.35));
    this.worldLabel(480, 175, 'シナイ山 ─ 神との契約');
    this.worldLabel(480, 1130, '民はふもとで待っている');
    for (let i = 0; i < 6; i++) {
      const person = this.add.image(265 + i * 82, 1320 + i % 2 * 30, 'roguelike_characters', [486, 379, 325][i % 3]).setScale(2.8).setDepth(20);
      this.mountainPeople.push(person);
      this.scenery.add(person);
    }
    this.phase = 'mountain';
    this.player.setPosition(480, 1240);
    this.physics.world.setBounds(394, 280, 172, 1005);
    this.cameras.main.setBounds(0, 0, MOUNTAIN_WIDTH, MOUNTAIN_HEIGHT);
    this.cameras.main.centerOn(480, 1240);
    this.hud.setObjective('石段を上へ登り、山頂で神のことばを聞こう。');
    this.hud.setAction('矢印 / WASD / 地面をタップ：山頂へ ↑');
    const smoke = this.add.graphics().setDepth(8);
    for (let i = 0; i < 7; i++) smoke.fillStyle(0xd8e2ef, .065).fillEllipse(290 + i * 65, 240 + i % 2 * 34, 160, 90);
    this.scenery.add(smoke);
    this.tweens.add({ targets: smoke, x: 20, y: -24, alpha: .4, duration: 2800, yoyo: true, repeat: -1 });
  }

  private receiveTablets() {
    this.phase = 'receiving';
    this.stop();
    this.hud.setObjective('雷鳴と煙の中で、神がモーセに語りかける。');
    this.hud.setAction('神のことばを聞こう');
    this.cameras.main.flash(650, 220, 235, 255);
    this.cameras.main.shake(750, .003);
    this.rumble();
    this.tweens.add({ targets: this.tablets, alpha: 1, y: '-=18', duration: 800, onComplete: () => {
      this.talk([
        { speaker: '主なる神', body: 'わたしは、あなたをエジプトの奴隷の家から導き出した主である。\nわたしの民として、この戒めを守りなさい。' },
        { speaker: '十戒・神と結ぶ契約', body: '一　主のほかに神を持たない\n二　偶像を造って拝まない\n三　主の名をみだりに唱えない\n四　安息日を聖なる日とする\n五　父と母を敬う' },
        { speaker: '十戒・人と生きる道', body: '六　殺してはならない\n七　姦淫してはならない\n八　盗んではならない\n九　偽りの証言をしてはならない\n十　隣人のものをむさぼってはならない' },
        { speaker: 'モーセ', body: '神は私たちを救い出し、生きる道も示してくださった。\nこの二枚の石板を抱え、ふもとで待つ民のもとへ急いで降りよう！' },
      ], () => {
        this.phase = 'descending';
        this.tablets[0].setPosition(this.player.x - 27, this.player.y + 4).setDepth(25);
        this.tablets[1].setPosition(this.player.x + 27, this.player.y + 4).setDepth(25);
        this.createGoldenCalf();
        this.startDancingPeople();
        this.hud.setObjective('十戒の石板を抱え、石段を駆け降りて民のもとへ向かおう ↓');
        this.hud.setAction('矢印 / WASD / 地面をタップ：ふもとへ降りる ↓');
      });
    } });
  }

  private createGoldenCalf() {
    this.calfContainer = this.add.container(480, 1260).setDepth(22);
    const glow = this.add.graphics();
    glow.fillStyle(0xffe066, 0.35).fillCircle(0, 0, 36);
    const base = this.add.rectangle(0, 20, 68, 22, 0x5a6577).setStrokeStyle(2, 0xd4af37);
    const cow = this.add.image(0, 0, 'golden_calf').setScale(1.2).setTint(0xffd700);
    const label = this.add.text(0, -38, '金の子牛（偶像）', {
      ...textStyle(14, '#fff2b3'), backgroundColor: '#6e5318', padding: { top: 4, bottom: 4, left: 6, right: 6 }
    }).setOrigin(0.5);
    this.calfContainer.add([glow, base, cow, label]);
    this.scenery.add(this.calfContainer);
    this.tweens.add({ targets: glow, alpha: 0.12, scale: 1.35, yoyo: true, repeat: -1, duration: 800 });
  }

  private startDancingPeople() {
    this.mountainPeople.forEach((p, index) => {
      this.tweens.add({
        targets: p,
        y: p.y - 18,
        angle: index % 2 === 0 ? 12 : -12,
        yoyo: true,
        repeat: -1,
        duration: 300 + (index % 3) * 70,
        ease: 'Sine.easeInOut'
      });
    });
  }

  private triggerCalfScene() {
    this.phase = 'calf';
    this.stop();
    this.talk([
      { speaker: '金の子牛と背きの民', body: 'モーセは山から戻らない！\nこの金の子牛こそ、私たちを導く神だ！ さあ飲めや歌え、踊り狂え！' },
      { speaker: 'モーセ', body: 'なんということを……！\n『主のほかに神を持たず、偶像を造ってはならない』と、神が命じられたばかりではないか！！' },
    ], () => this.breakTablets());
  }

  private breakTablets() {
    this.phase = 'breaking';
    this.stop();
    this.hud.setObjective('モーセの怒りが爆発する――！');
    this.hud.setAction('石板が粉々に砕け散る……！');
    this.tweens.add({
      targets: this.tablets,
      y: '-=60',
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.tablets,
          y: '+=110',
          duration: 250,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            this.cameras.main.shake(800, 0.015);
            this.cameras.main.flash(400, 255, 240, 200);
            this.rumble();
            this.tablets.forEach(t => t.setVisible(false));
            this.createTabletShards(this.player.x, this.player.y + 40);
            this.tweens.killTweensOf(this.mountainPeople);
            this.mountainPeople.forEach(p => p.setAngle(0).setTint(0x99aacc));

            this.time.delayedCall(950, () => {
              this.talk([
                { speaker: 'イスラエルの民', body: 'ああっ……！ 神聖な石板が粉々に……！\n私たちは取り返しのつかない大罪を犯してしまった……！' },
                { speaker: 'モーセの祈りと執り成し', body: 'モーセは激怒して偶像の金の子牛を焼き砕き、民を厳しく戒めた。\nそして罪深き民のため、神に必死の執り成しの祈りを捧げた。' },
                { speaker: '石板の再授与と聖なる契約', body: 'モーセはもう一度シナイ山へ登り、新たな石板に十戒を刻み直してもらった。\nイスラエルの民は深く悔い改め、真の神との契約を結んだのであった。' },
                { speaker: '契約の民の旅立ち', body: '海を割り、奴隷の民を導き出した神の力。\n十戒により、神の民としての歩みが始まった。' },
              ], () => {
                this.phase = 'complete';
                this.hud.setObjective('第5章 完 ─ 偶像を砕き、真の神と契約を結んだ。');
                this.hud.setProgress('3 / 3  十戒授与・金の子牛と契約更新 達成');
                this.hud.setAction('SPACE / ここをタップ：第6章 約束の地カナンへ');
              });
            });
          }
        });
      }
    });
  }

  private createTabletShards(x: number, y: number) {
    for (let i = 0; i < 14; i++) {
      const shard = this.add.image(x, y, TILES, 146).setScale(1.2).setDepth(28);
      const angle = (i / 14) * Math.PI * 2;
      const dist = 35 + Math.random() * 60;
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist + 15,
        angle: Math.random() * 360,
        alpha: 0.6,
        scale: 0.6,
        duration: 700,
        ease: 'Cubic.easeOut'
      });
    }
  }

  private rumble() {
    // 外部音源を追加せず、低域ノイズを短く減衰させて雷鳴を鳴らす。
    try {
      this.audioContext ??= new AudioContext();
      const context = this.audioContext;
      void context.resume().catch(() => {});
      const buffer = context.createBuffer(1, context.sampleRate * 1.3, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      const gain = context.createGain();
      gain.gain.setValueAtTime(.001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.18, context.currentTime + .08);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + 1.25);
      source.connect(filter).connect(gain).connect(context.destination);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start();
    } catch {
      // 音声が利用できない環境でも章の進行は止めない。
    }
  }

  update(_time: number, delta: number) {
    if (!this.player?.body || !this.keys) return;
    this.playerLabel.setPosition(this.player.x, this.player.y - 48);
    this.staff.setPosition(this.player.x + 24, this.player.y + 4);
    const action = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    if (this.pages.length) { if (action) this.advanceDialogue(); return; }
    if (action) this.action();
    if (!['shore', 'crossing', 'mountain', 'descending'].includes(this.phase)) return;
    const direction = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown || this.keys.D.isDown) - Number(this.cursors.left.isDown || this.keys.A.isDown),
      Number(this.cursors.down.isDown || this.keys.S.isDown) - Number(this.cursors.up.isDown || this.keys.W.isDown),
    );
    if (direction.lengthSq()) this.destination = null;
    else if (this.destination) {
      direction.copy(this.destination).subtract(this.player);
      if (direction.length() < 10) { direction.set(0, 0); this.destination = null; }
    }
    const speed = this.phase === 'shore' ? 230 : 330;
    direction.normalize().scale(speed);
    this.player.setVelocity(direction.x, direction.y);
    if (direction.x) this.player.setFlipX(direction.x < 0);
    if (this.phase === 'crossing') {
      if (Phaser.Math.Distance.BetweenPoints(this.trail[0], this.player) > 5) {
        this.trail.unshift(new Phaser.Math.Vector2(this.player.x, this.player.y));
        this.trail.length = Math.min(110, this.trail.length);
      }
      this.people.forEach((person, index) => {
        const point = this.trail[Math.min(this.trail.length - 1, (index + 1) * 6)];
        const blend = 1 - Math.exp(-delta / 80);
        person.x = Phaser.Math.Linear(person.x, point.x, blend);
        person.y = Phaser.Math.Linear(person.y, point.y + (index % 2 ? 12 : -12), blend);
      });
      const progress = Phaser.Math.Clamp(Math.round((this.player.x - 440) / 1360 * 100), 0, 100);
      this.hud.setProgress(`2 / 3  紅海横断 ${progress}%  ·  6人の民を導こう`);
      if (this.player.x > 1800 && this.people.every(person => person.x > 1550)) this.arrive();
    } else if (this.phase === 'mountain') {
      const progress = Phaser.Math.Clamp(Math.round((1240 - this.player.y) / 900 * 100), 0, 100);
      this.hud.setProgress(`3 / 3  シナイ山 ${progress}%  ·  山頂まであと${Math.max(0, Math.round((this.player.y - 350) / 48))}歩`);
      if (this.player.y < 380) this.hud.setAction('SPACE / ここをタップ：十戒の石板を授かる');
    } else if (this.phase === 'descending') {
      this.tablets[0].setPosition(this.player.x - 27, this.player.y + 4).setDepth(26);
      this.tablets[1].setPosition(this.player.x + 27, this.player.y + 4).setDepth(26);
      const remainingSteps = Math.max(0, Math.round((1130 - this.player.y) / 48));
      const progress = Phaser.Math.Clamp(Math.round((this.player.y - 350) / 780 * 100), 0, 100);
      this.hud.setProgress(`3 / 3  下山中 ${progress}%  ·  ふもとまであと${remainingSteps}歩（騒がしい……？）`);
      if (this.player.y > 1130) this.triggerCalfScene();
    }
  }
}
