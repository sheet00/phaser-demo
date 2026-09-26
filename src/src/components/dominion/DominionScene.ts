import Phaser from "phaser";
import { icon } from "@fortawesome/fontawesome-svg-core";
import { faCoins } from "@fortawesome/free-solid-svg-icons";
import { FONT_FAMILY, TEXT_STYLE } from "../old-testament-rpg/typography";
import { BASE, CARDS, KINGDOM } from "./cards";
import type { CardId } from "./cards";
import { cardCost, canBuy, canChoose, canGain, canPlay } from "./engine";
import type { Card } from "./engine";
import type { DominionStore } from "./store";
import { actionSound, SOUND_FILES } from "./audio";
import { cardAppearance } from "./cardAppearance";
import type { CardInspection } from "./cardAppearance";

export const SUPPLY_CARD_SCALE = 1.6;
export const SUPPLY_CARD_FONT_SCALE = 1.5;

const BASE_ART = new Set<CardId>([...BASE, ...KINGDOM]);
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
const SUPPLY_CARD_SIZE = { width: 160, height: 254 } as const;
const SUPPLY_CARD_WIDTH = SUPPLY_CARD_SIZE.width * SUPPLY_CARD_SCALE;
const SUPPLY_CARD_HEIGHT = SUPPLY_CARD_SIZE.height * SUPPLY_CARD_SCALE;
const SUPPLY_GRID_WIDTH = SUPPLY_CARD_WIDTH * 5 + 10 * 4;
const SUPPLY_BOTTOM = 38 + SUPPLY_CARD_HEIGHT * 2 + 10;
const HAND_TOP = SUPPLY_BOTTOM + 16;
const HAND_PANEL_HEIGHT = 256;
const FULL_TEXT_BODY_HEIGHT =
  SUPPLY_CARD_SIZE.height -
  24 -
  31 -
  Math.round((SUPPLY_CARD_SIZE.width - 8) * 0.48) -
  5;
