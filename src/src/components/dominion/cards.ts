export type CardId = 'copper' | 'silver' | 'gold' | 'estate' | 'duchy' | 'province' | 'curse'
  | 'cellar' | 'moat' | 'village' | 'merchant' | 'workshop' | 'smithy' | 'remodel' | 'militia' | 'market' | 'mine';

export type CardType = 'treasure' | 'victory' | 'curse' | 'action';

export interface CardDefinition {
  name: string;
  english: string;
  cost: number;
  type: CardType;
  kind: string;
  summary: string;
  description: string;
  coins?: number;
  points?: number;
}

export const CARDS: Record<CardId, CardDefinition> = {
  copper: { name: '銅貨', english: 'COPPER', cost: 0, type: 'treasure', kind: '財宝', summary: '1 コイン', description: '使用すると1コイン。', coins: 1 },
  silver: { name: '銀貨', english: 'SILVER', cost: 3, type: 'treasure', kind: '財宝', summary: '2 コイン', description: '使用すると2コイン。商人を使ったターンの最初の銀貨には追加コイン。', coins: 2 },
  gold: { name: '金貨', english: 'GOLD', cost: 6, type: 'treasure', kind: '財宝', summary: '3 コイン', description: '使用すると3コイン。', coins: 3 },
  estate: { name: '屋敷', english: 'ESTATE', cost: 2, type: 'victory', kind: '勝利点', summary: '1 勝利点', description: '終了時に1勝利点。手札から使用する効果はない。', points: 1 },
  duchy: { name: '公領', english: 'DUCHY', cost: 5, type: 'victory', kind: '勝利点', summary: '3 勝利点', description: '終了時に3勝利点。手札から使用する効果はない。', points: 3 },
  province: { name: '属州', english: 'PROVINCE', cost: 8, type: 'victory', kind: '勝利点', summary: '6 勝利点', description: '終了時に6勝利点。この山が空になると、そのターンの終了時にゲーム終了。', points: 6 },
  curse: { name: '呪い', english: 'CURSE', cost: 0, type: 'curse', kind: '呪い', summary: '−1 勝利点', description: '終了時に勝利点を1失う。', points: -1 },
  cellar: { name: '地下貯蔵庫', english: 'CELLAR', cost: 2, type: 'action', kind: 'アクション', summary: '+1 アクション\n手札を交換', description: 'アクション+1。手札を好きな枚数捨て、選択完了後に捨てた枚数だけ引く。1枚も捨てなくてもよい。' },
  moat: { name: '堀', english: 'MOAT', cost: 2, type: 'action', kind: 'アクション・リアクション', summary: '+2 カード\n攻撃を防御', description: '2枚引く。相手の攻撃時に手札の堀を公開すると、その攻撃を防げる。公開した堀は手札に残る。' },
  village: { name: '村', english: 'VILLAGE', cost: 3, type: 'action', kind: 'アクション', summary: '+1 カード\n+2 アクション', description: '1枚引き、アクション+2。複数のアクションカードを使える。' },
  merchant: { name: '商人', english: 'MERCHANT', cost: 3, type: 'action', kind: 'アクション', summary: '+1 カード・行動\n最初の銀貨 +1', description: '1枚引き、アクション+1。このターン最初に使用する銀貨で追加の1コイン。商人を複数使えばその枚数分加算する。' },
  workshop: { name: '工房', english: 'WORKSHOP', cost: 3, type: 'action', kind: 'アクション', summary: '4コスト以下を\n獲得', description: 'サプライから4コスト以下のカード1枚を獲得し、捨て札に置く。購入回数やコインは使わない。' },
  smithy: { name: '鍛冶屋', english: 'SMITHY', cost: 4, type: 'action', kind: 'アクション', summary: '+3 カード', description: '山札から3枚引く。山札が足りなければ捨て札をシャッフルして補充する。' },
  remodel: { name: '改築', english: 'REMODEL', cost: 4, type: 'action', kind: 'アクション', summary: '1枚廃棄\n価格 +2 まで獲得', description: '手札1枚を廃棄する。そのカードのコスト+2以下のカード1枚をサプライから捨て札へ獲得する。廃棄できなければ獲得しない。' },
  militia: { name: '民兵', english: 'MILITIA', cost: 4, type: 'action', kind: 'アクション・アタック', summary: '+2 コイン\n相手の手札3枚', description: 'コイン+2。相手は手札が3枚になるまで捨てる。相手が堀を公開した場合は防がれる。' },
  market: { name: '市場', english: 'MARKET', cost: 5, type: 'action', kind: 'アクション', summary: '+1 カード・行動\n+1 購入・コイン', description: '1枚引き、アクション+1、購入+1、コイン+1。' },
  mine: { name: '鉱山', english: 'MINE', cost: 5, type: 'action', kind: 'アクション', summary: '財宝を廃棄\n価格 +3 まで獲得', description: '任意で手札の財宝1枚を廃棄し、そのコスト+3以下の財宝1枚を手札へ獲得する。獲得した財宝はこのターンに使える。' },
};

export const KINGDOM: CardId[] = ['cellar', 'moat', 'village', 'merchant', 'workshop', 'smithy', 'remodel', 'militia', 'market', 'mine'];
export const BASE: CardId[] = ['province', 'gold', 'duchy', 'silver', 'estate', 'copper', 'curse'];
export const ALL_CARDS: CardId[] = [...BASE, ...KINGDOM];
