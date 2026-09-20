import Phaser from 'phaser';
import type { BuilderCard, GameCard, PlayerState, StarterCard, SupplyPile, TurnPhase, WellArchitectedCard } from '../types';
import { createDominionSupply } from '../data/cards';

const FONT_FAMILY = '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';

export class BuilderCardScene extends Phaser.Scene {
  private playerState!: PlayerState;
  private treasureSupply: SupplyPile[] = [];
  private victorySupply: SupplyPile[] = [];
  private kingdomSupply: SupplyPile[] = [];
  private currentPhase: TurnPhase = 'acquire';

  private bgRect!: Phaser.GameObjects.Rectangle;
  private headerBg!: Phaser.GameObjects.Rectangle;
  private messageText!: Phaser.GameObjects.Text;

  private supplyFrame!: Phaser.GameObjects.Rectangle;
  private supplyLabel!: Phaser.GameObjects.Text;
  private deployedFrame!: Phaser.GameObjects.Rectangle;
  private deployedLabel!: Phaser.GameObjects.Text;
  private handLabel!: Phaser.GameObjects.Text;

  // 操作バー（手札上部に集約されたリソースバッジ＆ボタン）
  private controlBarBg!: Phaser.GameObjects.Rectangle;
  private badgeCredits!: Phaser.GameObjects.Text;
  private badgeAcquires!: Phaser.GameObjects.Text;
  private badgePoints!: Phaser.GameObjects.Text;
  private actionButtonBg!: Phaser.GameObjects.Rectangle;
  private actionButtonText!: Phaser.GameObjects.Text;
  private retireButtonBg!: Phaser.GameObjects.Rectangle;
  private retireButtonText!: Phaser.GameObjects.Text;

  // 画面右側フルハイト・ゲームログ
  private logSidebarBg!: Phaser.GameObjects.Rectangle;
  private logSidebarBorder!: Phaser.GameObjects.Rectangle;
  private logSidebarTitle!: Phaser.GameObjects.Text;
  private logSidebarContent!: Phaser.GameObjects.Text;
  private logHistory: string[] = [];

  // ホバー特大拡大プレビュー (Zoom Preview)
  private zoomContainer?: Phaser.GameObjects.Container;

  private handContainers: Phaser.GameObjects.Container[] = [];
  private deployedContainers: Phaser.GameObjects.Container[] = [];
  private supplyContainers: Phaser.GameObjects.Container[] = [];

  private deckVisualContainer?: Phaser.GameObjects.Container;
  private discardVisualContainer?: Phaser.GameObjects.Container;
  private discardBadgeText?: Phaser.GameObjects.Text;

  private isAnimating = false;
  private canRetireThisTurn = false;
  private hasRetiredThisTurn = false;

  constructor() {
    super({ key: 'BuilderCardScene' });
  }

  preload() {
    this.load.audio('se_select', '/assets/platformer-pack/Sounds/sfx_select.ogg');
    this.load.audio('se_buy', '/assets/platformer-pack/Sounds/sfx_coin.ogg');
    this.load.audio('se_victory', '/assets/platformer-pack/Sounds/sfx_gem.ogg');
    this.load.audio('se_retire', '/assets/platformer-pack/Sounds/sfx_disappear.ogg');
    this.load.audio('se_turn', '/assets/platformer-pack/Sounds/sfx_magic.ogg');
  }

