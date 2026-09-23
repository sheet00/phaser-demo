import { ALL_CARDS, ALL_KINGDOM, BASE, CARDS, KINGDOM, hasType } from './cards.ts';
import type { CardId } from './cards.ts';
import type { ExpansionAPI, ExpansionPending, ExpansionTask } from './expansions/types.ts';
import { intrigueEffect, intrigueChoice, intrigueBot } from './expansions/intrigue.ts';

export type PlayerId = 0 | 1;
export interface Card { uid: number; id: CardId }
export interface Player {
  name: string;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  played: Card[];
  aside: Card[];
  turns: number;
}
export type Pending =
  | ExpansionPending
  | { kind: 'cellar'; player: PlayerId; discarded: number }
  | { kind: 'trash'; player: PlayerId; source: 'mine' | 'remodel' }
  | { kind: 'gain'; player: PlayerId; maxCost: number; treasureOnly: boolean; toHand: boolean }
  | { kind: 'reaction'; player: PlayerId; attack: Attack; blocked?: boolean; resume?: ExpansionTask }
  | { kind: 'militia'; player: PlayerId }
  | { kind: 'chapel'; player: PlayerId; remaining: number }
  | { kind: 'harbinger' | 'throneRoom' | 'bureaucrat' | 'moneylender' | 'topdeck' | 'bandit'; player: PlayerId }
  | { kind: 'poacher'; player: PlayerId; remaining: number }
  | { kind: 'vassal' | 'library'; player: PlayerId; uid: number }
  | { kind: 'sentry'; player: PlayerId; stage: 'trash' | 'discard' | 'order'; order: number[] };

export type Attack = 'militia' | 'witch' | 'bureaucrat' | 'bandit' | 'swindler' | 'minion' | 'replace' | 'torturer';
type Effect =
  | ({ kind: 'expansion' } & ExpansionTask)
  | { kind: 'action'; player: PlayerId; card: CardId; uid?: number }
  | { kind: 'attack'; player: PlayerId; card: Attack; blocked?: boolean; resume?: ExpansionTask }
  | { kind: 'library' | 'topdeck'; player: PlayerId };

