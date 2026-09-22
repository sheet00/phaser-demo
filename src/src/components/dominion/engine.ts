import { ALL_CARDS, CARDS } from './cards.ts';
import type { CardId } from './cards.ts';

export type PlayerId = 0 | 1;
export interface Card { uid: number; id: CardId }
export interface Player {
  name: string;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  played: Card[];
  turns: number;
}
export type Pending =
  | { kind: 'cellar'; player: PlayerId; discarded: number }
  | { kind: 'trash'; player: PlayerId; source: 'mine' | 'remodel' }
  | { kind: 'gain'; player: PlayerId; maxCost: number; treasureOnly: boolean; toHand: boolean }
  | { kind: 'reaction'; player: PlayerId }
  | { kind: 'militia'; player: PlayerId };

export interface GameState {
  players: [Player, Player];
  active: PlayerId;
  phase: 'action' | 'buy' | 'ended';
  actions: number;
  buys: number;
  coins: number;
  bought: boolean;
  merchants: number;
  silverPlayed: boolean;
  supply: Record<CardId, number>;
  trash: Card[];
  pending: Pending | null;
  log: { id: number; text: string }[];
  nextLog: number;
  nextUid: number;
  seed: number;
  winner: PlayerId | 'tie' | null;
  endReason: string;
}

export type Command =
  | { type: 'play'; uid: number }
  | { type: 'choose'; uid: number }
  | { type: 'buy'; card: CardId }
  | { type: 'gain'; card: CardId }
  | { type: 'buy-phase' | 'treasures' | 'end-turn' | 'done' | 'reveal' | 'decline' | 'resign' };

export function owned(player: Player): Card[] {
  return [...player.deck, ...player.hand, ...player.discard, ...player.played];
}

export function score(player: Player): number {
  return owned(player).reduce((sum, card) => sum + (CARDS[card.id].points ?? 0), 0);
}

function log(state: GameState, message: string) {
  state.log.push({ id: state.nextLog++, text: message });
  if (state.log.length > 160) state.log.shift();
}

function random(state: GameState): number {
  let seed = state.seed;
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  state.seed = seed >>> 0;
  return state.seed / 4294967296;
}

function shuffle(state: GameState, cards: Card[]) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

function draw(state: GameState, who: PlayerId, count: number) {
  const player = state.players[who];
  for (let i = 0; i < count; i++) {
    if (!player.deck.length && player.discard.length) {
      player.deck = player.discard;
      player.discard = [];
      shuffle(state, player.deck);
      log(state, `${player.name}：捨て札をシャッフル。`);
    }
    const card = player.deck.pop();
    if (!card) break;
    player.hand.push(card);
  }
}

function startTurn(state: GameState) {
  state.phase = 'action';
  state.actions = 1;
  state.buys = 1;
  state.coins = 0;
  state.bought = false;
  state.merchants = 0;
  state.silverPlayed = false;
  state.pending = null;
  const player = state.players[state.active];
  player.turns++;
  log(state, `── ${player.name}：ターン ${player.turns} ──`);
}

export function createGame(seed = Date.now()): GameState {
  const player = (name: string): Player => ({ name, deck: [], hand: [], discard: [], played: [], turns: 0 });
  const supply = Object.fromEntries(ALL_CARDS.map(id => [id, 10])) as Record<CardId, number>;
  Object.assign(supply, { copper: 46, silver: 40, gold: 30, estate: 8, duchy: 8, province: 8 });
  const state: GameState = {
    players: [player('あなた'), player('CPU')], active: 0, phase: 'action', actions: 1, buys: 1, coins: 0,
    bought: false, merchants: 0, silverPlayed: false, supply, trash: [], pending: null, log: [], nextLog: 1,
    nextUid: 1, seed: (seed >>> 0) || 1, winner: null, endReason: '',
  };
  state.active = random(state) < 0.5 ? 0 : 1;
  for (const who of [0, 1] as const) {
    for (let i = 0; i < 10; i++) state.players[who].deck.push({ uid: state.nextUid++, id: i < 7 ? 'copper' : 'estate' });
    shuffle(state, state.players[who].deck);
    draw(state, who, 5);
  }
  log(state, '「最初のゲーム」／あなた 対 CPU');
  startTurn(state);
  return state;
}

export function inputPlayer(state: GameState): PlayerId {
  return state.pending?.player ?? state.active;
}

