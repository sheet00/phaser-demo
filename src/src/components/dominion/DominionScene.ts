import Phaser from 'phaser';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faCoins } from '@fortawesome/free-solid-svg-icons';
import { FONT_FAMILY, TEXT_STYLE } from '../old-testament-rpg/typography';
import { BASE, CARDS } from './cards';
import type { CardId } from './cards';
import { cardCost, canBuy, canChoose, canGain, canPlay, inputPlayer } from './engine';
import type { Card } from './engine';
import type { DominionStore } from './store';
import { actionSound, SOUND_FILES } from './audio';
import { cardAppearance } from './cardAppearance';
import type { CardInspection } from './cardAppearance';

export class DominionScene extends Phaser.Scene {
  private store: DominionStore;
  private inspect: (card: CardInspection | null) => void;
  private onReady: () => void;
  private table!: Phaser.GameObjects.Container;
  private dirty = true;
  private handPage = 0;
  private playedPage = 0;

  constructor(store: DominionStore, inspect: (card: CardInspection | null) => void, onReady: () => void) {
    super('DominionTable');
    this.store = store;
    this.inspect = inspect;
    this.onReady = onReady;
  }

  preload() {
    const assets = `${import.meta.env.BASE_URL}assets/`;
    // Canvas用の独立したSVG画像には、HTML内のSVGと異なり名前空間が必要。
    const coinSvg = icon(faCoins, {
      attributes: { xmlns: 'http://www.w3.org/2000/svg' },
      styles: { color: '#9a701b' },
    }).html.join('');
    // PhaserのXHRLoaderはdata URLをatobで復号するため、Base64で渡す。
    this.load.svg('dominion-coin', `data:image/svg+xml;base64,${btoa(coinSvg)}`, { width: 64, height: 64 });
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
    compact?: boolean; count?: number; enabled?: boolean; action?: () => void;
  } = {}) {
    const definition = CARDS[id];
    const compact = options.compact ?? false;
    const appearance = cardAppearance(definition);
    const { accent, background } = appearance;
    const group = this.add.container(x, y);
    this.table.add(group);
    const shadow = this.add.rectangle(3, 4, width, height, 0x000000, 0.25).setOrigin(0);
    const face = this.add.rectangle(0, 0, width, height, background).setOrigin(0);
    const band = this.add.rectangle(0, 0, width, compact ? 28 : 32, accent).setOrigin(0);
    group.add([shadow, face, band]);
    const body = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0)
      .setStrokeStyle(options.enabled ? 3 : 1, options.enabled ? 0xf5d47c : 0x827a61);
    group.add(body);
    const label = (left: number, top: number, value: string, size = 14, bold = false, color = '#262e29') => {
      const object = this.add.text(left, top, value, {
        ...TEXT_STYLE, fontFamily: FONT_FAMILY, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal', color,
        align: 'center', lineSpacing: 3,
      });
      group.add(object);
      return object;
    };
    label(width / 2, 2, definition.name, compact ? 14 : 15, true).setOrigin(0.5, 0);
    if (!compact) {
      label(width / 2, 46, definition.summary, 13).setOrigin(0.5, 0);
    }
    const coinY = height - 16;
    const coinTexture = 'dominion-coin';
    if (this.textures.exists(coinTexture)) {
      group.add(this.add.image(14, coinY, coinTexture).setDisplaySize(18, 18));
    }
    label(31, coinY - 1, String(cardCost(this.store.getSnapshot(), id)), 14, true).setOrigin(0.5);
    // 小型カードではコストと種別の重なりを避け、通常カードは効果と種別を分ける。
    const kindLabel = compact
      ? definition.type !== 'action' ? id === 'gardens' ? '勝利点' : definition.summary.replaceAll(' ', '')
        : appearance.label === 'アクション' ? '行動' : appearance.label
      : appearance.label;
    label(width - 3, coinY - 1, kindLabel,
      13, false, '#394238').setOrigin(1, 0.5);
    if (options.count !== undefined) {
      const badge = this.add.rectangle(width - 7, -3, 26, 23, options.count === 0 ? 0x5d5d56 : 0x344e48).setStrokeStyle(1, 0xb9b59d);
      group.add(badge);
      label(width - 7, -4, String(options.count), 13, true, '#ffffff').setOrigin(0.5);
      if (options.count === 0) group.setAlpha(0.55);
    }
    const hit = this.add.zone(0, 0, width, height).setOrigin(0).setInteractive({ useHandCursor: true });
    group.add(hit);
    const inspect = (pointer: Phaser.Input.Pointer) => {
      const bounds = this.game.canvas.getBoundingClientRect();
      this.inspect({ id, x: bounds.left + pointer.x, y: bounds.top + pointer.y });
    };
    hit.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      body.setStrokeStyle(3, 0xf5d47c);
      inspect(pointer);
    });
    hit.on('pointermove', inspect);
    hit.on('pointerout', () => {
      body.setStrokeStyle(options.enabled ? 3 : 1, options.enabled ? 0xf5d47c : 0x827a61);
      this.inspect(null);
    });
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      inspect(pointer);
      if (!pointer.rightButtonDown() && options.enabled) options.action?.();
    });
  }

  private paint() {
    this.dirty = false;
    this.inspect(null);
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
    this.text(92, 5, `手札 ${opponent.hand.length}枚  ／  山札 ${opponent.deck.length}枚  ／  捨て札 ${opponent.discard.length}枚  ／  島 ${opponent.islandMat.length}枚・村 ${opponent.nativeVillageMat.length}枚`, 14);
    this.text(width - 20, 5, `ターン ${opponent.turns}`, 14, '#a9c1b4').setOrigin(1, 0);
    this.text(19, 45, '基本カード', 14, '#b9c8b7', true);
    this.text(266, 45, '王国カード', 14, '#b9c8b7', true);
    const selectedSets = this.store.expansions.map(id => id === 'base' ? '基本' : id === 'intrigue' ? '陰謀' : '海辺').join('＋');
    this.text(width - 18, 45, `${this.store.mode === 'basic' ? 'おすすめ' : 'ランダム10種類'} · ${selectedSets}`, 13, '#a2b8a7').setOrigin(1, 0);
    for (let i = 0; i < Math.min(opponent.hand.length, 5); i++) {
      this.panel(width - 220 + i * 16, 3, 24, 33, 0x376b60).setStrokeStyle(1, 0xb9b59d);
    }
    for (let i = 0; i < Math.min(player.deck.length, 3); i++) {
      this.panel(144 + i * 2, 282 - i * 2, 35, 48, 0x376b60).setStrokeStyle(1, 0xb9b59d);
    }
    this.text(184, 280, '山札', 13);
    this.text(190, 306, String(player.deck.length), 14, '#f1deaa', true);

    const supplyAction = (id: CardId) => () => {
      const pending = this.store.getSnapshot().pending;
      const gaining = pending?.kind === 'gain' || (pending?.kind === 'expansion' && pending.zone === 'supply');
      this.store.dispatch(0, { type: gaining ? 'gain' : 'buy', card: id });
    };
    BASE.forEach((id, index) => {
      this.card(22 + (index % 2) * 112, 80 + Math.floor(index / 2) * 66, 100, 60, id, {
        compact: true, count: state.supply[id], enabled: humanInput && (canBuy(state, id) || canGain(state, id)), action: supplyAction(id),
      });
    });
    const cardWidth = Math.min(155, (width - 296 - 4 * 14) / 5);
    const kingdomWidth = cardWidth * 5 + 56;
    const kingdomLeft = 266 + Math.max(0, (width - 286 - kingdomWidth) / 2);
    state.kingdom.forEach((id, index) => {
      this.card(kingdomLeft + (index % 5) * (cardWidth + 14), 76 + Math.floor(index / 5) * 144, cardWidth, 132, id, {
        count: state.supply[id], enabled: humanInput && (canBuy(state, id) || canGain(state, id)), action: supplyAction(id),
      });
    });

    const played = state.players[state.active].played;
    this.text(20, 357, `${state.players[state.active].name}の場`, 14, '#b9c8b7', true);
    const activePlayer = state.players[state.active];
    const mats = [
      activePlayer.islandMat.length && `島：${activePlayer.islandMat.map(card => CARDS[card.id].name).join('・')}`,
      activePlayer.nativeVillageMat.length && `原住民の村：${activePlayer.nativeVillageMat.map(card => CARDS[card.id].name).join('・')}`,
      activePlayer.blockadeMat.length && `封鎖：${activePlayer.blockadeMat.map(entry => CARDS[entry.card.id].name).join('・')}`,
      activePlayer.havenMat.length && `避難所：${activePlayer.havenMat.map(entry => CARDS[entry.card.id].name).join('・')}`,
    ].filter(Boolean).join(' ／ ');
    if (mats) this.text(20, 375, mats, 11, '#f1deaa');
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
      this.card(22 + index * 110, 392, 98, 60, id, { compact: true, count });
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
        enabled: humanInput && (canPlay(state, card) || canChoose(state, card)),
        action: () => this.store.dispatch(0, { type: this.store.getSnapshot().pending ? 'choose' : 'play', uid: card.uid }),
      });
    });
  }
}
