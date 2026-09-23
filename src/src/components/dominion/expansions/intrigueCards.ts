import type { CardDefinition } from '../cards.ts';

export const INTRIGUE_CARDS = {
  courtyard: { name: '中庭', english: 'COURTYARD', cost: 2, type: 'action', types: ['action'], kind: 'アクション', summary: '+3 カード\n手札1枚を山札へ', description: '3枚引き、手札1枚を山札の一番上へ戻す。' },
  lurker: { name: '待ち伏せ', english: 'LURKER', cost: 2, type: 'action', types: ['action'], kind: 'アクション', summary: '+1 アクション\n廃棄か獲得', description: 'アクション+1。サプライのアクション1枚を廃棄するか、廃棄置き場のアクション1枚を獲得する。' },
  pawn: { name: '手先', english: 'PAWN', cost: 2, type: 'action', types: ['action'], kind: 'アクション', summary: '異なる効果を\n2つ選ぶ', description: '1枚引く、アクション+1、購入+1、コイン+1のうち、異なる2つを選ぶ。' },
  masquerade: { name: '仮面舞踏会', english: 'MASQUERADE', cost: 3, type: 'action', types: ['action'], kind: 'アクション', summary: '+2 カード\n手札を渡し合う', description: '2枚引く。手札がある各プレイヤーは手札1枚を同時に相手へ渡す。その後、自分は任意で手札1枚を廃棄する。' },
  shantyTown: { name: '貧民街', english: 'SHANTY TOWN', cost: 3, type: 'action', types: ['action'], kind: 'アクション', summary: '+2 アクション\n行動なしなら2枚', description: 'アクション+2。手札を公開し、アクションがなければ2枚引く。' },
  steward: { name: '執事', english: 'STEWARD', cost: 3, type: 'action', types: ['action'], kind: 'アクション', summary: 'ドロー・コイン\nまたは2枚廃棄', description: '2枚引く、コイン+2、手札2枚を廃棄する、のいずれか1つを選ぶ。' },
  swindler: { name: '詐欺師', english: 'SWINDLER', cost: 3, type: 'action', types: ['action', 'attack'], kind: 'アクション・アタック', summary: '+2 コイン\n相手の札を変える', description: 'コイン+2。相手は山札の上1枚を廃棄し、それと同じコストのカードを、あなたが選んで相手に獲得させる。' },
  wishingWell: { name: '願いの井戸', english: 'WISHING WELL', cost: 3, type: 'action', types: ['action'], kind: 'アクション', summary: '+1 カード・行動\nカード名を予想', description: '1枚引き、アクション+1。カード名を宣言し、山札の上1枚を公開する。当たれば手札に加え、外れたら山札に戻す。' },
  baron: { name: '男爵', english: 'BARON', cost: 4, type: 'action', types: ['action'], kind: 'アクション', summary: '+1 購入\n屋敷を捨てて+4', description: '購入+1。任意で屋敷1枚を捨てるとコイン+4。捨てなければ屋敷1枚を獲得する。' },
  bridge: { name: '橋', english: 'BRIDGE', cost: 4, type: 'action', types: ['action'], kind: 'アクション', summary: '+1 購入・コイン\n全コスト−1', description: '購入+1、コイン+1。このターン中、全カードのコストを1下げる。0未満にはならない。' },
  conspirator: { name: '共謀者', english: 'CONSPIRATOR', cost: 4, type: 'action', types: ['action'], kind: 'アクション', summary: '+2 コイン\n3回目から追加効果', description: 'コイン+2。この使用を含めてこのターンにアクションを3回以上使用していれば、1枚引き、アクション+1。' },
  diplomat: { name: '外交官', english: 'DIPLOMAT', cost: 4, type: 'action', types: ['action', 'reaction'], kind: 'アクション・リアクション', summary: '+2 カード\n手札5以下で+2行動', description: '2枚引き、その後の手札が5枚以下ならアクション+2。攻撃を受けるとき、手札が5枚以上あれば公開して2枚引き、3枚捨ててもよい。' },
  ironworks: { name: '鉄工所', english: 'IRONWORKS', cost: 4, type: 'action', types: ['action'], kind: 'アクション', summary: '4以下を獲得\n種別で追加効果', description: '4コスト以下のカード1枚を獲得する。獲得札がアクションならアクション+1、財宝ならコイン+1、勝利点なら1枚引く。複数タイプなら全て適用。' },
  mill: { name: '風車', english: 'MILL', cost: 4, type: 'action', types: ['action', 'victory'], kind: 'アクション・勝利点', summary: '+1 カード・行動\n2枚捨てて+2', description: '1枚引き、アクション+1。任意で手札2枚を捨てればコイン+2。終了時1勝利点。', points: 1 },
  miningVillage: { name: '鉱山の村', english: 'MINING VILLAGE', cost: 4, type: 'action', types: ['action'], kind: 'アクション', summary: '+1 カード・2行動\n自身を廃棄で+2', description: '1枚引き、アクション+2。このカードを場から廃棄してもよい。実際に廃棄した場合コイン+2。' },
  secretPassage: { name: '隠し通路', english: 'SECRET PASSAGE', cost: 4, type: 'action', types: ['action'], kind: 'アクション', summary: '+2 カード・行動\n手札を山札内へ', description: '2枚引き、アクション+1。手札1枚を選び、山札の好きな位置に入れる。' },
  courtier: { name: '廷臣', english: 'COURTIER', cost: 5, type: 'action', types: ['action'], kind: 'アクション', summary: '札を公開\nタイプ数の効果', description: '手札1枚を公開する。そのタイプ数だけ、アクション+1、購入+1、コイン+3、金貨1枚獲得から異なる効果を選ぶ。' },
  duke: { name: '公爵', english: 'DUKE', cost: 5, type: 'victory', types: ['victory'], kind: '勝利点', summary: '公領1枚ごとに\n1 勝利点', description: '所有する公領1枚につき、この公爵1枚が1勝利点になる。' },
  minion: { name: '寵臣', english: 'MINION', cost: 5, type: 'action', types: ['action', 'attack'], kind: 'アクション・アタック', summary: '+1 アクション\nコインか手札交換', description: 'アクション+1。コイン+2、または手札を全て捨てて4枚引く、を選ぶ。後者では手札5枚以上の相手も全て捨てて4枚引く。' },
  patrol: { name: 'パトロール', english: 'PATROL', cost: 5, type: 'action', types: ['action'], kind: 'アクション', summary: '+3 カード\n山札4枚を公開', description: '3枚引く。その後、山札の上4枚を公開し、勝利点と呪いを全て手札へ加える。残りは好きな順番で山札に戻す。' },
  replace: { name: '身代わり', english: 'REPLACE', cost: 5, type: 'action', types: ['action', 'attack'], kind: 'アクション・アタック', summary: '1枚廃棄\n+2以下を獲得', description: '手札1枚を廃棄し、そのコスト+2以下の札を獲得する。獲得札がアクションか財宝なら山札の上へ。勝利点なら相手は呪い1枚を獲得する。' },
  torturer: { name: '拷問人', english: 'TORTURER', cost: 5, type: 'action', types: ['action', 'attack'], kind: 'アクション・アタック', summary: '+3 カード\n相手は捨て札か呪い', description: '3枚引く。相手は手札2枚を捨てるか、呪い1枚を手札に獲得するか選ぶ。実行できない選択肢も選べる。' },
  tradingPost: { name: '交易場', english: 'TRADING POST', cost: 5, type: 'action', types: ['action'], kind: 'アクション', summary: '手札2枚を廃棄\n銀貨を手札へ', description: '手札2枚を廃棄する。2枚廃棄できた場合、銀貨1枚を手札に獲得する。' },
  upgrade: { name: '改良', english: 'UPGRADE', cost: 5, type: 'action', types: ['action'], kind: 'アクション', summary: '+1 カード・行動\n廃棄して+1を獲得', description: '1枚引き、アクション+1。手札1枚を廃棄し、それよりちょうど1コスト高い札を獲得する。' },
  harem: { name: 'ハーレム', english: 'HAREM', cost: 6, type: 'treasure', types: ['treasure', 'victory'], kind: '財宝・勝利点', summary: '2 コイン\n2 勝利点', description: '使用すると2コイン。終了時2勝利点。', points: 2, coins: 2 },
  nobles: { name: '貴族', english: 'NOBLES', cost: 6, type: 'action', types: ['action', 'victory'], kind: 'アクション・勝利点', summary: '+3 カード\nまたは+2行動', description: '3枚引くか、アクション+2を選ぶ。終了時2勝利点。', points: 2 },
} satisfies Record<string, CardDefinition>;

export type IntrigueCardId = keyof typeof INTRIGUE_CARDS;
export const INTRIGUE_KINGDOM = Object.keys(INTRIGUE_CARDS) as IntrigueCardId[];
