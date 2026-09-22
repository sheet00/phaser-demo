import { createGame, reduceGame } from './engine';
import type { Command, GameState, PlayerId } from './engine';

export function createStore() {
  let state = createGame();
  const listeners = new Set<() => void>();
  const actionListeners = new Set<(command: Command, previous: GameState) => void>();
  const soundListeners = new Set<() => void>();
  let muted = false;
  return {
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
      state = createGame();
      listeners.forEach(listener => listener());
    },
  };
}

export type DominionStore = ReturnType<typeof createStore>;
