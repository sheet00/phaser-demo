import { instruction } from './engine';
import type { Command, GameState, PlayerId } from './engine';
import { basicKingdomFor } from './store';
import type { DominionStore, ExpansionId, GameMode, MatchMeta } from './store';
import { normalizePlayerName } from './playerName';

export type OnlineSession = { roomId: string; token: string };
export type OnlineStatus = {
  stage: 'connecting' | 'lobby' | 'playing';
  message: string;
  ready: [boolean, boolean];
  names: [string, string | null];
  joined: boolean;
  seat: PlayerId;
};

type ServerMessage =
  | { type: 'lobby'; seat: PlayerId; setup: { mode: GameMode; expansions: ExpansionId[] }; ready: [boolean, boolean]; names: [string, string | null]; joined: boolean; opponentConnected: boolean }
  | { type: 'snapshot'; seat: PlayerId; setup: { mode: GameMode; expansions: ExpansionId[] }; version: number; inputPlayer: PlayerId; state: GameState; opponentConnected: boolean; canClaim: boolean }
  | { type: 'error'; message: string };

const key = (roomId: string) => `dominion-seat:${roomId}`;

async function requestRoom(path: string, body: unknown): Promise<{ roomId?: string; token: string }> {
  const response = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => { throw new Error('対戦サーバーから応答を受け取れませんでした。'); }) as { roomId?: string; token?: string; error?: string };
  if (!response.ok || !data.token) throw new Error(data.error ?? '部屋に接続できませんでした。');
  return { roomId: data.roomId, token: data.token };
}

export async function createOnlineRoom(mode: GameMode, expansions: ExpansionId[], playerName: string): Promise<OnlineSession> {
  const name = normalizePlayerName(playerName);
  if (!name) throw new Error('プレイヤー名を1〜16文字で入力してください。');
  const result = await requestRoom('/api/dominion/rooms', { mode, expansions, name });
  if (!result.roomId) throw new Error('部屋を作成できませんでした。');
  localStorage.setItem(key(result.roomId), result.token);
  return { roomId: result.roomId, token: result.token };
}

export async function joinOnlineRoom(roomId: string, playerName: string): Promise<OnlineSession> {
  const name = normalizePlayerName(playerName);
  if (!name) throw new Error('プレイヤー名を1〜16文字で入力してください。');
  const result = await requestRoom(`/api/dominion/rooms/${roomId}/join`, { name });
  localStorage.setItem(key(roomId), result.token);
  return { roomId, token: result.token };
}

export function savedOnlineSession(roomId: string): OnlineSession | null {
  const token = localStorage.getItem(key(roomId));
  return token ? { roomId, token } : null;
}

export class OnlineStore implements DominionStore {
  mode: GameMode = 'random';
  expansions: ExpansionId[] = ['base'];
  basicKingdom = basicKingdomFor(['base']);
  online = true;
  playerId: PlayerId = 0;
  private state: GameState | null = null;
  private version = 0;
  private inputPlayer: PlayerId = 0;
  private socket: WebSocket | null = null;
  private retryTimer: number | null = null;
  private retryDelay = 1000;
  private closed = false;
  private muted = false;
  private listeners = new Set<() => void>();
  private soundListeners = new Set<() => void>();
  private actionListeners = new Set<(command: Command, previous: GameState) => void>();
  private statusListeners = new Set<() => void>();
  private metaListeners = new Set<() => void>();
  private status: OnlineStatus = { stage: 'connecting', message: '対戦部屋へ接続しています…', ready: [false, false], names: ['プレイヤー1', null], joined: false, seat: 0 };
  private meta: MatchMeta = { connection: 'connecting', opponentConnected: false, canClaim: false, busy: false };

  constructor(private session: OnlineSession) {}

  start = () => { this.closed = false; this.connect(); };

  private setStatus(status: OnlineStatus) {
    this.status = status;
    this.statusListeners.forEach(listener => listener());
  }

  private setMeta(meta: MatchMeta) {
    this.meta = meta;
    this.metaListeners.forEach(listener => listener());
  }

