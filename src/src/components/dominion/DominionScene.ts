import Phaser from "phaser";
import { icon } from "@fortawesome/fontawesome-svg-core";
import { faCoins } from "@fortawesome/free-solid-svg-icons";
import { FONT_FAMILY, TEXT_STYLE } from "./typography";
import { BASE, CARDS, KINGDOM } from "./cards";
import type { CardId } from "./cards";
import { cardCost, canBuy, canChoose, canGain, canPlay } from "./engine";
import type { Card } from "./engine";
import type { DominionStore } from "./store";
import { actionSound, SOUND_FILES } from "./audio";
import { cardAppearance } from "./cardAppearance";
import type { CardInspection } from "./cardAppearance";

export const SUPPLY_CARD_SCALE = 1.0;
export const SUPPLY_CARD_FONT_SCALE = 1.0;

const SEASIDE_ART: CardId[] = [
  "fishingVillage",
  "lighthouse",
  "pirate",
  "wharf",
  "astrolabe",
  "bazaar",
  "blockade",
  "caravan",
  "corsair",
  "cutpurse",
  "haven",
  "island",
  "lookout",
];
const BASE_ART = new Set<CardId>([...BASE, ...KINGDOM, ...SEASIDE_ART]);
const ART_FILES: Partial<Record<CardId, string>> = {
  curse: "curse-v5",
  merchant: "merchant-v2",
  militia: "militia-v2",
};
const BASIC_DISPLAY: CardId[] = [
  "copper",
  "silver",
  "gold",
  "estate",
  "duchy",
  "province",
  "curse",
];
const HAND_TYPE_ORDER = {
  action: 0,
  treasure: 1,
  victory: 2,
  curse: 3,
} as const;
const BASIC_CARD_WIDTH = 68;
const BASIC_CARD_HEIGHT = 114;
const SUPPLY_CARD_WIDTH = 126;
const SUPPLY_CARD_HEIGHT = 228;
const BASIC_PANEL_WIDTH = 226;
const BASIC_PANEL_LEFT = 8;
export type UiScale = "small" | "medium" | "large";

export const UI_SCALE_CONFIG: Record<
  UiScale,
  {
    multiplier: number;
    minWidth: number;
    minHeight: number;
    label: string;
  }
> = {
  small: { multiplier: 0.85, minWidth: 720, minHeight: 620, label: "小" },
  medium: { multiplier: 1.0, minWidth: 800, minHeight: 700, label: "中" },
  large: { multiplier: 1.25, minWidth: 960, minHeight: 780, label: "大" },
};

export const DOMINION_CANVAS_MIN_WIDTH = UI_SCALE_CONFIG.large.minWidth;
export const DOMINION_CANVAS_MIN_HEIGHT = UI_SCALE_CONFIG.large.minHeight;
const MAX_CARD_TEXT_LENGTH = 50;

function compareHandCards(a: Card, b: Card) {
  const left = CARDS[a.id];
  const right = CARDS[b.id];
  return (
    HAND_TYPE_ORDER[left.type] - HAND_TYPE_ORDER[right.type] ||
    left.cost - right.cost ||
    left.name.localeCompare(right.name, "ja") ||
    a.uid - b.uid
  );
}

export class DominionScene extends Phaser.Scene {
  private store: DominionStore;
  private inspect: (card: CardInspection | null) => void;
  private onReady: () => void;
  private table!: Phaser.GameObjects.Container;
  private dirty = true;
  private handPage = 0;
  private playedPage = 0;
  private uiScale: UiScale = "large";

  constructor(
    store: DominionStore,
    inspect: (card: CardInspection | null) => void,
    onReady: () => void,
    initialUiScale: UiScale = "large",
  ) {
    super("DominionTable");
    this.store = store;
    this.inspect = inspect;
    this.onReady = onReady;
    this.uiScale = initialUiScale;
  }

  setUiScale(scale: UiScale) {
    if (this.uiScale === scale) return;
    this.uiScale = scale;
    this.dirty = true;
  }

