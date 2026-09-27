import type { CardDefinition } from '../cards.ts';

export type AlchemyCardId =
  | 'potion'
  | 'herbalist'
  | 'vineyard'
  | 'apothecary'
  | 'apprentice'
  | 'transmute'
  | 'alchemist'
  | 'scryingPool'
  | 'familiar'
  | 'philosophersStone'
  | 'golem'
  | 'university'
  | 'possession';

export const ALCHEMY_CARDS: Record<AlchemyCardId, CardDefinition> = {
  potion: {
    name: 'ポーション',
    english: 'POTION',
    cost: 4,
    type: 'treasure',
    types: ['treasure'],
    kind: '財宝',
    summary: '1 ポーション',
    description: '使用すると1ポーションを生み出す。ポーションをコストに含むカードの購入に使用する。',
    coins: 0,
    potionsProduced: 1,
  },
  herbalist: {
    name: '薬草商',
    english: 'HERBALIST',
    cost: 2,
    type: 'action',
    types: ['action'],
    kind: 'アクション',
    summary: '+1 購入・コイン\n財宝を山札へ',
    description: '購入+1、コイン+1。ターン終了時、このターン使用した財宝カード1枚を山札の一番上に戻してもよい。',
  },
  vineyard: {
    name: 'ブドウ園',
    english: 'VINEYARD',
    cost: 0,
    potions: 1,
    type: 'victory',
    types: ['victory'],
    kind: '勝利点',
    summary: 'アクション3枚ごとに\n1 勝利点',
    description: 'ゲーム終了時、所有する全アクションカードの枚数を3で割り、端数を切り捨てた値が勝利点になる。',
  },
  apothecary: {
    name: '薬師',
    english: 'APOTHECARY',
    cost: 2,
    potions: 1,
    type: 'action',
    types: ['action'],
    kind: 'アクション',
    summary: '+1 カード・行動\n銅貨とポーションを手札へ',
    description: '1枚引き、アクション+1。山札の上から4枚を公開し、銅貨とポーションをすべて手札に加える。残りを好きな順で山札の上に戻す。',
  },
  apprentice: {
    name: '弟子',
    english: 'APPRENTICE',
    cost: 5,
    type: 'action',
    types: ['action'],
    kind: 'アクション',
    summary: '+1 行動\n手札廃棄でドロー',
    description: 'アクション+1。手札1枚を廃棄する。そのカードのコスト1コインにつき1枚、コストにポーションが含まれていればさらに+2枚、カードを引く。',
  },
  transmute: {
    name: '変成',
    english: 'TRANSMUTE',
    cost: 0,
    potions: 1,
    type: 'action',
    types: ['action'],
    kind: 'アクション',
    summary: '手札を廃棄\n種別でカード獲得',
    description: '手札1枚を廃棄する。廃棄したカードがアクションなら公領、財宝なら変成、勝利点なら金貨を獲得する。複数タイプなら該当するもの全て獲得。',
  },
  alchemist: {
    name: '錬金術師',
    english: 'ALCHEMIST',
    cost: 3,
    potions: 1,
    type: 'action',
    types: ['action'],
    kind: 'アクション',
    summary: '+2 カード・1行動\nポーションで山札へ',
    description: '2枚引き、アクション+1。このターンにポーションを使用していれば、ターン終了時にこのカードを山札の上に置いてもよい。',
  },
  scryingPool: {
    name: '念術師',
    english: 'SCRYING POOL',
    cost: 2,
    potions: 1,
    type: 'action',
    types: ['action', 'attack'],
    kind: 'アクション・アタック',
    summary: '+1 行動\n山札操作と大量ドロー',
    description: 'アクション+1。各プレイヤー（自分含む）の山札の上1枚を公開させ、捨て札にするか山札の上に戻すか選ぶ。その後、自分の山札をアクション以外が出るまで公開し、全て手札に加える。',
  },
  familiar: {
    name: '使い魔',
    english: 'FAMILIAR',
    cost: 3,
    potions: 1,
    type: 'action',
    types: ['action', 'attack'],
    kind: 'アクション・アタック',
    summary: '+1 カード・行動\n相手に呪い',
    description: '1枚引き、アクション+1。相手はサプライから呪い1枚を獲得する。',
  },
  philosophersStone: {
    name: '賢者の石',
    english: 'PHILOSOPHER\'S STONE',
    cost: 3,
    potions: 1,
    type: 'treasure',
    types: ['treasure'],
    kind: '財宝',
    summary: '山札と捨て札の\n5枚ごとに1コイン',
    description: '使用時、山札と捨て札の合計枚数を数える。5枚につき1コイン（端数切り捨て）。',
  },
  golem: {
    name: 'ゴーレム',
    english: 'GOLEM',
    cost: 4,
    potions: 1,
    type: 'action',
    types: ['action'],
    kind: 'アクション',
    summary: '山札のアクション2枚を\n探して使用',
    description: '山札からゴーレム以外のアクションカード2枚が出るまで公開する。その2枚のアクションカードを任意の順序で使用する。残りの公開したカードはすべて捨てる。',
  },
  university: {
    name: '大学',
    english: 'UNIVERSITY',
    cost: 2,
    potions: 1,
    type: 'action',
    types: ['action'],
    kind: 'アクション',
    summary: '+2 行動\n5以下を獲得',
    description: 'アクション+2。サプライからコスト5以下（ポーションを含まない）のアクションカード1枚を獲得してもよい。',
  },
  possession: {
    name: '支配',
    english: 'POSSESSION',
    cost: 6,
    potions: 1,
    type: 'action',
    types: ['action'],
    kind: 'アクション',
    summary: '相手の追加ターンを\n操作する',
    description: 'このターン終了後、相手の追加ターンが発生し、あなたはそのプレイヤーのカードを見て操作する。その追加ターン中に相手が獲得したカードはあなたが獲得し、相手が廃棄したカードは捨て札に置かれる。',
  },
};

export const ALCHEMY_KINGDOM: AlchemyCardId[] = [
  'herbalist',
  'vineyard',
  'apothecary',
  'apprentice',
  'transmute',
  'alchemist',
  'scryingPool',
  'familiar',
  'philosophersStone',
  'golem',
  'university',
  'possession',
];