const BASIC_PANEL_WIDTH = Math.round(275 * 1.1);
const BASIC_PANEL_LEFT = 10;
const BASIC_PANEL_RIGHT = BASIC_PANEL_LEFT + BASIC_PANEL_WIDTH;
export const DOMINION_CANVAS_MIN_WIDTH = Math.max(
  1200,
  Math.ceil(BASIC_PANEL_RIGHT + 20 + SUPPLY_GRID_WIDTH + 20),
);
export const DOMINION_CANVAS_MIN_HEIGHT = Math.max(
  1080,
  HAND_TOP + HAND_PANEL_HEIGHT + 14,
);

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

  constructor(
    store: DominionStore,
    inspect: (card: CardInspection | null) => void,
    onReady: () => void,
  ) {
    super("DominionTable");
    this.store = store;
    this.inspect = inspect;
    this.onReady = onReady;
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
      this.load.image(`dominion-${id}-art`, `${assets}dominion/${id}.png`);
    }
    for (const [key, file] of Object.entries(SOUND_FILES)) {
      this.load.audio(
        `dominion-${key}`,
        `${assets}kenney_casino-audio/Audio/${file}`,
      );
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
        const effect = actionSound(command, previous);
        if (!effect || !this.cache.audio.exists(`dominion-${effect}`)) return;
        try {
          this.sound.stopAll();
          this.sound.play(`dominion-${effect}`, { volume: 0.4 });
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
      textFitSize?: Readonly<{ width: number; height: number }>;
      count?: number;
      enabled?: boolean;
      action?: () => void;
    } = {},
  ) {
    const definition = CARDS[id];
    const compact = options.compact ?? false;
    const fontScale = options.fontScale ?? 1;
    const artKey = BASE_ART.has(id) ? `dominion-${id}-art` : null;
    const appearance = cardAppearance(definition);
    const { accent, background } = appearance;
    const titleHeight = compact ? 24 : 28;
    const footerHeight = compact ? 20 : 24;
    const artTop = titleHeight + 3;
    const artHeight = options.fullText
      ? Math.min(
          Math.round((width - 8) / 1.5),
          Math.max(
            1,
            Math.floor(
              height - footerHeight - artTop - FULL_TEXT_BODY_HEIGHT - 5,
            ),
          ),
        )
      : Math.round((width - 8) * (compact ? 0.61 : 0.66));
    const summaryTop = artTop + artHeight + 3;
    const group = this.add.container(x, y);
    this.table.add(group);
    const shadow = this.add
      .rectangle(3, 4, width, height, 0x000000, 0.25)
      .setOrigin(0);
    const face = this.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0);
    const band = this.add
      .rectangle(0, 0, width, titleHeight, accent)
      .setOrigin(0);
    group.add([shadow, face]);
    group.add(
      this.add
        .rectangle(4, artTop, width - 8, artHeight, background)
        .setOrigin(0)
        .setStrokeStyle(1, accent),
    );
    if (artKey) {
      const art = this.add.image(width / 2, artTop, artKey).setOrigin(0.5, 0);
      art.setDisplaySize(Math.min(width - 8, artHeight * 1.5), artHeight);
      group.add(art);
    } else {
      const initial = this.add
        .text(width / 2, artTop + artHeight / 2, definition.name[0], {
          ...TEXT_STYLE,
          fontFamily: FONT_FAMILY,
          fontSize: `${Math.min(34, Math.round(artHeight * 0.55)) * fontScale}px`,
          fontStyle: "bold",
          color: "#394238",
        })
        .setOrigin(0.5);
      group.add(initial);
    }
    group.add(
      this.add
        .rectangle(4, artTop, width - 8, artHeight, 0xffffff, 0)
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
        lineSpacing: 3,
      });
      group.add(object);
      return object;
    };
    label(
      7,
      titleHeight / 2,
      definition.name,
      compact ? 12 : 15,
      true,
    ).setOrigin(0, 0.5);
    let summarySize = options.fullText ? 12 : compact ? 11 : 13;
    const summary = label(
      width / 2,
      summaryTop,
      options.fullText ? definition.description : definition.summary,
      summarySize,
    ).setOrigin(0.5, 0);
    summary.setFontSize(summarySize);
    const fitWidth = options.textFitSize?.width ?? width;
    const fitHeight = options.textFitSize?.height ?? height;
    const fitArtHeight = Math.round(
      (fitWidth - 8) * (options.fullText ? 0.48 : compact ? 0.61 : 0.66),
    );
    summary.setWordWrapWidth(fitWidth - 16, true);
    const availableSummaryHeight =
      fitHeight - footerHeight - artTop - fitArtHeight - 5;
    while (summary.height > availableSummaryHeight && summarySize > 9) {
      summarySize -= 1;
      summary.setFontSize(summarySize);
    }
    summary.setWordWrapWidth(width - 16, true);
    summary.setFontSize(summarySize * fontScale);
    const actualSummaryHeight = height - footerHeight - summaryTop - 2;
    while (summary.height > actualSummaryHeight && summarySize > 9) {
      summarySize -= 1;
      summary.setFontSize(summarySize * fontScale);
    }
    const coinY = height - footerHeight / 2;
    const coinTexture = "dominion-coin";
    if (this.textures.exists(coinTexture)) {
      group.add(
        this.add
          .image(13, coinY, coinTexture)
          .setDisplaySize(compact ? 14 : 17, compact ? 14 : 17),
      );
    }
    label(
      29,
      coinY - 1,
      String(cardCost(this.store.getSnapshot(), id)),
      compact ? 11 : 13,
      true,
    ).setOrigin(0.5);
    label(
      width - 4,
      coinY - 1,
      compact && appearance.label === "アクション" ? "行動" : appearance.label,
      compact ? 10 : 12,
      false,
      "#394238",
    ).setOrigin(1, 0.5);
    if (options.count !== undefined) {
      const badgeX = width - 14;
      const badgeY = titleHeight / 2;
      const badge = this.add
        .rectangle(
          badgeX,
          badgeY,
          23,
          20,
          options.count === 0 ? 0x5d5d56 : 0x344e48,
        )
        .setStrokeStyle(1, 0xb9b59d);
      group.add(badge);
      label(
        badgeX,
        badgeY,
        String(options.count),
        11,
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
      if (!options.fullText) inspect(pointer);
    });
    if (!options.fullText) hit.on("pointermove", inspect);
    hit.on("pointerout", () => {
      body.setStrokeStyle(
        options.enabled ? 3 : 1,
        options.enabled ? 0xf5d47c : 0x827a61,
      );
      this.inspect(null);
    });
    hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
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
    const humanInput =
      state.phase !== "ended" &&
      this.store.getInputPlayer() === seat &&
      meta.connection === "connected" &&
      meta.opponentConnected &&
      !meta.busy;
    const player = state.players[seat];
    this.panel(0, 0, width, height, 0x173f35);
    const supplyCardWidth = SUPPLY_CARD_WIDTH;
    const supplyCardHeight = SUPPLY_CARD_HEIGHT;
    const basicLeft = 16;
    const basicPanelRight = BASIC_PANEL_RIGHT;
    const basicCardLeft = BASIC_PANEL_LEFT + 14;
    const basicCardStep = 96;
    const supplyWidth = SUPPLY_GRID_WIDTH;
    const supplyLeft =
      basicPanelRight +
      Math.max(20, (width - basicPanelRight - supplyWidth) / 2);
    this.panel(
      BASIC_PANEL_LEFT,
      8,
      BASIC_PANEL_WIDTH,
      460,
      0x0b251f,
      0.45,
    ).setStrokeStyle(1, 0x496054);
    this.text(basicLeft, 8, "基本カード", 14, "#b9c8b7", true);
    this.text(supplyLeft, 8, "サプライ", 14, "#b9c8b7", true);
    const selectedSets = this.store.expansions
      .map((id) =>
        id === "base" ? "基本" : id === "intrigue" ? "陰謀" : "海辺",
      )
      .join("＋");
    this.text(
      width - 18,
      8,
      `${this.store.mode === "basic" ? "おすすめ" : "ランダム10種類"} · ${selectedSets}`,
      13,
      "#a2b8a7",
    ).setOrigin(1, 0);
    const supplyAction = (id: CardId) => () => {
      const pending = this.store.getSnapshot().pending;
      const gaining =
        pending?.kind === "gain" ||
        (pending?.kind === "expansion" && pending.zone === "supply");
      this.store.dispatch(seat, { type: gaining ? "gain" : "buy", card: id });
    };
    BASIC_DISPLAY.forEach((id, index) => {
      const column = id === "curse" ? 1 : index % 3;
      this.card(
        basicCardLeft + column * basicCardStep,
        38 + Math.floor(index / 3) * 139,
        84,
        134,
        id,
        {
          compact: true,
          count: state.supply[id],
          enabled: humanInput && (canBuy(state, id) || canGain(state, id)),
          action: supplyAction(id),
        },
      );
    });
    state.kingdom.forEach((id, index) => {
      this.card(
        supplyLeft + (index % 5) * (supplyCardWidth + 10),
        38 + Math.floor(index / 5) * (supplyCardHeight + 10),
        supplyCardWidth,
        supplyCardHeight,
        id,
        {
          fullText: true,
          fontScale: SUPPLY_CARD_FONT_SCALE,
          textFitSize: SUPPLY_CARD_SIZE,
          count: state.supply[id],
          enabled: humanInput && (canBuy(state, id) || canGain(state, id)),
          action: supplyAction(id),
        },
      );
    });

    const played = state.players[state.active].played;
    const playedTop = 478;
    const playedHeight = Math.max(540, height - playedTop - 14);
    this.panel(
      BASIC_PANEL_LEFT,
      playedTop,
      BASIC_PANEL_WIDTH,
      playedHeight,
      0x0b251f,
      0.45,
    ).setStrokeStyle(1, 0x496054);
    this.text(
      basicLeft,
      playedTop + 8,
      `${state.players[state.active].name}の場`,
      14,
      "#b9c8b7",
      true,
    );
    const activePlayer = state.players[state.active];
    const mats = [
      activePlayer.islandMat.length &&
        `島：${activePlayer.islandMat.map((card) => CARDS[card.id].name).join("・")}`,
      activePlayer.nativeVillageMat.length &&
        `原住民の村：${activePlayer.nativeVillageMat.map((card) => CARDS[card.id].name).join("・")}`,
      activePlayer.blockadeMat.length &&
        `封鎖：${activePlayer.blockadeMat.map((entry) => CARDS[entry.card.id].name).join("・")}`,
      activePlayer.havenMat.length &&
        `避難所：${activePlayer.havenMat.map((entry) => CARDS[entry.card.id].name).join("・")}`,
    ]
      .filter(Boolean)
      .join(" ／ ");
    let matBottom = playedTop + 38;
    if (mats) {
      const matText = this.text(basicLeft, playedTop + 28, mats, 11, "#f1deaa");
      matText.setWordWrapWidth(BASIC_PANEL_WIDTH - 20, true);
      matBottom = playedTop + 28 + matText.height + 10;
    }
    let resourceBottom = matBottom;
    if (state.active === seat) {
      const resourceTop = matBottom;
      const resourceWidth = BASIC_PANEL_WIDTH - 12;
      const resourceLeft = BASIC_PANEL_LEFT + 6;
      const slotWidth = Math.floor(resourceWidth / 3);
      this.panel(
        resourceLeft,
        resourceTop,
        resourceWidth,
        72,
        0x102d27,
        0.95,
      ).setStrokeStyle(1, 0x657267);
      this.panel(resourceLeft + slotWidth, resourceTop + 6, 1, 60, 0x496054);
      this.panel(
        resourceLeft + slotWidth * 2,
        resourceTop + 6,
        1,
        60,
        0x496054,
      );
      (
        [
          ["アクション", state.actions],
          ["購入", state.buys],
          ["コイン", state.coins],
        ] as const
      ).forEach(([label, value], index) => {
        const center =
          resourceLeft + Math.floor(slotWidth / 2) + index * slotWidth;
        this.text(
          center,
          resourceTop + 6,
          label,
          12,
          "#c1d0c2",
          true,
        ).setOrigin(0.5, 0);
        this.text(
          center,
          resourceTop + 25,
          String(value),
          30,
          "#f1deaa",
          true,
        ).setOrigin(0.5, 0);
      });
      resourceBottom = resourceTop + 78;
    }
    const counts = new Map<CardId, number>();
    played.forEach((card) =>
      counts.set(card.id, (counts.get(card.id) ?? 0) + 1),
    );
    const groups = [...counts];
    const playedCardsTop = resourceBottom + 6;
    const availableHeight = playedTop + playedHeight - playedCardsTop;
    const rows = Math.max(1, Math.min(4, Math.floor(availableHeight / 140)));
    const playedSlots = rows * 3;
    const playedPages = Math.max(1, Math.ceil(groups.length / playedSlots));
    this.playedPage = Math.min(this.playedPage, playedPages - 1);
    if (playedPages > 1) {
      this.pager(
        BASIC_PANEL_RIGHT - 85,
        playedTop + 8,
        "←",
        this.playedPage > 0,
        () => {
          this.playedPage--;
          this.dirty = true;
        },
      );
      this.text(
        BASIC_PANEL_RIGHT - 58,
        playedTop + 8,
        `${this.playedPage + 1}/${playedPages}`,
        12,
      );
      this.pager(
        BASIC_PANEL_RIGHT - 23,
        playedTop + 8,
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
        BASIC_PANEL_LEFT + BASIC_PANEL_WIDTH / 2,
        playedCardsTop + 40,
        "使用したカードが\nここに並びます",
        13,
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
          playedCardsTop + row * 139,
          84,
          134,
          id,
          {
            compact: true,
            count,
          },
        );
      });

    const handTop = Math.max(SUPPLY_BOTTOM + 16, height - 262);
    const handLeft = basicPanelRight + 10;
    const handWidth = width - handLeft - 10;
    this.panel(handLeft, handTop - 4, handWidth, 258, 0x0d2d26, 0.7);
    this.text(handLeft + 12, handTop, "手札", 14, "#f1deaa", true);
    this.text(
      handLeft + 66,
      handTop,
      `${player.hand.length}枚 ／ 山札 ${player.deck.length} ／ 捨て札 ${player.discard.length} ／ 廃棄 ${state.trash.length}`,
      12,
      "#b9c8b7",
    );
    const handAreaWidth = handWidth - 160;
    const slots = Math.max(1, Math.floor((handAreaWidth - 24) / 146));
    const pages = Math.max(1, Math.ceil(player.hand.length / slots));
    this.handPage = Math.min(this.handPage, pages - 1);
    if (pages > 1) {
      this.pager(width - 290, handTop, "← 前", this.handPage > 0, () => {
        this.handPage--;
        this.dirty = true;
      });
      this.text(width - 235, handTop, `${this.handPage + 1} / ${pages}`, 14);
      this.pager(
        width - 180,
        handTop,
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
    const handY = handTop + 28;
    hand.forEach((card: Card, index: number) => {
      this.card(handCardsLeft + index * 146, handY, 136, 216, card.id, {
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
