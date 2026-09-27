import { DurableObject } from "cloudflare:workers";
import { ALL_CARDS, CARDS, KINGDOM } from "../src/components/dominion/cards.ts";
import type { CardId } from "../src/components/dominion/cards.ts";
import { INTRIGUE_KINGDOM } from "../src/components/dominion/expansions/intrigueCards.ts";
import { SEASIDE_KINGDOM } from "../src/components/dominion/expansions/seasideCards.ts";
import { createGame, reduceGame } from "../src/components/dominion/engine.ts";
import type {
  Command,
  GameState,
  PlayerId,
} from "../src/components/dominion/engine.ts";
import {
  projectGame,
  projectInput,
} from "../src/components/dominion/networkView.ts";
import { basicKingdomFor } from "../src/components/dominion/store.ts";
import { normalizePlayerName } from "../src/components/dominion/playerName.ts";
import type {
  ExpansionId,
  GameMode,
} from "../src/components/dominion/store.ts";

type Setup = { mode: GameMode; expansions: ExpansionId[]; playerCount: number };
type Room = {
  setup: Setup;
  names: (string | null)[];
  seatHashes: (string | null)[];
  connectionIds: (string | null)[];
  ready: boolean[];
  game: GameState | null;
  version: number;
  seenOps: string[][];
  disconnectedAt: (number | null)[];
  expiresAt: number;
  publicLog: { id: number; text: string }[];
};
type Attachment = { seat: PlayerId | null; connectionId: string | null };

const GRACE_MS = 5 * 60 * 1000;
const roomPattern = /^\/api\/dominion\/rooms\/([0-9a-f-]{36})\/(join|socket)$/;
const send = (socket: WebSocket, value: unknown) =>
  socket.send(JSON.stringify(value));
const error = (message: string, status = 400) =>
  Response.json({ error: message }, { status });

function parseSetup(value: unknown): Setup | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.mode !== "basic" && data.mode !== "random") return null;
  if (
    !Array.isArray(data.expansions) ||
    data.expansions.length < 1 ||
    data.expansions.length > 4
  )
    return null;
  if (
    data.expansions.some(
      (id) => id !== "base" && id !== "intrigue" && id !== "seaside" && id !== "alchemy",
    )
  )
    return null;
  if (new Set(data.expansions).size !== data.expansions.length) return null;
  if (data.mode === "basic" && data.expansions.length !== 1) return null;
  let playerCount = 2;
  if ("playerCount" in data) {
    const count = Number(data.playerCount);
    if (!Number.isInteger(count) || count < 2 || count > 6) return null;
    playerCount = count;
  }
  return { mode: data.mode, expansions: data.expansions as ExpansionId[], playerCount };
}

function parseCommand(value: unknown): Command | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.type === "play" || data.type === "choose") {
    return Number.isSafeInteger(data.uid) && Number(data.uid) > 0
      ? { type: data.type, uid: Number(data.uid) }
      : null;
  }
  if (data.type === "buy" || data.type === "gain") {
    return typeof data.card === "string" &&
      ALL_CARDS.includes(data.card as CardId)
      ? { type: data.type, card: data.card as CardId }
      : null;
  }
  if (data.type === "option")
    return typeof data.value === "string" && data.value.length <= 100
      ? { type: "option", value: data.value }
      : null;
  if (
    [
      "buy-phase",
      "treasures",
      "end-turn",
      "done",
      "reveal",
      "decline",
      "resign",
      "accept",
      "diplomat",
    ].includes(String(data.type))
  ) {
    return { type: data.type } as Command;
  }
  return null;
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 4096) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

