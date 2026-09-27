import { CARDS } from './cards';
import type { Command, GameState } from './engine';

export const SOUND_FILES = {
  card: 'kenney_casino-audio/Audio/card-place-1.ogg',
  treasure: 'kenney_casino-audio/Audio/chips-handle-1.ogg',
  purchase: 'kenney_casino-audio/Audio/chips-stack-1.ogg',
  discard: 'kenney_casino-audio/Audio/card-slide-1.ogg',
  turn: 'kenney_casino-audio/Audio/card-fan-1.ogg',
  confirm: 'kenney_casino-audio/Audio/chip-lay-1.ogg',
  myTurn: 'notification_message-best-notification-1-286672.mp3',
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
    case 'accept': case 'buy-phase': case 'reveal': case 'decline': return 'confirm';
    default: return null;
  }
}
