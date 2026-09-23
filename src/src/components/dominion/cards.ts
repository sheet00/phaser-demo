import { INTRIGUE_CARDS, INTRIGUE_KINGDOM } from './expansions/intrigueCards.ts';
import type { IntrigueCardId } from './expansions/intrigueCards.ts';
import { SEASIDE_CARDS, SEASIDE_KINGDOM } from './expansions/seasideCards.ts';
import type { SeasideCardId } from './expansions/seasideCards.ts';

export type CardId = IntrigueCardId | SeasideCardId | 'copper' | 'silver' | 'gold' | 'estate' | 'duchy' | 'province' | 'curse'
  | 'cellar' | 'moat' | 'village' | 'merchant' | 'workshop' | 'smithy' | 'remodel' | 'militia' | 'market' | 'mine'
  | 'chapel' | 'harbinger' | 'vassal' | 'bureaucrat' | 'gardens' | 'moneylender' | 'poacher' | 'throneRoom'
  | 'bandit' | 'festival' | 'library' | 'laboratory' | 'sentry' | 'witch' | 'artisan' | 'councilRoom';

export type CardType = 'treasure' | 'victory' | 'curse' | 'action';
export type CardMarker = CardType | 'attack' | 'reaction' | 'duration';

export interface CardDefinition {
  name: string;
  english: string;
  cost: number;
  type: CardType;
  types?: CardMarker[];
  kind: string;
  summary: string;
  description: string;
  coins?: number;
  points?: number;
}

