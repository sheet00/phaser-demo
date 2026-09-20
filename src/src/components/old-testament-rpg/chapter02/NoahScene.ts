import Phaser from 'phaser';
import { addBabelBlock, addNoahTile, buildArkMap, buildBabelMap } from './map';

const FONT_FAMILY = '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';

type Phase = 'rescue' | 'flood' | 'covenant' | 'babel' | 'babelBuilding' | 'scattering' | 'complete';
type AnimalPair = { sprites: Phaser.GameObjects.Image[]; label: Phaser.GameObjects.Text; saved: boolean };

export default class NoahChapterScene extends Phaser.Scene {
  private phase: Phase = 'rescue';
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerLabel!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private destination: Phaser.Math.Vector2 | null = null;
  private scenery!: Phaser.GameObjects.Container;
  private boat!: Phaser.GameObjects.Container;
  private flood?: Phaser.GameObjects.Container;
  private rain!: Phaser.GameObjects.Graphics;
  private command!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private dialogue!: Phaser.GameObjects.Container;
  private speech!: Phaser.GameObjects.Text;
  private speaker!: Phaser.GameObjects.Text;
  private pages: { speaker: string; body: string }[] = [];
  private afterDialogue: (() => void) | null = null;
  private pairs: AnimalPair[] = [];
  private rescued = 0;
  private builders: Phaser.GameObjects.Sprite[] = [];
  private builderLabels: Phaser.GameObjects.Text[] = [];
  private babelConversationStarted = false;
  private babelConstructionStarted = false;
  private nextChapter?: () => void;

  constructor(nextChapter?: () => void) { super('noah'); this.nextChapter = nextChapter; }

  preload() {
    this.load.spritesheet('noah_tiles', '/assets/roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png', {
      frameWidth: 16, frameHeight: 16, spacing: 1
    });
    this.load.image('noah_person', '/assets/platformer-pack/Sprites/Characters/Default/character_beige_idle.png');
    for (const name of ['lion', 'deer', 'bunny', 'parrot']) {
      this.load.image(`noah_${name}`, `/assets/cube-pets/Previews/animal-${name}.png`);
    }
    this.load.audio('noah_magic', '/assets/platformer-pack/Sounds/sfx_magic.ogg');
  }