export function canPlay(state: GameState, card: Card): boolean {
  if (state.pending || state.phase === 'ended') return false;
  if (!state.players[state.active].hand.some(entry => entry.uid === card.uid)) return false;
  return CARDS[card.id].type === 'action'
    ? state.phase === 'action' && state.actions > 0
    : CARDS[card.id].type === 'treasure' && state.phase === 'buy' && !state.bought;
}

export function canBuy(state: GameState, id: CardId): boolean {
  return !state.pending && state.phase === 'buy' && state.buys > 0 && state.supply[id] > 0 && CARDS[id].cost <= state.coins;
}

export function canGain(state: GameState, id: CardId): boolean {
  const pending = state.pending;
  return pending?.kind === 'gain' && state.supply[id] > 0 && CARDS[id].cost <= pending.maxCost
    && (!pending.treasureOnly || CARDS[id].type === 'treasure');
}

export function canChoose(state: GameState, card: Card): boolean {
  const pending = state.pending;
  if (!pending || !state.players[pending.player].hand.some(entry => entry.uid === card.uid)) return false;
  return pending.kind === 'cellar' || pending.kind === 'militia'
    || (pending.kind === 'trash' && (pending.source === 'remodel' || CARDS[card.id].type === 'treasure'));
}

function gainPrompt(state: GameState, player: PlayerId, maxCost: number, treasureOnly = false, toHand = false) {
  state.pending = { kind: 'gain', player, maxCost, treasureOnly, toHand };
  if (!ALL_CARDS.some(id => canGain(state, id))) {
    state.pending = null;
    log(state, '獲得できるカードがないため、効果を終了。');
  }
}

function militiaDiscard(state: GameState, who: PlayerId) {
  state.pending = state.players[who].hand.length > 3 ? { kind: 'militia', player: who } : null;
}

function play(state: GameState, uid: number) {
  const player = state.players[state.active];
  const index = player.hand.findIndex(card => card.uid === uid);
  const card = player.hand.splice(index, 1)[0];
  player.played.push(card);
  log(state, `${player.name}：${CARDS[card.id].name}を使用。`);
  if (CARDS[card.id].type === 'treasure') {
    state.coins += CARDS[card.id].coins ?? 0;
    if (card.id === 'silver' && !state.silverPlayed) {
      state.coins += state.merchants;
      state.silverPlayed = true;
      if (state.merchants) log(state, `商人の効果：+${state.merchants}コイン。`);
    }
    return;
  }
  state.actions--;
  switch (card.id) {
    case 'village': state.actions += 2; draw(state, state.active, 1); break;
    case 'smithy': draw(state, state.active, 3); break;
    case 'moat': draw(state, state.active, 2); break;
    case 'market': state.actions++; state.buys++; state.coins++; draw(state, state.active, 1); break;
    case 'merchant': state.actions++; state.merchants++; draw(state, state.active, 1); break;
    case 'cellar': state.actions++; state.pending = { kind: 'cellar', player: state.active, discarded: 0 }; break;
    case 'workshop': gainPrompt(state, state.active, 4); break;
    case 'remodel':
      if (player.hand.length) state.pending = { kind: 'trash', player: state.active, source: 'remodel' };
      break;
    case 'mine':
      if (player.hand.some(entry => CARDS[entry.id].type === 'treasure')) state.pending = { kind: 'trash', player: state.active, source: 'mine' };
      break;
    case 'militia': {
      state.coins += 2;
      const opponent: PlayerId = state.active === 0 ? 1 : 0;
      if (state.players[opponent].hand.some(entry => entry.id === 'moat')) state.pending = { kind: 'reaction', player: opponent };
      else militiaDiscard(state, opponent);
      break;
    }
  }
}

function gain(state: GameState, who: PlayerId, id: CardId, toHand = false) {
  state.supply[id]--;
  state.players[who][toHand ? 'hand' : 'discard'].push({ uid: state.nextUid++, id });
  log(state, `${state.players[who].name}：${CARDS[id].name}を${toHand ? '手札へ' : '捨て札へ'}獲得。`);
}

