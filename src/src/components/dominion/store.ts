import { FIRST_GAME } from './cards';
import { createGame, reduceGame } from './engine';
import type { Command, GameState, PlayerId } from './engine';

export type GameMode = 'basic' | 'random';

export function createStore(mode: GameMode = 'random') {
  const newGame = () => createGame(crypto.getRandomValues(new Uint32Array(1))[0], mode === 'basic' ? FIRST_GAME : undefined);
  let state = newGame();
  const listeners = new Set<() => void>();
  const actionListeners = new Set<(command: Command, previous: GameState) => void>();
  const soundListeners = new Set<() => void>();
  let muted = false;
  return {
    mode,
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