async function hashToken(token: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function sameToken(
  token: string,
  expected: string | null,
): Promise<boolean> {
  if (!expected || !/^[0-9a-f-]{36}$/.test(token)) return false;
  const actual = await hashToken(token);
  return crypto.subtle.timingSafeEqual(
    new TextEncoder().encode(actual),
    new TextEncoder().encode(expected),
  );
}

export class DominionRoom extends DurableObject<Env> {
  private queue: Promise<void> = Promise.resolve();

  private enqueue<T>(action: () => Promise<T>): Promise<T> {
    const result = this.queue.then(action);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async room(): Promise<Room | null> {
    return (await this.ctx.storage.get<Room>("room")) ?? null;
  }

  private connected(seat: PlayerId, except?: WebSocket): boolean {
    return this.ctx
      .getWebSockets()
      .some(
        (socket) =>
          socket !== except &&
          socket.readyState === WebSocket.OPEN &&
          (socket.deserializeAttachment() as Attachment | null)?.seat === seat,
      );
  }

  private seat(socket: WebSocket): PlayerId | null {
    const value = (socket.deserializeAttachment() as Attachment | null)?.seat;
    return typeof value === "number" && value >= 0 && value < 6 ? value : null;
  }

  private snapshot(room: Room, seat: PlayerId) {
    const otherSeats = room.seatHashes.map((_, i) => i).filter((i) => i !== seat);
    const allOthersConnected = otherSeats.every((i) => this.connected(i));
    if (!room.game)
      return {
        type: "lobby",
        seat,
        setup: room.setup,
        names: room.names.map((name, i) => name ?? (room.seatHashes[i] ? `プレイヤー${i + 1}` : null)),
        ready: room.ready,
        joined: room.seatHashes.every(Boolean),
        opponentConnected: allOthersConnected,
        connections: room.seatHashes.map((_, i) => this.connected(i)),
      };
    const state = projectGame(room.game, seat);
    if (room.game.phase !== "ended") state.log = room.publicLog;
    const canClaim =
      room.game.phase !== "ended" &&
      otherSeats.length > 0 &&
      otherSeats.every(
        (i) =>
          room.disconnectedAt[i] !== null &&
          Date.now() - room.disconnectedAt[i]! >= GRACE_MS &&
          !this.connected(i),
      );
    return {
      type: "snapshot",
      seat,
      setup: room.setup,
      version: room.version,
      inputPlayer: projectInput(room.game),
      state,
      opponentConnected: allOthersConnected,
      canClaim,
    };
  }

  private broadcast(room: Room) {
    for (const socket of this.ctx.getWebSockets()) {
      const seat = this.seat(socket);
      if (seat !== null && socket.readyState === WebSocket.OPEN)
        send(socket, this.snapshot(room, seat));
    }
  }

  private startIfReady(room: Room) {
    const count = room.setup.playerCount;
    if (
      room.game ||
      room.seatHashes.some((hash) => hash === null) ||
      room.ready.some((r) => !r) ||
      Array.from({ length: count }, (_, i) => i).some((i) => !this.connected(i))
    )
      return;
    const pool: CardId[] = [
      ...(room.setup.expansions.includes("base") ? KINGDOM : []),
      ...(room.setup.expansions.includes("intrigue") ? INTRIGUE_KINGDOM : []),
      ...(room.setup.expansions.includes("seaside") ? SEASIDE_KINGDOM : []),
      ...(room.setup.expansions.includes("alchemy") ? ALCHEMY_KINGDOM : []),
    ];
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const playerNames = room.names.map((name, i) => name ?? `プレイヤー${i + 1}`);
    const game = createGame(
      seed,
      room.setup.mode === "basic"
        ? basicKingdomFor(room.setup.expansions)
        : undefined,
      pool,
      playerNames,
    );
    room.game = game;
  }

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/api/dominion/rooms" && request.method === "POST") {
      return this.enqueue(async () => {
        if (await this.room()) return error("部屋は作成済みです。", 409);
        const body = await readJson(request);
        const setup = parseSetup(body);
        if (!setup) return error("対戦設定が不正です。");
        const name = normalizePlayerName((body as Record<string, unknown>).name);
        if (!name) return error("プレイヤー名を1〜16文字で入力してください。");
        const token = crypto.randomUUID();
        const count = setup.playerCount;
        const names: (string | null)[] = Array.from({ length: count }, () => null);
        names[0] = name;
        const seatHashes: (string | null)[] = Array.from({ length: count }, () => null);
        seatHashes[0] = await hashToken(token);
        const connectionIds: (string | null)[] = Array.from({ length: count }, () => null);
        const ready: boolean[] = Array.from({ length: count }, () => false);
        const seenOps: string[][] = Array.from({ length: count }, () => []);
        const disconnectedAt: (number | null)[] = Array.from({ length: count }, () => null);
        const room: Room = {
          setup,
          names,
          seatHashes,
          connectionIds,
          ready,
          game: null,
          version: 0,
          seenOps,
          disconnectedAt,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          publicLog: [],
        };
        await this.ctx.storage.put("room", room);
        await this.ctx.storage.setAlarm(room.expiresAt);
        return Response.json({ token });
      });
    }
    if (path.endsWith("/join") && request.method === "POST") {
      return this.enqueue(async () => {
        const room = await this.room();
        if (!room) return error("部屋が見つかりません。", 404);
        if (room.game) return error("対戦はすでに開始しています。", 409);
        const emptySeat = room.seatHashes.findIndex((h) => h === null);
        if (emptySeat === -1) return error("この部屋は満員です。", 409);
        const body = await readJson(request);
        const name = normalizePlayerName(body && typeof body === "object" ? (body as Record<string, unknown>).name : null);
        if (!name) return error("プレイヤー名を1〜16文字で入力してください。");
        const token = crypto.randomUUID();
        room.seatHashes[emptySeat] = await hashToken(token);
        room.names[emptySeat] = name;
        await this.ctx.storage.put("room", room);
        this.broadcast(room);
        return Response.json({ token, setup: room.setup, seat: emptySeat });
      });
    }
    if (
      path.endsWith("/socket") &&
      request.headers.get("Upgrade")?.toLowerCase() === "websocket"
    ) {
      if (!(await this.room())) return error("部屋が見つかりません。", 404);
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({
        seat: null,
        connectionId: null,
      } satisfies Attachment);
      return new Response(null, { status: 101, webSocket: client });
    }
    return error("見つかりません。", 404);
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    await this.enqueue(() => this.handleMessage(socket, message)).catch(
      (error) => {
        console.error(
          JSON.stringify({
            event: "dominion_socket_error",
            message: String(error),
          }),
        );
        socket.close(1011, "対戦の処理に失敗しました");
      },
    );
  }

  private async handleMessage(
    socket: WebSocket,
    message: string | ArrayBuffer,
  ) {
    if (typeof message !== "string" || message.length > 4096) {
      socket.close(1009, "メッセージが大きすぎます");
      return;
    }
    let data: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(message);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("message");
      data = parsed as Record<string, unknown>;
    } catch {
      send(socket, { type: "error", message: "メッセージが不正です。" });
      return;
    }
    const room = await this.room();
    if (!room) {
      socket.close(1008, "部屋が見つかりません");
      return;
    }
    let seat = this.seat(socket);
    if (seat === null) {
      if (data.type !== "auth" || typeof data.token !== "string") {
        socket.close(1008, "認証が必要です");
        return;
      }
      let matchedSeat: PlayerId | null = null;
      for (let i = 0; i < room.seatHashes.length; i++) {
        const hash = room.seatHashes[i];
        if (hash && (await sameToken(data.token, hash))) {
          matchedSeat = i as PlayerId;
          break;
        }
      }
      if (matchedSeat === null) {
        socket.close(1008, "席を確認できません");
        return;
      }
      seat = matchedSeat;
      for (const other of this.ctx.getWebSockets()) {
        if (other !== socket && this.seat(other) === seat)
          other.close(1000, "別の画面で再接続しました");
      }
      const connectionId = crypto.randomUUID();
      socket.serializeAttachment({ seat, connectionId } satisfies Attachment);
      room.connectionIds[seat] = connectionId;
      room.disconnectedAt[seat] = null;
      this.startIfReady(room);
      await this.ctx.storage.put("room", room);
      this.broadcast(room);
      return;
    }
    if (
      (socket.deserializeAttachment() as Attachment | null)?.connectionId !==
      room.connectionIds[seat]
    ) {
      socket.close(1000, "別の画面で再接続しました");
      return;
    }
    if (data.type === "ready") {
      if (room.game) return;
      room.ready[seat] = true;
      this.startIfReady(room);
      await this.ctx.storage.put("room", room);
      this.broadcast(room);
      return;
    }
    if (!room.game) {
      send(socket, { type: "error", message: "対戦開始を待っています。" });
      return;
    }
    if (data.type === "claim") {
      const otherSeats = room.seatHashes.map((_, i) => i).filter((i) => i !== seat);
      const allLeftAndExpired =
        otherSeats.length > 0 &&
        otherSeats.every(
          (i) =>
            room.disconnectedAt[i] !== null &&
            Date.now() - room.disconnectedAt[i]! >= GRACE_MS &&
            !this.connected(i),
        );
      if (room.game.phase === "ended" || !allLeftAndExpired) {
        send(socket, {
          type: "error",
          message: "切断勝ちはまだ確定できません。",
        });
        return;
      }
      room.game = structuredClone(room.game);
      room.game.phase = "ended";
      room.game.pending = null;
      room.game.effects = [];
      room.game.winner = seat;
      room.game.endReason = "他プレイヤー全員の切断により対戦終了。";
      room.version++;
      await this.ctx.storage.put("room", room);
      this.broadcast(room);
      return;
    }
    if (
      data.type !== "command" ||
      typeof data.id !== "string" ||
      !/^[0-9a-f-]{36}$/.test(data.id)
    ) {
      send(socket, { type: "error", message: "操作が不正です。" });
      return;
    }
    if (room.seenOps[seat].includes(data.id)) {
      send(socket, this.snapshot(room, seat));
      return;
    }
    if (data.version !== room.version) {
      send(socket, this.snapshot(room, seat));
      return;
    }
    const command = parseCommand(data.command);
    if (!command) {
      send(socket, { type: "error", message: "操作が不正です。" });
      return;
    }
    const otherSeats = room.seatHashes.map((_, i) => i).filter((i) => i !== seat);
    if (otherSeats.some((i) => !this.connected(i)) && command.type !== "resign") {
      send(socket, { type: "error", message: "相手の再接続を待っています。" });
      return;
    }
    const previous = room.game;
    const next = reduceGame(previous, seat, command);
    if (next === room.game) {
      send(socket, { type: "error", message: "今はその操作を行えません。" });
      return;
    }
    room.game = next;
    room.version++;
    const actorName = next.players[seat].name;
    const publicText =
      command.type === "play"
        ? `${actorName}：${CARDS[previous.players[seat].hand.find((card) => card.uid === command.uid)!.id].name}を使用。`
        : command.type === "buy"
          ? `${actorName}：${CARDS[command.card].name}を購入。`
          : command.type === "gain"
            ? `${actorName}：${CARDS[command.card].name}を獲得。`
            : command.type === "end-turn"
              ? `${actorName}：ターン終了。`
              : command.type === "resign"
                ? `${actorName}：投了。`
                : "";
    if (publicText) {
      room.publicLog.push({ id: room.version, text: publicText });
      if (room.publicLog.length > 160) room.publicLog.shift();
    }
    room.seenOps[seat].push(data.id);
    if (room.seenOps[seat].length > 32) room.seenOps[seat].shift();
    await this.ctx.storage.put("room", room);
    this.broadcast(room);
  }

  private async handleClose(socket: WebSocket) {
    const seat = this.seat(socket);
    if (seat === null || this.connected(seat, socket)) return;
    const room = await this.room();
    if (!room || !room.game || room.game.phase === "ended") return;
    room.disconnectedAt[seat] ??= Date.now();
    await this.ctx.storage.put("room", room);
    await this.ctx.storage.setAlarm(
      Math.min(room.disconnectedAt[seat] + GRACE_MS, room.expiresAt),
    );
    this.broadcast(room);
  }

  async webSocketClose(socket: WebSocket) {
    await this.enqueue(() => this.handleClose(socket));
  }

  async webSocketError(socket: WebSocket) {
    await this.enqueue(() => this.handleClose(socket));
  }

  async alarm() {
    await this.enqueue(async () => {
      const room = await this.room();
      if (!room) return;
      if (Date.now() >= room.expiresAt) {
        for (const socket of this.ctx.getWebSockets())
          socket.close(1000, "対戦部屋の保存期間が終了しました");
        await this.ctx.storage.deleteAll();
        return;
      }
      this.broadcast(room);
      await this.ctx.storage.setAlarm(room.expiresAt);
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/dominion/"))
      return env.ASSETS.fetch(request);
    const origin = request.headers.get("Origin");
    const localProxy =
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin ?? "");
    if (origin && origin !== url.origin && !localProxy)
      return error("許可されていない接続です。", 403);
    if (url.pathname === "/api/dominion/rooms" && request.method === "POST") {
      const id = crypto.randomUUID();
      const response = await env.DOMINION_ROOMS.get(
        env.DOMINION_ROOMS.idFromName(id),
      ).fetch(request);
      if (!response.ok) return response;
      const body = (await response.json()) as { token: string };
      return Response.json({ roomId: id, token: body.token });
    }
    const match = roomPattern.exec(url.pathname);
    if (!match) return error("見つかりません。", 404);
    const stub = env.DOMINION_ROOMS.get(
      env.DOMINION_ROOMS.idFromName(match[1]),
    );
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
