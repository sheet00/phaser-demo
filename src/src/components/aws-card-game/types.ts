export type CardType = 'starter' | 'builder' | 'well-architected' | 'mission';

export type StarterColor = 'blue' | 'purple' | 'red' | 'green';

export interface BaseCard {
  id: string;
  name: string;
  nameJa: string;
  type: CardType;
  cost: number;
  credit: number;
  description: string;
  pairedCardId?: string; // 1:1連携が成立したペアのカードID
}

export interface StarterCard extends BaseCard {
  type: 'starter';
  color: StarterColor;
  comboWith?: string[];
  comboBonus?: {
    credit?: number;
    draw?: number;
  };
  comboDesc?: string;
}

export interface BuilderCard extends BaseCard {
  type: 'builder';
  category: 'compute' | 'storage' | 'database' | 'networking' | 'management' | 'integration' | 'security' | 'developer';
  comboWith?: string[]; // 連携対象カード名
  comboBonus?: {
    credit?: number;
    draw?: number;
    extraAcquire?: number;
  };
  comboDesc?: string; // 「連携: Amazon S3 ➜ +1c」
  effects?: {
    draw?: number;
    extraAcquire?: number;
    retireOnUse?: boolean; // 夕日アイコン
  };
}

export interface WellArchitectedCard extends BaseCard {
  type: 'well-architected';
  points: 1 | 3;
}

export type GameCard = StarterCard | BuilderCard | WellArchitectedCard;

export type TurnPhase = 'build' | 'acquire' | 'end';

export interface PlayerState {
  id: string;
  name: string;
  deck: GameCard[];
  hand: GameCard[];
  discard: GameCard[];
  deployed: GameCard[];
  wellArchitectedPoints: number;
  wellArchitectedCards: WellArchitectedCard[];
  credits: number;
  remainingAcquires: number;
}

export interface SupplyPile {
  id: string;
  card: GameCard;
  count: number;
  maxCount: number;
}
