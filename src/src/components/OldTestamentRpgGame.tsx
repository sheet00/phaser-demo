import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

/**
 * 旧約聖書RPG - 第1章：天地創造とエデンの園
 */
export default function OldTestamentRpgGame() {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const TILE_SCALE = 4.5; // タイルを 4.5倍（72px）にして見やすい視野に調整
    const TILE_SIZE = 16 * TILE_SCALE; // 72px
    const MAP_COLS = 36;
    const MAP_ROWS = 26;
    const MAP_WIDTH = MAP_COLS * TILE_SIZE; // 2592px
    const MAP_HEIGHT = MAP_ROWS * TILE_SIZE; // 1872px

    const PET_SCALE = 1.6; // 64px の Cube Pets を約 102px に拡大
    const PLAYER_SCALE = 0.82; // 128px の人型スプライトを約 105px に調整
    const PLAYER_SPEED = 340; // 快適な移動速度

    let player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    let playerTag: Phaser.GameObjects.Container;
    let playerHopTween: Phaser.Tweens.Tween | null = null;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    let keyW: Phaser.Input.Keyboard.Key;
    let keyA: Phaser.Input.Keyboard.Key;
    let keyS: Phaser.Input.Keyboard.Key;
    let keyD: Phaser.Input.Keyboard.Key;
    let keySpace: Phaser.Input.Keyboard.Key;

    let obstaclesGroup: Phaser.Physics.Arcade.StaticGroup;
    let targetDest: Phaser.Math.Vector2 | null = null;
    let isDialogueActive = false;

    // ゲーム進行フラグ
    let namedAnimalsCount = 0;
    const TOTAL_ANIMALS_TO_NAME = 3;
    let hasEatenForbiddenFruit = false;
    let isChapterCleared = false;

    let promptBubble: Phaser.GameObjects.Container;
    let promptBubbleBg: Phaser.GameObjects.Rectangle;
    let promptBubbleText: Phaser.GameObjects.Text;
    let dialogueContainer: Phaser.GameObjects.Container;
    let dialogueSpeakerText: Phaser.GameObjects.Text;
    let dialogueBodyText: Phaser.GameObjects.Text;
    let dNextHint: Phaser.GameObjects.Text;

    type DialoguePage = {
      speaker: string;
      body: string;
      onPageShow?: () => void;
      onPageNext?: () => void;
    };

    let dialogueQueue: DialoguePage[] = [];
    let currentDialoguePageIndex = 0;

    let hudCommandText: Phaser.GameObjects.Text;

    let seSelect: Phaser.Sound.BaseSound;
    let seMagic: Phaser.Sound.BaseSound;
    let seBump: Phaser.Sound.BaseSound;

    type Interactable = {
      id: string;
      x: number;
      y: number;
      radius: number;
      title: string;
      message: string;
      actionPrompt?: string;
      isAnimal?: boolean;
      isTree?: boolean;
      isExit?: boolean;
      onInteract?: () => void;
      labelBg?: Phaser.GameObjects.Rectangle;
      labelText?: Phaser.GameObjects.Text;
      labelContainer?: Phaser.GameObjects.Container;
      updateLabel?: () => void;
    };

    const interactables: Interactable[] = [];
    let currentNearInteractable: Interactable | null = null;

    function preload(this: Phaser.Scene) {
      this.load.spritesheet('roguelike_sheet', '/assets/roguelike-rpg-pack/Spritesheet/roguelikeSheet_transparent.png', {
        frameWidth: 16,
        frameHeight: 16,
        spacing: 1
      });

      this.load.image('player_adam', '/assets/platformer-pack/Sprites/Characters/Default/character_beige_idle.png');
      this.load.image('pet_dog', '/assets/cube-pets/Previews/animal-dog.png');
      this.load.image('pet_lion', '/assets/cube-pets/Previews/animal-lion.png');
      this.load.image('pet_deer', '/assets/cube-pets/Previews/animal-deer.png');
      this.load.image('pet_cow', '/assets/cube-pets/Previews/animal-cow.png');
      this.load.image('pet_bunny', '/assets/cube-pets/Previews/animal-bunny.png');
      this.load.image('pet_chick', '/assets/cube-pets/Previews/animal-chick.png');
      this.load.image('pet_fish', '/assets/cube-pets/Previews/animal-fish.png');

      this.load.audio('se_select', '/assets/platformer-pack/Sounds/sfx_select.ogg');
      this.load.audio('se_magic', '/assets/platformer-pack/Sounds/sfx_magic.ogg');
      this.load.audio('se_bump', '/assets/platformer-pack/Sounds/sfx_bump.ogg');
    }

    function create(this: Phaser.Scene) {
      this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
      obstaclesGroup = this.physics.add.staticGroup();

      buildEdenMap.call(this);
      spawnEdenPets.call(this);

      // プレイヤー（最初の人間：アダム）生成
      player = this.physics.add.sprite(1100, 950, 'player_adam');
      player.setCollideWorldBounds(true);
      player.setScale(PLAYER_SCALE);
      // 足元に合わせた物理当たり判定
      player.body.setSize(48, 36);
      player.body.setOffset(40, 88);

      // 頭上ネームタグ
      playerTag = this.add.container(player.x, player.y - 68).setDepth(2000);
      const tagBg = this.add.rectangle(0, 0, 76, 24, 0x111111, 0.85)
        .setStrokeStyle(1.5, 0x2ecc71);
      const tagText = this.add.text(0, 0, 'アダム', {
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
        padding: { top: 3, bottom: 2, left: 2, right: 2 }
      }).setOrigin(0.5);
      playerTag.add([tagBg, tagText]);

      this.physics.add.collider(player, obstaclesGroup);

      this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
      this.cameras.main.startFollow(player, true, 0.1, 0.1);

      if (this.input.keyboard) {
        cursors = this.input.keyboard.createCursorKeys();
        keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      }

      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (isDialogueActive) {
          advanceOrCloseDialogue.call(this);
          return;
        }
        targetDest = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      });

      seSelect = this.sound.add('se_select');
      seMagic = this.sound.add('se_magic');
      seBump = this.sound.add('se_bump');

      createUI.call(this);
      openDialogueQueue.call(this, [{
        speaker: '神からの司令',
        body: 'アダムよ、この園をあなたに委ねる。\n園の生き物たちに名を授けなさい。\nまずは三匹のもとを訪ね、それぞれに名を与えるのだ。'
      }]);
      updateDivineCommand();
    }

    function buildEdenMap(this: Phaser.Scene) {
      const random = new Phaser.Math.RandomDataGenerator(['eden-tile-map']);
      const terrain = Array.from({ length: MAP_ROWS }, () => Array<number>(MAP_COLS).fill(5));
      const paths = Array.from({ length: MAP_ROWS }, () => Array<boolean>(MAP_COLS).fill(false));
      const water = Array.from({ length: MAP_ROWS }, () => Array<boolean>(MAP_COLS).fill(false));
      const bridges = Array.from({ length: MAP_ROWS }, () => Array<boolean>(MAP_COLS).fill(false));
      const mark = (grid: boolean[][], left: number, top: number, right: number, bottom: number) => {
        for (let row = top; row <= bottom; row++) {
          for (let col = left; col <= right; col++) grid[row][col] = true;
        }
      };
      mark(paths, 1, 13, 34, 14);
      mark(paths, 9, 2, 10, 13);
      mark(paths, 10, 9, 14, 10);
      mark(paths, 13, 13, 14, 19);
      mark(paths, 13, 18, 22, 19);
      mark(paths, 21, 10, 22, 19);
      mark(paths, 21, 9, 25, 10);
      mark(paths, 24, 2, 25, 13);
      mark(paths, 15, 11, 20, 15);
      for (let col = 0; col < MAP_COLS; col++) {
        const top = col < 7 ? 4 : col < 15 ? 5 : col < 24 ? 4 : 3;
        mark(water, col, top, col, top + 3);
      }
      mark(water, 3, 18, 7, 21);
      mark(water, 4, 17, 6, 22);
      mark(bridges, 9, 4, 10, 9);
      mark(bridges, 24, 2, 25, 7);

      const tile = (col: number, row: number, frame: number, depth = -10) =>
        this.add.image(col * TILE_SIZE, row * TILE_SIZE, 'roguelike_sheet', frame)
          .setOrigin(0).setScale(TILE_SCALE).setDepth(depth);
      const blocker = (x: number, y: number, width: number, height: number) => {
        const body = this.add.rectangle(x, y, width, height).setVisible(false);
        obstaclesGroup.add(body);
      };
      // 素材の岸辺・土道の外周タイルを、隣接する地形に合わせて選ぶ。
      const edgeFrame = (grid: boolean[][], col: number, row: number, frames: number[]) => {
        const top = row > 0 && !grid[row - 1][col];
        const bottom = row < MAP_ROWS - 1 && !grid[row + 1][col];
        const left = col > 0 && !grid[row][col - 1];
        const right = col < MAP_COLS - 1 && !grid[row][col + 1];
        return frames[(top ? 0 : bottom ? 2 : 1) * 3 + (left ? 0 : right ? 2 : 1)];
      };
      for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
          if (water[row][col]) {
            terrain[row][col] = edgeFrame(water, col, row, [2, 3, 4, 59, 0, 61, 116, 117, 118]);
            if (!bridges[row][col]) {
              blocker((col + 0.5) * TILE_SIZE, (row + 0.5) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
          }
        }
      }
      const map = this.make.tilemap({ data: terrain, tileWidth: 16, tileHeight: 16 });
      const tileset = map.addTilesetImage('eden', 'roguelike_sheet', 16, 16, 0, 1);
      if (!tileset) throw new Error('エデンの園のタイルセットを読み込めませんでした。');
      map.createLayer(0, tileset, 0, 0)!.setScale(TILE_SCALE).setDepth(-30);
      for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
          if (bridges[row][col]) {
            tile(col, row, 123, -20);
          } else if (paths[row][col] && !water[row][col]) {
            tile(col, row, edgeFrame(paths, col, row, [518, 519, 522, 575, 6, 579, 632, 635, 636]), -20);
          }
        }
      }
      const clearings = [[820, 720], [1650, 720], [950, 1200], [1550, 1200], [1280, 880], [1100, 950], [1140, 1040], [1296, 980], [2472, 936]];
      const occupied = new Set<string>();
      const canPlant = (col: number, row: number) => {
        if (row < 1 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
        if (occupied.has(`${col},${row}`) || occupied.has(`${col},${row - 1}`)) return false;
        if (water[row][col] || water[row - 1][col] || paths[row][col] || paths[row - 1][col]) return false;
        const x = (col + 0.5) * TILE_SIZE;
        const y = (row + 0.5) * TILE_SIZE;
        return !clearings.some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 145);
      };
      const tree = (col: number, row: number, fruit = false) => {
        const depth = (row + 1) * TILE_SIZE;
        const frames = fruit ? [593, 650] : random.pick([[583, 640], [585, 642], [586, 643]]);
        tile(col, row - 1, frames[0], depth);
        tile(col, row, frames[1], depth);
        occupied.add(`${col},${row - 1}`);
        occupied.add(`${col},${row}`);
        blocker((col + 0.5) * TILE_SIZE, (row + 0.82) * TILE_SIZE, TILE_SIZE * 0.45, TILE_SIZE * 0.3);
      };
      for (let row = 1; row < MAP_ROWS; row += 2) {
        for (let col = 0; col < MAP_COLS; col++) {
          const border = col < 2 || col >= MAP_COLS - 2 || row < 3 || row >= MAP_ROWS - 2;
          const grove = (col < 8 || col > 27 || row > 20) && random.frac() < 0.6;
          if ((border || grove || random.frac() < 0.12) && canPlant(col, row)) tree(col, row);
        }
      }
      for (let row = 2; row < MAP_ROWS - 2; row++) {
        for (let col = 2; col < MAP_COLS - 2; col++) {
          if (water[row][col] || paths[row][col] || occupied.has(`${col},${row}`)) continue;
          const flowerBed = (col >= 9 && col <= 12 && row >= 16 && row <= 19)
            || (col >= 23 && col <= 27 && row >= 15 && row <= 18);
          if (flowerBed) {
            tile(col, row, random.pick([513, 514, 570, 571, 684, 685]));
          } else if (random.frac() < 0.18) {
            tile(col, row, random.pick([533, 534, 651, 652, 653]));
          }
        }
      }
      // 木は上下2枚の原寸タイルで構成し、中央の木も同じ縮尺に揃える。
      tree(18, 13, true);
      tree(16, 11, true);
      tree(20, 11, true);
      const treeCenterX = 18.5 * TILE_SIZE;
      const treeCenterY = 13.5 * TILE_SIZE;
      const exitX = 34 * TILE_SIZE;
      const exitY = 13.5 * TILE_SIZE;
      for (const row of [11, 15]) {
        for (let col = 31; col <= 34; col++) {
          tile(col, row, col === 31 ? 1359 : col === 34 ? 1360 : 1363, (row + 1) * TILE_SIZE);
          blocker((col + 0.5) * TILE_SIZE, (row + 0.65) * TILE_SIZE, TILE_SIZE, 18);
        }
      }
      tile(32, 12, 21, 12.8 * TILE_SIZE);
      tile(11, 10, 19, 10.8 * TILE_SIZE);
      tile(23, 18, 20, 18.8 * TILE_SIZE);

      // 善悪の知識の木（ラベル＆ターゲット情報）
      const treeLabelContainer = this.add.container(treeCenterX, treeCenterY - 110).setDepth(4000);
      const treeLabelBg = this.add.rectangle(0, 0, 240, 26, 0x111111, 0.88).setStrokeStyle(1.5, 0x7f8c8d);
      const treeLabelText = this.add.text(0, 0, '🍎 善悪の知識の木 (まだ触れない)', {
        fontSize: '13px',
        color: '#bdc3c7',
        fontStyle: 'bold',
        padding: { top: 3, bottom: 2, left: 2, right: 2 }
      }).setOrigin(0.5);
      treeLabelContainer.add([treeLabelBg, treeLabelText]);

      const treeItem: Interactable = {
        id: 'tree_of_knowledge',
        x: treeCenterX,
        y: treeCenterY,
        radius: 140,
        title: '善悪の知識の木（禁断の果実）',
        message: '神が「決して取って食べてはならない」と命じられた美しい木だ。\n葉の隙間から蛇がささやいた……\n「食べたら神のように善悪を知る者になれるんだよ……」\n（ポリッ……あっ、食べちゃった！）',
        actionPrompt: '木を見上げる',
        isTree: true,
        labelBg: treeLabelBg,
        labelText: treeLabelText,
        labelContainer: treeLabelContainer,
        updateLabel: () => {
          if (hasEatenForbiddenFruit) {
            treeLabelText.setText('🍎 善悪の知識の木 (実をもぎ取った)');
            treeLabelText.setColor('#e06666');
            treeLabelBg.setStrokeStyle(1.5, 0x962d2d);
            treeLabelBg.setSize(treeLabelText.width + 24, 26);
            treeItem.actionPrompt = '木を見上げる';
          } else if (namedAnimalsCount >= TOTAL_ANIMALS_TO_NAME) {
            treeLabelText.setText('🍎 善悪の知識の木 (食べてはならない)');
            treeLabelText.setColor('#ff4757');
            treeLabelBg.setStrokeStyle(2, 0xff4757);
            treeLabelBg.setSize(treeLabelText.width + 24, 26);
            treeItem.actionPrompt = '禁断の果実を調べる';
          } else {
            treeLabelText.setText('🍎 善悪の知識の木 (まだ触れない)');
            treeLabelText.setColor('#bdc3c7');
            treeLabelBg.setStrokeStyle(1.5, 0x7f8c8d);
            treeLabelBg.setSize(treeLabelText.width + 24, 26);
            treeItem.actionPrompt = '木を見上げる';
          }
        },
      };
      interactables.push(treeItem);

      // エデンの東の門（ラベル＆ターゲット情報）
      const exitLabelContainer = this.add.container(exitX, exitY - 60).setDepth(4000);
      const exitLabelBg = this.add.rectangle(0, 0, 210, 26, 0x111111, 0.88).setStrokeStyle(1.5, 0x34495e);
      const exitLabelText = this.add.text(0, 0, '🚪 エデンの東の門 (閉ざされている)', {
        fontSize: '13px',
        color: '#95a5a6',
        fontStyle: 'bold',
        padding: { top: 3, bottom: 2, left: 2, right: 2 }
      }).setOrigin(0.5);
      exitLabelContainer.add([exitLabelBg, exitLabelText]);

      const exitItem: Interactable = {
        id: 'eden_exit',
        x: exitX,
        y: exitY,
        radius: 120,
        title: 'エデンの東の門',
        message: '',
        actionPrompt: '門を調べる',
        isExit: true,
        labelBg: exitLabelBg,
        labelText: exitLabelText,
        labelContainer: exitLabelContainer,
        updateLabel: () => {
          if (isChapterCleared) {
            exitLabelText.setText('🚪 エデンの東の門 (旅立ちの門)');
            exitLabelText.setColor('#2ecc71');
            exitLabelBg.setStrokeStyle(1.5, 0x2ecc71);
            exitLabelBg.setSize(exitLabelText.width + 24, 26);
            exitItem.actionPrompt = '門を見る';
          } else if (hasEatenForbiddenFruit) {
            exitLabelText.setText('🚪 エデンの東の門 ✨ 開門！荒野へ');
            exitLabelText.setColor('#f1c40f');
            exitLabelBg.setStrokeStyle(2, 0xf1c40f);
            exitLabelBg.setSize(exitLabelText.width + 24, 26);
            exitItem.actionPrompt = '荒野へ旅立つ';
          } else {
            exitLabelText.setText('🚪 エデンの東の門 (閉ざされている)');
            exitLabelText.setColor('#95a5a6');
            exitLabelBg.setStrokeStyle(1.5, 0x34495e);
            exitLabelBg.setSize(exitLabelText.width + 24, 26);
            exitItem.actionPrompt = '門を調べる';
          }
        },
      };
      interactables.push(exitItem);
    }

    function spawnEdenPets(this: Phaser.Scene) {
      const petConfigs = [
        {
          key: 'pet_lion',
          x: 820,
          y: 720,
          name: 'ライオン',
          desc: '黄金の立派なたてがみと鋭い爪を持つ、威厳ある名もなき生き物だ。',
          namingMsg: 'アダム「お前の名は【ライオン】だ！」\nライオンは嬉しそうに喉をゴロゴロと鳴らし、誇らしげに咆哮した！',
          metMsg: '立派なたてがみを持つ百獣の王ライオン。\nアダムの足元で誇らしげに座り、喉を鳴らしている。'
        },
        {
          key: 'pet_deer',
          x: 1650,
          y: 720,
          name: 'シカ',
          desc: '枝分かれした美しい角と澄んだ瞳を持つ、穏やかな名もなき生き物だ。',
          namingMsg: 'アダム「お前の名は【シカ】だ！」\nシカは静かに頭を下げ、澄んだ瞳でアダムに優しく挨拶してくれた！',
          metMsg: '美しい角を持つ穏やかなシカ。\n澄んだ瞳でアダムを見守り、そっと寄り添っている。'
        },
        {
          key: 'pet_cow',
          x: 950,
          y: 1200,
          name: 'ウシ',
          desc: '白黒の温かみある体で、川のほとりの青草を美味しそうに食む大きな生き物だ。',
          namingMsg: 'アダム「お前の名は【ウシ】だ！」\nウシは嬉しそうに「モォ〜」と温かな声で応えてくれた！',
          metMsg: '青草をのんびりと食むウシ。\nアダムが近づくと優しく見つめ返してくれる。'
        },
        {
          key: 'pet_bunny',
          x: 1550,
          y: 1200,
          name: 'ウサギ',
          desc: '白くてふわふわの毛並みと長い耳を持つ、小さな名もなき生き物だ。',
          namingMsg: 'アダム「お前の名は【ウサギ】だ！」\nウサギはピョンピョンとリズミカルに飛び跳ねて喜んでいる！',
          metMsg: '白くてふわふわのウサギ。\nアダムの足元を元気に飛び跳ねている。'
        },
        {
          key: 'pet_chick',
          x: 1280,
          y: 880,
          name: 'ヒヨコ',
          desc: '黄色くて小さなふわふわの羽を持つ、愛らしい名もなき生き物だ。',
          namingMsg: 'アダム「お前の名は【ヒヨコ】だ！」\nヒヨコは「ピヨピヨ！」と元気に鳴いて、トコトコと後をついてきた！',
          metMsg: '黄色くて小さなヒヨコ。\n一生懸命アダムの足元をついて歩いている。'
        },
        {
          key: 'pet_dog',
          x: 1140,
          y: 1040,
          name: 'イヌ',
          desc: '垂れた耳と元気な尻尾を持ち、じっとアダムを見つめてくる人懐っこい生き物だ。',
          namingMsg: 'アダム「お前の名は【イヌ】だ！」\nイヌは激しく尻尾を振り、嬉しそうにアダムの手をペロペロ舐めて甘えてきた！',
          metMsg: '忠実な友となったイヌ。\n尻尾をちぎれんばかりに振ってアダムのそばに寄り添っている。'
        }
      ];

      petConfigs.forEach(cfg => {
        const petSprite = this.physics.add.staticSprite(cfg.x, cfg.y, cfg.key);
        petSprite.setScale(PET_SCALE).setDepth(cfg.y);
        petSprite.body.setSize(32, 20).setOffset(16, 42);
        obstaclesGroup.add(petSprite);

        const tweenDuration = 350 + Math.random() * 200;
        const tweenDelay = Math.random() * 500;

        this.tweens.add({
          targets: petSprite,
          y: cfg.y - 12,
          scaleY: PET_SCALE * 0.92,
          duration: tweenDuration,
          yoyo: true,
          repeat: -1,
          delay: tweenDelay
        });

        // 頭上ラベル（名付け前は「？？？」、名付け後は「★ 〇〇」）
        const labelContainer = this.add.container(cfg.x, cfg.y - 50).setDepth(cfg.y + 100);
        const labelBg = this.add.rectangle(0, 0, 70, 24, 0x111111, 0.88).setStrokeStyle(1.5, 0xf39c12);
        const labelText = this.add.text(0, 0, '？？？', {
          fontSize: '12px',
          color: '#f39c12',
          fontStyle: 'bold',
          padding: { top: 3, bottom: 2, left: 2, right: 2 }
        }).setOrigin(0.5);
        labelBg.setSize(labelText.width + 20, 24);
        labelContainer.add([labelBg, labelText]);

        // ラベルも生き物のホップと同期して上下に浮遊
        this.tweens.add({
          targets: labelContainer,
          y: cfg.y - 50 - 12,
          duration: tweenDuration,
          yoyo: true,
          repeat: -1,
          delay: tweenDelay
        });

        let isNamed = false;
        const animalItem: Interactable = {
          id: `pet_${cfg.name}`,
          x: cfg.x,
          y: cfg.y,
          radius: 95,
          title: '名もなき生き物',
          message: `${cfg.desc}\n\n${cfg.namingMsg}`,
          actionPrompt: '名を付ける',
          isAnimal: true,
          labelBg,
          labelText,
          labelContainer,
          updateLabel: () => {
            if (isNamed) {
              labelText.setText(`★ ${cfg.name}`);
              labelText.setColor('#2ecc71');
              labelBg.setStrokeStyle(1.5, 0x2ecc71);
              labelBg.setSize(labelText.width + 20, 24);
              animalItem.actionPrompt = `${cfg.name}と触れ合う`;
              animalItem.title = `★ ${cfg.name}`;
              animalItem.message = cfg.metMsg;
            } else {
              labelText.setText('？？？');
              labelText.setColor('#f39c12');
              labelBg.setStrokeStyle(1.5, 0xf39c12);
              labelBg.setSize(labelText.width + 20, 24);
              animalItem.actionPrompt = '名を付ける';
              animalItem.title = '名もなき生き物';
              animalItem.message = `${cfg.desc}\n\n${cfg.namingMsg}`;
            }
          },
          onInteract: () => {
            if (!isNamed) {
              isNamed = true;
              namedAnimalsCount++;
              seMagic.play();
              animalItem.updateLabel?.();
              updateDivineCommand();

              if (namedAnimalsCount === TOTAL_ANIMALS_TO_NAME && !hasEatenForbiddenFruit) {
                this.time.delayedCall(350, () => {
                  openDialogueQueue.call(this, [{
                    speaker: '神からの司令',
                    body: '園の生き物たちに名を授けたのだな。\n\n園の中央にある木を見よ。\n決してその実を取って食べてはならない。'
                  }]);
                });
              }
            }
          }
        };
        interactables.push(animalItem);
      });

      // 川を泳ぐ魚（環境演出）
      const fish1 = this.add.image(1100, 405, 'pet_fish').setScale(0.7).setDepth(-4);
      this.tweens.add({
        targets: fish1,
        x: 1250,
        y: 375,
        duration: 3200,
        yoyo: true,
        repeat: -1
      });
    }

    function updateDivineCommand() {
      if (!hudCommandText) return;

      let command: string;
      if (isChapterCleared) {
        command = '地を耕し、生きてゆきなさい。\nあなたの歩みを、わたしは見守っている。';
      } else if (hasEatenForbiddenFruit) {
        command = '東の門へ向かいなさい。\nここからあなたの旅が始まる。';
      } else if (namedAnimalsCount >= TOTAL_ANIMALS_TO_NAME) {
        command = '園の中央にある木を見よ。\nその実を食べてはならない。';
      } else {
        command = `園の生き物たちに名を授けなさい。\n名を授けた生き物：${namedAnimalsCount}／${TOTAL_ANIMALS_TO_NAME}`;
      }
      hudCommandText.setText(command);
      interactables.forEach(item => item.updateLabel?.());
    }

    function createUI(this: Phaser.Scene) {
      // 接近時アクションフキダシ（可変幅・対象名連動）
      promptBubble = this.add.container(0, 0).setDepth(5000);
      promptBubble.setVisible(false);

      promptBubbleBg = this.add.rectangle(0, 0, 220, 44, 0x0a0a0a, 0.92).setStrokeStyle(2, 0xf1c40f);
      promptBubbleText = this.add.text(0, 0, 'SPACE: 調べる', {
        fontSize: '17px',
        color: '#ffffff',
        fontStyle: 'bold',
        padding: { top: 6, bottom: 4, left: 4, right: 4 }
      }).setOrigin(0.5);
      promptBubble.add([promptBubbleBg, promptBubbleText]);

      const hudX = 24;
      const hudY = 24;
      const hudWidth = 450;
      const hudHeight = 224;

      const hudBg = this.add.rectangle(hudX, hudY, hudWidth, hudHeight, 0x110f0d, 0.94)
        .setOrigin(0, 0)
        .setStrokeStyle(3, 0x27ae60)
        .setScrollFactor(0).setDepth(6000);

      const hudTitle = this.add.text(hudX + 20, hudY + 16, '第1章：エデンの園（創世記）', {
        fontSize: '22px',
        color: '#2ecc71',
        fontStyle: 'bold',
        padding: { top: 6, bottom: 4, left: 4, right: 4 }
      }).setScrollFactor(0).setDepth(6000);

      const hudChar = this.add.text(hudX + 20, hudY + 54, '操作キャラ: 最初の人間 アダム', {
        fontSize: '16px',
        color: '#ecf0f1',
        padding: { top: 5, bottom: 4, left: 4, right: 4 }
      }).setScrollFactor(0).setDepth(6000);

      this.add.text(hudX + 20, hudY + 94, '神からの司令', {
        fontSize: '19px',
        color: '#e5c77e',
        fontStyle: 'bold',
        padding: { top: 6, bottom: 4 }
      }).setScrollFactor(0).setDepth(6000);

      hudCommandText = this.add.text(hudX + 20, hudY + 132, '', {
        fontSize: '17px',
        color: '#f3e6c6',
        lineSpacing: 8,
        wordWrap: { width: hudWidth - 48 },
        padding: { top: 6, bottom: 4, left: 4, right: 4 }
      }).setScrollFactor(0).setDepth(6000);

      this.add.existing(hudBg);
      this.add.existing(hudTitle);
      this.add.existing(hudChar);
      this.add.existing(hudCommandText);
      updateDivineCommand();

      // 会話・テキストウィンドウ（幅1050px・高さ230px、文字21pxに特大化）
      dialogueContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(6000);
      dialogueContainer.setVisible(false);

      const { width, height } = this.scale;
      const boxWidth = Math.min(1050, width - 48);
      const boxHeight = 230;
      const boxX = width / 2;
      const boxY = height - boxHeight / 2 - 24;

      const dBoxBg = this.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0x0e0b08, 0.96)
        .setStrokeStyle(4, 0x27ae60);

      dialogueSpeakerText = this.add.text(boxX - boxWidth / 2 + 32, boxY - boxHeight / 2 + 20, '', {
        fontSize: '26px',
        color: '#2ecc71',
        fontStyle: 'bold',
        padding: { top: 8, bottom: 4, left: 4, right: 4 }
      });

      dialogueBodyText = this.add.text(boxX - boxWidth / 2 + 32, boxY - boxHeight / 2 + 66, '', {
        fontSize: '21px',
        color: '#ffffff',
        lineSpacing: 10,
        wordWrap: { width: boxWidth - 64 },
        padding: { top: 8, bottom: 6, left: 4, right: 4 }
      });

      dNextHint = this.add.text(boxX + boxWidth / 2 - 28, boxY + boxHeight / 2 - 24, '▼ SPACE / クリックで閉じる', {
        fontSize: '16px',
        color: '#f39c12',
        fontStyle: 'bold',
        padding: { top: 5, bottom: 4, left: 4, right: 4 }
      }).setOrigin(1, 1);

      dialogueContainer.add([dBoxBg, dialogueSpeakerText, dialogueBodyText, dNextHint]);
    }

    function startPlayerHop(this: Phaser.Scene) {
      if (!playerHopTween || !playerHopTween.isPlaying()) {
        playerHopTween = this.tweens.add({
          targets: player,
          scaleY: { from: PLAYER_SCALE, to: PLAYER_SCALE * 0.90 },
          angle: { from: -3, to: 3 },
          duration: 160,
          yoyo: true,
          repeat: -1
        });
      }
    }

    function stopPlayerHop() {
      if (playerHopTween) {
        playerHopTween.stop();
        playerHopTween = null;
      }
      player.setScale(PLAYER_SCALE);
      player.setAngle(0);
    }

    function openDialogueQueue(this: Phaser.Scene, pages: DialoguePage[]) {
      if (!pages || pages.length === 0) return;
      dialogueQueue = pages;
      currentDialoguePageIndex = 0;
      isDialogueActive = true;
      targetDest = null;
      player.setVelocity(0, 0);
      stopPlayerHop();
      showCurrentDialoguePage.call(this);
    }

    function showCurrentDialoguePage(this: Phaser.Scene) {
      const page = dialogueQueue[currentDialoguePageIndex];
      if (!page) {
        closeDialogue.call(this);
        return;
      }

      dialogueSpeakerText.setText(page.speaker);
      dialogueBodyText.setText(page.body);

      const hasNext = currentDialoguePageIndex < dialogueQueue.length - 1;
      dNextHint.setText(hasNext ? '▼ SPACE / クリックで次へ' : '▼ SPACE / クリックで閉じる');

      dialogueContainer.setVisible(true);
      promptBubble.setVisible(false);

      if (page.onPageShow) {
        page.onPageShow();
      }
    }

    function advanceOrCloseDialogue(this: Phaser.Scene) {
      if (!isDialogueActive) return;

      const page = dialogueQueue[currentDialoguePageIndex];
      if (page && page.onPageNext) {
        page.onPageNext();
      }

      currentDialoguePageIndex++;
      if (currentDialoguePageIndex < dialogueQueue.length) {
        seSelect.play();
        showCurrentDialoguePage.call(this);
      } else {
        closeDialogue.call(this);
      }
    }

    function closeDialogue(this: Phaser.Scene) {
      isDialogueActive = false;
      dialogueContainer.setVisible(false);
      dialogueQueue = [];
      currentDialoguePageIndex = 0;
    }

    function openDialogue(this: Phaser.Scene, item: Interactable) {
      if (item.isTree) {
        if (namedAnimalsCount < TOTAL_ANIMALS_TO_NAME) {
          openDialogueQueue.call(this, [{
            speaker: '神からの司令',
            body: 'アダムよ、まずは園の生き物たちに名を授けなさい。\nあなたに委ねた務めを果たすのだ。'
          }]);
          return;
        }

        if (hasEatenForbiddenFruit) {
          openDialogueQueue.call(this, [{
            speaker: '神からの司令',
            body: '東の門へ向かいなさい。\nここからあなたの旅が始まる。'
          }]);
          return;
        }

        // 禁断の果実イベント：タイマーによる強制遷移を廃止し、操作で確実に進む3ページ構成
        openDialogueQueue.call(this, [
          {
            speaker: '善悪の知識の木',
            body: '神が「決して取って食べてはならない」と命じられた大樹だ。\n葉の隙間から滑らかな蛇が姿を現し、ささやいてきた……\n「本当に死ぬって言われたの？ 食べたら神のように善悪を知る者になれるんだよ……」'
          },
          {
            speaker: '禁断の果実',
            body: '（ポリッ……シャキッ……！）\n甘い香りが広がる……あっ、実を食べてしまった！',
            onPageShow: () => {
              seBump.play();
              this.cameras.main.flash(400, 255, 100, 100);
            }
          },
          {
            speaker: '神からの司令',
            body: 'アダムよ、食べてはならないと命じた実を食べたのか。\nあなたに衣を与えよう。\n東の門へ向かいなさい。ここからあなたの旅が始まる。',
            onPageShow: () => {
              hasEatenForbiddenFruit = true;
              updateDivineCommand();
            }
          }
        ]);
        return;
      }

      if (item.isExit) {
        if (!hasEatenForbiddenFruit) {
          openDialogueQueue.call(this, [{
            speaker: '神からの司令',
            body: namedAnimalsCount < TOTAL_ANIMALS_TO_NAME
              ? 'まだ園を離れる時ではない。\n園の生き物たちに名を授けなさい。'
              : '園の中央にある木を見よ。\nその実を食べてはならない。'
          }]);
          return;
        }

        if (isChapterCleared) {
          openDialogueQueue.call(this, [{
            speaker: '神からの司令',
            body: '地を耕し、生きてゆきなさい。\nあなたの歩みを、わたしは見守っている。'
          }]);
          return;
        }

        isChapterCleared = true;
        openDialogueQueue.call(this, [
          {
            speaker: '神からの司令',
            body: 'アダムよ、この先の地を耕し、生きてゆきなさい。\nあなたの歩みを、わたしは見守っている。',
            onPageShow: () => {
              seMagic.play();
            }
          },
          {
            speaker: '第1章 ― エデンの園を後に',
            body: '★★ 第1章：天地創造とエデンの園 完 ★★\n\n（次は第2章『ノアの箱舟とバベルの塔』へ続く！）',
            onPageNext: () => {
              updateDivineCommand();
            }
          }
        ]);
        return;
      }

      // 通常の動物たち
      openDialogueQueue.call(this, [{
        speaker: item.title,
        body: item.message,
        onPageNext: item.onInteract
      }]);
    }

    function update(this: Phaser.Scene) {
      player.setDepth(player.y + 35);
      if (playerTag) {
        playerTag.setPosition(player.x, player.y - 74);
        playerTag.setDepth(player.y + 36);
      }

      if (isDialogueActive) {
        if (keySpace && Phaser.Input.Keyboard.JustDown(keySpace)) {
          advanceOrCloseDialogue.call(this);
        }
        return;
      }

      currentNearInteractable = null;
      for (const item of interactables) {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, item.x, item.y);
        if (dist <= item.radius) {
          currentNearInteractable = item;
          break;
        }
      }

      if (currentNearInteractable) {
        const actionStr = currentNearInteractable.actionPrompt
          ? `SPACE: ${currentNearInteractable.actionPrompt}`
          : 'SPACE: 調べる';
        promptBubbleText.setText(actionStr);
        promptBubbleBg.setSize(promptBubbleText.width + 36, 44);

        // 大型化したフキダシの位置調整（頭上ネームタグの上部に配置）
        promptBubble.setPosition(player.x, player.y - 112);
        promptBubble.setVisible(true);

        if (keySpace && Phaser.Input.Keyboard.JustDown(keySpace)) {
          openDialogue.call(this, currentNearInteractable);
          return;
        }
      } else {
        promptBubble.setVisible(false);
      }

      const isLeft = cursors?.left?.isDown || keyA?.isDown;
      const isRight = cursors?.right?.isDown || keyD?.isDown;
      const isUp = cursors?.up?.isDown || keyW?.isDown;
      const isDown = cursors?.down?.isDown || keyS?.isDown;

      const inputVec = new Phaser.Math.Vector2(0, 0);

      if (isLeft) inputVec.x -= 1;
      if (isRight) inputVec.x += 1;
      if (isUp) inputVec.y -= 1;
      if (isDown) inputVec.y += 1;

      if (inputVec.lengthSq() > 0) {
        targetDest = null;
        inputVec.normalize().scale(PLAYER_SPEED);
        player.setVelocity(inputVec.x, inputVec.y);

        if (inputVec.x !== 0) {
          player.setFlipX(inputVec.x < 0);
        }
        startPlayerHop.call(this);
      } else if (targetDest !== null) {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, targetDest.x, targetDest.y);
        if (dist > 12) {
          const moveAngle = Phaser.Math.Angle.Between(player.x, player.y, targetDest.x, targetDest.y);
          const velX = Math.cos(moveAngle) * PLAYER_SPEED;
          const velY = Math.sin(moveAngle) * PLAYER_SPEED;
          player.setVelocity(velX, velY);

          player.setFlipX(velX < 0);
          startPlayerHop.call(this);
        } else {
          player.setVelocity(0, 0);
          targetDest = null;
          stopPlayerHop();
        }
      } else {
        player.setVelocity(0, 0);
        stopPlayerHop();
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: {
        preload,
        create,
        update
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      }
    };

    const game = new Phaser.Game(config);

    const handleResize = () => {
      if (!game) return;
      game.scale.resize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      game.destroy(true);
    };
  }, []);

  return (
    <div
      ref={gameRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
        padding: 0
      }}
    />
  );
}
