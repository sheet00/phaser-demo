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
import type {
  ExpansionId,
  GameMode,
} from "../src/components/dominion/store.ts";

type Setup = { mode: GameMode; expansions: ExpansionId[] };
type Room = {
  setup: Setup;
  seatHashes: [string, string | null];
  connectionIds: [string | null, string | null];
  ready: [boolean, boolean];
  game: GameState | null;
  version: number;
  seenOps: [string[], string[]];
  disconnectedAt: [number | null, number | null];
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
    data.expansions.length > 3
  )
    return null;
  if (
    data.expansions.some(
      (id) => id !== "base" && id !== "intrigue" && id !== "seaside",
    )
  )
    return null;
  if (new Set(data.expansions).size !== data.expansions.length) return null;
  if (data.mode === "basic" && data.expansions.length !== 1) return null;
  return { mode: data.mode, expansions: data.expansions as ExpansionId[] };
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
    return value === 0 || value === 1 ? value : null;
  }

  private snapshot(room: Room, seat: PlayerId) {
    if (!room.game)
      return {
        type: "lobby",
        seat,
        setup: room.setup,
        ready: room.ready,
        joined: room.seatHashes[1] !== null,
        opponentConnected: this.connected(seat === 0 ? 1 : 0),
      };
    const opponent = seat === 0 ? 1 : 0;
    const state = projectGame(room.game, seat);
    if (room.game.phase !== "ended") state.log = room.publicLog;
    return {
      type: "snapshot",
      seat,
      setup: room.setup,
      version: room.version,
      inputPlayer: projectInput(room.game),
      state,
      opponentConnected: this.connected(opponent),
      canClaim:
        room.game.phase !== "ended" &&
        room.disconnectedAt[opponent] !== null &&
        Date.now() - room.disconnectedAt[opponent] >= GRACE_MS,
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
    if (
      room.game ||
      !room.seatHashes[1] ||
      !room.ready[0] ||
      !room.ready[1] ||
      !this.connected(0) ||
      !this.connected(1)
    )
      return;
    const pool: CardId[] = [
      ...(room.setup.expansions.includes("base") ? KINGDOM : []),
      ...(room.setup.expansions.includes("intrigue") ? INTRIGUE_KINGDOM : []),
      ...(room.setup.expansions.includes("seaside") ? SEASIDE_KINGDOM : []),
    ];
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    room.game = createGame(
      seed,
      room.setup.mode === "basic"
        ? basicKingdomFor(room.setup.expansions)
        : undefined,
      pool,
    );
    room.game.players[0].name = "プレイヤー1";
    room.game.players[1].name = "プレイヤー2";
    room.game.log = room.game.log.map((entry) => ({
      ...entry,
      text: entry.text
        .replaceAll("あなた", "プレイヤー1")
        .replaceAll("CPU", "プレイヤー2"),
    }));
  }

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/api/dominion/rooms" && request.method === "POST") {
      return this.enqueue(async () => {
        if (await this.room()) return error("部屋は作成済みです。", 409);
        const setup = parseSetup(await readJson(request));
        if (!setup) return error("対戦設定が不正です。");
        const token = crypto.randomUUID();
        const room: Room = {
          setup,
          seatHashes: [await hashToken(token), null],
          connectionIds: [null, null],
          ready: [false, false],
          game: null,
          version: 0,
          seenOps: [[], []],
          disconnectedAt: [null, null],
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
        if (room.seatHashes[1] || room.game)
          return error("この部屋は満員です。", 409);
        const token = crypto.randomUUID();
        room.seatHashes[1] = await hashToken(token);
        await this.ctx.storage.put("room", room);
        this.broadcast(room);
        return Response.json({ token, setup: room.setup });
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
      if (await sameToken(data.token, room.seatHashes[0])) seat = 0;
      else if (await sameToken(data.token, room.seatHashes[1])) seat = 1;
      else {
        socket.close(1008, "席を確認できません");
        return;
      }
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
      const opponent = seat === 0 ? 1 : 0;
      const leftAt = room.disconnectedAt[opponent];
      if (
        room.game.phase === "ended" ||
        leftAt === null ||
        Date.now() - leftAt < GRACE_MS ||
        this.connected(opponent)
      ) {
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
      room.game.endReason = `${room.game.players[opponent].name}の切断により対戦終了。`;
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
    if (!this.connected(seat === 0 ? 1 : 0) && command.type !== "resign") {
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