export const CARDS: Record<CardId, CardDefinition> = {
  ...INTRIGUE_CARDS,
  ...SEASIDE_CARDS,
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
  chapel: { name: '礼拝堂', english: 'CHAPEL', cost: 2, type: 'action', kind: 'アクション', summary: '手札を最大4枚\n廃棄', description: '手札から0〜4枚を選んで廃棄する。途中で選択を終了できる。' },
  harbinger: { name: '前駆者', english: 'HARBINGER', cost: 3, type: 'action', kind: 'アクション', summary: '+1 カード・行動\n捨て札を山札へ', description: '1枚引き、アクション+1。その後、捨て札を見て、任意で1枚を山札の一番上に戻す。' },
  vassal: { name: '家臣', english: 'VASSAL', cost: 3, type: 'action', kind: 'アクション', summary: '+2 コイン\n山札から使用', description: 'コイン+2。山札の一番上を捨てる。そのカードがアクションなら、アクション数を消費せず使用してもよい。' },
  bureaucrat: { name: '役人', english: 'BUREAUCRAT', cost: 4, type: 'action', kind: 'アクション・アタック', summary: '銀貨を山札へ\n相手の勝利点戻し', description: '銀貨を山札の一番上に獲得する。相手は手札の勝利点1枚を公開して山札の上に戻す。勝利点がなければ手札を公開する。' },
  gardens: { name: '庭園', english: 'GARDENS', cost: 4, type: 'victory', kind: '勝利点', summary: '所有10枚ごとに\n1 勝利点', description: '終了時、所有する全カードの枚数を10で割り、小数点以下を切り捨てた値が、この庭園1枚の勝利点になる。' },
  moneylender: { name: '金貸し', english: 'MONEYLENDER', cost: 4, type: 'action', kind: 'アクション', summary: '銅貨1枚を廃棄\n+3 コイン', description: '任意で手札の銅貨1枚を廃棄する。実際に廃棄した場合だけコイン+3。' },
  poacher: { name: '密猟者', english: 'POACHER', cost: 4, type: 'action', kind: 'アクション', summary: '+1 カード・行動\n+1 コイン', description: '1枚引き、アクション+1、コイン+1。空になったサプライの山1つにつき手札を1枚捨てる。' },
  throneRoom: { name: '玉座の間', english: 'THRONE ROOM', cost: 4, type: 'action', kind: 'アクション', summary: 'アクションを\n2回使用', description: '任意で手札のアクション1枚を選び、効果を最後まで解決してからもう一度使用する。選んだカードの使用にアクション数は消費しない。' },
  bandit: { name: '山賊', english: 'BANDIT', cost: 5, type: 'action', kind: 'アクション・アタック', summary: '金貨を獲得\n相手の財宝を廃棄', description: '金貨を捨て札に獲得。相手は山札の上2枚を公開し、その中の銅貨以外の財宝1枚を選んで廃棄し、残りを捨てる。対象の財宝がなければ全て捨てる。' },
  festival: { name: '祝祭', english: 'FESTIVAL', cost: 5, type: 'action', kind: 'アクション', summary: '+2 行動・コイン\n+1 購入', description: 'アクション+2、購入+1、コイン+2。' },
  library: { name: '書庫', english: 'LIBRARY', cost: 5, type: 'action', kind: 'アクション', summary: '手札7枚まで引く\n行動は見送り可', description: '手札が7枚になるまで1枚ずつ引く。引いたアクションは手札に入れず脇に置いてもよい。脇に置いたカードは、この効果の終了時にまとめて捨てる。' },
  laboratory: { name: '研究所', english: 'LABORATORY', cost: 5, type: 'action', kind: 'アクション', summary: '+2 カード\n+1 アクション', description: '2枚引き、アクション+1。' },
  sentry: { name: '衛兵', english: 'SENTRY', cost: 5, type: 'action', kind: 'アクション', summary: '+1 カード・行動\n山札2枚を整理', description: '1枚引き、アクション+1。山札の上2枚を見て、任意の枚数を廃棄し、任意の枚数を捨てる。残りは好きな順番で山札の上に戻す。' },
  witch: { name: '魔女', english: 'WITCH', cost: 5, type: 'action', kind: 'アクション・アタック', summary: '+2 カード\n相手に呪い', description: '2枚引く。相手はサプライから呪い1枚を捨て札に獲得する。呪いの山が空でも2枚引ける。' },
  artisan: { name: '職人', english: 'ARTISAN', cost: 6, type: 'action', kind: 'アクション', summary: '5以下を手札へ\n手札1枚を山札へ', description: '5コスト以下のカード1枚を手札に獲得。その後、手札1枚を山札の一番上に戻す。今獲得したカードを戻してもよい。' },
  councilRoom: { name: '議事堂', english: 'COUNCIL ROOM', cost: 5, type: 'action', kind: 'アクション', summary: '+4 カード・1購入\n相手も1枚引く', description: '4枚引き、購入+1。相手も1枚引く。攻撃ではないため堀では防げない。' },

};

export const FIRST_GAME: CardId[] = ['cellar', 'moat', 'village', 'merchant', 'workshop', 'smithy', 'remodel', 'militia', 'market', 'mine'];
export const KINGDOM: CardId[] = [...FIRST_GAME, 'chapel', 'harbinger', 'vassal', 'bureaucrat', 'gardens', 'moneylender', 'poacher', 'throneRoom', 'bandit', 'festival', 'library', 'laboratory', 'sentry', 'witch', 'artisan', 'councilRoom'];
export const BASE: CardId[] = ['province', 'gold', 'duchy', 'silver', 'estate', 'copper', 'curse'];
export const ALL_KINGDOM: CardId[] = [...KINGDOM, ...INTRIGUE_KINGDOM, ...SEASIDE_KINGDOM];
export const ALL_CARDS: CardId[] = [...BASE, ...ALL_KINGDOM];

export function cardTypes(id: CardId): CardMarker[] {
  const card = CARDS[id];
  return card.types ?? [card.type, ...(card.kind.includes('アタック') ? ['attack' as const] : []), ...(card.kind.includes('リアクション') ? ['reaction' as const] : [])];
}

export function hasType(id: CardId, type: CardMarker): boolean {
  return cardTypes(id).includes(type);
}