export interface GameState {
  players: [Player, Player];
  active: PlayerId;
  phase: 'action' | 'buy' | 'ended';
  actions: number;
  buys: number;
  coins: number;
  bought: boolean;
  merchants: number;
  costReduction: number;
  actionsPlayed: number;
  masqueradePass: [Card | null, Card | null];
  silverPlayed: boolean;
  supply: Record<CardId, number>;
  kingdom: CardId[];
  effects: Effect[];
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
  | { type: 'option'; value: string }
  | { type: 'play'; uid: number }
  | { type: 'choose'; uid: number }
  | { type: 'buy'; card: CardId }
  | { type: 'gain'; card: CardId }
  | { type: 'buy-phase' | 'treasures' | 'end-turn' | 'done' | 'reveal' | 'decline' | 'resign' | 'accept' | 'diplomat' };

export function owned(player: Player): Card[] {
  return [...player.deck, ...player.hand, ...player.discard, ...player.played, ...player.aside];
}

export function score(player: Player): number {
  const cards = owned(player);
  return cards.reduce((sum, card) => sum + (card.id === 'gardens' ? Math.floor(cards.length / 10) : card.id === 'duke' ? cards.filter(entry => entry.id === 'duchy').length : CARDS[card.id].points ?? 0), 0);
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

function shuffle<T>(state: GameState, cards: T[]) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random(state) * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
}

function takeTop(state: GameState, who: PlayerId): Card | undefined {
  const player = state.players[who];
  if (!player.deck.length && player.discard.length) {
    player.deck = player.discard;
    player.discard = [];
    shuffle(state, player.deck);
    log(state, `${player.name}：捨て札をシャッフル。`);
  }
  return player.deck.pop();
}

function draw(state: GameState, who: PlayerId, count: number) {
  for (let i = 0; i < count; i++) {
    const card = takeTop(state, who);
    if (!card) break;
    state.players[who].hand.push(card);
  }
}

export function supplyCards(state: GameState): CardId[] {
  return [...BASE, ...state.kingdom];
}

function emptyPiles(state: GameState): number {
  return supplyCards(state).filter(id => state.supply[id] === 0).length;
}

function startTurn(state: GameState) {
  state.phase = 'action';
  state.actions = 1;
  state.buys = 1;
  state.coins = 0;
  state.bought = false;
  state.merchants = 0;
  state.costReduction = 0;
  state.actionsPlayed = 0;
  state.silverPlayed = false;
  state.pending = null;
  state.effects = [];
  const player = state.players[state.active];
  player.turns++;
  log(state, `── ${player.name}：ターン ${player.turns} ──`);
}

export function createGame(seed = Date.now(), kingdom?: readonly CardId[], pool: readonly CardId[] = KINGDOM): GameState {
  if (kingdom && (kingdom.length !== 10 || new Set(kingdom).size !== 10 || kingdom.some(id => !ALL_KINGDOM.includes(id)))) {
    throw new Error("王国カードは重複のない10種類を指定してください。");
  }
  if (pool.length < 10 || new Set(pool).size !== pool.length || pool.some(id => !ALL_KINGDOM.includes(id))) throw new Error('抽選対象の王国カードが不正です。');
  const player = (name: string): Player => ({ name, deck: [], hand: [], discard: [], played: [], aside: [], turns: 0 });
  const supply = Object.fromEntries(ALL_CARDS.map(id => [id, 0])) as Record<CardId, number>;
  Object.assign(supply, { copper: 46, silver: 40, gold: 30, estate: 8, duchy: 8, province: 8, curse: 10 });
  const state: GameState = {
    players: [player('あなた'), player('CPU')], active: 0, phase: 'action', actions: 1, buys: 1, coins: 0,
    bought: false, merchants: 0, costReduction: 0, actionsPlayed: 0, masqueradePass: [null, null], silverPlayed: false, supply, kingdom: [], effects: [], trash: [], pending: null, log: [], nextLog: 1,
    nextUid: 1, seed: (seed >>> 0) || 1, winner: null, endReason: '',
  };
  const candidates = [...pool];
  shuffle(state, candidates);
  state.kingdom = (kingdom ? [...kingdom] : candidates.slice(0, 10))
    .sort((a, b) => CARDS[a].cost - CARDS[b].cost || ALL_KINGDOM.indexOf(a) - ALL_KINGDOM.indexOf(b));
  for (const id of state.kingdom) state.supply[id] = hasType(id, 'victory') ? 8 : 10;
  state.active = random(state) < 0.5 ? 0 : 1;
  for (const who of [0, 1] as const) {
    for (let i = 0; i < 10; i++) state.players[who].deck.push({ uid: state.nextUid++, id: i < 7 ? 'copper' : 'estate' });
    shuffle(state, state.players[who].deck);
    draw(state, who, 5);
  }
  log(state, `王国カード：${state.kingdom.map(id => CARDS[id].name).join('・')}`);
  startTurn(state);
  return state;
}

export function inputPlayer(state: GameState): PlayerId {
  return state.pending?.player ?? state.active;
}

export function canPlay(state: GameState, card: Card): boolean {
  if (state.pending || state.phase === 'ended') return false;
  if (!state.players[state.active].hand.some(entry => entry.uid === card.uid)) return false;
  return hasType(card.id, 'action')
    ? state.phase === 'action' && state.actions > 0
    : hasType(card.id, 'treasure') && state.phase === 'buy' && !state.bought;
}

export function canBuy(state: GameState, id: CardId): boolean {
  return !state.pending && state.phase === 'buy' && state.buys > 0 && supplyCards(state).includes(id) && state.supply[id] > 0 && cardCost(state, id) <= state.coins;
}

export function canGain(state: GameState, id: CardId): boolean {
  const pending = state.pending;
  if (pending?.kind === 'expansion') return pending.zone === 'supply' && pending.choices.includes(id);
  return pending?.kind === 'gain' && supplyCards(state).includes(id) && state.supply[id] > 0 && cardCost(state, id) <= pending.maxCost
    && (!pending.treasureOnly || hasType(id, 'treasure'));
}

export function choiceCards(state: GameState): Card[] {
  const pending = state.pending;
  if (!pending) return [];
  const player = state.players[pending.player];
  switch (pending.kind) {
    case 'expansion': {
      const zone = pending.zone === 'trash' ? state.trash : pending.zone === 'hand' ? player.hand : pending.zone === 'aside' ? player.aside : [];
      return zone.filter(card => pending.choices.includes(String(card.uid)));
    }
    case 'harbinger': return player.discard;
    case 'vassal': return player.discard.filter(card => card.uid === pending.uid);
    case 'library': return player.aside.filter(card => card.uid === pending.uid);
    case 'sentry': return player.aside.filter(card => !pending.order.includes(card.uid));
    case 'bandit': return player.aside;
    default: return player.hand;
  }
}

export function canChoose(state: GameState, card: Card): boolean {
  const pending = state.pending;
  if (!pending || !choiceCards(state).some(entry => entry.uid === card.uid)) return false;
  switch (pending.kind) {
    case 'expansion': return true;
    case 'cellar': case 'militia': case 'chapel': case 'poacher': case 'harbinger': case 'topdeck': case 'sentry': return true;
    case 'trash': return pending.source === 'remodel' || hasType(card.id, 'treasure');
    case 'throneRoom': case 'vassal': return hasType(card.id, 'action');
    case 'bureaucrat': return hasType(card.id, 'victory');
    case 'moneylender': return card.id === 'copper';
    case 'bandit': return hasType(card.id, 'treasure') && card.id !== 'copper';
    default: return false;
  }
}

export function canDone(state: GameState): boolean {
  const pending = state.pending;
  if (pending?.kind === 'expansion') return pending.optional;
  return !!pending && (['cellar', 'chapel', 'harbinger', 'throneRoom', 'moneylender', 'vassal', 'library', 'sentry'].includes(pending.kind)
    || (pending.kind === 'trash' && pending.source === 'mine'));
}

function gainPrompt(state: GameState, player: PlayerId, maxCost: number, treasureOnly = false, toHand = false) {
  state.pending = { kind: 'gain', player, maxCost, treasureOnly, toHand };
  if (!ALL_CARDS.some(id => canGain(state, id))) {
    state.pending = null;
    log(state, '獲得できるカードがないため、効果を終了。');
  }
}

function opponent(who: PlayerId): PlayerId { return who === 0 ? 1 : 0; }

function moveCard(state: GameState, who: PlayerId, from: 'hand' | 'discard' | 'aside' | 'played' | 'trash', uid: number, to: 'deck' | 'discard' | 'hand' | 'played' | 'trash') {
  const player = state.players[who];
  const origin = from === 'trash' ? state.trash : player[from];
  const index = origin.findIndex(card => card.uid === uid);
  const card = origin.splice(index, 1)[0];
  (to === 'trash' ? state.trash : player[to]).push(card);
  if (to === 'trash' || to === 'discard') log(state, `${player.name}：${CARDS[card.id].name}を${to === 'trash' ? '廃棄' : '捨て札へ'}。`);
  return card;
}

function resolveAttack(state: GameState, who: PlayerId, attack: Attack) {
  const player = state.players[who];
  if (intrigueEffect(state, expansionAPI, { player: who, source: attack, step: 'attack' })) return;
  switch (attack) {
    case 'militia':
      if (player.hand.length > 3) state.pending = { kind: 'militia', player: who };
      break;
    case 'witch': gain(state, who, 'curse'); break;
    case 'bureaucrat':
      if (player.hand.some(card => hasType(card.id, 'victory'))) state.pending = { kind: 'bureaucrat', player: who };
      else log(state, `${player.name}：勝利点なし。手札を公開：${player.hand.map(card => CARDS[card.id].name).join('・') || 'なし'}。`);
      break;
    case 'bandit':
      for (let i = 0; i < 2; i++) {
        const card = takeTop(state, who);
        if (card) player.aside.push(card);
      }
      log(state, `${player.name}：山賊で公開：${player.aside.map(card => CARDS[card.id].name).join('・') || 'なし'}。`);
      if (player.aside.some(card => hasType(card.id, 'treasure') && card.id !== 'copper')) state.pending = { kind: 'bandit', player: who };
      else player.discard.push(...player.aside.splice(0));
      break;
  }
}

function actionEffect(state: GameState, who: PlayerId, id: CardId, uid?: number) {
  const player = state.players[who];
  log(state, `${player.name}：${CARDS[id].name}を使用。`);
  state.actionsPlayed++;
  if (intrigueEffect(state, expansionAPI, { player: who, source: id, step: 'play', uid })) return;
  const attack = (card: Attack) => state.effects.unshift({ kind: 'attack', player: opponent(who), card });
  switch (id) {
    case 'village': state.actions += 2; draw(state, who, 1); break;
    case 'smithy': draw(state, who, 3); break;
    case 'moat': draw(state, who, 2); break;
    case 'market': state.actions++; state.buys++; state.coins++; draw(state, who, 1); break;
    case 'merchant': state.actions++; state.merchants++; draw(state, who, 1); break;
    case 'cellar': state.actions++; state.pending = { kind: 'cellar', player: who, discarded: 0 }; break;
    case 'workshop': gainPrompt(state, who, 4); break;
    case 'remodel':
      if (player.hand.length) state.pending = { kind: 'trash', player: who, source: 'remodel' };
      break;
    case 'mine':
      if (player.hand.some(card => hasType(card.id, 'treasure'))) state.pending = { kind: 'trash', player: who, source: 'mine' };
      break;
    case 'militia': state.coins += 2; attack(id); break;
    case 'chapel':
      if (player.hand.length) state.pending = { kind: 'chapel', player: who, remaining: 4 };
      break;
    case 'harbinger':
      draw(state, who, 1); state.actions++;
      if (player.discard.length) state.pending = { kind: 'harbinger', player: who };
      break;
    case 'vassal': {
      state.coins += 2;
      const card = takeTop(state, who);
      if (card) {
        player.discard.push(card);
        log(state, `${player.name}：家臣で${CARDS[card.id].name}を捨て札へ。`);
        if (hasType(card.id, 'action')) state.pending = { kind: 'vassal', player: who, uid: card.uid };
      }
      break;
    }
    case 'bureaucrat': gain(state, who, 'silver', false, true); attack(id); break;
    case 'moneylender':
      if (player.hand.some(card => card.id === 'copper')) state.pending = { kind: 'moneylender', player: who };
      break;
    case 'poacher': {
      draw(state, who, 1); state.actions++; state.coins++;
      const remaining = Math.min(emptyPiles(state), player.hand.length);
      if (remaining) state.pending = { kind: 'poacher', player: who, remaining };
      break;
    }
    case 'throneRoom':
      if (player.hand.some(card => hasType(card.id, 'action'))) state.pending = { kind: 'throneRoom', player: who };
      break;
    case 'bandit': gain(state, who, 'gold'); attack(id); break;
    case 'festival': state.actions += 2; state.buys++; state.coins += 2; break;
    case 'laboratory': draw(state, who, 2); state.actions++; break;
    case 'councilRoom': draw(state, who, 4); state.buys++; draw(state, opponent(who), 1); break;
    case 'witch': draw(state, who, 2); attack(id); break;
    case 'artisan':
      state.effects.unshift({ kind: 'topdeck', player: who });
      gainPrompt(state, who, 5, false, true);
      break;
    case 'library': state.effects.unshift({ kind: 'library', player: who }); break;
    case 'sentry':
      draw(state, who, 1); state.actions++;
      for (let i = 0; i < 2; i++) {
        const card = takeTop(state, who);
        if (card) player.aside.push(card);
      }
      if (player.aside.length) state.pending = { kind: 'sentry', player: who, stage: 'trash', order: [] };
      break;
  }
}

// 選択が必要になった時点で中断し、その解決後に残りの効果を再開する。
// 玉座の間を重ねても、最初の使用を完了してから2回目を解決する。
function resolveEffects(state: GameState) {
  while (!state.pending && state.effects.length && state.phase !== 'ended') {
    const effect = state.effects.shift()!;
    const player = state.players[effect.player];
    switch (effect.kind) {
      case 'action': actionEffect(state, effect.player, effect.card, effect.uid); break;
      case 'expansion': intrigueEffect(state, expansionAPI, effect); break;
      case 'attack':
        if ((!effect.blocked && player.hand.some(card => card.id === 'moat')) || canReactDiplomat(state, effect.player)) {
          state.pending = { kind: 'reaction', player: effect.player, attack: effect.card, blocked: effect.blocked, resume: effect.resume };
        } else if (effect.resume) intrigueEffect(state, expansionAPI, { ...effect.resume, blocked: effect.blocked });
        else if (!effect.blocked) resolveAttack(state, effect.player, effect.card);
        break;
      case 'topdeck':
        if (player.hand.length) state.pending = { kind: 'topdeck', player: effect.player };
        break;
      case 'library': {
        while (player.hand.length < 7) {
          const card = takeTop(state, effect.player);
          if (!card) break;
          if (hasType(card.id, 'action')) {
            player.aside.push(card);
            state.pending = { kind: 'library', player: effect.player, uid: card.uid };
            state.effects.unshift(effect);
            break;
          }
          player.hand.push(card);
        }
        if (!state.pending) player.discard.push(...player.aside.splice(0));
        break;
      }
    }
  }
}

function play(state: GameState, uid: number) {
  const who = state.active;
  const card = moveCard(state, who, 'hand', uid, 'played');
  if (hasType(card.id, 'treasure')) {
    log(state, `${state.players[who].name}：${CARDS[card.id].name}を使用。`);
    state.coins += CARDS[card.id].coins ?? 0;
    if (card.id === 'silver' && !state.silverPlayed) {
      state.coins += state.merchants;
      state.silverPlayed = true;
      if (state.merchants) log(state, `商人の効果：+${state.merchants}コイン。`);
    }
  } else {
    state.actions--;
    state.effects.unshift({ kind: 'action', player: who, card: card.id, uid: card.uid });
  }
}

function gain(state: GameState, who: PlayerId, id: CardId, toHand = false, toDeck = false) {
  if (state.supply[id] <= 0 || !supplyCards(state).includes(id)) return;
  state.supply[id]--;
  state.players[who][toDeck ? 'deck' : toHand ? 'hand' : 'discard'].push({ uid: state.nextUid++, id });
  log(state, `${state.players[who].name}：${CARDS[id].name}を${toDeck ? '山札の上へ' : toHand ? '手札へ' : '捨て札へ'}獲得。`);
}

function endTurn(state: GameState) {
  const player = state.players[state.active];
  player.discard.push(...player.played, ...player.hand);
  player.played = [];
  player.hand = [];
  draw(state, state.active, 5);
  const empty = emptyPiles(state);
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
    case 'choose': return choiceCards(state).some(card => card.uid === command.uid && canChoose(state, card));
    case 'buy': return canBuy(state, command.card);
    case 'gain': return canGain(state, command.card);
    case 'done': return canDone(state);
    case 'accept': return pending?.kind === 'library' || pending?.kind === 'vassal';
    case 'reveal': return pending?.kind === 'reaction' && !pending.blocked && hand.some(card => card.id === 'moat');
    case 'decline': return pending?.kind === 'reaction';
    case 'diplomat': return pending?.kind === 'reaction' && canReactDiplomat(state, actor);
    case 'option': return pending?.kind === 'expansion' && pending.zone === 'options' && pending.choices.includes(command.value);
    case 'buy-phase': return !pending && state.phase === 'action';
    case 'treasures': return !pending && state.phase === 'buy' && !state.bought && hand.some(card => hasType(card.id, 'treasure'));
    case 'end-turn': return !pending && state.phase === 'buy';
  }
}