  create() {
    this.updateCameraView();
    this.scale.on('resize', () => this.updateCameraView());
    this.physics.world.setBounds(24, 170, 912, 492);
    this.scenery = this.add.container(0, 0);
    this.boat = buildArkMap(this, this.scenery);
    this.player = this.physics.add.sprite(480, 470, 'noah_person').setScale(0.52).setDepth(20);
    this.player.setCollideWorldBounds(true);
    this.player.body!.setSize(48, 36);
    this.player.body!.setOffset(40, 88);
    this.playerLabel = this.add.text(480, 425, 'ノア', {
      fontFamily: FONT_FAMILY, fontSize: '15px', color: '#ffffff', backgroundColor: '#26352c',
      resolution: 3, padding: { top: 6, bottom: 4, left: 6, right: 6 }
    }).setOrigin(0.5).setDepth(21);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE') as typeof this.keys;
    this.createPairs();
    this.rain = this.add.graphics().setDepth(40);
    this.add.rectangle(480, 54, 928, 90, 0x14251d, 0.96).setStrokeStyle(1, 0xb79a56).setDepth(100);
    this.add.text(32, 18, '第2章  ノアの箱舟とバベルの塔', {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: '#e5c77e', fontStyle: 'bold',
      resolution: 3, padding: { top: 6, bottom: 4, left: 4, right: 4 }
    }).setDepth(101);
    this.command = this.add.text(32, 51, '', {
      fontFamily: FONT_FAMILY, fontSize: '17px', color: '#fff2d0', wordWrap: { width: 880 },
      resolution: 3, padding: { top: 6, bottom: 4, left: 4, right: 4 }
    }).setDepth(101);
    this.hint = this.add.text(480, 696, '矢印 / WASD / タップで移動 · SPACE / タップで調べる', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: '#ffffff', backgroundColor: '#19251c',
      resolution: 3, padding: { top: 6, bottom: 4, left: 8, right: 8 }
    }).setOrigin(0.5).setDepth(101);
    this.dialogue = this.add.container(0, 0).setDepth(200).setVisible(false);
    const panel = this.add.rectangle(480, 595, 916, 180, 0x111b17, 0.98).setStrokeStyle(2, 0xb79a56);
    this.speaker = this.add.text(42, 517, '', {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: '#e5c77e', fontStyle: 'bold',
      resolution: 3, padding: { top: 8, bottom: 4, left: 4, right: 4 }
    });
    this.speech = this.add.text(42, 556, '', {
      fontFamily: FONT_FAMILY, fontSize: '19px', color: '#ffffff', lineSpacing: 8, wordWrap: { width: 870 },
      resolution: 3, padding: { top: 8, bottom: 6, left: 4, right: 4 }
    });
    const next = this.add.text(906, 648, 'SPACE / タップで次へ', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: '#d5c9a7',
      resolution: 3, padding: { top: 6, bottom: 4, left: 4, right: 4 }
    }).setOrigin(1, 0);
    this.dialogue.add([panel, this.speaker, this.speech, next]);
    this.setCommand('ノアよ、つがいの動物たちを箱舟へ導きなさい。 0 / 3組');
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.pages.length) { this.advanceDialogue(); return; }
      if (this.phase === 'babel' && this.builders.length) {
        const builder = this.builders.find(candidate => Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, candidate.x, candidate.y) < 75);
        if (builder && Phaser.Math.Distance.Between(this.player.x, this.player.y, builder.x, builder.y) < 105) {
          this.startBabelConversation();
          return;
        }
        if (builder) {
          this.destination = new Phaser.Math.Vector2(builder.x, builder.y);
          return;
        }
      }
      if (this.phase === 'rescue' || this.phase === 'babel') {
        this.destination = new Phaser.Math.Vector2(Phaser.Math.Clamp(pointer.worldX, 45, 915), Phaser.Math.Clamp(pointer.worldY, 380, 650));
      }
    });
    this.talk([{ speaker: '神からの司令', body: 'ノアよ、洪水が近づいている。\nつがいの動物たちに触れ、箱舟へ避難させなさい。' }]);
  }

  private tile(col: number, row: number, frame: number, parent = this.scenery) {
    return addNoahTile(this, parent, col, row, frame);
  }

  private createPairs() {
    ['lion', 'deer', 'bunny'].forEach((name, index) => {
      const x = [280, 480, 700][index];
      const y = [455, 580, 475][index];
      const sprites = [-23, 23].map(offset => this.add.image(x + offset, y, `noah_${name}`).setScale(0.8).setDepth(22));
      const label = this.add.text(x, y - 43, '助けを待つつがい', {
        fontFamily: FONT_FAMILY, fontSize: '13px', color: '#fff0c2', backgroundColor: '#3b4037',
        resolution: 3, padding: { top: 6, bottom: 4, left: 6, right: 6 }
      }).setOrigin(0.5).setDepth(23);
      this.pairs.push({ sprites, label, saved: false });
      for (const sprite of sprites) {
        this.tweens.add({ targets: sprite, x: sprite.x + 8, duration: 230 + index * 60, yoyo: true, repeat: -1 });
      }
    });
  }

  private rescue(pair: AnimalPair) {
    pair.saved = true;
    pair.label.setText('箱舟へ！');
    for (const sprite of pair.sprites) this.tweens.killTweensOf(sprite);
    this.sound.play('noah_magic', { volume: 0.3 });
    this.tweens.add({ targets: [...pair.sprites, pair.label], x: 480, y: 320, alpha: 0, duration: 700,
      onComplete: () => {
        this.rescued++;
        this.setCommand(`ノアよ、つがいの動物たちを箱舟へ導きなさい。 ${this.rescued} / 3組`);
        if (this.rescued === this.pairs.length) this.beginFlood();
      }
    });
  }

  private beginFlood() {
    this.phase = 'flood';
    this.stopMovement();
    this.player.setVisible(false);
    this.playerLabel.setVisible(false);
    this.setCommand('箱舟に入りなさい。あなたたちの命を守ろう。');
    this.hint.setText('雨は降り続き、水が大地を覆っていく……');
    const flood = this.add.container(0, 0).setDepth(10).setAlpha(0);
    this.flood = flood;
    for (let r = 0; r < 12; r++) for (let c = 0; c < 20; c++) this.tile(c, r, (r + c) % 3 === 0 ? 1 : 0, flood);
    this.tweens.add({ targets: flood, alpha: 1, duration: 1700 });
    this.tweens.add({ targets: this.boat, y: -16, duration: 1100, yoyo: true, repeat: -1 });
    this.time.delayedCall(2300, () => this.showCovenant());
  }

  private showCovenant() {
    this.phase = 'covenant';
    this.rain.clear();
    this.hint.setText('水が引き、鳩がオリーブの葉を持ち帰った。');
    const dove = this.add.image(890, 180, 'noah_parrot').setScale(0.65).setTintFill(0xffffff).setDepth(50);
    const leaf = this.add.image(900, 195, 'noah_tiles', 652).setScale(1.2).setDepth(51);
    this.tweens.add({ targets: [dove, leaf], x: '-=410', y: '+=60', duration: 1300 });
    const rainbow = this.add.graphics().setDepth(45).setAlpha(0);
    [0xe68181, 0xe8b56b, 0xe7d88e, 0x92c58c, 0x87bed8, 0xaaa0d2].forEach((color, index) => {
      rainbow.lineStyle(8, color, 0.85).beginPath().arc(480, 370, 224 - index * 9, Math.PI, Math.PI * 2).strokePath();
    });
    this.tweens.add({ targets: rainbow, alpha: 1, duration: 1300 });
    this.time.delayedCall(1500, () => {
      this.setCommand('この虹を、あなたたちと結ぶ契約のしるしとする。');
      this.talk([
        { speaker: '神の約束 ― 虹の契約', body: 'この虹を契約のしるしとする。\n再び洪水によって、すべての生き物を滅ぼすことはしない。' },
        { speaker: '時は流れ、シナルの平野へ', body: 'ノアの子孫たちは地上に増え広がり、一つの言葉を話していた。\nやがて自分たちの名を高めようと、天に届く塔を築き始めた。' }
      ], () => {
        dove.destroy(); leaf.destroy(); rainbow.destroy();
        this.tweens.killTweensOf(this.boat);
        this.boat.destroy();
        this.flood?.destroy();
        this.buildBabel();
      });
    });
  }

  private buildBabel() {
    this.phase = 'babel';
    buildBabelMap(this, this.scenery);
    this.player.setPosition(480, 580).setVisible(true);
    this.playerLabel.setText('ノアの子孫').setVisible(true);
    this.builders = [330, 420, 560, 650].map((x, index) => this.add.sprite(x, 455 + index % 2 * 35, 'noah_person').setScale(0.46).setTint([0xd1a96b, 0xadc6d1, 0xc6b494, 0xc2d29b][index]).setDepth(20));
    this.builderLabels = this.builders.map((builder, index) => {
      const label = this.add.text(builder.x, builder.y - 45, index % 2 ? 'レンガを運ぶ' : '積もう！', {
        fontFamily: FONT_FAMILY, fontSize: '14px', color: '#fff4d6', backgroundColor: '#594833',
        resolution: 3, padding: { top: 6, bottom: 4, left: 6, right: 6 }
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: builder, x: builder.x + (index % 2 ? -18 : 18), duration: 420 + index * 40, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: label, x: label.x + (index % 2 ? -18 : 18), duration: 420 + index * 40, yoyo: true, repeat: -1 });
      return label;
    });
    this.setCommand('人々の築く塔を見よ。その高慢を見届けなさい。');
    this.hint.setText('建設者に近づき SPACE / タップで話しかける');
  }

  private startBabelConversation() {
    if (this.babelConversationStarted || this.babelConstructionStarted) return;
    this.babelConversationStarted = true;
    this.talk([
      { speaker: '建設者', body: 'こんにちは！ 私たちは同じ言葉で話し、力を合わせている。\nレンガを積んで、町と塔を建てよう！' },
      { speaker: '建設者たちの誇り', body: '「天に届く塔を建て、われわれの名を上げよう！\n地の全面に散らされないようにしよう！」' }
    ], () => this.startBabelConstruction());
  }

  private startBabelConstruction() {
    if (this.babelConstructionStarted) return;
    this.babelConstructionStarted = true;
    this.phase = 'babelBuilding';
    this.setCommand('建設者たちはレンガを積み、塔を少しずつ高くしている。');
    this.hint.setText('建設中……レンガが積み上がっていく');
    this.builderLabels.forEach(label => label.setText('レンガを積む！'));
    [1, 2].forEach((tier, index) => {
      const left = 6 + tier;
      const right = 13 - tier;
      const row = 4 - tier * 2;
      const startDelay = 650 + index * 950;
      for (let col = left; col <= right; col++) {
        [row, row + 1].forEach((blockRow, rowIndex) => {
          this.time.delayedCall(startDelay + (col - left) * 90 + rowIndex * 35, () => {
            addBabelBlock(this, this.scenery, col, blockRow);
            this.builderLabels.forEach(label => label.setText(index === 0 ? 'もう一段！' : '高くなった！'));
          });
        });
      }
    });
    this.time.delayedCall(2850, () => {
      this.setCommand('塔が高くなった。人々は自分たちの名を誇っている。');
      this.hint.setText('建設が終わった。SPACE / タップで神の戒めを聞く');
      this.talk([{ speaker: '神の声', body: '彼らは一つの民で、皆一つの言葉を使っている。\nこれは彼らの始めたことだ。高慢な思いを改めなさい。' }], () => this.scatter());
    });
  }

  private scatter() {
    this.phase = 'scattering';
    this.stopMovement();
    this.tweens.killTweensOf(this.builders);
    this.tweens.killTweensOf(this.builderLabels);
    this.builderLabels.forEach(label => label.setText('指示が通じない…').setPosition(label.x, label.y));
    this.setCommand('同じ指示が通じなくなり、建設は止まった。');
    this.hint.setText('人々は立ち止まり、互いの言葉を聞き返している……');
    this.talk([{ speaker: '神の声', body: '人々は自分たちの力を誇り、高慢になった。\nさあ、彼らの言葉を混乱させ、互いに通じなくしよう。' }], () => {
      this.setCommand('言葉が通じず、工事は止まった。人々は全地へ散っていく。');
      this.hint.setText('人々は塔を離れ、世界各地へ去っていく……');
      this.builders.forEach((builder, index) => {
        const speech = this.builderLabels[index].setText(['何を言っている？', '…？ …！', '言葉が通じない！', '別の土地へ行こう'][index]);
        this.tweens.add({ targets: [builder, speech], x: index < 2 ? 30 : 930, y: `+=${index % 2 ? 130 : -50}`, alpha: 0, delay: 850, duration: 2200 });
      });
      this.time.delayedCall(3300, () => {
        this.phase = 'complete';
        this.setCommand('高慢を捨て、わたしの導きに耳を傾けなさい。');
        this.hint.setText('第2章 完 · 上部の章メニューから遊び直せます');
        this.talk([
          { speaker: '第2章 ― ノアの箱舟とバベルの塔 完', body: '洪水は罪への裁き。箱舟と虹は、神の憐れみと契約のしるし。\nバベルの人々は高慢を戒められ、世界各地へ散っていった。' },
          { speaker: '次の物語へ', body: 'やがて神は、アブラハムという一人の人を呼び出す。\n第3章「アブラハムとイサク」へ続く。' }
        ], this.nextChapter);
      });
    });
  }

  private setCommand(text: string) { this.command.setText(`神からの司令  ${text}`); }

  private talk(pages: { speaker: string; body: string }[], after?: () => void) {
    this.stopMovement();
    this.pages = pages;
    this.afterDialogue = after ?? null;
    this.showPage();
  }

  private showPage() {
    this.speaker.setText(this.pages[0].speaker);
    this.speech.setText(this.pages[0].body);
    this.dialogue.setVisible(true);
  }

  private advanceDialogue() {
    this.pages.shift();
    if (this.pages.length) { this.showPage(); return; }
    this.dialogue.setVisible(false);
    const after = this.afterDialogue;
    this.afterDialogue = null;
    after?.();
  }

  stopMovement() {
    this.destination = null;
    this.player?.setVelocity(0, 0);
    this.input.keyboard?.resetKeys();
  }

  update(time: number) {
    if (!this.player) return;
    this.playerLabel.setPosition(this.player.x, this.player.y - 43);
    if (this.phase === 'rescue' || this.phase === 'flood') {
      this.rain.clear().lineStyle(2, 0xc2d7e5, 0.5);
      for (let i = 0; i < 65; i++) {
        const x = (i * 137 + time * 0.07) % 960;
        const y = 110 + (i * 79 + time * 0.45) % 570;
        this.rain.lineBetween(x, y, x - 5, y + 15);
      }
    }
    const action = Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    if (this.pages.length) { if (action) this.advanceDialogue(); return; }
    if (this.phase !== 'rescue' && this.phase !== 'babel') return;
    const movement = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown || this.keys.D.isDown) - Number(this.cursors.left.isDown || this.keys.A.isDown),
      Number(this.cursors.down.isDown || this.keys.S.isDown) - Number(this.cursors.up.isDown || this.keys.W.isDown)
    );
    if (movement.lengthSq()) this.destination = null;
    else if (this.destination) {
      movement.copy(this.destination).subtract(this.player);
      if (movement.length() < 9) { movement.set(0, 0); this.destination = null; }
    }
    movement.normalize().scale(270);
    this.player.setVelocity(movement.x, movement.y);
    this.player.y = Phaser.Math.Clamp(this.player.y, 405, 650);
    if (movement.x) this.player.setFlipX(movement.x < 0);
    if (this.phase === 'rescue') {
      for (const pair of this.pairs) {
        if (!pair.saved && pair.sprites.some(sprite => Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y) < 70)) this.rescue(pair);
      }
    } else if (this.builders.some(builder => Phaser.Math.Distance.Between(this.player.x, this.player.y, builder.x, builder.y) < 85) && action) {
      this.startBabelConversation();
    }
  }

  private updateCameraView() {
    const zoom = Math.min(this.scale.width / 960, this.scale.height / 720);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(480, 360);
  }
}
