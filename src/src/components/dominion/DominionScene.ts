import Phaser from 'phaser';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faCoins } from '@fortawesome/free-solid-svg-icons';
import { FONT_FAMILY, TEXT_STYLE } from '../old-testament-rpg/typography';
import { BASE, CARDS, KINGDOM } from './cards';
import type { CardId } from './cards';
import { canBuy, canChoose, canGain, canPlay, inputPlayer } from './engine';
import type { Card } from './engine';
import type { DominionStore } from './store';
import { actionSound, SOUND_FILES } from './audio';

const COLORS = { treasure: 0xc5a658, victory: 0x79a17c, curse: 0xa187b8, action: 0xc6c3b4 };

export class DominionScene extends Phaser.Scene {
  private store: DominionStore;
  private inspect: (id: CardId) => void;
  private onReady: () => void;
  private table!: Phaser.GameObjects.Container;
  private dirty = true;
  private handPage = 0;
  private playedPage = 0;

  constructor(store: DominionStore, inspect: (id: CardId) => void, onReady: () => void) {
    super('DominionTable');
    this.store = store;
    this.inspect = inspect;
    this.onReady = onReady;
  }

  preload() {
    const assets = `${import.meta.env.BASE_URL}assets/`;
    const sheets = `${assets}kenney_boardgame-pack/Spritesheets/`;
    this.load.atlasXML('dominion-backs', `${sheets}playingCardBacks.png`, `${sheets}playingCardBacks.xml`);
    const coinSvg = icon(faCoins, { styles: { color: '#b58b2c' } }).html.join('');
    // PhaserのXHRLoaderはdata URLをatobで復号するため、Base64で渡す。
    this.load.svg('dominion-coin', `data:image/svg+xml;base64,${btoa(coinSvg)}`, { width: 64, height: 64 });
    const lightCoinSvg = icon(faCoins, { styles: { color: '#ffffff' } }).html.join('');
    this.load.svg('dominion-coin-light', `data:image/svg+xml;base64,${btoa(lightCoinSvg)}`, { width: 64, height: 64 });
    for (const [key, file] of Object.entries(SOUND_FILES)) {
      this.load.audio(`dominion-${key}`, `${assets}kenney_casino-audio/Audio/${file}`);
    }
  }