function finishSentry(state: GameState) {
  const pending = state.pending;
  if (pending?.kind !== 'sentry') return;
  const player = state.players[pending.player];
  const ordered = [...pending.order.map(uid => player.aside.find(card => card.uid === uid)!),
    ...player.aside.filter(card => !pending.order.includes(card.uid))];
  player.deck.push(...ordered.reverse());
  player.aside = [];
  state.pending = null;
}

function advanceSentry(state: GameState) {
  const pending = state.pending;
  if (pending?.kind !== 'sentry') return;
  if (!state.players[pending.player].aside.length) { state.pending = null; return; }
  if (pending.stage === 'trash') pending.stage = 'discard';
  else if (pending.stage === 'discard') {
    pending.stage = 'order';
    if (state.players[pending.player].aside.length <= 1) finishSentry(state);
  } else finishSentry(state);
}

function choose(state: GameState, who: PlayerId, uid: number) {
  const pending = state.pending;
  if (!pending) return;
  const player = state.players[who];
  switch (pending.kind) {
    case 'expansion': intrigueChoice(state, expansionAPI, pending, String(uid)); break;
    case 'trash': {
      const card = moveCard(state, who, 'hand', uid, 'trash');
      const mine = pending.source === 'mine';
      gainPrompt(state, who, cardCost(state, card.id) + (mine ? 3 : 2), mine, mine);
      break;
    }
    case 'cellar': moveCard(state, who, 'hand', uid, 'discard'); pending.discarded++; break;
    case 'militia':
      moveCard(state, who, 'hand', uid, 'discard');
      if (player.hand.length <= 3) state.pending = null;
      break;
    case 'poacher':
      moveCard(state, who, 'hand', uid, 'discard');
      if (--pending.remaining === 0 || !player.hand.length) state.pending = null;
      break;
    case 'chapel':
      moveCard(state, who, 'hand', uid, 'trash');
      if (--pending.remaining === 0 || !player.hand.length) state.pending = null;
      break;
    case 'moneylender':
      moveCard(state, who, 'hand', uid, 'trash'); state.coins += 3; state.pending = null;
      break;
    case 'harbinger': moveCard(state, who, 'discard', uid, 'deck'); state.pending = null; break;
    case 'bureaucrat': {
      const card = moveCard(state, who, 'hand', uid, 'deck');
      log(state, `${player.name}：${CARDS[card.id].name}を公開し山札の上へ。`);
      state.pending = null;
      break;
    }
    case 'topdeck': moveCard(state, who, 'hand', uid, 'deck'); state.pending = null; break;
    case 'throneRoom': case 'vassal': {
      const card = moveCard(state, who, pending.kind === 'vassal' ? 'discard' : 'hand', uid, 'played');
      const effect: Effect = { kind: 'action', player: who, card: card.id, uid: card.uid };
      state.effects.unshift(effect);
      if (pending.kind === 'throneRoom') state.effects.unshift({ ...effect });
      state.pending = null;
      break;
    }
    case 'bandit':
      moveCard(state, who, 'aside', uid, 'trash');
      player.discard.push(...player.aside.splice(0));
      state.pending = null;
      break;
    case 'sentry':
      if (pending.stage === 'order') {
        pending.order.push(uid);
        if (pending.order.length >= player.aside.length - 1) finishSentry(state);
      } else {
        moveCard(state, who, 'aside', uid, pending.stage === 'trash' ? 'trash' : 'discard');
        if (!player.aside.length) state.pending = null;
      }
      break;
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
      for (const card of [...player.hand]) if (hasType(card.id, 'treasure')) play(state, card.uid);
      break;
    case 'buy':
      state.coins -= cardCost(state, command.card);
      state.buys--;
      state.bought = true;
      gain(state, actor, command.card);
      break;
    case 'option': if (pending?.kind === 'expansion') intrigueChoice(state, expansionAPI, pending, command.value); break;
    case 'gain':
      if (pending?.kind === 'expansion') { intrigueChoice(state, expansionAPI, pending, command.card); break; }
      if (pending?.kind === 'gain') gain(state, actor, command.card, pending.toHand);
      state.pending = null;
      break;
    case 'choose': choose(state, actor, command.uid); break;
    case 'accept':
      if (pending?.kind === 'library') moveCard(state, actor, 'aside', pending.uid, 'hand');
      if (pending?.kind === 'vassal') {
        const card = moveCard(state, actor, 'discard', pending.uid, 'played');
        state.effects.unshift({ kind: 'action', player: actor, card: card.id, uid: card.uid });
      }
      state.pending = null;
      break;
    case 'done':
      if (pending?.kind === 'expansion') { intrigueChoice(state, expansionAPI, pending, null); break; }
      if (pending?.kind === 'cellar') draw(state, actor, pending.discarded);
      if (pending?.kind === 'sentry') advanceSentry(state);
      else state.pending = null;
      break;
    case 'reveal':
      if (pending?.kind === 'reaction') log(state, `${player.name}：堀を公開し、${CARDS[pending.attack].name}を防御。`);
      state.pending = null;
      if (pending?.kind === 'reaction' && canReactDiplomat(state, actor)) {
        state.effects.unshift({ kind: 'attack', player: actor, card: pending.attack, blocked: true, resume: pending.resume });
      }
      else if (pending?.kind === 'reaction' && pending.resume) intrigueEffect(state, expansionAPI, { ...pending.resume, blocked: true });
      break;
    case 'diplomat':
      if (pending?.kind === 'reaction') {
        state.pending = null;
        state.effects.unshift({ kind: 'attack', player: actor, card: pending.attack, blocked: pending.blocked, resume: pending.resume });
        intrigueEffect(state, expansionAPI, { player: actor, source: 'diplomat', step: 'reaction' });
      }
      break;
    case 'decline':
      state.pending = null;
      if (pending?.kind === 'reaction' && pending.resume) intrigueEffect(state, expansionAPI, { ...pending.resume, blocked: pending.blocked });
      else if (pending?.kind === 'reaction' && !pending.blocked) resolveAttack(state, actor, pending.attack);
      break;
    case 'end-turn': endTurn(state); break;
    case 'resign':
      state.phase = 'ended'; state.pending = null; state.effects = []; state.winner = actor === 0 ? 1 : 0;
      state.endReason = `${player.name}が投了しました。`; log(state, state.endReason);
      break;
  }
  resolveEffects(state);
  return state;
}

