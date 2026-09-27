import { BASE, KINGDOM } from './cards';
import type { CardDefinition, CardId } from './cards';
import { SEASIDE_KINGDOM } from './expansions/seasideCards';
import { INTRIGUE_KINGDOM } from './expansions/intrigueCards';
import { ALCHEMY_KINGDOM } from './expansions/alchemyCards';

export const SEASIDE_ART_IDS: CardId[] = [...SEASIDE_KINGDOM];
export const SEASIDE_ART_SET = new Set<CardId>(SEASIDE_ART_IDS);
export const INTRIGUE_ART_IDS: CardId[] = [...INTRIGUE_KINGDOM];
export const INTRIGUE_ART_SET = new Set<CardId>(INTRIGUE_ART_IDS);
export const ALCHEMY_ART_IDS: CardId[] = ['potion', ...ALCHEMY_KINGDOM];
export const ALCHEMY_ART_SET = new Set<CardId>(ALCHEMY_ART_IDS);
export const BASE_ART_SET = new Set<CardId>([...BASE, ...KINGDOM, ...SEASIDE_ART_IDS, ...INTRIGUE_ART_IDS, ...ALCHEMY_ART_IDS]);

export const ART_FILES: Partial<Record<CardId, string>> = {
  curse: 'curse-v5',
  province: 'province-v4',
};

export function getCardAssetFolder(id: CardId): string {
  if (SEASIDE_ART_SET.has(id)) return 'seaside';
  if (INTRIGUE_ART_SET.has(id)) return 'intrigue';
  if (ALCHEMY_ART_SET.has(id)) return 'alchemy';
  return 'base';
}

export function getCardArtPath(id: CardId): string | null {
  if (!BASE_ART_SET.has(id)) return null;
  const folder = getCardAssetFolder(id);
  const file = ART_FILES[id] ?? (folder === 'base' ? `${id}-v2` : id);
  return `assets/dominion/${folder}/${file}.png`;
}

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
