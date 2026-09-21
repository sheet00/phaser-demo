import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from './constants';
import { buildEdenMap } from './map';
import { petConfigs } from './animals';
import { createEdenUI } from './ui';

export function createEdenScene(onNextChapter: () => void) {
  const PET_SCALE = 1.6; // 64px の Cube Pets を約 102px に拡大
  const PLAYER_SCALE = 5.2; // 16px スプライトを約 83px に調整
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

    this.load.spritesheet('roguelike_characters', '/assets/roguelike-characters/Spritesheet/roguelikeChar_transparent.png', {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1
    });
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

    createEdenMap.call(this);
    spawnEdenPets.call(this);

    // プレイヤー（最初の人間：アダム）生成
    player = this.physics.add.sprite(1100, 950, 'roguelike_characters', 378);
    player.setCollideWorldBounds(true);
    player.setScale(PLAYER_SCALE);
    player.body.setSize(12, 10);
    player.body.setOffset(2, 6);

    // 頭上ネームタグ
    playerTag = this.add.container(player.x, player.y - 54).setDepth(2000);
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

    ({ promptBubble, promptBubbleBg, promptBubbleText, hudCommandText, dialogueContainer, dialogueSpeakerText, dialogueBodyText, dNextHint } = createEdenUI(this));
    openDialogueQueue.call(this, [{
      speaker: '主なる神の呼びかけ',
      body: 'アダムよ、この園をあなたに委ねる。\n園の生き物たちに名を授けなさい。\nまずは三匹のもとを訪ね、それぞれに名を与えるのだ。'
    }]);
    updateDivineCommand();
  }

  function createEdenMap(this: Phaser.Scene) {
    const { treeCenterX, treeCenterY, exitX, exitY } = buildEdenMap(this, obstaclesGroup);

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
                  speaker: '主なる神',
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
          speaker: '主なる神',
          body: 'アダムよ、まずは園の生き物たちに名を授けなさい。\nあなたに委ねた務めを果たすのだ。'
        }]);
        return;
      }

      if (hasEatenForbiddenFruit) {
        openDialogueQueue.call(this, [{
          speaker: '主なる神',
          body: '東の門へ向かいなさい。\nここからあなたの旅が始まる。'
        }]);
        return;
      }

      // 禁断の果実イベント：タイマーによる強制遷移を廃止し、操作で確実に進む3ページ構成
      openDialogueQueue.call(this, [
        {
          speaker: '蛇の誘惑と禁断の木',
          body: '神が「決して取って食べてはならない」と命じられた大樹だ。\n葉の隙間から滑らかな蛇が姿を現し、ささやいてきた……\n「本当に死ぬって言われたの？ 食べたら神のように善悪を知る者になれるんだよ……」'
        },
        {
          speaker: '禁じられた木の実',
          body: '（ポリッ……シャキッ……！）\n甘い香りが広がる……あっ、実を食べてしまった！',
          onPageShow: () => {
            seBump.play();
            this.cameras.main.flash(400, 255, 100, 100);
          }
        },
        {
          speaker: '主なる神',
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
          speaker: '主なる神',
          body: namedAnimalsCount < TOTAL_ANIMALS_TO_NAME
            ? 'まだ園を離れる時ではない。\n園の生き物たちに名を授けなさい。'
            : '園の中央にある木を見よ。\nその実を食べてはならない。'
        }]);
        return;
      }

      if (isChapterCleared) {
        openDialogueQueue.call(this, [{
          speaker: '主なる神',
          body: '地を耕し、生きてゆきなさい。\nあなたの歩みを、わたしは見守っている。'
        }]);
        return;
      }

      isChapterCleared = true;
      openDialogueQueue.call(this, [
        {
          speaker: '主なる神',
          body: 'アダムよ、この先の地を耕し、生きてゆきなさい。\nあなたの歩みを、わたしは見守っている。',
          onPageShow: () => {
            seMagic.play();
          }
        },
        {
          speaker: '失楽園・エデンの園を後に',
          body: '★★ 第1章：天地創造とエデンの園 完 ★★\n\n（次は第2章『ノアの箱舟とバベルの塔』へ続く！）',
          onPageNext: () => {
            updateDivineCommand();
            onNextChapter();
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
      playerTag.setPosition(player.x, player.y - 54);
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

      // フキダシの位置調整（頭上ネームタグの上部に配置）
      promptBubble.setPosition(player.x, player.y - 92);
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

  return new class EdenScene extends Phaser.Scene {
    constructor() { super('eden'); }
    preload() { preload.call(this); }
    create() { create.call(this); }
    update() { update.call(this); }
    stopMovement() {
      targetDest = null;
      if (player?.active) {
        this.input.keyboard?.resetKeys();
        player.setVelocity(0, 0);
        stopPlayerHop();
      }
    }
  }();
}