export function instruction(state: GameState): string {
  if (state.phase === 'ended') return state.endReason;
  const pending = state.pending;
  if (pending) {
    const prefix = `${state.players[pending.player].name}：`;
    switch (pending.kind) {
      case 'expansion': return `${prefix}${pending.message}`;
      case 'cellar': return `${prefix}捨てる手札を選択。選択完了で${pending.discarded}枚引きます。`;
      case 'trash': return `${prefix}${pending.source === 'mine' ? '財宝' : '手札'}1枚を選んで廃棄。`;
      case 'gain': return `${prefix}${pending.maxCost}コスト以下の${pending.treasureOnly ? '財宝' : 'カード'}をサプライから獲得。`;
      case 'reaction': return `${prefix}${CARDS[pending.attack].name}へのリアクションを選択。`;
      case 'chapel': return `${prefix}廃棄する手札を選択（あと最大${pending.remaining}枚）。途中で終了できます。`;
      case 'harbinger': return `${prefix}捨て札から山札の上に戻す1枚を選択。戻さなくても構いません。`;
      case 'vassal': return `${prefix}家臣で捨てたアクションを使用しますか？`;
      case 'throneRoom': return `${prefix}2回使用するアクションを手札から選択。使用しなくても構いません。`;
      case 'bureaucrat': return `${prefix}手札の勝利点1枚を公開して山札の上に戻してください。`;
      case 'moneylender': return `${prefix}銅貨を1枚廃棄すると3コイン。廃棄しなくても構いません。`;
      case 'poacher': return `${prefix}空の山の数に応じて、あと${pending.remaining}枚捨ててください。`;
      case 'topdeck': return `${prefix}手札から山札の一番上に戻す1枚を選択。`;
      case 'bandit': return `${prefix}公開された銅貨以外の財宝1枚を選んで廃棄。`;
      case 'library': return `${prefix}このアクションを手札に加えるか、脇に置いて次を引くか選択。`;
      case 'sentry': return `${prefix}${pending.stage === 'trash' ? '廃棄するカードを選択し、次へ。' : pending.stage === 'discard' ? '捨てるカードを選択し、次へ。' : '次に引きたいカードを選択して一番上へ。'} `;
      case 'militia': return `${prefix}あと${state.players[pending.player].hand.length - 3}枚、手札を捨ててください。`;
    }
  }
  if (state.active === 1) return 'CPUのターンです。';
  if (state.phase === 'action') return state.actions > 0 && state.players[0].hand.some(card => hasType(card.id, 'action'))
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
    if (id === 'market' || id === 'laboratory') return 70;
    if (id === 'gardens') return cards.length >= 25 ? 65 : 8;
    if (id === 'witch') return (state.supply.curse > 0 ? 76 : 50) - count(id) * 20;
    const priorities: Partial<Record<CardId, number>> = { smithy: 62, militia: 60, village: 53, merchant: 50, mine: 55, moat: 35, cellar: 25, workshop: 20, remodel: 20, chapel: 40, harbinger: 42, vassal: 40, bureaucrat: 35, moneylender: 52, poacher: 56, throneRoom: 58, bandit: 68, festival: 65, library: 58, sentry: 74, artisan: 65, councilRoom: 61 };
    if (id === 'duke') return count('duchy') >= 4 ? 85 : 5;
    return (priorities[id] ?? (hasType(id, 'action') || hasType(id, 'treasure') ? 35 + CARDS[id].cost * 5 : 0)) - count(id) * 22;
  };
  return [...available].sort((a, b) => value(b) - value(a))[0];
}

