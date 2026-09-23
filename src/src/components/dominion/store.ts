import { FIRST_GAME, KINGDOM } from './cards';
import { createGame, reduceGame } from './engine';
import type { Command, GameState, PlayerId } from './engine';

import { INTRIGUE_KINGDOM } from './expansions/intrigueCards';
import { SEASIDE_KINGDOM } from './expansions/seasideCards';

export type ExpansionId = 'base' | 'intrigue' | 'seaside';
export type GameMode = 'basic' | 'random';

const BASIC_KINGDOMS: Record<string, readonly import('./cards').CardId[]> = {
  base: FIRST_GAME,
  intrigue: ['baron', 'courtier', 'duke', 'harem', 'ironworks', 'masquerade', 'mill', 'nobles', 'patrol', 'replace'],
  seaside: ['bazaar', 'blockade', 'caravan', 'corsair', 'haven', 'island', 'lookout', 'pirate', 'warehouse', 'wharf'],
  'base,intrigue': ['courtier', 'diplomat', 'minion', 'nobles', 'pawn', 'cellar', 'festival', 'library', 'sentry', 'vassal'],
};

export function basicKingdomFor(expansions: readonly ExpansionId[]) {
  const key = [...expansions].sort().join(',');
  return BASIC_KINGDOMS[key] ?? BASIC_KINGDOMS.base;
}

export function createStore(mode: GameMode = 'random', expansions: readonly ExpansionId[] = ['base']) {
  const selected = [...new Set(expansions)];
  const pool = [...(selected.includes('base') ? KINGDOM : []), ...(selected.includes('intrigue') ? INTRIGUE_KINGDOM : []), ...(selected.includes('seaside') ? SEASIDE_KINGDOM : [])];
  if (mode === 'random' && pool.length < 10) throw new Error('セットを1つ以上選択してください。');
  const basicKingdom = basicKingdomFor(selected);
  const newGame = () => createGame(crypto.getRandomValues(new Uint32Array(1))[0], mode === 'basic' ? basicKingdom : undefined, pool);
  let state = newGame();
  const listeners = new Set<() => void>();
  const actionListeners = new Set<(command: Command, previous: GameState) => void>();
  const soundListeners = new Set<() => void>();
  let muted = false;
  return {
    mode,
    expansions: selected,
    basicKingdom,
    getSnapshot: () => state,
    getMuted: () => muted,
    setMuted: (value: boolean) => {
      muted = value;
      soundListeners.forEach(listener => listener());
    },
    subscribeSound: (listener: () => void) => {
      soundListeners.add(listener);
      return () => { soundListeners.delete(listener); };
    },
    subscribeActions: (listener: (command: Command, previous: GameState) => void) => {
      actionListeners.add(listener);
      return () => { actionListeners.delete(listener); };
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    dispatch: (actor: PlayerId, command: Command) => {
      const next = reduceGame(state, actor, command);
      if (next === state) return;
      const previous = state;
      state = next;
      actionListeners.forEach(listener => listener(command, previous));
      listeners.forEach(listener => listener());
    },
    restart: () => {
      state = newGame();
      listeners.forEach(listener => listener());
    },
  };
}

export type DominionStore = ReturnType<typeof createStore>;