function endTurn(state: GameState) {
  const player = state.players[state.active];
  player.discard.push(...player.played, ...player.hand);
  player.played = [];
  player.hand = [];
  draw(state, state.active, 5);
  const empty = ALL_CARDS.filter(id => state.supply[id] === 0).length;
  if (state.supply.province === 0 || empty >= 3) {
    state.phase = 'ended';
    state.endReason = state.supply.province === 0 ? '属州の山が空になりました。' : 'サプライの3山が空になりました。';
    const difference = score(state.players[0]) - score(state.players[1]);
    const fewerTurns = state.players[1].turns - state.players[0].turns;
    const comparison = difference || fewerTurns;
    state.winner = comparison > 0 ? 0 : comparison < 0 ? 1 : 'tie';
    log(state, state.endReason);
    return;
  }
  state.active = state.active === 0 ? 1 : 0;
  startTurn(state);
}

function valid(state: GameState, actor: PlayerId, command: Command): boolean {
  if (state.phase === 'ended') return false;
  if (command.type === 'resign') return true;
  if (actor !== inputPlayer(state)) return false;
  const hand = state.players[actor].hand;
  const pending = state.pending;
  switch (command.type) {
    case 'play': return hand.some(card => card.uid === command.uid && canPlay(state, card));
    case 'choose': return hand.some(card => card.uid === command.uid && canChoose(state, card));
    case 'buy': return canBuy(state, command.card);
    case 'gain': return canGain(state, command.card);
    case 'done': return pending?.kind === 'cellar' || (pending?.kind === 'trash' && pending.source === 'mine');
    case 'reveal': case 'decline': return pending?.kind === 'reaction';
    case 'buy-phase': return !pending && state.phase === 'action';
    case 'treasures': return !pending && state.phase === 'buy' && !state.bought && hand.some(card => CARDS[card.id].type === 'treasure');
    case 'end-turn': return !pending && state.phase === 'buy';
  }
}

// UIとCPUの両方をここで検証し、選択中の割り込みや二重クリックを無効にする。
export function reduceGame(previous: GameState, actor: PlayerId, command: Command): GameState {
  if (!valid(previous, actor, command)) return previous;
  const state = structuredClone(previous);
  const pending = state.pending;
  const player = state.players[actor];
  switch (command.type) {
    case 'play': play(state, command.uid); break;
    case 'buy-phase': state.phase = 'buy'; break;
    case 'treasures':
      for (const card of [...player.hand]) if (CARDS[card.id].type === 'treasure') play(state, card.uid);
      break;
    case 'buy':
      state.coins -= CARDS[command.card].cost;
      state.buys--;
      state.bought = true;
      gain(state, actor, command.card);
      break;
    case 'gain':
      if (pending?.kind === 'gain') gain(state, actor, command.card, pending.toHand);
      state.pending = null;
      break;
    case 'choose': {
      const index = player.hand.findIndex(card => card.uid === command.uid);
      const card = player.hand.splice(index, 1)[0];
      if (pending?.kind === 'trash') {
        state.trash.push(card);
        log(state, `${player.name}：${CARDS[card.id].name}を廃棄。`);
        const mine = pending.source === 'mine';
        gainPrompt(state, actor, CARDS[card.id].cost + (mine ? 3 : 2), mine, mine);
      } else {
        player.discard.push(card);
        log(state, `${player.name}：${CARDS[card.id].name}を捨て札へ。`);
        if (pending?.kind === 'cellar') pending.discarded++;
        else if (pending?.kind === 'militia' && player.hand.length <= 3) state.pending = null;
      }
      break;
    }
    case 'done':
      if (pending?.kind === 'cellar') draw(state, actor, pending.discarded);
      state.pending = null;
      break;
    case 'reveal':
      log(state, `${player.name}：堀を公開し、民兵を防御。`);
      state.pending = null;
      break;
    case 'decline': militiaDiscard(state, actor); break;
    case 'end-turn': endTurn(state); break;
    case 'resign':
      state.phase = 'ended'; state.pending = null; state.winner = actor === 0 ? 1 : 0;
      state.endReason = `${player.name}が投了しました。`; log(state, state.endReason);
      break;
  }
  return state;
}