export function botCommand(state: GameState, who: PlayerId = 1): Command | null {
  if (state.phase === 'ended' || inputPlayer(state) !== who) return null;
  const hand = state.players[who].hand;
  const pending = state.pending;
  if (pending) {
    if (pending.kind === 'reaction') return !pending.blocked && hand.some(card => card.id === 'moat') ? { type: 'reveal' } : canReactDiplomat(state, who) ? { type: 'diplomat' } : { type: 'decline' };
    if (pending.kind === 'expansion') return intrigueBot(state, pending);
    if (pending.kind === 'gain') {
      const card = desiredCard(state, who, supplyCards(state).filter(id => canGain(state, id)));
      return card ? { type: 'gain', card } : null;
    }
    const choices = choiceCards(state).filter(card => canChoose(state, card));
    const choose = (card: Card | undefined): Command => card ? { type: 'choose', uid: card.uid } : { type: 'done' };
    if (pending.kind === 'cellar') return choose(hand.find(entry => hasType(entry.id, 'victory') || hasType(entry.id, 'curse')));
    if (pending.kind === 'chapel') return choose(choices.find(card => shouldTrash(state, who, card)));
    if (pending.kind === 'harbinger') return choose([...choices].sort((a, b) => keepValue(b) - keepValue(a)).find(card => keepValue(card) > 3));
    if (pending.kind === 'vassal') return { type: 'accept' };
    if (pending.kind === 'library') return { type: state.actions > 0 ? 'accept' : 'done' };
    if (pending.kind === 'throneRoom') return choose([...choices].sort((a, b) => actionPriority(a.id) - actionPriority(b.id))[0]);
    if (pending.kind === 'sentry') {
      if (pending.stage === 'trash') return choose(choices.find(card => shouldTrash(state, who, card)));
      if (pending.stage === 'discard') return choose(choices.find(card => keepValue(card) < 0));
      return choose([...choices].sort((a, b) => keepValue(b) - keepValue(a))[0]);
    }
    if (pending.kind === 'trash' && pending.source === 'mine') {
      const card = choices.find(entry => entry.id === 'silver' && state.supply.gold > 0)
        ?? choices.find(entry => entry.id === 'copper' && state.supply.silver > 0);
      return choose(card);
    }
    return choose([...choices].sort((a, b) => keepValue(a) - keepValue(b))[0]);
  }
  if (state.phase === 'action') {
    const card = [...hand].filter(entry => canPlay(state, entry)).sort((a, b) => actionPriority(a.id) - actionPriority(b.id))[0];
    return card ? { type: 'play', uid: card.uid } : { type: 'buy-phase' };
  }
  if (!state.bought && hand.some(card => hasType(card.id, 'treasure'))) return { type: 'treasures' };
  const available = supplyCards(state).filter(id => canBuy(state, id) && id !== 'curse' && id !== 'copper'
    && (id !== 'estate' || state.supply.province <= 2));
  const card = desiredCard(state, who, available);
  return card ? { type: 'buy', card } : { type: 'end-turn' };
}

