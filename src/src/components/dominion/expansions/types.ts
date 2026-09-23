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
  move: (state: GameState, player: PlayerId, from: 'hand' | 'discard' | 'aside' | 'played' | 'trash', uid: number, to: 'deck' | 'discard' | 'hand' | 'played' | 'trash') => Card;
  cost: (state: GameState, card: CardId) => number;
  supply: (state: GameState) => CardId[];
  log: (state: GameState, text: string) => void;
}