  private connect() {
    if (this.closed) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${location.host}/api/dominion/rooms/${this.session.roomId}/socket`);
    this.socket = socket;
    this.setMeta({ ...this.meta, connection: 'connecting', busy: false });
    socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'auth', token: this.session.token })));
    socket.addEventListener('message', event => {
      let message: ServerMessage;
      try { message = JSON.parse(String(event.data)) as ServerMessage; }
      catch { return; }
      if (message.type === 'error') {
        this.setStatus({ ...this.status, message: message.message });
        this.setMeta({ ...this.meta, busy: false });
        return;
      }
      if (message.type !== 'lobby' && message.type !== 'snapshot') return;
      this.playerId = message.seat;
      this.mode = message.setup.mode;
      this.expansions = message.setup.expansions;
      this.basicKingdom = basicKingdomFor(this.expansions);
      this.retryDelay = 1000;
      if (message.type === 'lobby') {
        this.setStatus({ stage: 'lobby', message: '', ready: message.ready, names: message.names, joined: message.joined, seat: message.seat });
      } else {
        this.version = message.version;
        this.inputPlayer = message.inputPlayer;
        this.state = message.state;
        this.setStatus({ ...this.status, stage: 'playing', message: '' });
        this.listeners.forEach(listener => listener());
      }
      this.setMeta({ connection: 'connected', opponentConnected: message.opponentConnected, canClaim: message.type === 'snapshot' && message.canClaim, busy: false });
    });
    socket.addEventListener('close', event => {
      if (this.closed || this.socket !== socket) return;
      const denied = event.code === 1008 || event.reason.includes('保存期間');
      this.setMeta({ ...this.meta, connection: 'disconnected', busy: false });
      this.setStatus({ ...this.status, message: event.reason.includes('保存期間') ? '対戦部屋の保存期間が終了しました。' : denied ? '席を確認できません。招待リンクから入り直してください。' : '通信が切れました。再接続しています…' });
      if (denied) return;
      this.retryTimer = window.setTimeout(() => this.connect(), this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, 10000);
    });
  }

  getOnlineStatus = () => this.status;
  subscribeOnlineStatus = (listener: () => void) => { this.statusListeners.add(listener); return () => { this.statusListeners.delete(listener); }; };
  ready = () => { if (this.meta.connection === 'connected') this.socket?.send(JSON.stringify({ type: 'ready' })); };
  getSnapshot = (): GameState => {
    if (!this.state) throw new Error('対戦はまだ開始していません。');
    return this.state;
  };
  getMuted = () => this.muted;
  setMuted = (value: boolean) => { this.muted = value; this.soundListeners.forEach(listener => listener()); };
  subscribeSound = (listener: () => void) => { this.soundListeners.add(listener); return () => { this.soundListeners.delete(listener); }; };
  subscribeActions = (listener: (command: Command, previous: GameState) => void) => { this.actionListeners.add(listener); return () => { this.actionListeners.delete(listener); }; };
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  dispatch = (actor: PlayerId, command: Command) => {
    if (actor !== this.playerId || !this.state || this.meta.connection !== 'connected' || (!this.meta.opponentConnected && command.type !== 'resign') || this.meta.busy) return;
    this.socket?.send(JSON.stringify({ type: 'command', id: crypto.randomUUID(), version: this.version, command }));
    this.actionListeners.forEach(listener => listener(command, this.state!));
    this.setMeta({ ...this.meta, busy: true });
  };
  restart = () => undefined;
  getInputPlayer = () => this.inputPlayer;
  getInstruction = () => {
    if (this.meta.connection !== 'connected') return '通信の再接続を待っています。';
    if (this.status.message) return this.status.message;
    if (!this.meta.opponentConnected) return '相手の再接続を待っています。';
    if (this.meta.busy) return '操作を反映しています…';
    if (!this.state) return '対戦開始を待っています。';
    if (this.inputPlayer !== this.playerId) return `${this.state.players[this.inputPlayer].name}の操作を待っています。`;
    return instruction(this.state, this.playerId);
  };
  getMeta = () => this.meta;
  subscribeMeta = (listener: () => void) => { this.metaListeners.add(listener); return () => { this.metaListeners.delete(listener); }; };
  claimDisconnectedWin = () => { if (this.meta.canClaim) this.socket?.send(JSON.stringify({ type: 'claim' })); };
  dispose = () => {
    this.closed = true;
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.socket?.close(1000, '画面を閉じました');
  };
}