function shouldTrash(state: GameState, who: PlayerId, card: Card): boolean {
  if (card.id === 'curse') return true;
  if (card.id === 'estate') return state.supply.province > 3;
  if (card.id !== 'copper') return false;
  const wealth = owned(state.players[who]).reduce((sum, entry) => sum + (CARDS[entry.id].coins ?? 0), 0);
  return wealth > 5;
}

function actionPriority(id: CardId): number {
  const priority: CardId[] = ['throneRoom', 'shantyTown', 'miningVillage', 'nobles', 'lurker', 'pawn', 'mill', 'wishingWell', 'secretPassage', 'upgrade', 'minion', 'village', 'festival', 'laboratory', 'market', 'sentry', 'merchant', 'harbinger', 'poacher', 'cellar',
    'witch', 'councilRoom', 'smithy', 'library', 'bandit', 'militia', 'vassal', 'moat', 'artisan', 'moneylender', 'chapel', 'mine', 'remodel', 'workshop', 'bureaucrat'];
  const index = priority.indexOf(id);
  return index < 0 ? priority.length : index;
}


export function cardCost(state: GameState, id: CardId): number {
  return Math.max(0, CARDS[id].cost - state.costReduction);
}

export function canReactDiplomat(state: GameState, player: PlayerId): boolean {
  return state.players[player].hand.length >= 5 && state.players[player].hand.some(card => card.id === 'diplomat');
}

const expansionAPI: ExpansionAPI = {
  draw, takeTop, gain, move: moveCard, cost: cardCost, supply: supplyCards, log,
};
