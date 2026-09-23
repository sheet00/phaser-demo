import type { CardDefinition, CardId } from './cards';

const PALETTES = {
  action: { accent: 0xc6c3b4, background: 0xf0eee5, label: 'アクション' },
  attack: { accent: 0xdb9188, background: 0xf8e6e1, label: '攻撃' },
  reaction: { accent: 0x88b9df, background: 0xe3eff8, label: '反応' },
  duration: { accent: 0xe5a267, background: 0xf8e8d5, label: '持続' },
  victory: { accent: 0x79b18a, background: 0xe4f0e3, label: '勝利点' },
  treasure: { accent: 0xdec16e, background: 0xf8f0d5, label: '財宝' },
  curse: { accent: 0xb095cd, background: 0xeee4f5, label: '呪い' },
};

export function cardAppearance(card: CardDefinition) {
  const types = card.types ?? [
    card.type,
    ...(card.kind.includes('アタック') ? ['attack' as const] : []),
    ...(card.kind.includes('リアクション') ? ['reaction' as const] : []),
    ...(card.kind.includes('持続') ? ['duration' as const] : []),
  ];
  const type = types.includes('attack') ? 'attack'
    : types.includes('reaction') ? 'reaction'
      : types.includes('victory') ? 'victory'
        : types.includes('treasure') ? 'treasure'
          : types.includes('duration') ? 'duration' : card.type;
  return PALETTES[type];
}

export interface CardInspection {
  id: CardId;
  x: number;
  y: number;
}
