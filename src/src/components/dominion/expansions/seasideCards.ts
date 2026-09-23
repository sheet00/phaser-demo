import type { CardDefinition } from '../cards.ts';

export type SeasideCardId =
  | 'astrolabe' | 'bazaar' | 'blockade' | 'caravan' | 'corsair' | 'cutpurse' | 'fishingVillage'
  | 'haven' | 'island' | 'lighthouse' | 'lookout' | 'merchantShip' | 'monkey' | 'nativeVillage'
  | 'outpost' | 'pirate' | 'sailor' | 'salvager' | 'seaChart' | 'seaWitch' | 'smugglers'
  | 'tactician' | 'tidePools' | 'treasureMap' | 'treasury' | 'warehouse' | 'wharf';

export const SEASIDE_CARDS: Record<SeasideCardId, CardDefinition> = {
  astrolabe: { name: '星盤', english: 'ASTROLABE', cost: 3, type: 'treasure', types: ['treasure', 'duration'], kind: '財宝・持続', summary: '+1 コイン・購入\n次のターンも同じ', description: 'コイン+1、購入+1。次のターン開始時にもコイン+1、購入+1。', coins: 1 },
  bazaar: { name: 'バザー', english: 'BAZAAR', cost: 5, type: 'action', kind: 'アクション', summary: '+1 カード・2行動\n+1 コイン', description: '1枚引き、アクション+2、コイン+1。' },
  blockade: { name: '封鎖', english: 'BLOCKADE', cost: 4, type: 'action', types: ['action', 'duration', 'attack'], kind: 'アクション・持続・アタック', summary: '4以下を脇に置く\n次のターン手札へ', description: '4コスト以下のカード1枚を獲得し、このカードの上に脇置きする。次のターン開始時に手札へ移す。それまで、他のプレイヤーが自分のターンに同じカードを獲得したら、そのプレイヤーは呪いも獲得する。' },
  caravan: { name: '隊商', english: 'CARAVAN', cost: 4, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '+1 カード・行動\n次のターン+1カード', description: '1枚引き、アクション+1。次のターン開始時に1枚引く。' },
  corsair: { name: '私掠船', english: 'CORSAIR', cost: 5, type: 'action', types: ['action', 'duration', 'attack'], kind: 'アクション・持続・アタック', summary: '+2 コイン\n相手の財宝を廃棄', description: 'コイン+2。相手は山札の上2枚を公開し、銀貨か金貨があれば1枚を廃棄し、残りを捨てる。次のターン開始時に1枚引く。それまで相手が各ターン最初に使用した銀貨か金貨を廃棄する。' },
  cutpurse: { name: '追いはぎ', english: 'CUTPURSE', cost: 4, type: 'action', types: ['action', 'attack'], kind: 'アクション・アタック', summary: '+2 コイン\n相手は銅貨を捨てる', description: 'コイン+2。相手は銅貨1枚を捨てる。なければ手札を公開する。' },
  fishingVillage: { name: '漁村', english: 'FISHING VILLAGE', cost: 3, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '+2 行動・1コイン\n次のターン+1行動・コイン', description: 'アクション+2、コイン+1。次のターン開始時にアクション+1、コイン+1。' },
  haven: { name: '避難所', english: 'HAVEN', cost: 2, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '+1 カード・行動\n手札1枚を保管', description: '1枚引き、アクション+1。手札1枚をこのカードの下に脇置きする。次のターン開始時に手札へ戻す。' },
  island: { name: '島', english: 'ISLAND', cost: 4, type: 'action', types: ['action', 'victory'], kind: 'アクション・勝利点', summary: '自身と手札1枚を\n島マットへ・2勝利点', description: 'このカードと手札1枚を島マットに置く。ゲーム終了時に2勝利点。', points: 2 },
  lighthouse: { name: '灯台', english: 'LIGHTHOUSE', cost: 2, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '+1 行動・コイン\n次のターン+1コイン', description: 'アクション+1、コイン+1。次のターン開始時にコイン+1。それまで相手のアタックを受けない。' },
  lookout: { name: '見張り', english: 'LOOKOUT', cost: 3, type: 'action', kind: 'アクション', summary: '+1 行動\n山札3枚を整理', description: 'アクション+1。山札の上3枚を見て、1枚を廃棄し、1枚を捨て、残りを山札の上に戻す。' },
  merchantShip: { name: '商船', english: 'MERCHANT SHIP', cost: 5, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '+2 コイン\n次のターンも+2', description: 'コイン+2。次のターン開始時にもコイン+2。' },
  monkey: { name: '猿', english: 'MONKEY', cost: 3, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '次のターンまで\n相手の獲得で1枚引く', description: '次のターン開始時に1枚引く。それまで、右隣のプレイヤーがカードを獲得するたびに1枚引く。' },
  nativeVillage: { name: '原住民の村', english: 'NATIVE VILLAGE', cost: 2, type: 'action', kind: 'アクション', summary: '+2 行動\n山札かマットを選ぶ', description: 'アクション+2。山札の一番上を原住民の村マットに置くか、マット上のカードすべてを手札に加えるか選ぶ。' },
  outpost: { name: '前哨地', english: 'OUTPOST', cost: 5, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '次の手札3枚\n追加ターン', description: 'このターン最初の使用で、直前のターンが相手のターンなら、次の手札を3枚にして追加ターンを得る。追加ターン開始時に何もしない。' },
  pirate: { name: '海賊', english: 'PIRATE', cost: 5, type: 'action', types: ['action', 'duration', 'reaction'], kind: 'アクション・持続・リアクション', summary: '財宝獲得時に使用\n次のターン財宝獲得', description: '自分または相手が財宝を獲得したとき、手札から使用してよい。次の自分のターン開始時に、6コスト以下の財宝1枚を手札に獲得する。' },
  sailor: { name: '船乗り', english: 'SAILOR', cost: 4, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '+1 行動\n獲得した持続を使用', description: 'アクション+1。このターンに持続カードを獲得したとき、船乗り1枚につき1回、そのカードを使用してよい。次のターン開始時にコイン+2、手札1枚を廃棄してもよい。' },
  salvager: { name: '引揚水夫', english: 'SALVAGER', cost: 4, type: 'action', kind: 'アクション', summary: '+1 購入\n手札を廃棄しコイン', description: '購入+1。手札1枚を廃棄し、そのカードのコスト分のコインを得る。' },
  seaChart: { name: '海図', english: 'SEA CHART', cost: 3, type: 'action', kind: 'アクション', summary: '+1 カード・行動\n場のカードなら手札へ', description: '1枚引き、アクション+1。山札の一番上を公開し、同じカードが場にあれば手札に加える。なければ山札の上に戻す。' },
  seaWitch: { name: '海の魔女', english: 'SEA WITCH', cost: 5, type: 'action', types: ['action', 'duration', 'attack'], kind: 'アクション・持続・アタック', summary: '+2 カード\n相手に呪い', description: '2枚引く。相手は呪いを獲得する。次のターン開始時に2枚引き、手札2枚を捨てる。' },
  smugglers: { name: '密輸人', english: 'SMUGGLERS', cost: 3, type: 'action', kind: 'アクション', summary: '右隣が前ターンに\n獲得した札を獲得', description: '右隣のプレイヤーが直前のターンに獲得し、今もサプライにある6コスト以下のカードの同じカードを獲得する。' },
  tactician: { name: '戦術家', english: 'TACTICIAN', cost: 5, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '手札を捨てる\n次のターン+5枚・行動・購入', description: '手札が1枚以上あれば全て捨てる。次のターン開始時に5枚引き、アクション+1、購入+1。' },
  tidePools: { name: '潮だまり', english: 'TIDE POOLS', cost: 5, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '+3 カード・行動\n次のターン2枚捨てる', description: '3枚引き、アクション+1。次のターン開始時に手札2枚を捨てる。' },
  treasureMap: { name: '宝の地図', english: 'TREASURE MAP', cost: 4, type: 'action', kind: 'アクション', summary: '同名2枚を廃棄\n金貨4枚を山札へ', description: 'このカードと手札の宝の地図1枚を廃棄してもよい。両方廃棄したら金貨4枚を山札の上に獲得する。' },
  treasury: { name: '国庫', english: 'TREASURY', cost: 5, type: 'action', kind: 'アクション', summary: '+1 カード・行動\n+1 コイン', description: '1枚引き、アクション+1、コイン+1。このターン勝利点カードを獲得していなければ、ターン終了時にこのカードを山札の上に置いてもよい。' },
  warehouse: { name: '倉庫', english: 'WAREHOUSE', cost: 3, type: 'action', kind: 'アクション', summary: '+3 カード・行動\n手札3枚を捨てる', description: '3枚引き、アクション+1。その後、手札を最大3枚捨てる。' },
  wharf: { name: '波止場', english: 'WHARF', cost: 5, type: 'action', types: ['action', 'duration'], kind: 'アクション・持続', summary: '+2 カード・1購入\n次のターンも同じ', description: '2枚引き、購入+1。次のターン開始時にも2枚引き、購入+1。' },
};

export const SEASIDE_KINGDOM: SeasideCardId[] = Object.keys(SEASIDE_CARDS) as SeasideCardId[];