  create() {
    this.table = this.add.container(0, 0);
    this.input.mouse?.disableContextMenu();
    const unsubscribe = this.store.subscribe(() => { this.dirty = true; });
    const updateSound = () => { this.sound.mute = this.store.getMuted(); };
    updateSound();
    const unsubscribeSound = this.store.subscribeSound(updateSound);
    const unsubscribeActions = this.store.subscribeActions((command, previous) => {
      // ロック中のCPU操作を予約すると、最初のタップで過去の音がまとめて鳴ってしまう。
      if (this.sound.locked || this.sound.mute || document.hidden) return;
      const effect = actionSound(command, previous);
      if (!effect || !this.cache.audio.exists(`dominion-${effect}`)) return;
      try {
        this.sound.stopAll();
        this.sound.play(`dominion-${effect}`, { volume: 0.4 });
      } catch {
        // 音声の再生に失敗しても、カード操作と対戦は継続する。
      }
    });
    const resize = () => { this.dirty = true; };
    this.scale.on(Phaser.Scale.Events.RESIZE, resize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      unsubscribeSound();
      unsubscribeActions();
      this.sound.stopAll();
      this.scale.off(Phaser.Scale.Events.RESIZE, resize);
    });
    this.paint();
    this.onReady();
  }

  update() {
    if (this.dirty) this.paint();
  }

  private text(x: number, y: number, value: string, size = 14, color = '#e4e7dd', bold = false) {
    const text = this.add.text(x, y, value, {
      ...TEXT_STYLE, fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal',
    });
    this.table.add(text);
    return text;
  }

  private panel(x: number, y: number, width: number, height: number, color: number, alpha = 1) {
    const panel = this.add.rectangle(x, y, width, height, color, alpha).setOrigin(0);
    this.table.add(panel);
    return panel;
  }

  private pager(x: number, y: number, label: string, enabled: boolean, action: () => void) {
    const text = this.text(x, y, label, 14, enabled ? '#f0d493' : '#59736b', true);
    if (enabled) text.setInteractive({ useHandCursor: true }).on('pointerdown', action);
  }

  private card(x: number, y: number, width: number, height: number, id: CardId, options: {
    compact?: boolean; spriteBackground?: boolean; count?: number; enabled?: boolean; action?: () => void;
  } = {}) {
    const definition = CARDS[id];
    const compact = options.compact ?? false;
    const spriteBackground = options.spriteBackground ?? false;
    const accent = COLORS[definition.type];
    const group = this.add.container(x, y);
    this.table.add(group);
    const shadow = this.add.rectangle(3, 4, width, height, 0x000000, 0.25).setOrigin(0);
    const frame = definition.type === 'victory' ? 'cardBack_green1.png' : definition.type === 'treasure' ? 'cardBack_red1.png' : 'cardBack_blue1.png';
    const face = this.textures.exists('dominion-backs')
      ? this.add.image(0, 0, 'dominion-backs', frame).setOrigin(0).setDisplaySize(width, height)
      : this.add.rectangle(0, 0, width, height, spriteBackground ? 0x315d7b : 0xeee9d9).setOrigin(0);
    group.add([shadow, face]);
    if (!spriteBackground) {
      const paper = this.add.rectangle(5, 5, width - 10, height - 10, 0xeee9d9).setOrigin(0);
      const band = this.add.rectangle(5, 5, width - 10, compact ? 25 : 28, accent).setOrigin(0);
      group.add([paper, band]);
    }
    const body = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0)
      .setStrokeStyle(options.enabled ? 3 : 1, options.enabled ? 0xf5d47c : 0x827a61);
    group.add(body);
    const label = (left: number, top: number, value: string, size = 14, bold = false, color = spriteBackground ? '#ffffff' : '#262e29') => {
      const object = this.add.text(left, top, value, {
        ...TEXT_STYLE, fontFamily: FONT_FAMILY, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color,
        align: 'center', lineSpacing: 3,
      });
      if (spriteBackground) object.setShadow(0, 1, '#183026', 2, false, true);
      group.add(object);
      return object;
    };
    label(width / 2, 2, definition.name, compact ? 14 : 15, true).setOrigin(0.5, 0);
    if (!compact) {
      label(width / 2, 46, definition.summary, 13).setOrigin(0.5, 0);
    }
    const coinY = height - 16;
    const coinTexture = spriteBackground ? 'dominion-coin-light' : 'dominion-coin';
    if (this.textures.exists(coinTexture)) {
      group.add(this.add.image(14, coinY, coinTexture).setDisplaySize(15, 15));
    }
    label(31, coinY - 1, String(definition.cost), 14, true).setOrigin(0.5);
    label(width - 5, coinY - 1, compact ? definition.type === 'action' ? '使用中' : definition.summary : definition.kind.includes('リアクション') ? '反応' : definition.kind.includes('アタック') ? '攻撃' : definition.kind,
      13, false, spriteBackground ? '#ffffff' : '#525648').setOrigin(1, 0.5);
    if (options.count !== undefined) {
      const badge = this.add.rectangle(width - 7, -3, 26, 23, options.count === 0 ? 0x5d5d56 : 0x344e48).setStrokeStyle(1, 0xb9b59d);
      group.add(badge);
      label(width - 7, -4, String(options.count), 13, true, '#ffffff').setOrigin(0.5);
      if (options.count === 0) group.setAlpha(0.55);
    }
    const hit = this.add.zone(0, 0, width, height).setOrigin(0).setInteractive({ useHandCursor: true });
    group.add(hit);
    hit.on('pointerover', () => {
      body.setStrokeStyle(3, 0xf5d47c);
      this.inspect(id);
    });
    hit.on('pointerout', () => body.setStrokeStyle(options.enabled ? 3 : 1, options.enabled ? 0xf5d47c : 0x827a61));
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.inspect(id);
      if (!pointer.rightButtonDown() && options.enabled) options.action?.();
    });
  }

  private paint() {
    this.dirty = false;
    this.table.removeAll(true);
    const state = this.store.getSnapshot();
    const width = this.scale.width;
    const height = this.scale.height;
    const humanInput = state.phase !== 'ended' && inputPlayer(state) === 0;
    const player = state.players[0];
    const opponent = state.players[1];
    this.panel(0, 0, width, height, 0x173f35);
    this.panel(0, 0, width, 40, 0x102d27);
    this.panel(10, 44, 236, 308, 0x0b251f, 0.45).setStrokeStyle(1, 0x496054);
    this.text(20, 2, 'CPU', 18, '#f1deaa', true);
    this.text(92, 5, `手札 ${opponent.hand.length}枚  ／  山札 ${opponent.deck.length}枚  ／  捨て札 ${opponent.discard.length}枚`, 14);
    this.text(width - 20, 5, `ターン ${opponent.turns}`, 14, '#a9c1b4').setOrigin(1, 0);
    this.text(19, 45, '基本カード', 14, '#b9c8b7', true);
    this.text(266, 45, '王国カード', 14, '#b9c8b7', true);
    this.text(width - 18, 45, '最初のゲーム · 基本セット', 13, '#a2b8a7').setOrigin(1, 0);
    if (this.textures.exists('dominion-backs')) {
      for (let i = 0; i < Math.min(opponent.hand.length, 5); i++) {
        this.table.add(this.add.image(width - 220 + i * 16, 3, 'dominion-backs', 'cardBack_red3.png').setOrigin(0).setDisplaySize(24, 33));
      }
      for (let i = 0; i < Math.min(player.deck.length, 3); i++) {
        this.table.add(this.add.image(144 + i * 2, 282 - i * 2, 'dominion-backs', 'cardBack_blue3.png').setOrigin(0).setDisplaySize(35, 48));
      }
      this.text(184, 280, '山札', 13);
      this.text(190, 306, String(player.deck.length), 14, '#f1deaa', true);
    }

    const supplyAction = (id: CardId) => () => {
      this.store.dispatch(0, { type: this.store.getSnapshot().pending?.kind === 'gain' ? 'gain' : 'buy', card: id });
    };
    BASE.forEach((id, index) => {
      this.card(22 + (index % 2) * 112, 80 + Math.floor(index / 2) * 66, 100, 60, id, {
        compact: true, count: state.supply[id], enabled: humanInput && (canBuy(state, id) || canGain(state, id)), action: supplyAction(id),
      });
    });
    const cardWidth = Math.min(155, (width - 296 - 4 * 14) / 5);
    const kingdomWidth = cardWidth * 5 + 56;
    const kingdomLeft = 266 + Math.max(0, (width - 286 - kingdomWidth) / 2);
    KINGDOM.forEach((id, index) => {
      this.card(kingdomLeft + (index % 5) * (cardWidth + 14), 76 + Math.floor(index / 5) * 144, cardWidth, 132, id, {
        count: state.supply[id], enabled: humanInput && (canBuy(state, id) || canGain(state, id)), action: supplyAction(id),
      });
    });

    const played = state.players[state.active].played;
    this.text(20, 357, `${state.players[state.active].name}の場`, 14, '#b9c8b7', true);
    const counts = new Map<CardId, number>();
    played.forEach(card => counts.set(card.id, (counts.get(card.id) ?? 0) + 1));
    const groups = [...counts];
    const playedSlots = Math.max(1, Math.floor((width - 40) / 110));
    const playedPages = Math.max(1, Math.ceil(groups.length / playedSlots));
    this.playedPage = Math.min(this.playedPage, playedPages - 1);
    if (playedPages > 1) {
      this.pager(width - 205, 357, '←', this.playedPage > 0, () => { this.playedPage--; this.dirty = true; });
      this.text(width - 170, 357, `${this.playedPage + 1} / ${playedPages}`, 14);
      this.pager(width - 70, 357, '→', this.playedPage < playedPages - 1, () => { this.playedPage++; this.dirty = true; });
    }
    if (!played.length) this.text(width / 2, 420, '使用したカードがここに並びます', 14, '#90ad9e').setOrigin(0.5);
    groups.slice(this.playedPage * playedSlots, (this.playedPage + 1) * playedSlots).forEach(([id, count], index) => {
      this.card(22 + index * 110, 392, 98, 60, id, { compact: true, spriteBackground: true, count });
    });

    const handY = height - 142;
    this.panel(0, handY - 42, width, 184, 0x0d2d26, 0.7);
    this.text(18, handY - 38, 'あなたの手札', 16, '#f1deaa', true);
    this.text(167, handY - 35, `${player.hand.length}枚`, 14, '#b9c8b7');
    this.text(235, handY - 35, `山札 ${player.deck.length}枚  ／  捨て札 ${player.discard.length}枚  ／  廃棄 ${state.trash.length}枚`, 14, '#b9c8b7');
    const slots = Math.max(1, Math.floor((width - 42) / 130));
    const pages = Math.max(1, Math.ceil(player.hand.length / slots));
    this.handPage = Math.min(this.handPage, pages - 1);
    if (pages > 1) {
      this.pager(width - 225, handY - 37, '← 前', this.handPage > 0, () => { this.handPage--; this.dirty = true; });
      this.text(width - 152, handY - 37, `${this.handPage + 1} / ${pages}`, 14);
      this.pager(width - 80, handY - 37, '次 →', this.handPage < pages - 1, () => { this.handPage++; this.dirty = true; });
    }
    const hand = player.hand.slice(this.handPage * slots, (this.handPage + 1) * slots);
    const handLeft = Math.max(22, (width - hand.length * 130 + 10) / 2);
    hand.forEach((card: Card, index: number) => {
      this.card(handLeft + index * 130, handY, 120, 132, card.id, {
        spriteBackground: true,
        enabled: humanInput && (canPlay(state, card) || canChoose(state, card)),
        action: () => this.store.dispatch(0, { type: this.store.getSnapshot().pending ? 'choose' : 'play', uid: card.uid }),
      });
    });
  }
}