export function instruction(state: GameState): string {
  if (state.phase === 'ended') return state.endReason;
  const pending = state.pending;
  if (pending) {
    const prefix = `${state.players[pending.player].name}：`;
    switch (pending.kind) {
      case 'cellar': return `${prefix}捨てる手札を選択。選択完了で${pending.discarded}枚引きます。`;
      case 'trash': return `${prefix}${pending.source === 'mine' ? '財宝' : '手札'}1枚を選んで廃棄。`;
      case 'gain': return `${prefix}${pending.maxCost}コスト以下の${pending.treasureOnly ? '財宝' : 'カード'}をサプライから獲得。`;
      case 'reaction': return `${prefix}堀を公開して民兵を防ぎますか？`;
      case 'militia': return `${prefix}あと${state.players[pending.player].hand.length - 3}枚、手札を捨ててください。`;
    }
  }
  if (state.active === 1) return 'CPUのターンです。';
  if (state.phase === 'action') return state.actions > 0 && state.players[0].hand.some(card => CARDS[card.id].type === 'action')
    ? 'アクションカードを使用するか、購入へ進んでください。' : '「購入へ」を押して、財宝を使用しましょう。';
  return state.bought ? '購入を続けるか、ターンを終了してください。' : '財宝を使用して、サプライのカードを購入しましょう。';
}

function keepValue(card: Card): number {
  const definition = CARDS[card.id];
  if (definition.type === 'curse' || definition.type === 'victory') return -10 + (definition.points ?? 0);
  if (definition.type === 'treasure') return (definition.coins ?? 0) * 3;
  return ({ village: 8, market: 10, merchant: 9, smithy: 7, militia: 7 } as Partial<Record<CardId, number>>)[card.id] ?? 2;
}

function desiredCard(state: GameState, who: PlayerId, available: CardId[]): CardId | undefined {
  const cards = owned(state.players[who]);
  const count = (id: CardId) => cards.filter(card => card.id === id).length;
  const value = (id: CardId) => {
    if (id === 'province') return 100;
    if (id === 'duchy') return state.supply.province <= 4 ? 85 : 5;
    if (id === 'estate') return state.supply.province <= 2 ? 75 : -2;
    if (id === 'curse') return -100;
    if (id === 'gold') return 80;
    if (id === 'silver') return 45;
    if (id === 'copper') return -1;
    if (id === 'market') return 70;
    const priorities: Partial<Record<CardId, number>> = { smithy: 62, militia: 60, village: 53, merchant: 50, mine: 55, moat: 35, cellar: 25, workshop: 20, remodel: 20 };
    return (priorities[id] ?? 0) - count(id) * 22;
  };
  return [...available].sort((a, b) => value(b) - value(a))[0];
}

export function botCommand(state: GameState): Command | null {
  if (state.phase === 'ended' || inputPlayer(state) !== 1) return null;
  const hand = state.players[1].hand;
  const pending = state.pending;
  if (pending) {
    if (pending.kind === 'reaction') return { type: 'reveal' };
    if (pending.kind === 'gain') {
      const card = desiredCard(state, 1, ALL_CARDS.filter(id => canGain(state, id)));
      return card ? { type: 'gain', card } : null;
    }
    if (pending.kind === 'cellar') {
      const card = hand.find(entry => CARDS[entry.id].type === 'victory' || CARDS[entry.id].type === 'curse');
      return card ? { type: 'choose', uid: card.uid } : { type: 'done' };
    }
    const choices = hand.filter(card => canChoose(state, card));
    if (pending.kind === 'trash' && pending.source === 'mine') {
      const card = choices.find(entry => entry.id === 'silver' && state.supply.gold > 0)
        ?? choices.find(entry => entry.id === 'copper' && state.supply.silver > 0);
      return card ? { type: 'choose', uid: card.uid } : { type: 'done' };
    }
    const card = choices.sort((a, b) => keepValue(a) - keepValue(b))[0];
    return card ? { type: 'choose', uid: card.uid } : null;
  }
  if (state.phase === 'action') {
    const priority: CardId[] = ['village', 'market', 'merchant', 'cellar', 'smithy', 'militia', 'moat', 'mine', 'remodel', 'workshop'];
    const card = [...hand].filter(entry => canPlay(state, entry)).sort((a, b) => priority.indexOf(a.id) - priority.indexOf(b.id))[0];
    return card ? { type: 'play', uid: card.uid } : { type: 'buy-phase' };
  }
  if (!state.bought && hand.some(card => CARDS[card.id].type === 'treasure')) return { type: 'treasures' };
  const available = ALL_CARDS.filter(id => canBuy(state, id) && id !== 'curse' && id !== 'copper'
    && (id !== 'estate' || state.supply.province <= 2));
  const card = desiredCard(state, 1, available);
  return card ? { type: 'buy', card } : { type: 'end-turn' };
}
