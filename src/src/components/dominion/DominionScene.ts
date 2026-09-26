import Phaser from 'phaser';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faCoins } from '@fortawesome/free-solid-svg-icons';
import { FONT_FAMILY, TEXT_STYLE } from '../old-testament-rpg/typography';
import { BASE, CARDS, KINGDOM } from './cards';
import type { CardId } from './cards';
import { cardCost, canBuy, canChoose, canGain, canPlay } from './engine';
import type { Card } from './engine';
import type { DominionStore } from './store';
import { actionSound, SOUND_FILES } from './audio';
import { cardAppearance } from './cardAppearance';
import type { CardInspection } from './cardAppearance';

const BASE_ART = new Set<CardId>([...BASE, ...KINGDOM]);
const BASIC_DISPLAY: CardId[] = ['copper', 'silver', 'gold', 'estate', 'duchy', 'province', 'curse'];
const HAND_TYPE_ORDER = { action: 0, treasure: 1, victory: 2, curse: 3 } as const;

function compareHandCards(a: Card, b: Card) {
  const left = CARDS[a.id];
  const right = CARDS[b.id];
  return HAND_TYPE_ORDER[left.type] - HAND_TYPE_ORDER[right.type]
    || left.cost - right.cost
    || left.name.localeCompare(right.name, 'ja')
    || a.uid - b.uid;
}

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
    for (const id of BASE_ART) {
      this.load.image(`dominion-${id}-art`, `${assets}dominion/${id}.png`);
    }
    for (const [key, file] of Object.entries(SOUND_FILES)) {
      this.load.audio(`dominion-${key}`, `${assets}kenney_casino-audio/Audio/${file}`);
    }
  }

  create() {
    for (const id of BASE_ART) {
      this.textures.get(`dominion-${id}-art`).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.table = this.add.container(0, 0);
    this.input.mouse?.disableContextMenu();
    const unsubscribe = this.store.subscribe(() => { this.dirty = true; });
    const unsubscribeMeta = this.store.subscribeMeta(() => { this.dirty = true; });
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
      unsubscribeMeta();
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
    compact?: boolean; fullText?: boolean; count?: number; enabled?: boolean; action?: () => void;
  } = {}) {
    const definition = CARDS[id];
    const compact = options.compact ?? false;
    const artKey = BASE_ART.has(id) ? `dominion-${id}-art` : null;
    const appearance = cardAppearance(definition);
    const { accent, background } = appearance;
    const titleHeight = compact ? 24 : 28;
    const footerHeight = compact ? 20 : 24;
    const artTop = titleHeight + 3;
    const artHeight = Math.round((width - 8) * (options.fullText ? 0.48 : compact ? 0.61 : 0.66));
    const summaryTop = artTop + artHeight + 3;
    const group = this.add.container(x, y);
    this.table.add(group);
    const shadow = this.add.rectangle(3, 4, width, height, 0x000000, 0.25).setOrigin(0);
    const face = this.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0);
    const band = this.add.rectangle(0, 0, width, titleHeight, accent).setOrigin(0);
    group.add([shadow, face]);
    group.add(this.add.rectangle(4, artTop, width - 8, artHeight, background).setOrigin(0).setStrokeStyle(1, accent));
    if (artKey) {
      const art = this.add.image(width / 2, artTop, artKey).setOrigin(0.5, 0);
      art.setDisplaySize(Math.min(width - 8, artHeight * 1.5), artHeight);
      group.add(art);
    } else {
      const initial = this.add.text(width / 2, artTop + artHeight / 2, definition.name[0], {
        ...TEXT_STYLE, fontFamily: FONT_FAMILY, fontSize: `${Math.min(34, Math.round(artHeight * 0.55))}px`,
        fontStyle: 'bold', color: '#394238',
      }).setOrigin(0.5);
      group.add(initial);
    }
    group.add(this.add.rectangle(4, artTop, width - 8, artHeight, 0xffffff, 0).setOrigin(0).setStrokeStyle(1, accent));
    group.add([band, this.add.rectangle(0, height - footerHeight, width, footerHeight, accent).setOrigin(0)]);
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
    label(width / 2, titleHeight / 2, definition.name, compact ? 12 : 15, true).setOrigin(0.5);
    let summarySize = options.fullText ? 12 : compact ? 11 : 13;
    const summary = label(width / 2, summaryTop, options.fullText ? definition.description : definition.summary, summarySize).setOrigin(0.5, 0);
    summary.setWordWrapWidth(width - 16, true);
    const availableSummaryHeight = height - footerHeight - summaryTop - 2;
    while (summary.height > availableSummaryHeight && summarySize > 9) {
      summarySize -= 1;
      summary.setFontSize(summarySize);
    }
    const coinY = height - footerHeight / 2;
    const coinTexture = 'dominion-coin';
    if (this.textures.exists(coinTexture)) {
      group.add(this.add.image(13, coinY, coinTexture).setDisplaySize(compact ? 14 : 17, compact ? 14 : 17));
    }
    label(29, coinY - 1, String(cardCost(this.store.getSnapshot(), id)), compact ? 11 : 13, true).setOrigin(0.5);
    label(width - 4, coinY - 1, compact && appearance.label === 'アクション' ? '行動' : appearance.label,
      compact ? 10 : 12, false, '#394238').setOrigin(1, 0.5);
    if (options.count !== undefined) {
      const badge = this.add.rectangle(width - 14, artTop + 11, 23, 20, options.count === 0 ? 0x5d5d56 : 0x344e48).setStrokeStyle(1, 0xb9b59d);
      group.add(badge);
      label(width - 14, artTop + 10, String(options.count), 11, true, '#ffffff').setOrigin(0.5);
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
      if (!options.fullText) inspect(pointer);
    });
    if (!options.fullText) hit.on('pointermove', inspect);
    hit.on('pointerout', () => {
      body.setStrokeStyle(options.enabled ? 3 : 1, options.enabled ? 0xf5d47c : 0x827a61);
      this.inspect(null);
    });
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!options.fullText) inspect(pointer);
      if (!pointer.rightButtonDown() && options.enabled) options.action?.();
    });
  }

  private paint() {
    this.dirty = false;
    this.inspect(null);
    this.table.removeAll(true);
    const state = this.store.getSnapshot();
    const seat = this.store.playerId;
    const width = this.scale.width;
    const height = this.scale.height;
    const meta = this.store.getMeta();
    const humanInput = state.phase !== 'ended' && this.store.getInputPlayer() === seat
      && meta.connection === 'connected' && meta.opponentConnected && !meta.busy;
    const player = state.players[seat];
    this.panel(0, 0, width, height, 0x173f35);
    const marketCardWidth = 160;
    const marketCardHeight = 254;
    const basicLeft = 16;
    const basicPanelRight = 285;
    const kingdomWidth = marketCardWidth * 5 + 40;
    const kingdomLeft = basicPanelRight + (width - basicPanelRight - kingdomWidth) / 2;
    this.panel(10, 8, 275, 460, 0x0b251f, 0.45).setStrokeStyle(1, 0x496054);
    this.text(basicLeft, 8, '基本カード', 14, '#b9c8b7', true);
    this.text(kingdomLeft, 8, 'サプライ', 14, '#b9c8b7', true);
    const selectedSets = this.store.expansions.map(id => id === 'base' ? '基本' : id === 'intrigue' ? '陰謀' : '海辺').join('＋');
    this.text(width - 18, 8, `${this.store.mode === 'basic' ? 'おすすめ' : 'ランダム10種類'} · ${selectedSets}`, 13, '#a2b8a7').setOrigin(1, 0);
    const supplyAction = (id: CardId) => () => {
      const pending = this.store.getSnapshot().pending;
      const gaining = pending?.kind === 'gain' || (pending?.kind === 'expansion' && pending.zone === 'supply');
      this.store.dispatch(seat, { type: gaining ? 'gain' : 'buy', card: id });
    };
    BASIC_DISPLAY.forEach((id, index) => {
      const column = id === 'curse' ? 1 : index % 3;
      this.card(basicLeft + column * 89, 38 + Math.floor(index / 3) * 139, 84, 134, id, {
        compact: true, count: state.supply[id], enabled: humanInput && (canBuy(state, id) || canGain(state, id)), action: supplyAction(id),
      });
    });
    state.kingdom.forEach((id, index) => {
      this.card(kingdomLeft + (index % 5) * (marketCardWidth + 10), 38 + Math.floor(index / 5) * (marketCardHeight + 10), marketCardWidth, marketCardHeight, id, {
        fullText: true, count: state.supply[id], enabled: humanInput && (canBuy(state, id) || canGain(state, id)), action: supplyAction(id),
      });
    });

    const played = state.players[state.active].played;
    const playedTop = 590;
    this.text(20, playedTop, `${state.players[state.active].name}の場`, 14, '#b9c8b7', true);
    const activePlayer = state.players[state.active];
    const mats = [
      activePlayer.islandMat.length && `島：${activePlayer.islandMat.map(card => CARDS[card.id].name).join('・')}`,
      activePlayer.nativeVillageMat.length && `原住民の村：${activePlayer.nativeVillageMat.map(card => CARDS[card.id].name).join('・')}`,
      activePlayer.blockadeMat.length && `封鎖：${activePlayer.blockadeMat.map(entry => CARDS[entry.card.id].name).join('・')}`,
      activePlayer.havenMat.length && `避難所：${activePlayer.havenMat.map(entry => CARDS[entry.card.id].name).join('・')}`,
    ].filter(Boolean).join(' ／ ');
    if (mats) this.text(20, playedTop + 18, mats, 11, '#f1deaa');
    if (state.active === seat) {
      const resourceLeft = width - 330;
      this.panel(resourceLeft, playedTop + 38, 318, 130, 0x102d27, 0.95).setStrokeStyle(1, 0x657267);
      this.panel(resourceLeft + 106, playedTop + 54, 1, 98, 0x496054);
      this.panel(resourceLeft + 212, playedTop + 54, 1, 98, 0x496054);
      ([['アクション回数', state.actions], ['購入回数', state.buys], ['コイン合計', state.coins]] as const).forEach(([label, value], index) => {
        const center = resourceLeft + 53 + index * 106;
        this.text(center, playedTop + 50, label, 14, '#c1d0c2', true).setOrigin(0.5, 0);
        this.text(center, playedTop + 83, String(value), 36, '#f1deaa', true).setOrigin(0.5, 0);
      });
    }
    const counts = new Map<CardId, number>();
    played.forEach(card => counts.set(card.id, (counts.get(card.id) ?? 0) + 1));
    const groups = [...counts];
    const playedAreaWidth = state.active === seat ? width - 350 : width;
    const playedSlots = Math.max(1, Math.floor((playedAreaWidth - 40) / 94));
    const playedPages = Math.max(1, Math.ceil(groups.length / playedSlots));
    this.playedPage = Math.min(this.playedPage, playedPages - 1);
    if (playedPages > 1) {
      this.pager(playedAreaWidth - 205, playedTop, '←', this.playedPage > 0, () => { this.playedPage--; this.dirty = true; });
      this.text(playedAreaWidth - 170, playedTop, `${this.playedPage + 1} / ${playedPages}`, 14);
      this.pager(playedAreaWidth - 70, playedTop, '→', this.playedPage < playedPages - 1, () => { this.playedPage++; this.dirty = true; });
    }
    if (!played.length) this.text(playedAreaWidth / 2, playedTop + 110, '使用したカードがここに並びます', 14, '#90ad9e').setOrigin(0.5);
    groups.slice(this.playedPage * playedSlots, (this.playedPage + 1) * playedSlots).forEach(([id, count], index) => {
      this.card(22 + index * 94, playedTop + 44, 84, 134, id, { compact: true, count });
    });

    const handY = height - 228;
    this.panel(0, handY - 32, width, 260, 0x0d2d26, 0.7);
    this.text(12, handY - 29, '手札', 14, '#f1deaa', true);
    this.text(66, handY - 29, `${player.hand.length}枚 ／ 山札 ${player.deck.length} ／ 捨て札 ${player.discard.length} ／ 廃棄 ${state.trash.length}`, 12, '#b9c8b7');
    const handAreaWidth = width - 166;
    const slots = Math.max(1, Math.floor((handAreaWidth - 24) / 146));
    const pages = Math.max(1, Math.ceil(player.hand.length / slots));
    this.handPage = Math.min(this.handPage, pages - 1);
    if (pages > 1) {
      this.pager(width - 225, handY - 29, '← 前', this.handPage > 0, () => { this.handPage--; this.dirty = true; });
      this.text(width - 152, handY - 29, `${this.handPage + 1} / ${pages}`, 14);
      this.pager(width - 80, handY - 29, '次 →', this.handPage < pages - 1, () => { this.handPage++; this.dirty = true; });
    }
    const hand = [...player.hand].sort(compareHandCards).slice(this.handPage * slots, (this.handPage + 1) * slots);
    const handLeft = Math.max(12, (handAreaWidth - hand.length * 146 + 10) / 2);
    hand.forEach((card: Card, index: number) => {
      this.card(handLeft + index * 146, handY, 136, 216, card.id, {
        enabled: humanInput && (canPlay(state, card) || canChoose(state, card)),
        action: () => this.store.dispatch(seat, { type: this.store.getSnapshot().pending ? 'choose' : 'play', uid: card.uid }),
      });
    });
  }
}
