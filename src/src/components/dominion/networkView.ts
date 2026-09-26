import { inputPlayer } from './engine.ts';
import type { Card, GameState, Pending, Player, PlayerId } from './engine.ts';

const covered = (cards: readonly Card[]): Card[] => cards.map((_, index) => ({ uid: -index - 1, id: 'copper' }));

function visiblePlayer(player: Player, own: boolean): Player {
  return {
    name: player.name,
    deck: covered(player.deck),
    hand: own ? player.hand : covered(player.hand),
    discard: player.discard,
    played: player.played,
    aside: own ? player.aside : covered(player.aside),
    islandMat: own ? player.islandMat : covered(player.islandMat),
    nativeVillageMat: own ? player.nativeVillageMat : covered(player.nativeVillageMat),
    blockadeMat: player.blockadeMat.map(entry => ({ blockadeUid: entry.blockadeUid, card: own ? entry.card : covered([entry.card])[0] })),
    havenMat: player.havenMat.map(entry => ({ sourceUid: entry.sourceUid, card: own ? entry.card : covered([entry.card])[0] })),
    durations: player.durations,
    durationResolvedThisTurn: [], gainsThisTurn: [], lastTurnGains: [], sailorUsed: [], sailorGainedUsed: [],
    corsairUsed: 0, outpostPlayed: false, turns: player.turns,
  };
}

function visiblePending(pending: Pending | null, seat: PlayerId): Pending | null {
  if (!pending || pending.player !== seat) return null;
  switch (pending.kind) {
    case 'expansion': return {
      kind: 'expansion', player: seat, source: pending.source, step: pending.step,
      zone: pending.zone, choices: pending.choices, options: pending.options,
      optional: pending.optional, message: pending.message,
    };
    case 'reaction': return {
      kind: 'reaction', player: seat, attack: pending.attack,
      blocked: pending.blocked, diplomatUsed: pending.diplomatUsed,
    };
    case 'durationOrder': return { kind: 'durationOrder', player: seat, entries: [], choices: pending.choices, options: pending.options };
    case 'sentry': return { kind: 'sentry', player: seat, stage: pending.stage, order: pending.order };
    case 'gain': return { kind: 'gain', player: seat, maxCost: pending.maxCost, treasureOnly: pending.treasureOnly, toHand: pending.toHand };
    case 'trash': return { kind: 'trash', player: seat, source: pending.source };
    case 'cellar': return { kind: 'cellar', player: seat, discarded: pending.discarded };
    case 'chapel': return { kind: 'chapel', player: seat, remaining: pending.remaining };
    case 'poacher': return { kind: 'poacher', player: seat, remaining: pending.remaining };
    case 'throneRoom': return { kind: 'throneRoom', player: seat };
    case 'vassal': case 'library': return { kind: pending.kind, player: seat, uid: pending.uid };
    case 'militia': return { kind: 'militia', player: seat };
    case 'harbinger': case 'bureaucrat': case 'moneylender': case 'topdeck': case 'bandit':
      return { kind: pending.kind, player: seat };
  }
  return null;
}

export function projectGame(state: GameState, seat: PlayerId): GameState {
  if (state.phase === 'ended') return state;
  return {
    players: [visiblePlayer(state.players[0], seat === 0), visiblePlayer(state.players[1], seat === 1)],
    active: state.active, phase: state.phase, actions: state.actions, buys: state.buys, coins: state.coins,
    bought: state.bought, merchants: 0, costReduction: state.costReduction, actionsPlayed: state.actionsPlayed,
    masqueradePass: [null, null], silverPlayed: state.silverPlayed, lastTurnPlayer: state.lastTurnPlayer,
    extraTurnRequested: false, isExtraTurn: state.isExtraTurn, nextHandSize: 0, victoryGainedThisBuy: false,
    supply: state.supply, kingdom: state.kingdom, effects: [], trash: state.trash,
    pending: visiblePending(state.pending, seat), log: [], nextLog: 0, nextUid: 0, seed: 0,
    winner: null, endReason: '',
  };
}

export function projectInput(state: GameState): PlayerId {
  return inputPlayer(state);
}