  preload() {
    const assets = `${import.meta.env.BASE_URL}assets/`;
    // Canvas用の独立したSVG画像には、HTML内のSVGと異なり名前空間が必要。
    const coinSvg = icon(faCoins, {
      attributes: { xmlns: "http://www.w3.org/2000/svg" },
      styles: { color: "#9a701b" },
    }).html.join("");
    // PhaserのXHRLoaderはdata URLをatobで復号するため、Base64で渡す。
    this.load.svg(
      "dominion-coin",
      `data:image/svg+xml;base64,${btoa(coinSvg)}`,
      { width: 64, height: 64 },
    );
    for (const id of BASE_ART) {
      const file = ART_FILES[id] ?? id;
      this.load.image(`dominion-${id}-art`, `${assets}dominion/${file}.png`);
    }
    for (const [key, file] of Object.entries(SOUND_FILES)) {
      this.load.audio(`dominion-${key}`, `${assets}${file}`);
    }
  }

  create() {
    for (const id of BASE_ART) {
      this.textures
        .get(`dominion-${id}-art`)
        .setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.table = this.add.container(0, 0);
    this.input.mouse?.disableContextMenu();
    const unsubscribe = this.store.subscribe(() => {
      this.dirty = true;
    });
    const unsubscribeMeta = this.store.subscribeMeta(() => {
      this.dirty = true;
    });
    const updateSound = () => {
      this.sound.mute = this.store.getMuted();
    };
    updateSound();
    const unsubscribeSound = this.store.subscribeSound(updateSound);
    const unsubscribeActions = this.store.subscribeActions(
      (command, previous) => {
        // ロック中のCPU操作を予約すると、最初のタップで過去の音がまとめて鳴ってしまう。
        if (this.sound.locked || this.sound.mute || document.hidden) return;
        const current = this.store.getSnapshot();
        const seat = this.store.playerId;
        let effect = actionSound(command, previous);
        if (previous.active !== seat && current.active === seat && current.phase !== "ended") {
          effect = "myTurn";
        }
        if (!effect || !this.cache.audio.exists(`dominion-${effect}`)) return;
        try {
          this.sound.stopAll();
          this.sound.play(`dominion-${effect}`, { volume: 0.45 });
        } catch {
          // 音声の再生に失敗しても、カード操作と対戦は継続する。
        }
      },
    );
    const resize = () => {
      this.dirty = true;
    };
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

  private text(
    x: number,
    y: number,
    value: string,
    size = 14,
    color = "#e4e7dd",
    bold = false,
  ) {
    const text = this.add.text(x, y, value, {
      ...TEXT_STYLE,
      fontFamily: FONT_FAMILY,
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? "bold" : "normal",
    });
    this.table.add(text);
    return text;
  }

  private panel(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha = 1,
  ) {
    const panel = this.add
      .rectangle(x, y, width, height, color, alpha)
      .setOrigin(0);
    this.table.add(panel);
    return panel;
  }

  private pager(
    x: number,
    y: number,
    label: string,
    enabled: boolean,
    action: () => void,
  ) {
    const text = this.text(
      x,
      y,
      label,
      14,
      enabled ? "#f0d493" : "#59736b",
      true,
    );
    if (enabled)
      text.setInteractive({ useHandCursor: true }).on("pointerdown", action);
  }

  private card(
    x: number,
    y: number,
    width: number,
    height: number,
    id: CardId,
    options: {
      compact?: boolean;
      fullText?: boolean;
      fontScale?: number;
      scale?: number;
      textFitSize?: Readonly<{ width: number; height: number }>;
      count?: number;
      enabled?: boolean;
      action?: () => void;
    } = {},
  ) {
    const definition = CARDS[id];
    const compact = options.compact ?? false;
    const scale = options.scale ?? options.fontScale ?? 1;
    const fontScale = options.fontScale ?? 1;
    const artKey = BASE_ART.has(id) ? `dominion-${id}-art` : null;
    const appearance = cardAppearance(definition);
    const { accent, background } = appearance;
    const titleHeight = Math.round((compact ? 24 : 30) * scale);
    const footerHeight = Math.round((compact ? 20 : 26) * scale);
    const artTop = titleHeight + Math.max(1, Math.round(2 * scale));
    const artMargin = compact ? 2 : 4;
    const artWidth = width - artMargin * 2;
    // イラスト元画像（384x256）と完全一致のアスペクト比 3:2（1.5:1）で算出
    const artHeight = Math.round(artWidth * (2 / 3));
    const summaryTop = artTop + artHeight + Math.max(1, Math.round(2 * scale));
    const group = this.add.container(x, y);
    this.table.add(group);
    const shadow = this.add
      .rectangle(2, 3, width, height, 0x000000, 0.25)
      .setOrigin(0);
    const face = this.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0);
    const band = this.add
      .rectangle(0, 0, width, titleHeight, accent)
      .setOrigin(0);
    group.add([shadow, face]);
    group.add(
      this.add
        .rectangle(artMargin, artTop, artWidth, artHeight, background)
        .setOrigin(0)
        .setStrokeStyle(1, accent),
    );
    if (artKey) {
      const art = this.add.image(width / 2, artTop, artKey).setOrigin(0.5, 0);
      art.setDisplaySize(artWidth, artHeight);
      group.add(art);
    } else {
      const initial = this.add
        .text(width / 2, artTop + artHeight / 2, definition.name[0], {
          ...TEXT_STYLE,
          fontFamily: FONT_FAMILY,
          fontSize: `${Math.round(Math.min(32, Math.round(artHeight * 0.55)) * fontScale)}px`,
          fontStyle: "bold",
          color: "#394238",
        })
        .setOrigin(0.5);
      group.add(initial);
    }
    group.add(
      this.add
        .rectangle(artMargin, artTop, artWidth, artHeight, 0xffffff, 0)
        .setOrigin(0)
        .setStrokeStyle(1, accent),
    );
    group.add([
      band,
      this.add
        .rectangle(0, height - footerHeight, width, footerHeight, accent)
        .setOrigin(0),
    ]);
    const body = this.add
      .rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0)
      .setStrokeStyle(
        options.enabled ? 3 : 1,
        options.enabled ? 0xf5d47c : 0x827a61,
      );
    group.add(body);
    const label = (
      left: number,
      top: number,
      value: string,
      size = 14,
      bold = false,
      color = "#262e29",
    ) => {
      const object = this.add.text(left, top, value, {
        ...TEXT_STYLE,
        fontFamily: FONT_FAMILY,
        fontSize: `${size}px`,
        fontStyle: bold ? "bold" : "normal",
        color,
        align: "center",
        lineSpacing: Math.max(1, Math.round(2 * scale)),
      });
      group.add(object);
      return object;
    };
    label(
      compact ? 5 : 7,
      titleHeight / 2,
      definition.name,
      Math.round((compact ? 12 : 15) * scale),
      true,
    ).setOrigin(0, 0.5);
    let summarySize = Math.round((options.fullText ? 11 : compact ? 9 : 12) * scale);
    const rawText = options.fullText ? definition.description : definition.summary;
    const cardText =
      options.fullText && rawText.length > MAX_CARD_TEXT_LENGTH
        ? `${rawText.slice(0, MAX_CARD_TEXT_LENGTH)}…`
        : rawText;
    const compactTextY = Math.round(
      (artTop + artHeight + (height - footerHeight)) / 2,
    );
    const summary = label(
      width / 2,
      compact ? compactTextY : summaryTop,
      cardText,
      summarySize,
    ).setOrigin(0.5, compact ? 0.5 : 0);
    summary.setFontSize(summarySize);
    const fitWidth = options.textFitSize?.width ?? width;
    const fitHeight = options.textFitSize?.height ?? height;
    const fitArtMargin = compact ? 2 : 4;
    const fitArtHeight = Math.round((fitWidth - fitArtMargin * 2) * (2 / 3));
    summary.setWordWrapWidth(fitWidth - 12, true);
    const availableSummaryHeight =
      fitHeight - footerHeight - artTop - fitArtHeight - 4;
    const minSummarySize = Math.max(9, Math.round(9 * scale));
    while (summary.height > availableSummaryHeight && summarySize > minSummarySize) {
      summarySize -= 1;
      summary.setFontSize(summarySize);
    }
    summary.setWordWrapWidth(width - 12, true);
    summary.setFontSize(summarySize);
    const actualSummaryHeight = height - footerHeight - summaryTop - 2;
    while (summary.height > actualSummaryHeight && summarySize > minSummarySize) {
      summarySize -= 1;
      summary.setFontSize(summarySize);
    }
    const coinY = height - footerHeight / 2;
    const coinTexture = "dominion-coin";
    const potionCost = definition.potions ?? 0;
    const baseCoins = cardCost(this.store.getSnapshot(), id);
    const coinSize = Math.round((compact ? 14 : 17) * scale);
    if (this.textures.exists(coinTexture)) {
      group.add(
        this.add
          .image(Math.round((compact ? 11 : 14) * scale), coinY, coinTexture)
          .setDisplaySize(coinSize, coinSize),
      );
    }
    const costText =
      potionCost > 0
        ? baseCoins > 0
          ? `${baseCoins}+⚗`
          : "⚗"
        : String(baseCoins);
    label(
      potionCost > 0 ? Math.round((compact ? 30 : 36) * scale) : Math.round((compact ? 26 : 30) * scale),
      coinY - 1,
      costText,
      Math.round((compact ? (potionCost > 0 ? 10 : 12) : potionCost > 0 ? 12 : 14) * scale),
      true,
    ).setOrigin(0.5);
    label(
      width - 4,
      coinY - 1,
      compact && appearance.label === "アクション" ? "行動" : appearance.label,
      Math.round((compact ? 10 : 12) * scale),
      false,
      "#394238",
    ).setOrigin(1, 0.5);
    if (options.count !== undefined) {
      const badgeX = width - Math.round((compact ? 12 : 15) * scale);
      const badgeY = titleHeight / 2;
      const badge = this.add
        .rectangle(
          badgeX,
          badgeY,
          Math.round((compact ? 20 : 24) * scale),
          Math.round((compact ? 18 : 21) * scale),
          options.count === 0 ? 0x5d5d56 : 0x344e48,
        )
        .setStrokeStyle(1, 0xb9b59d);
      group.add(badge);
      label(
        badgeX,
        badgeY,
        String(options.count),
        Math.round((compact ? 11 : 12) * scale),
        true,
        "#ffffff",
      ).setOrigin(0.5);
      if (options.count === 0) group.setAlpha(0.55);
    }
    const hit = this.add
      .zone(0, 0, width, height)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    group.add(hit);
    const inspect = (pointer: Phaser.Input.Pointer) => {
      const bounds = this.game.canvas.getBoundingClientRect();
      this.inspect({
        id,
        x: bounds.left + pointer.x,
        y: bounds.top + pointer.y,
      });
    };
    hit.on("pointerover", (pointer: Phaser.Input.Pointer) => {
      body.setStrokeStyle(3, 0xf5d47c);
      inspect(pointer);
    });
    hit.on("pointermove", inspect);
    hit.on("pointerout", () => {
      body.setStrokeStyle(
        options.enabled ? 3 : 1,
        options.enabled ? 0xf5d47c : 0x827a61,
      );
      this.inspect(null);
    });
    hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      inspect(pointer);
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
    const humanInput =
      state.phase !== "ended" &&
      this.store.getInputPlayer() === seat &&
      meta.connection === "connected" &&
      meta.opponentConnected &&
      !meta.busy;
    const player = state.players[seat];
    this.panel(0, 0, width, height, 0x173f35);

    // ユーザー選択スケール（小・中・大）に応じた基準倍率を適用し、縦横比に合わせて最適化
    const config = UI_SCALE_CONFIG[this.uiScale];
    const scaleW = width / 950;
    const scaleH = (height - 24) / 700;
    const baseScale = Phaser.Math.Clamp(Math.min(scaleW, scaleH), 0.95, 1.45);
    const scale = baseScale * config.multiplier;

    const basicPanelLeft = BASIC_PANEL_LEFT;
    const basicCardWidth = Math.round(BASIC_CARD_WIDTH * scale);
    const basicCardHeight = Math.round(BASIC_CARD_HEIGHT * scale);
    const basicCardStep = basicCardWidth + Math.max(4, Math.round(6 * scale));
    const basicPanelWidth = Math.max(Math.round(BASIC_PANEL_WIDTH * scale), basicCardStep * 3 + 14);
    const basicPanelRight = basicPanelLeft + basicPanelWidth;
    const basicLeft = basicPanelLeft + Math.round(8 * scale);
    const basicCardLeft = basicPanelLeft + Math.round(7 * scale);

    const supplyTop = Math.round(36 * scale);
    const supplyCardWidth = Math.round(SUPPLY_CARD_WIDTH * scale);
    const supplyCardHeight = Math.round(SUPPLY_CARD_HEIGHT * scale);
    const supplyGap = Math.max(6, Math.round(8 * scale));
    const supplyRowGap = Math.max(10, Math.round(20 * scale));
    const supplyBottomPad = Math.max(8, Math.round(14 * scale));
    const supplyGridWidth = supplyCardWidth * 5 + supplyGap * 4;
    const supplyLeft =
      basicPanelRight +
      Math.max(12, Math.floor((width - basicPanelRight - supplyGridWidth) / 2));

    // サプライエリアUIの最下端（テキストが余裕を持って収まる縦幅）
    const supplyBottom = supplyTop + supplyCardHeight * 2 + supplyRowGap + supplyBottomPad;
    const basicPanelHeight = supplyBottom - 6;
    const basicAvailableHeight = basicPanelHeight - supplyTop - Math.round(8 * scale);
    const basicRowStep = Math.max(
      basicCardHeight + Math.max(4, Math.round(6 * scale)),
      Math.floor((basicAvailableHeight - basicCardHeight) / 2),
    );

    this.panel(
      basicPanelLeft,
      6,
      basicPanelWidth,
      basicPanelHeight,
      0x0b251f,
      0.45,
    ).setStrokeStyle(1, 0x496054);
    this.text(basicLeft, 8, "基本カード", Math.round(14 * scale), "#b9c8b7", true);
    this.text(supplyLeft, 8, "サプライ", Math.round(14 * scale), "#b9c8b7", true);
    const selectedSets = this.store.expansions
      .map((id) =>
        id === "base"
          ? "基本"
          : id === "intrigue"
            ? "陰謀"
            : id === "seaside"
              ? "海辺"
              : "錬金術",
      )
      .join("＋");
    this.text(
      width - 14,
      8,
      `${this.store.mode === "basic" ? "おすすめ" : "ランダム10種類"} · ${selectedSets}`,
      Math.round(13 * scale),
      "#a2b8a7",
    ).setOrigin(1, 0);

    const supplyAction = (id: CardId) => () => {
      const pending = this.store.getSnapshot().pending;
      const gaining =
        pending?.kind === "gain" ||
        (pending?.kind === "expansion" && pending.zone === "supply");
      this.store.dispatch(seat, { type: gaining ? "gain" : "buy", card: id });
    };

    const basicCards: CardId[] =
      state.supply.potion !== undefined
        ? [
            "copper",
            "silver",
            "gold",
            "estate",
            "duchy",
            "province",
            "potion",
            "curse",
          ]
        : BASIC_DISPLAY;

    basicCards.forEach((id, index) => {
      const isThirdRow = Math.floor(index / 3) === 2;
      const column =
        isThirdRow && basicCards.length === 7 ? 1 : index % 3;
      this.card(
        basicCardLeft + column * basicCardStep,
        supplyTop + Math.floor(index / 3) * basicRowStep,
        basicCardWidth,
        basicCardHeight,
        id,
        {
          compact: true,
          scale,
          count: state.supply[id],
          enabled: humanInput && (canBuy(state, id) || canGain(state, id)),
          action: supplyAction(id),
        },
      );
    });

    state.kingdom.forEach((id, index) => {
      this.card(
        supplyLeft + (index % 5) * (supplyCardWidth + supplyGap),
        supplyTop + Math.floor(index / 5) * (supplyCardHeight + supplyRowGap),
        supplyCardWidth,
        supplyCardHeight,
        id,
        {
          fullText: true,
          scale,
          fontScale: scale,
          count: state.supply[id],
          enabled: humanInput && (canBuy(state, id) || canGain(state, id)),
          action: supplyAction(id),
        },
      );
    });

    const played = state.players[state.active].played;
    const sectionGap = Math.max(10, Math.round(14 * scale));
    const bottomAreaTop = supplyBottom + sectionGap;
    const playedTop = bottomAreaTop;
    const playedHeight = Math.min(Math.round(220 * scale), Math.max(160, height - playedTop - 12));
    this.panel(
      basicPanelLeft,
      playedTop,
      basicPanelWidth,
      playedHeight,
      0x0b251f,
      0.45,
    ).setStrokeStyle(1, 0x496054);
    this.text(
      basicLeft,
      playedTop + 6,
      `${state.players[state.active].name}の場`,
      Math.round(13 * scale),
      "#b9c8b7",
      true,
    );

    const activePlayer = state.players[state.active];
    const mats = [
      activePlayer.islandMat.length &&
        `島：${activePlayer.islandMat.map((card) => CARDS[card.id].name).join("・")}`,
      activePlayer.nativeVillageMat.length &&
        `村：${activePlayer.nativeVillageMat.map((card) => CARDS[card.id].name).join("・")}`,
      activePlayer.blockadeMat.length &&
        `封鎖：${activePlayer.blockadeMat.map((entry) => CARDS[entry.card.id].name).join("・")}`,
      activePlayer.havenMat.length &&
        `避難所：${activePlayer.havenMat.map((entry) => CARDS[entry.card.id].name).join("・")}`,
    ]
      .filter(Boolean)
      .join(" ／ ");
    let matBottom = playedTop + Math.round(24 * scale);
    if (mats) {
      const matText = this.text(basicLeft, playedTop + Math.round(22 * scale), mats, Math.round(10 * scale), "#f1deaa");
      matText.setWordWrapWidth(basicPanelWidth - 16, true);
      matBottom = playedTop + Math.round(22 * scale) + matText.height + 4;
    }

    let resourceBottom = matBottom;
    if (state.active === seat) {
      const resourceTop = matBottom;
      const resourceWidth = basicPanelWidth - 12;
      const resourceLeft = basicPanelLeft + 6;
      const resourceHeight = Math.round(42 * scale);
      const hasPotionInGame = state.supply.potion !== undefined;
      const resources = hasPotionInGame
        ? ([
            ["アクション", state.actions],
            ["購入", state.buys],
            ["コイン", state.coins],
            ["ポーション", state.potions],
          ] as const)
        : ([
            ["アクション", state.actions],
            ["購入", state.buys],
            ["コイン", state.coins],
          ] as const);
      const slotCount = resources.length;
      const slotWidth = Math.floor(resourceWidth / slotCount);
      this.panel(
        resourceLeft,
        resourceTop,
        resourceWidth,
        resourceHeight,
        0x102d27,
        0.95,
      ).setStrokeStyle(1, 0x657267);
      for (let i = 1; i < slotCount; i++) {
        this.panel(
          resourceLeft + slotWidth * i,
          resourceTop + 3,
          1,
          resourceHeight - 6,
          0x496054,
        );
      }
      resources.forEach(([label, value], index) => {
        const center =
          resourceLeft + Math.floor(slotWidth / 2) + index * slotWidth;
        this.text(
          center,
          resourceTop + 3,
          label,
          Math.round((hasPotionInGame ? 9 : 10) * scale),
          "#c1d0c2",
          true,
        ).setOrigin(0.5, 0);
        this.text(
          center,
          resourceTop + Math.round(16 * scale),
          String(value),
          Math.round((hasPotionInGame ? 18 : 20) * scale),
          "#f1deaa",
          true,
        ).setOrigin(0.5, 0);
      });
      resourceBottom = resourceTop + resourceHeight + 4;
    }

    const counts = new Map<CardId, number>();
    played.forEach((card) =>
      counts.set(card.id, (counts.get(card.id) ?? 0) + 1),
    );
    const groups = [...counts];
    const playedCardsTop = resourceBottom + 4;
    const availableHeight = playedTop + playedHeight - playedCardsTop;
    const playedRowStep = basicCardHeight + Math.max(3, Math.round(4 * scale));
    const rows = Math.max(1, Math.min(2, Math.floor(availableHeight / playedRowStep)));
    const playedSlots = rows * 3;
    const playedPages = Math.max(1, Math.ceil(groups.length / playedSlots));
    this.playedPage = Math.min(this.playedPage, playedPages - 1);
    if (playedPages > 1) {
      this.pager(
        basicPanelRight - Math.round(75 * scale),
        playedTop + 6,
        "←",
        this.playedPage > 0,
        () => {
          this.playedPage--;
          this.dirty = true;
        },
      );
      this.text(
        basicPanelRight - Math.round(50 * scale),
        playedTop + 6,
        `${this.playedPage + 1}/${playedPages}`,
        Math.round(11 * scale),
      );
      this.pager(
        basicPanelRight - Math.round(20 * scale),
        playedTop + 6,
        "→",
        this.playedPage < playedPages - 1,
        () => {
          this.playedPage++;
          this.dirty = true;
        },
      );
    }
    if (!played.length) {
      this.text(
        basicPanelLeft + basicPanelWidth / 2,
        playedCardsTop + Math.round(24 * scale),
        "使用したカードが\nここに並びます",
        Math.round(12 * scale),
        "#90ad9e",
      ).setOrigin(0.5);
    }
    groups
      .slice(this.playedPage * playedSlots, (this.playedPage + 1) * playedSlots)
      .forEach(([id, count], index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        this.card(
          basicCardLeft + col * basicCardStep,
          playedCardsTop + row * playedRowStep,
          basicCardWidth,
          basicCardHeight,
          id,
          {
            compact: true,
            scale,
            count,
          },
        );
      });

    const handTop = playedTop;
    const handLeft = basicPanelRight + 10;
    const handWidth = width - handLeft - 8;
    const handCardWidth = basicCardWidth;
    const handCardHeight = basicCardHeight;
    const slotCardWidth = handCardWidth + Math.max(4, Math.round(6 * scale));
    const handActionAreaWidth = Math.max(140, Math.round(145 * scale));
    const handAreaWidth = handWidth - handActionAreaWidth;
    const slots = Math.max(1, Math.floor((handAreaWidth - 20) / slotCardWidth));
    const pages = Math.max(1, Math.ceil(player.hand.length / slots));
    this.handPage = Math.min(this.handPage, pages - 1);

    // 手札パネル高さ：カード高さ＋ヘッダー・余白のみのコンパクトな高さに引き締め
    const handHeight = handCardHeight + Math.round(46 * scale);
    const isYourTurn = state.active === seat && state.phase !== "ended";

    this.panel(handLeft, handTop, handWidth, handHeight, 0x0d2d26, 0.75)
      .setStrokeStyle(isYourTurn ? 2 : 1, isYourTurn ? 0xf5d47c : 0x496054);
    this.text(handLeft + 12, handTop + 8, "手札", Math.round(14 * scale), isYourTurn ? "#ffd875" : "#f1deaa", true);
    this.text(
      handLeft + Math.round(60 * scale),
      handTop + 8,
      `${player.hand.length}枚 ／ 山札 ${player.deck.length} ／ 捨て札 ${player.discard.length} ／ 廃棄 ${state.trash.length}`,
      Math.round(12 * scale),
      "#b9c8b7",
    );

    if (pages > 1) {
      this.pager(width - Math.round(275 * scale), handTop + 8, "← 前", this.handPage > 0, () => {
        this.handPage--;
        this.dirty = true;
      });
      this.text(width - Math.round(225 * scale), handTop + 8, `${this.handPage + 1} / ${pages}`, Math.round(12 * scale));
      this.pager(
        width - Math.round(175 * scale),
        handTop + 8,
        "次 →",
        this.handPage < pages - 1,
        () => {
          this.handPage++;
          this.dirty = true;
        },
      );
    }
    const hand = [...player.hand]
      .sort(compareHandCards)
      .slice(this.handPage * slots, (this.handPage + 1) * slots);
    const handCardsLeft = handLeft + 12;
    const handY = handTop + Math.round(32 * scale);
    const host = this.game.canvas?.parentElement;
    if (host) {
      host.style.setProperty("--hand-actions-top", `${handY}px`);
    }
    hand.forEach((card: Card, index: number) => {
      this.card(handCardsLeft + index * slotCardWidth, handY, handCardWidth, handCardHeight, card.id, {
        compact: true,
        scale,
        enabled: humanInput && (canPlay(state, card) || canChoose(state, card)),
        action: () =>
          this.store.dispatch(seat, {
            type: this.store.getSnapshot().pending ? "choose" : "play",
            uid: card.uid,
          }),
      });
    });
  }
}