  create() {
    const { width, height } = this.scale;

    this.bgRect = this.add.rectangle(0, 0, width, height, 0x0f172a).setOrigin(0, 0);

    this.initGameData();
    this.createLayout(width, height);
    this.startTurn();

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.handleResize(gameSize.width, gameSize.height);
    });
  }

  private playSound(key: string, volume: number = 0.4) {
    try {
      if (this.sound && this.cache.audio.exists(key)) {
        this.sound.play(key, { volume });
      }
    } catch {
      // 安全なフォールバック
    }
  }

  private initGameData() {
    const supply = createDominionSupply();
    this.treasureSupply = supply.treasurePiles;
    this.victorySupply = supply.victoryPiles;
    this.kingdomSupply = supply.kingdomPiles;

    // ドミニオン初期デッキ：基本コンピュート（銅貨相当）7枚 ＋ 仮想マシン（屋敷相当）3枚 ＝ 計10枚
    const starterCards: GameCard[] = [];
    for (let i = 1; i <= 7; i++) {
      starterCards.push({
        id: `init-base-${i}`,
        name: 'Base Compute',
        nameJa: '基本コンピュート',
        type: 'starter',
        color: 'blue',
        cost: 0,
        credit: 1,
        description: '基本計算能力。1クレジット生成。(銅貨相当)',
      });
    }
    for (let i = 1; i <= 3; i++) {
      starterCards.push({
        id: `init-vm-${i}`,
        name: 'Virtual Machine',
        nameJa: '仮想マシン',
        type: 'starter',
        color: 'blue',
        cost: 0,
        credit: 1,
        description: '仮想サーバー。EC2と連携で+1c。(屋敷相当)',
        comboWith: ['Amazon EC2', 'Amazon EC2 Standard'],
        comboBonus: { credit: 1 },
        comboDesc: '【連携: EC2】+1c',
      });
    }

    const shuffled = this.shuffle(starterCards);
    this.playerState = {
      id: 'player-1',
      name: 'あなた (ITアーキテクト)',
      deck: shuffled,
      hand: [],
      discard: [],
      deployed: [],
      wellArchitectedPoints: 0,
      wellArchitectedCards: [],
      credits: 0,
      remainingAcquires: 1,
    };
    this.logHistory = [
      '🎮 ドミニオンオンライン式UIへようこそ！',
      'ℹ️ カードにマウスを合わせると特大プレビューが表示されます。',
      '💡 手札のカードをプレイしてクレジットを獲得しましょう。',
      '🛒 サプライのカードをクリックして購入できます。',
    ];
  }

  private addLog(entry: string) {
    this.logHistory.push(entry);
    if (this.logHistory.length > 25) {
      this.logHistory.shift();
    }
    this.updateLogText();
  }

  private updateLogText() {
    if (!this.logSidebarContent) return;
    const text = this.logHistory.slice(-14).map((item) => `• ${item}`).join('\n\n');
    this.logSidebarContent.setText(text);
  }

  /**
   * ドミニオンオンライン伝統の「カードホバー特大プレビュー」
   */
  private showCardZoom(card: GameCard, x: number, y: number) {
    this.hideCardZoom();

    const zoomW = 250;
    const zoomH = 345;
    const { width, height } = this.scale;
    const dim = this.calculateDimensions(width, height);
    const maxRight = dim.logX - 20;

    let targetX = x + 30;
    if (targetX + zoomW > maxRight) {
      targetX = x - zoomW - 20;
    }
    if (targetX < 20) targetX = 20;

    let targetY = y - 80;
    if (targetY + zoomH > height - 20) {
      targetY = height - zoomH - 20;
    }
    if (targetY < 20) targetY = 20;

    const container = this.add.container(targetX, targetY).setDepth(9999);

    const shadow = this.add.rectangle(8, 8, zoomW, zoomH, 0x000000, 0.75).setOrigin(0, 0);
    container.add(shadow);

    const zoomVisual = this.createCardVisual(0, 0, zoomW, zoomH, card, undefined, true);
    container.add(zoomVisual);

    const badge = this.add.text(zoomW / 2, -12, '🔍 カード詳細プレビュー', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#0284c7',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      padding: { top: 2, bottom: 2, left: 8, right: 8 },
    }).setOrigin(0.5);
    container.add(badge);

    this.zoomContainer = container;
  }

  private hideCardZoom() {
    if (this.zoomContainer) {
      this.zoomContainer.destroy();
      this.zoomContainer = undefined;
    }
  }

  private calculateDimensions(width: number, height: number) {
    const logW = Math.min(380, Math.max(250, Math.floor(width * 0.20)));
    const logX = width - logW;
    const mainW = logX;

    // サプライ（横8列、縦2段）
    const gapX = Math.max(8, Math.min(16, Math.floor(mainW * 0.01)));
    const sepGap = gapX * 2;
    const maxCardWFromWidth = Math.floor((mainW - 48 - sepGap - 7 * gapX) / 8);
    const targetSupplyFrameH = Math.floor(height * 0.40);
    const maxCardHFromHeight = Math.floor((targetSupplyFrameH - 52) / 2);

    const cardH = Math.max(130, Math.min(maxCardHFromHeight, Math.floor(maxCardWFromWidth * 1.36)));
    const cardW = Math.floor(cardH / 1.36);

    const totalSupplyW = 3 * cardW + 2 * gapX + sepGap + 5 * cardW + 4 * gapX;
    const supplyStartX = Math.max(16, Math.floor((mainW - totalSupplyW) / 2));

    const frameX = Math.max(8, supplyStartX - 14);
    const frameY = 48;
    const frameW = totalSupplyW + 28;
    const frameH = 2 * cardH + 54;

    // プレイエリア（In Play）
    const deployedFrameY = frameY + frameH + 24;
    const deployedFrameH = Math.max(90, Math.min(150, Math.floor(height * 0.15)));
    const deployedCardH = Math.min(120, deployedFrameH - 14);
    const deployedCardW = Math.floor(deployedCardH * 0.95);

    // ドミニオン操作バー
    const barY = deployedFrameY + deployedFrameH + 10;
    const barH = 46;

    // 手札・山札・捨て札エリア（残り縦幅をフル活用）
    const handLabelY = barY + barH + 8;
    const handY = handLabelY + 20;
    const handCardH = Math.max(140, Math.min(300, height - handY - 14));
    const handCardW = Math.floor(handCardH / 1.36);

    const deckCardH = handCardH;
    const deckCardW = Math.min(handCardW, Math.max(110, Math.floor((mainW - 5 * handCardW - 6 * gapX) / 2) - 20));

    return {
      logW, logX, mainW,
      cardW, cardH, gapX, sepGap, totalSupplyW, supplyStartX,
      frameX, frameY, frameW, frameH,
      deployedFrameY, deployedFrameH, deployedCardW, deployedCardH,
      barY, barH,
      handLabelY, handY, handCardW, handCardH,
      deckCardW, deckCardH
    };
  }

  private startTurn() {
    this.currentPhase = 'build';
    this.playerState.deployed = [];
    this.playerState.credits = 0;
    this.playerState.remainingAcquires = 1;
    this.hasRetiredThisTurn = false;

    this.drawCards(5);

    for (const card of this.playerState.hand) {
      card.pairedCardId = undefined;
    }

    const drawnHand = [...this.playerState.hand];
    const builderCount = drawnHand.filter(c => c.type === 'builder').length;
    const starterCount = drawnHand.filter(c => c.type === 'starter').length;
    this.canRetireThisTurn = builderCount > starterCount && starterCount > 0;

    this.playSound('se_turn', 0.25);
    this.messageText.setText('手札のカードをプレイするか、「⚡ すべての財宝をプレイ」を押してください。');
    this.addLog('--- ターン開始 (手札 5枚 ドロー) ---');
    this.refreshAll();
  }

  /**
   * ドミニオン伝統の「すべての財宝をプレイ (Play All Treasures)」
   */
  private handlePlayAllStarters() {
    let playedCount = 0;
    let gainedCredits = 0;
    let i = 0;
    while (i < this.playerState.hand.length) {
      const card = this.playerState.hand[i];
      if (card.type === 'starter') {
        this.playerState.hand.splice(i, 1);
        this.playerState.deployed.push(card);
        this.playerState.credits += card.credit;
        gainedCredits += card.credit;
        playedCount++;
        this.checkSynergies(card);
      } else {
        i++;
      }
    }

    if (playedCount > 0) {
      this.playSound('se_select', 0.5);
      this.messageText.setText(`オンプレミス ${playedCount}枚 を一括プレイ！ (+${gainedCredits}c 獲得)`);
      this.addLog(`⚡ 【一括プレイ】オンプレミス ${playedCount}枚 を場に出した (+${gainedCredits}c)`);
      this.refreshAll();
    }
  }

  private createLayout(width: number, height: number) {
    const dim = this.calculateDimensions(width, height);

    // --- 1. 右側フルハイト・ゲームログ（MENUボタン回避） ---
    this.logSidebarBg = this.add.rectangle(dim.logX, 0, dim.logW, height, 0x090d16).setOrigin(0, 0);
    this.logSidebarBorder = this.add.rectangle(dim.logX, 0, 2, height, 0x1e293b).setOrigin(0, 0);

    const logTitleBg = this.add.rectangle(dim.logX, 0, dim.logW, 52, 0x0f172a).setOrigin(0, 0);
    this.logSidebarTitle = this.add.text(dim.logX + 16, 26, '📜 ゲームログ (Game Log)', {
      fontSize: '15px',
      color: '#93c5fd',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
    }).setOrigin(0, 0.5);

    this.logSidebarContent = this.add.text(dim.logX + 16, 62, '', {
      fontSize: '13px',
      color: '#cbd5e1',
      fontFamily: FONT_FAMILY,
      lineSpacing: 8,
      wordWrap: { width: dim.logW - 32, useAdvancedWrap: true },
      resolution: 2,
    });
    this.updateLogText();

    // --- 2. メインエリア最上部メッセージヘッダー ---
    this.headerBg = this.add.rectangle(0, 0, dim.mainW, 48, 0x0f172a).setOrigin(0, 0);
    this.messageText = this.add.text(dim.mainW / 2, 24, '', {
      fontSize: '17px',
      color: '#38bdf8',
      fontFamily: FONT_FAMILY,
      align: 'center',
      resolution: 2,
    }).setOrigin(0.5);

    // --- 3. サプライエリア（全幅を活用した特大テーブル） ---
    this.supplyFrame = this.add.rectangle(dim.frameX, dim.frameY, dim.frameW, dim.frameH, 0x0b1120, 0.5)
      .setOrigin(0, 0)
      .setStrokeStyle(1.5, 0x1e3a8a);

    this.supplyLabel = this.add.text(dim.frameX + 16, dim.frameY + 12, '【 🛒 サプライ (基本財宝・勝利点 ＆ 王国AWSアクション10種) 】', {
      fontSize: '15px',
      color: '#38bdf8',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
    });

    // --- 4. プレイエリア（In Play） ---
    this.deployedLabel = this.add.text(dim.frameX, dim.deployedFrameY - 20, '【 🚀 プレイエリア (In Play / 稼働中アーキテクチャ) 】', {
      fontSize: '14px',
      color: '#94a3b8',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
    });
    this.deployedFrame = this.add.rectangle(dim.frameX, dim.deployedFrameY, dim.frameW, dim.deployedFrameH, 0x0f172a, 0.45)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x334155);

    // --- 5. ドミニオン操作バー ---
    this.controlBarBg = this.add.rectangle(dim.frameX, dim.barY, dim.frameW, dim.barH, 0x0f172a, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1.5, 0x1e293b);

    this.badgeCredits = this.add.text(dim.frameX + 16, dim.barY + dim.barH / 2, '💰 0 クレジット', {
      fontSize: '18px',
      color: '#facc15',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      backgroundColor: '#271c0c',
      padding: { top: 4, bottom: 4, left: 10, right: 10 },
      resolution: 2,
    }).setOrigin(0, 0.5);

    this.badgeAcquires = this.add.text(dim.frameX + 190, dim.barY + dim.barH / 2, '🛒 購入権: 1', {
      fontSize: '18px',
      color: '#34d399',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      backgroundColor: '#062d1f',
      padding: { top: 4, bottom: 4, left: 10, right: 10 },
      resolution: 2,
    }).setOrigin(0, 0.5);

    this.badgePoints = this.add.text(dim.frameX + 340, dim.barY + dim.barH / 2, '🏆 勝利点: 0pt', {
      fontSize: '18px',
      color: '#60a5fa',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      backgroundColor: '#0b1d3a',
      padding: { top: 4, bottom: 4, left: 10, right: 10 },
      resolution: 2,
    }).setOrigin(0, 0.5);

    const btnActionW = 215;
    const btnRetireW = 200;
    const btnActionX = (dim.frameX + dim.frameW) - 10 - btnActionW / 2;
    const btnRetireX = btnActionX - btnActionW / 2 - 12 - btnRetireW / 2;

    this.retireButtonBg = this.add.rectangle(btnRetireX, dim.barY + dim.barH / 2, btnRetireW, 36, 0x334155)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.handleRetireStarter());
    this.retireButtonText = this.add.text(btnRetireX, dim.barY + dim.barH / 2, '🗑️ オンプレミス廃棄', {
      fontSize: '13px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
    }).setOrigin(0.5);

    this.actionButtonBg = this.add.rectangle(btnActionX, dim.barY + dim.barH / 2, btnActionW, 36, 0x16a34a)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.handlePhaseAdvance());
    this.actionButtonText = this.add.text(btnActionX, dim.barY + dim.barH / 2, 'ターン終了', {
      fontSize: '15px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
    }).setOrigin(0.5);

    // --- 6. 手札見出し ---
    this.handLabel = this.add.text(dim.frameX + 16, dim.handLabelY, '【 手札 (Hand) - クリックでプレイ / ホバーで拡大 】', {
      fontSize: '13px',
      color: '#94a3b8',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
    });
  }

  private handleResize(width: number, height: number) {
    this.bgRect.setSize(width, height);
    const dim = this.calculateDimensions(width, height);

    this.logSidebarBg.setPosition(dim.logX, 0).setSize(dim.logW, height);
    this.logSidebarBorder.setPosition(dim.logX, 0).setSize(2, height);
    this.logSidebarTitle.setPosition(dim.logX + 16, 26);
    this.logSidebarContent.setPosition(dim.logX + 16, 62).setWordWrapWidth(dim.logW - 32);

    this.headerBg.setPosition(0, 0).setSize(dim.mainW, 48);
    this.messageText.setPosition(dim.mainW / 2, 24);

    this.supplyFrame.setPosition(dim.frameX, dim.frameY).setSize(dim.frameW, dim.frameH);
    this.supplyLabel.setPosition(dim.frameX + 16, dim.frameY + 12);

    this.deployedLabel.setPosition(dim.frameX, dim.deployedFrameY - 20);
    this.deployedFrame.setPosition(dim.frameX, dim.deployedFrameY).setSize(dim.frameW, dim.deployedFrameH);

    this.controlBarBg.setPosition(dim.frameX, dim.barY).setSize(dim.frameW, dim.barH);
    this.badgeCredits.setPosition(dim.frameX + 16, dim.barY + dim.barH / 2);
    this.badgeAcquires.setPosition(dim.frameX + 190, dim.barY + dim.barH / 2);
    this.badgePoints.setPosition(dim.frameX + 340, dim.barY + dim.barH / 2);

    const btnActionW = 215;
    const btnRetireW = 200;
    const btnActionX = (dim.frameX + dim.frameW) - 10 - btnActionW / 2;
    const btnRetireX = btnActionX - btnActionW / 2 - 12 - btnRetireW / 2;

    this.retireButtonBg.setPosition(btnRetireX, dim.barY + dim.barH / 2).setSize(btnRetireW, 36);
    this.retireButtonText.setPosition(btnRetireX, dim.barY + dim.barH / 2);

    this.actionButtonBg.setPosition(btnActionX, dim.barY + dim.barH / 2).setSize(btnActionW, 36);
    this.actionButtonText.setPosition(btnActionX, dim.barY + dim.barH / 2);

    this.handLabel.setPosition(dim.frameX + 16, dim.handLabelY);

    this.refreshAll();
  }

  private refreshAll() {
    this.updateStatus();
    this.renderSupply();
    this.renderDeployed();
    this.renderDeckAndDiscard();
    this.renderHand();
    this.updateRetireButton();
  }

  private updateStatus() {
    this.badgeCredits.setText(`💰 ${this.playerState.credits} クレジット`);
    this.badgeAcquires.setText(`🛒 購入枠: ${this.playerState.remainingAcquires}`);
    this.badgePoints.setText(`🏆 勝利点: ${this.playerState.wellArchitectedPoints}pt`);

    const hasStartersInHand = this.playerState.hand.some(c => c.type === 'starter');

    if (hasStartersInHand) {
      this.actionButtonText.setText('⚡ すべてのオンプレをプレイ');
      this.actionButtonBg.setFillStyle(0x0284c7);
    } else {
      this.actionButtonText.setText('ターン終了 (購入完了)');
      this.actionButtonBg.setFillStyle(0x16a34a);
    }
  }

  private renderDeckAndDiscard() {
    const { width, height } = this.scale;
    const dim = this.calculateDimensions(width, height);

    const cardW = dim.deckCardW;
    const cardH = dim.deckCardH;
    const baseY = dim.handY;

    // --- 左側：山札 (Draw Deck) ---
    if (this.deckVisualContainer) this.deckVisualContainer.destroy();
    const deckX = Math.max(16, dim.frameX);
    const deckContainer = this.add.container(deckX, baseY);

    if (this.playerState.deck.length > 1) {
      const shadow = this.add.rectangle(4, -4, cardW, cardH, 0x091428).setOrigin(0, 0).setStrokeStyle(1, 0x1e3a8a);
      deckContainer.add(shadow);
    }

    const isDeckEmpty = this.playerState.deck.length === 0;
    const deckBg = this.add.rectangle(0, 0, cardW, cardH, isDeckEmpty ? 0x1e293b : 0x172554)
      .setOrigin(0, 0)
      .setStrokeStyle(2, isDeckEmpty ? 0x475569 : 0x3b82f6);

    const deckHeader = this.add.text(cardW / 2, 16, '【 山札 (Deck) 】', {
      fontSize: '13px',
      color: '#93c5fd',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
    }).setOrigin(0.5);

    const deckCountNumber = this.add.text(cardW / 2, cardH / 2 - 4, `${this.playerState.deck.length}`, {
      fontSize: '38px',
      color: isDeckEmpty ? '#64748b' : '#facc15',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
    }).setOrigin(0.5);

    const deckLabel = this.add.text(cardW / 2, cardH - 24, isDeckEmpty ? '（空）' : '残りカード', {
      fontSize: '12px',
      color: '#cbd5e1',
      fontFamily: FONT_FAMILY,
      resolution: 2,
    }).setOrigin(0.5);

    deckContainer.add([deckBg, deckHeader, deckCountNumber, deckLabel]);
    this.deckVisualContainer = deckContainer;

    // --- 右側：捨て札 (Discard Pile) ---
    if (this.discardVisualContainer) this.discardVisualContainer.destroy();
    const discardX = dim.frameX + dim.frameW - cardW;
    const discardContainer = this.add.container(discardX, baseY);

    const isDiscardEmpty = this.playerState.discard.length === 0;
    const topDiscardCard = this.playerState.discard[this.playerState.discard.length - 1];

    if (!isDiscardEmpty && topDiscardCard) {
      const topVisual = this.createCardVisual(0, 0, cardW, cardH, topDiscardCard);
      discardContainer.add(topVisual);

      const discardHeaderBg = this.add.rectangle(0, 0, cardW, 22, 0x111827, 0.85).setOrigin(0, 0);
      const discardHeaderText = this.add.text(cardW / 2, 11, '【 捨て札 (Discard) 】', {
        fontSize: '12px',
        color: '#f8fafc',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        resolution: 2,
      }).setOrigin(0.5);
      discardContainer.add([discardHeaderBg, discardHeaderText]);
    } else {
      const emptyDiscardBg = this.add.rectangle(0, 0, cardW, cardH, 0x1e293b, 0.4)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x475569);
      const emptyDiscardHeader = this.add.text(cardW / 2, 16, '【 捨て札 (Discard) 】', {
        fontSize: '12px',
        color: '#94a3b8',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        resolution: 2,
      }).setOrigin(0.5);
      const emptyDiscardText = this.add.text(cardW / 2, cardH / 2, '購入したカードが\nここに入ります', {
        fontSize: '12px',
        color: '#64748b',
        fontFamily: FONT_FAMILY,
        align: 'center',
        resolution: 2,
      }).setOrigin(0.5);
      discardContainer.add([emptyDiscardBg, emptyDiscardHeader, emptyDiscardText]);
    }

    this.discardBadgeText = this.add.text(cardW / 2, cardH - 16, `計 ${this.playerState.discard.length} 枚`, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#047857',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 3, bottom: 3, left: 8, right: 8 },
    }).setOrigin(0.5);
    discardContainer.add(this.discardBadgeText);

    this.discardVisualContainer = discardContainer;
  }

  private renderSupply() {
    this.supplyContainers.forEach(c => c.destroy());
    this.supplyContainers = [];

    const { width, height } = this.scale;
    const dim = this.calculateDimensions(width, height);
    const { cardW, cardH, gapX, sepGap, supplyStartX, frameY } = dim;

    const row0Y = frameY + 36;
    const row1Y = row0Y + cardH + 10;

    // --- 1. 基本財宝カード (3種) ＆ 基本勝利点カード (2種) ---
    // 列0: 銅貨（基本 0c）/ 銀貨（EC2 2c）
    const col0X = supplyStartX;
    if (this.treasureSupply[0]) {
      this.renderSupplyPile(this.treasureSupply[0], col0X, row0Y, cardW, cardH);
    }
    if (this.treasureSupply[1]) {
      this.renderSupplyPile(this.treasureSupply[1], col0X, row1Y, cardW, cardH);
    }

    // 列1: 金貨（Aurora 4c）
    const col1X = col0X + cardW + gapX;
    if (this.treasureSupply[2]) {
      this.renderSupplyPile(this.treasureSupply[2], col1X, row0Y, cardW, cardH);
    }

    // 列2: 1pt (2c) / 3pt (4c)
    const col2X = col1X + cardW + gapX;
    if (this.victorySupply[0]) {
      this.renderSupplyPile(this.victorySupply[0], col2X, row0Y, cardW, cardH);
    }
    if (this.victorySupply[1]) {
      this.renderSupplyPile(this.victorySupply[1], col2X, row1Y, cardW, cardH);
    }

    // 基本カードと王国カードの境界セパレータ
    const sepX = col2X + cardW + sepGap / 2;
    const sepLine = this.add.rectangle(sepX, frameY + 30, 2, 2 * cardH + 18, 0x1e3a8a, 0.6).setOrigin(0.5, 0);
    this.supplyContainers.push(this.add.container(0, 0, [sepLine]));

    // --- 2. 王国カード10種 (5列 × 2段、コスト昇順整列) ---
    const kingdomStartX = col2X + cardW + sepGap;
    const row0Cards = this.kingdomSupply.slice(0, 5);
    const row1Cards = this.kingdomSupply.slice(5, 10);

    row0Cards.forEach((pile, colIdx) => {
      const x = kingdomStartX + colIdx * (cardW + gapX);
      this.renderSupplyPile(pile, x, row0Y, cardW, cardH);
    });

    row1Cards.forEach((pile, colIdx) => {
      const x = kingdomStartX + colIdx * (cardW + gapX);
      this.renderSupplyPile(pile, x, row1Y, cardW, cardH);
    });
  }

  private renderSupplyPile(pile: SupplyPile, x: number, y: number, w: number, h: number) {
    const isSoldOut = pile.count <= 0;
    const canAfford = this.playerState.credits >= pile.card.cost && this.playerState.remainingAcquires > 0;

    const container = this.createCardVisual(x, y, w, h, pile.card, () => {
      this.handleBuySupplyCard(pile, x, y);
    });

    const badgeColor = isSoldOut ? '#ef4444' : '#facc15';
    const badgeBg = isSoldOut ? '#7f1d1d' : '#1e293b';
    const badgeText = isSoldOut ? '完売' : `残: ${pile.count}`;

    const countBadge = this.add.text(w / 2, -7, badgeText, {
      fontSize: '11px',
      color: badgeColor,
      backgroundColor: badgeBg,
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 2, bottom: 2, left: 6, right: 6 },
    }).setOrigin(0.5, 1);
    container.add(countBadge);

    if (isSoldOut) {
      container.setAlpha(0.35);
      const soldOutOverlay = this.add.rectangle(w / 2, h / 2, w - 8, 28, 0x000000, 0.85);
      const soldOutText = this.add.text(w / 2, h / 2, 'SOLD OUT', {
        fontSize: '12px',
        color: '#ef4444',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        resolution: 2,
      }).setOrigin(0.5);
      container.add([soldOutOverlay, soldOutText]);
    } else if (canAfford) {
      const highlight = this.add.rectangle(0, 0, w, h).setOrigin(0, 0).setStrokeStyle(2.5, 0xfacc15);
      container.add(highlight);
    } else {
      container.setAlpha(0.7);
    }

    this.supplyContainers.push(container);
  }

  private renderDeployed() {
    this.deployedContainers.forEach(c => c.destroy());
    this.deployedContainers = [];

    const { width, height } = this.scale;
    const dim = this.calculateDimensions(width, height);

    const cardWidth = dim.deployedCardW;
    const cardHeight = dim.deployedCardH;
    const gap = 12;
    const count = this.playerState.deployed.length;
    const totalWidth = count * cardWidth + Math.max(0, count - 1) * gap;
    const startX = Math.max(dim.frameX + 16, Math.floor((dim.mainW - totalWidth) / 2));
    const startY = dim.deployedFrameY + Math.floor((dim.deployedFrameH - cardHeight) / 2);

    this.playerState.deployed.forEach((card, idx) => {
      const x = startX + idx * (cardWidth + gap);
      const y = startY;
      const container = this.createCardVisual(x, y, cardWidth, cardHeight, card);
      this.deployedContainers.push(container);
    });
  }

  private renderHand() {
    this.handContainers.forEach(c => c.destroy());
    this.handContainers = [];

    const { width, height } = this.scale;
    const dim = this.calculateDimensions(width, height);

    const cardWidth = dim.handCardW;
    const cardHeight = dim.handCardH;
    const gap = 14;
    const count = this.playerState.hand.length;

    const deckRightEdge = Math.max(16, dim.frameX) + dim.deckCardW + 16;
    const discardLeftEdge = dim.frameX + dim.frameW - dim.deckCardW - 16;
    const availableWidth = discardLeftEdge - deckRightEdge;

    if (count === 0) {
      const emptyGuide = this.add.text(dim.mainW / 2, dim.handY + cardHeight / 2, '手札のカードはすべて場に出されました。\n上のサプライから好きなカードを1枚クリックして購入してください！', {
        fontSize: '15px',
        color: '#64748b',
        fontFamily: FONT_FAMILY,
        align: 'center',
        lineSpacing: 6,
        resolution: 2,
      }).setOrigin(0.5);
      this.handContainers.push(this.add.container(0, 0, [emptyGuide]));
      return;
    }

    const totalWidth = count * cardWidth + Math.max(0, count - 1) * gap;
    const startX = deckRightEdge + Math.max(0, (availableWidth - totalWidth) / 2);
    const startY = dim.handY;

    this.playerState.hand.forEach((card, idx) => {
      const x = startX + idx * (cardWidth + gap);
      const y = startY;
      const container = this.createCardVisual(x, y, cardWidth, cardHeight, card, () => {
        this.handleDeployCard(idx);
      });
      this.handContainers.push(container);
    });
  }

  /**
   * 実物カード完全準拠のビジュアル生成（ホバー拡大プレビュー対応）
   */
  private createCardVisual(
    x: number,
    y: number,
    w: number,
    h: number,
    card: GameCard | null,
    onClick?: () => void,
    isZoom: boolean = false
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    if (!card) {
      const emptyBg = this.add.rectangle(0, 0, w, h, 0x1e293b, 0.5)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x475569);
      const emptyText = this.add.text(w / 2, h / 2, '空きスロット', {
        fontSize: '12px',
        color: '#64748b',
        fontFamily: FONT_FAMILY,
        resolution: 2,
      }).setOrigin(0.5);
      container.add([emptyBg, emptyText]);
      return container;
    }

    let bgColor = 0x1e293b;
    let borderColor = 0x475569;
    let headerBg = 0x334155;
    let typeLabel = '[オンプレミス]';
    let typeColor = '#94a3b8';

    if (card.pairedCardId) {
      borderColor = 0x10b981;
    }

    if (card.type === 'builder') {
      bgColor = 0x0f172a;
      if (!card.pairedCardId) borderColor = 0x0284c7;
      headerBg = 0x0369a1;
      typeLabel = '[AWSサービス]';
      typeColor = '#38bdf8';
    } else if (card.type === 'well-architected') {
      bgColor = 0x2a1505;
      borderColor = 0xfacc15;
      headerBg = 0xb45309;
      typeLabel = '[勝利点]';
      typeColor = '#facc15';
    }

    const strokeWidth = isZoom ? 3.5 : (card.pairedCardId ? 3 : 2);
    const bg = this.add.rectangle(0, 0, w, h, bgColor)
      .setOrigin(0, 0)
      .setStrokeStyle(strokeWidth, borderColor);

    const isSmall = h < 130;
    const titleBarH = isZoom ? 40 : (isSmall ? 26 : 32);
    const titleBar = this.add.rectangle(0, 0, w, titleBarH, headerBg).setOrigin(0, 0);

    const titleFontSize = isZoom ? '17px' : (isSmall ? '11px' : (w > 140 ? '14px' : '12.5px'));
    const name = this.add.text(w / 2, titleBarH / 2, card.nameJa, {
      fontSize: titleFontSize,
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: w - 8, useAdvancedWrap: true },
      resolution: 2,
    }).setOrigin(0.5);

    const boxX = 6;
    const boxY = titleBarH + 3;
    const boxW = w - 12;
    const footerMargin = isZoom ? 38 : (isSmall ? 24 : 32);
    const boxH = Math.max(30, h - titleBarH - footerMargin);
    const innerBox = this.add.rectangle(w / 2, boxY + boxH / 2, boxW, boxH, 0x030712, 0.45)
      .setStrokeStyle(1, 0x334155);

    const elements: Phaser.GameObjects.GameObject[] = [bg, titleBar, name, innerBox];

    let currentY = boxY + (isZoom ? 8 : (isSmall ? 2 : 5));

    if (card.type === 'well-architected') {
      const points = (card as WellArchitectedCard).points;
      const pointText = this.add.text(w / 2, currentY + (isZoom ? 20 : (isSmall ? 4 : 12)), `🏆 +${points} 勝利点`, {
        fontSize: isZoom ? '28px' : (isSmall ? '16px' : '20px'),
        color: '#facc15',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        resolution: 2,
      }).setOrigin(0.5, 0);
      elements.push(pointText);
      currentY = pointText.y + pointText.height + (isZoom ? 12 : 6);

      // 勝利点カードはズーム時のみ詳細説明を表示し、通常時は大きな勝利点アイコンで見やすく配置
      if (card.description && isZoom) {
        const desc = this.add.text(w / 2, currentY + 4, card.description, {
          fontSize: '13px',
          color: '#cbd5e1',
          fontFamily: FONT_FAMILY,
          align: 'center',
          wordWrap: { width: boxW - 8, useAdvancedWrap: true },
          lineSpacing: 4,
          resolution: 2,
        }).setOrigin(0.5, 0);
        elements.push(desc);
      }
    } else {
      const mainEffects: { text: string; color: string; size: string }[] = [];
      const effSize = isZoom ? '22px' : (isSmall ? '13px' : (w > 140 ? '16px' : '14px'));
      const subEffSize = isZoom ? '18px' : (isSmall ? '11px' : (w > 140 ? '14px' : '12.5px'));

      if (card.credit > 0) {
        mainEffects.push({ text: `💰 +${card.credit} クレジット`, color: '#fde047', size: effSize });
      }
      if (card.effects?.extraDraw) {
        mainEffects.push({ text: `🃏 +${card.effects.extraDraw} ドロー`, color: '#60a5fa', size: subEffSize });
      }
      if (card.effects?.extraAcquire) {
        mainEffects.push({ text: `🛒 +${card.effects.extraAcquire} 購入権`, color: '#34d399', size: subEffSize });
      }
      if (card.effects?.retireOnEnd) {
        mainEffects.push({ text: `🌅 リタイア`, color: '#fb923c', size: subEffSize });
      }

      mainEffects.forEach((eff) => {
        const effText = this.add.text(w / 2, currentY, eff.text, {
          fontSize: eff.size,
          color: eff.color,
          fontFamily: FONT_FAMILY,
          fontStyle: 'bold',
          resolution: 2,
        }).setOrigin(0.5, 0);
        elements.push(effText);
        currentY += effText.height + (isZoom ? 4 : 2);
      });

      if (card.description && !isSmall) {
        const descFontSize = isZoom ? '13px' : (w > 140 ? '11px' : '10px');
        const desc = this.add.text(w / 2, currentY + (isZoom ? 6 : 2), card.description, {
          fontSize: descFontSize,
          color: '#cbd5e1',
          fontFamily: FONT_FAMILY,
          align: 'center',
          wordWrap: { width: boxW - 6, useAdvancedWrap: true },
          lineSpacing: isZoom ? 4 : 2,
          resolution: 2,
        }).setOrigin(0.5, 0);
        elements.push(desc);
        currentY = desc.y + desc.height + 2;
      }
    }

    const comboDescText = (card as BuilderCard | StarterCard).comboDesc;
    if (comboDescText) {
      const isPaired = !!card.pairedCardId;
      const comboLabel = isPaired ? `✨連携中! ${comboDescText}` : `🔗${comboDescText}`;
      const comboBanner = this.add.text(w / 2, boxY + boxH - (isZoom ? 6 : 3), comboLabel, {
        fontSize: isZoom ? '13px' : (isSmall ? '8.5px' : '9.5px'),
        color: isPaired ? '#6ee7b7' : '#7dd3fc',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: isPaired ? '#064e3b' : '#0c4a6e',
        wordWrap: { width: boxW - 4, useAdvancedWrap: true },
        resolution: 2,
        padding: { top: isZoom ? 3 : 1, bottom: isZoom ? 3 : 1, left: isZoom ? 6 : 3, right: isZoom ? 6 : 3 },
      }).setOrigin(0.5, 1);
      elements.push(comboBanner);
    }

    // --- 最下部: コストコイン & 種別ラベル ---
    const footerDivider = this.add.rectangle(w / 2, h - (isZoom ? 32 : (isSmall ? 22 : 28)), w - 12, 1, 0x334155);
    elements.push(footerDivider);

    const coinRadius = isZoom ? 15 : (isSmall ? 9 : 11);
    const coinX = coinRadius + (isZoom ? 12 : 8);
    const coinY = h - (isZoom ? 16 : (isSmall ? 11 : 14));

    let coinBgColor = 0xd97706;
    let coinStrokeColor = 0xfef08a;
    let coinText = `${card.cost}c`;
    let coinTextColor = '#ffffff';
    let coinFontSize = isZoom ? '14px' : (isSmall ? '9px' : '11px');

    if (card.cost === 0) {
      if (card.type === 'starter') {
        coinBgColor = 0x334155;
        coinStrokeColor = 0x64748b;
        coinText = '初期';
        coinTextColor = '#94a3b8';
        coinFontSize = isZoom ? '12px' : (isSmall ? '8px' : '9px');
      } else {
        coinBgColor = 0x059669;
        coinStrokeColor = 0x6ee7b7;
        coinText = '無料';
        coinFontSize = isZoom ? '12px' : (isSmall ? '8px' : '9px');
      }
    }

    const coinCircle = this.add.circle(coinX, coinY, coinRadius, coinBgColor)
      .setStrokeStyle(1.5, coinStrokeColor);

    const coinLabel = this.add.text(coinX, coinY, coinText, {
      fontSize: coinFontSize,
      color: coinTextColor,
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
    }).setOrigin(0.5);

    const typeLabelObj = this.add.text(w - (isZoom ? 12 : 8), coinY, typeLabel, {
      fontSize: isZoom ? '13px' : (isSmall ? '8.5px' : '10px'),
      color: typeColor,
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
    }).setOrigin(1, 0.5);

    elements.push(coinCircle, coinLabel, typeLabelObj);
    container.add(elements);

    // インタラクション＆ホバー拡大プレビュー
    if (!isZoom) {
      bg.setInteractive({ useHandCursor: !!onClick });

      if (onClick) {
        bg.on('pointerdown', onClick);
      }

      bg.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        bg.setStrokeStyle(3, 0xffffff);
        if (onClick) container.setY(y - 6);
        this.showCardZoom(card, pointer.worldX, pointer.worldY);
      });

      bg.on('pointerout', () => {
        bg.setStrokeStyle(card.pairedCardId ? 3 : 2, borderColor);
        if (onClick) container.setY(y);
        this.hideCardZoom();
      });
    }

    return container;
  }

  /**
   * 公式 1:1 原則に基づくアーキテクチャ・シナジー判定エンジン
   */
  private checkSynergies(newCard: GameCard) {
    if (newCard.pairedCardId) return;

    // 1. 新規カードが連携対象を持っている場合
    const comboTargets = (newCard as BuilderCard | StarterCard).comboWith;
    const comboBonus = (newCard as BuilderCard | StarterCard).comboBonus;

    if (comboTargets && comboBonus) {
      const partner = this.playerState.deployed.find(
        c => c.id !== newCard.id && !c.pairedCardId && comboTargets.includes(c.name)
      );

      if (partner) {
        newCard.pairedCardId = partner.id;
        partner.pairedCardId = newCard.id;
        this.applyComboBonus(newCard, partner, comboBonus);
        return;
      }
    }

    // 2. 既存カードが新規カードを連携対象に指定している場合
    for (const existing of this.playerState.deployed) {
      if (existing.id === newCard.id || existing.pairedCardId) continue;
      const targets = (existing as BuilderCard | StarterCard).comboWith;
      const bonus = (existing as BuilderCard | StarterCard).comboBonus;

      if (targets && bonus && targets.includes(newCard.name)) {
        existing.pairedCardId = newCard.id;
        newCard.pairedCardId = existing.id;
        this.applyComboBonus(existing, newCard, bonus);
        return;
      }
    }
  }

  /**
   * 組み合わせボーナスの適用と演出
   */
  private applyComboBonus(source: GameCard, target: GameCard, bonus: { credit?: number; draw?: number; extraAcquire?: number }) {
    this.playSound('se_victory', 0.5);

    let bonusMsg = '';
    if (bonus.credit) {
      this.playerState.credits += bonus.credit;
      bonusMsg += `+${bonus.credit}c `;
    }
    if (bonus.draw) {
      this.drawCardsWithAnimation(bonus.draw, `${source.nameJa} × ${target.nameJa}`);
      bonusMsg += `+${bonus.draw}枚引く `;
    }
    if (bonus.extraAcquire) {
      this.playerState.remainingAcquires += bonus.extraAcquire;
      bonusMsg += `+${bonus.extraAcquire}購入枠 `;
    }

    this.messageText.setText(`【アーキテクチャ完成！】${source.nameJa} × ${target.nameJa} ➜ ${bonusMsg}獲得！`);
    this.addLog(`✨ 【連携】${source.nameJa} × ${target.nameJa} ➜ ${bonusMsg.trim()}`);
  }

  private handleDeployCard(index: number) {
    const card = this.playerState.hand.splice(index, 1)[0];
    if (!card) return;

    this.playSound('se_select', 0.4);

    this.playerState.deployed.push(card);
    this.playerState.credits += card.credit;
    this.addLog(`🚀 【デプロイ】${card.nameJa} (+${card.credit}c)`);

    // 基本効果（プライマリー）の解決
    if (card.type === 'builder') {
      const builder = card as BuilderCard;
      if (builder.effects?.draw) {
        this.drawCardsWithAnimation(builder.effects.draw, builder.nameJa);
      }
      if (builder.effects?.extraAcquire) {
        this.playerState.remainingAcquires += builder.effects.extraAcquire;
      }
    }

    // 組み合わせ効果（セカンダリー）の判定
    this.checkSynergies(card);

    if (this.playerState.hand.length === 0) {
      this.currentPhase = 'acquire';
    }

    this.refreshAll();
  }

  private handleRetireStarter() {
    if (this.hasRetiredThisTurn) {
      this.messageText.setText('このターンは既にオンプレミスを1枚廃棄しました。（1ターン1回まで）');
      return;
    }

    if (!this.canRetireThisTurn) {
      this.messageText.setText('【廃棄不可】ターン開始時の手札で「AWSカード数 ＞ オンプレミス数」の時のみ廃棄できます。');
      return;
    }

    if (this.playerState.credits <= 0) {
      this.messageText.setText('【クレジット不足】オンプレミス廃棄には1クレジットの犠牲（消費）が必要です。');
      return;
    }

    const startersInDeployed = this.playerState.deployed.filter(c => c.type === 'starter');
    if (startersInDeployed.length === 0) {
      this.messageText.setText('場に廃棄可能なオンプレミスがありません。');
      return;
    }

    let targetIdx = this.playerState.deployed.findIndex(
      c => c.type === 'starter' && !(c as StarterCard).comboWith
    );
    if (targetIdx === -1) {
      targetIdx = this.playerState.deployed.findIndex(c => c.type === 'starter');
    }

    if (targetIdx !== -1) {
      const removed = this.playerState.deployed.splice(targetIdx, 1)[0];
      const prevCredits = this.playerState.credits;
      this.playerState.credits = Math.max(0, this.playerState.credits - 1);
      this.hasRetiredThisTurn = true;
      this.playSound('se_retire', 0.5);

      this.messageText.setText(`【🗑️ デッキ圧縮】1cを犠牲にして ${removed.nameJa} を廃棄しました！（所持クレジット: ${prevCredits}c ➔ ${this.playerState.credits}c）`);
      this.addLog(`🗑️ 【廃棄】${removed.nameJa} を廃棄 (デッキ圧縮)`);
      this.refreshAll();
    }
  }


  private updateRetireButton() {
    const totalStarters =
      this.playerState.deck.filter(c => c.type === 'starter').length +
      this.playerState.discard.filter(c => c.type === 'starter').length +
      this.playerState.deployed.filter(c => c.type === 'starter').length +
      this.playerState.hand.filter(c => c.type === 'starter').length;

    if (totalStarters === 0) {
      this.retireButtonBg.setFillStyle(0x064e3b).setStrokeStyle(1.5, 0x10b981);
      this.retireButtonText.setText('オンプレ全廃止達成!').setColor('#6ee7b7');
    } else if (this.hasRetiredThisTurn) {
      this.retireButtonBg.setFillStyle(0x1e293b).setStrokeStyle(1, 0x475569);
      this.retireButtonText.setText('済: 今ターン廃棄完了').setColor('#64748b');
    } else if (this.canRetireThisTurn) {
      if (this.playerState.credits >= 1) {
        this.retireButtonBg.setFillStyle(0xd97706).setStrokeStyle(2, 0xfde047);
        this.retireButtonText.setText('🗑️ オンプレ廃棄 (-1c)').setColor('#ffffff');
      } else {
        this.retireButtonBg.setFillStyle(0x1e293b).setStrokeStyle(1, 0x475569);
        this.retireButtonText.setText('🔒 廃棄不可 (残高0c)').setColor('#94a3b8');
      }
    } else {
      this.retireButtonBg.setFillStyle(0x1e293b).setStrokeStyle(1, 0x334155);
      this.retireButtonText.setText(`🔒 廃棄不可 (残${totalStarters}枚)`).setColor('#94a3b8');
    }
  }

  private handleBuySupplyCard(pile: SupplyPile, originX: number, originY: number) {
    if (this.isAnimating) return;

    if (pile.count <= 0) {
      this.messageText.setText(`[${pile.card.nameJa}] は売り切れです！`);
      return;
    }

    if (this.playerState.remainingAcquires <= 0) {
      this.messageText.setText('このターンの購入枠が残っていません。「ターン終了」を押してください。');
      return;
    }

    if (this.playerState.credits < pile.card.cost) {
      this.messageText.setText(`クレジットが不足しています (必要: ${pile.card.cost}c / 所持: ${this.playerState.credits}c)`);
      return;
    }

    this.isAnimating = true;
    this.playSound('se_buy', 0.45);

    this.playerState.credits -= pile.card.cost;
    this.playerState.remainingAcquires--;
    pile.count--;

    // 勝利点カードの場合
    if (pile.card.type === 'well-architected') {
      const wa = pile.card as WellArchitectedCard;
      this.playerState.wellArchitectedPoints += wa.points;
      this.playerState.wellArchitectedCards.push(wa);
    }

    const { width, height } = this.scale;
    const dim = this.calculateDimensions(width, height);
    const targetX = dim.frameX + dim.frameW - dim.deckCardW;
    const targetY = dim.handY;

    const flyingCard = this.createCardVisual(originX, originY, dim.deckCardW, dim.deckCardH, pile.card);
    flyingCard.setDepth(1500);

    this.renderSupply();

    this.tweens.add({
      targets: flyingCard,
      x: targetX,
      y: targetY,
      scale: 0.95,
      alpha: 0.9,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        flyingCard.destroy();
        this.playerState.discard.push({ ...pile.card, id: `${pile.card.id}-${Date.now()}` });
        this.isAnimating = false;

        this.messageText.setText(`【購入完了！】${pile.card.nameJa} を購入しました！（捨て札に追加）`);
        this.addLog(`🛒 【購入】${pile.card.nameJa} (-${pile.card.cost}c / 残${pile.count}枚)`);
        this.refreshAll();

        if (this.discardBadgeText) {
          this.tweens.add({
            targets: this.discardBadgeText,
            scale: 1.35,
            duration: 150,
            yoyo: true,
            ease: 'Back.easeOut',
          });
        }

        // ドミニオン終了条件チェック:
        // 1. 3pt勝利点（属州相当）が売り切れ
        // 2. いずれかのサプライの山が3つ売り切れ（3山枯渇）
        const is3PtEmpty = this.victorySupply.find(p => (p.card as WellArchitectedCard).points === 3)?.count === 0;
        const allPiles = [...this.treasureSupply, ...this.victorySupply, ...this.kingdomSupply];
        const emptyPilesCount = allPiles.filter(p => p.count === 0).length;

        if (is3PtEmpty || emptyPilesCount >= 3) {
          const reason = is3PtEmpty ? '【3pt勝利点（属州相当）完売！】' : '【サプライ3山枯渇！】';
          this.messageText.setText(`${reason} ゲーム終了です！`);
          this.time.delayedCall(600, () => {
            this.endGame();
          });
          return;
        }

        if (this.playerState.remainingAcquires <= 0) {
          this.time.delayedCall(800, () => {
            this.endTurn();
          });
        }
      },
    });
  }

  private handlePhaseAdvance() {
    const hasStartersInHand = this.playerState.hand.some(c => c.type === 'starter');
    if (hasStartersInHand) {
      this.handlePlayAllStarters();
    } else {
      this.endTurn();
    }
  }

  private endTurn() {
    const retiringCards = this.playerState.deployed.filter(
      c => c.type === 'builder' && (c as BuilderCard).effects?.retireOnUse
    );
    if (retiringCards.length > 0) {
      this.playSound('se_retire', 0.4);
    }

    const nonRetiring = this.playerState.deployed.filter(
      c => !(c.type === 'builder' && (c as BuilderCard).effects?.retireOnUse)
    );

    this.playerState.discard.push(...nonRetiring, ...this.playerState.hand);
    this.playerState.deployed = [];
    this.playerState.hand = [];

    this.startTurn();
  }

  /**
   * 追加ドロー時の快感演出付きドロー処理（山札からの飛行・+1 DRAWポップアップ・着地SE）
   */
  private drawCardsWithAnimation(count: number, sourceName?: string) {
    const { width, height } = this.scale;
    const dim = this.calculateDimensions(width, height);

    const cardW = dim.handCardW;
    const cardH = dim.handCardH;
    const gap = 14;
    const deckRightEdge = Math.max(16, dim.frameX) + dim.deckCardW + 16;
    const discardLeftEdge = dim.frameX + dim.frameW - dim.deckCardW - 16;
    const availableWidth = discardLeftEdge - deckRightEdge;

    const deckX = Math.max(16, dim.frameX);
    const deckY = dim.handY;

    for (let i = 0; i < count; i++) {
      if (this.playerState.deck.length === 0) {
        if (this.playerState.discard.length === 0) break;
        this.playerState.deck = this.shuffle([...this.playerState.discard]);
        this.playerState.discard = [];
        this.messageText.setText('【山札再構成】捨て札をすべてシャッフルし、新しい山札を作りました！');
      }

      const drawnCard = this.playerState.deck.pop();
      if (!drawnCard) continue;

      this.isAnimating = true;

      const handIndex = this.playerState.hand.length;
      this.playerState.hand.push(drawnCard);

      // 山札から飛び出すカードのビジュアルを生成
      const flyingCard = this.createCardVisual(deckX, deckY, cardW, cardH, drawnCard);
      flyingCard.setDepth(1500);
      flyingCard.setScale(0.8);

      // ドロー開始時の効果音
      this.playSound('se_turn', 0.45);

      // 手札エリアでの着地先座標
      const totalCount = this.playerState.hand.length;
      const totalWidth = totalCount * cardW + Math.max(0, totalCount - 1) * gap;
      const startX = deckRightEdge + Math.max(0, (availableWidth - totalWidth) / 2);
      const targetX = startX + handIndex * (cardW + gap);
      const targetY = dim.handY;

      // 「+1 DRAW!」の派手なフロートバッジ演出（上に浮かびながらフェードアウト）
      const drawBadge = this.add.text(deckX + cardW / 2, deckY - 20, `✨ 🃏 +1 DRAW! [${drawnCard.nameJa}]`, {
        fontSize: '16px',
        color: '#fde047',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
        backgroundColor: '#1e3a8a',
        resolution: 2,
        padding: { top: 6, bottom: 6, left: 12, right: 12 },
      }).setOrigin(0.5).setDepth(2000);

      this.tweens.add({
        targets: drawBadge,
        y: deckY - 80,
        alpha: 0,
        scale: 1.15,
        duration: 1100,
        ease: 'Cubic.easeOut',
        onComplete: () => drawBadge.destroy(),
      });

      // 山札カウンターを弾ませる
      if (this.deckVisualContainer) {
        this.tweens.add({
          targets: this.deckVisualContainer,
          scale: 1.08,
          duration: 120,
          yoyo: true,
          ease: 'Quad.easeInOut',
        });
      }

      // 手札へ向かって飛んでいくアニメーション
      this.tweens.add({
        targets: flyingCard,
        x: targetX,
        y: targetY,
        scale: 1.0,
        duration: 520,
        delay: i * 220,
        ease: 'Back.easeOut',
        onComplete: () => {
          flyingCard.destroy();
          this.playSound('se_victory', 0.45);
          this.isAnimating = false;

          const reason = sourceName ? `（発動元: ${sourceName}）` : '';
          this.messageText.setText(`【追加ドロー成功！】山札から [${drawnCard.nameJa}] を手札に引き込みました！ ${reason}`);
          this.refreshAll();
        },
      });
    }

    this.renderDeckAndDiscard();
  }

  private drawCards(count: number) {
    for (let i = 0; i < count; i++) {
      if (this.playerState.deck.length === 0) {
        if (this.playerState.discard.length === 0) break;
        this.playerState.deck = this.shuffle([...this.playerState.discard]);
        this.playerState.discard = [];
        this.messageText.setText('【山札再構成】捨て札をすべてシャッフルし、新しい山札を作りました！');
      }
      const card = this.playerState.deck.pop();
      if (card) {
        this.playerState.hand.push(card);
      }
    }
  }

  private endGame() {
    this.playSound('se_victory', 0.6);

    const { width, height } = this.scale;
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0, 0);
    const winText = this.add.text(width / 2, height / 2 - 36, 'ゲーム終了！', {
      fontSize: '42px',
      color: '#facc15',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
      resolution: 2,
      padding: { top: 8, bottom: 4, left: 4, right: 4 },
    }).setOrigin(0.5);

    const scoreText = this.add.text(width / 2, height / 2 + 36, `最終獲得勝利点: ${this.playerState.wellArchitectedPoints} ポイント`, {
      fontSize: '26px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      resolution: 2,
      padding: { top: 6, bottom: 4, left: 4, right: 4 },
    }).setOrigin(0.5);

    this.add.container(0, 0, [overlay, winText, scoreText]);
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
