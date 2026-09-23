import type { CardId } from '../cards.ts';
import type { Card, GameState, PlayerId } from '../engine.ts';

export interface ExpansionTask {
  player: PlayerId;
  source: CardId;
  step: string;
  uid?: number;
  target?: PlayerId;
  count?: number;
  remaining?: number;
  cost?: number;
  selected?: string[];
  order?: number[];
  gainUid?: number;
  blocked?: boolean;
}

export interface ExpansionPending extends ExpansionTask {
  kind: 'expansion';
  zone: 'hand' | 'aside' | 'trash' | 'supply' | 'options';
  choices: string[];
  options: { value: string; label: string }[];
  optional: boolean;
  message: string;
}

export interface ExpansionAPI {
  draw: (state: GameState, player: PlayerId, count: number) => void;
  takeTop: (state: GameState, player: PlayerId) => Card | undefined;
  gain: (state: GameState, player: PlayerId, card: CardId, toHand?: boolean, toDeck?: boolean) => void;
  move: (state: GameState, player: PlayerId, from: 'hand' | 'discard' | 'aside' | 'played' | 'trash', uid: number, to: 'deck' | 'discard' | 'hand' | 'played' | 'trash' | 'island') => Card;
  duration: (state: GameState, player: PlayerId, source: CardId, uid: number) => void;
  gainBlockade: (state: GameState, player: PlayerId, card: CardId, blockadeUid: number) => void;
  playFree: (state: GameState, player: PlayerId, uid: number, from: 'hand' | 'discard' | 'deck' | 'blockade') => void;
  finishTurn: (state: GameState) => void;
  cost: (state: GameState, card: CardId) => number;
  supply: (state: GameState) => CardId[];
  log: (state: GameState, text: string) => void;
}
