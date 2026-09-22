import { CARDS } from './cards';
import type { Command, GameState } from './engine';

export const SOUND_FILES = {
  card: 'card-place-1.ogg',
  treasure: 'chips-handle-1.ogg',
  purchase: 'chips-stack-1.ogg',
  discard: 'card-slide-1.ogg',
  turn: 'card-fan-1.ogg',
  confirm: 'chip-lay-1.ogg',
} as const;

export function actionSound(command: Command, previous: GameState): keyof typeof SOUND_FILES | null {
  switch (command.type) {
    case 'play': {
      const card = previous.players[previous.active].hand.find(card => card.uid === command.uid);
      return card && CARDS[card.id].type === 'treasure' ? 'treasure' : 'card';
    }
    case 'treasures': return 'treasure';
    case 'buy': return 'purchase';
    case 'gain': return 'card';
    case 'choose': return 'discard';
    case 'end-turn': return 'turn';
    case 'done': return previous.pending?.kind === 'cellar' && previous.pending.discarded > 0 ? 'turn' : 'confirm';
    case 'buy-phase': case 'reveal': case 'decline': return 'confirm';
    default: return null;
  }
}
