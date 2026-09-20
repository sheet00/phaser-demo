import type { BuilderCard, StarterCard, StarterColor, WellArchitectedCard, SupplyPile } from '../types';

/**
 * プレイヤー初期デッキ用オンプレミスカード（計10枚）
 * 第2版公式ルール通り、「仮想マシン」にEC2との組み合わせ効果を実装
 */
export function createStarterDeck(color: StarterColor = 'blue'): StarterCard[] {
  return [
    {
      id: `${color}-bm-1`,
      name: 'Bare Metal Host',
      nameJa: 'ベアメタルホスト',
      type: 'starter',
      color,
      cost: 0,
      credit: 1,
      description: '物理サーバー。1クレジットを生成。',
    },
    {
      id: `${color}-bm-2`,
      name: 'Bare Metal Host',
      nameJa: 'ベアメタルホスト',
      type: 'starter',
      color,
      cost: 0,
      credit: 1,
      description: '物理サーバー。1クレジットを生成。',
    },
    {
      id: `${color}-bm-3`,
      name: 'Bare Metal Host',
      nameJa: 'ベアメタルホスト',
      type: 'starter',
      color,
      cost: 0,
      credit: 1,
      description: '物理サーバー。1クレジットを生成。',
    },
    {
      id: `${color}-vm-1`,
      name: 'Virtual Machine',
      nameJa: '仮想マシン',
      type: 'starter',
      color,
      cost: 0,
      credit: 1,
      description: '仮想サーバー。EC2と連携で+1c。',
      comboWith: ['Amazon EC2'],
      comboBonus: { credit: 1 },
      comboDesc: '【連携: EC2】+1c',
    },
    {
      id: `${color}-db-1`,
      name: 'Database Server',
      nameJa: 'データベースサーバー',
      type: 'starter',
      color,
      cost: 0,
      credit: 1,
      description: '自社運用のDB。1クレジットを生成。',
    },
    {
      id: `${color}-san-1`,
      name: 'Storage Area Network (SAN)',
      nameJa: 'ストレージエリアネットワーク',
      type: 'starter',
      color,
      cost: 0,
      credit: 1,
      description: '共有SANストレージ。1クレジットを生成。',
    },
    {
      id: `${color}-dw-1`,
      name: 'Data Warehouse',
      nameJa: 'データウェアハウス',
      type: 'starter',
      color,
      cost: 0,
      credit: 1,
      description: '分析基盤。1クレジットを生成。',
    },
    {
      id: `${color}-nw-1`,
      name: 'Networking',
      nameJa: 'オンプレネットワーク',
      type: 'starter',
      color,
      cost: 0,
      credit: 1,
      description: '構内LAN/スイッチ。1クレジットを生成。',
    },
    {
      id: `${color}-id-1`,
      name: 'Corporate Identity Provider',
      nameJa: '企業IDプロバイダー',
      type: 'starter',
      color,
      cost: 0,
      credit: 1,
      description: '社内Active Directory。1クレジットを生成。',
    },
    {
      id: `${color}-doc-1`,
      name: 'Document Store',
      nameJa: 'ドキュメントストア',
      type: 'starter',
      color,
      cost: 0,
      credit: 1,
      description: 'ファイルサーバー。1クレジットを生成。',
    },
  ];
}

interface BuilderDefinition extends Omit<BuilderCard, 'id'> {
  quantity: number;
}

/**
 * 公式ルールブック準拠：全36種類のビルダーカード（プライマリー＆セカンダリー連携）
 */
export const ALL_BUILDER_DEFINITIONS: BuilderDefinition[] = [
  // --- コンピュート ---
  {
    name: 'Amazon EC2',
    nameJa: 'Amazon EC2',
    type: 'builder',
    category: 'compute',
    cost: 0,
    credit: 1,
    quantity: 8,
    description: '仮想サーバー。1c生成。',
    comboWith: ['Amazon S3', 'Amazon RDS', 'Elastic Load Balancing'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: S3/RDS/ELB】+1c',
  },
  {
    name: 'AWS Lambda',
    nameJa: 'AWS Lambda',
    type: 'builder',
    category: 'compute',
    cost: 0,
    credit: 1,
    quantity: 6,
    description: 'サーバーレス実行環境。1c生成。',
    comboWith: ['Amazon S3', 'Amazon DynamoDB', 'Amazon API Gateway'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: S3/DDB/API】+1c',
  },
  {
    name: 'AWS Fargate',
    nameJa: 'AWS Fargate',
    type: 'builder',
    category: 'compute',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: 'サーバーレスコンテナ。2c生成＋1ドロー。',
    effects: { draw: 1 },
  },
  {
    name: 'Amazon ECS',
    nameJa: 'Amazon ECS',
    type: 'builder',
    category: 'compute',
    cost: 0,
    credit: 1,
    quantity: 2,
    description: 'コンテナ管理。Fargateと連携で+1c。',
    comboWith: ['AWS Fargate'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: Fargate】+1c',
  },
  {
    name: 'Amazon EKS',
    nameJa: 'Amazon EKS',
    type: 'builder',
    category: 'compute',
    cost: 3,
    credit: 3,
    quantity: 2,
    description: 'マネージドKubernetes。大容量3c生成。',
  },
  {
    name: 'Amazon EC2 Auto Scaling',
    nameJa: 'EC2 Auto Scaling',
    type: 'builder',
    category: 'compute',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: '自動スケール。2c生成＋購入枠+1。',
    effects: { extraAcquire: 1 },
  },

  // --- ストレージ ---
  {
    name: 'Amazon S3',
    nameJa: 'Amazon S3',
    type: 'builder',
    category: 'storage',
    cost: 0,
    credit: 1,
    quantity: 4,
    description: 'オブジェクトストレージ。Lambdaと連携で1ドロー。',
    comboWith: ['AWS Lambda'],
    comboBonus: { draw: 1 },
    comboDesc: '【連携: Lambda】+1枚引く',
  },
  {
    name: 'Amazon EFS',
    nameJa: 'Amazon EFS',
    type: 'builder',
    category: 'storage',
    cost: 0,
    credit: 1,
    quantity: 2,
    description: '共有ファイルストレージ。EC2と連携で+1c。',
    comboWith: ['Amazon EC2'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: EC2】+1c',
  },

  // --- データベース ---
  {
    name: 'Amazon DynamoDB',
    nameJa: 'Amazon DynamoDB',
    type: 'builder',
    category: 'database',
    cost: 2,
    credit: 2,
    quantity: 3,
    description: '高速NoSQL DB。2c生成＋購入枠+1。',
    effects: { extraAcquire: 1 },
  },
  {
    name: 'Amazon RDS',
    nameJa: 'Amazon RDS',
    type: 'builder',
    category: 'database',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: 'マネージドRDB。EC2と連携で特大+2c。',
    comboWith: ['Amazon EC2'],
    comboBonus: { credit: 2 },
    comboDesc: '【連携: EC2】+2c (特大)',
  },
  {
    name: 'Amazon Aurora',
    nameJa: 'Amazon Aurora',
    type: 'builder',
    category: 'database',
    cost: 3,
    credit: 3,
    quantity: 2,
    description: '超高性能クラウドRDB。大容量3c生成。',
  },
  {
    name: 'Amazon ElastiCache',
    nameJa: 'Amazon ElastiCache',
    type: 'builder',
    category: 'database',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: 'インメモリキャッシュ。2c生成＋1ドロー。',
    effects: { draw: 1 },
  },
  {
    name: 'Amazon Redshift',
    nameJa: 'Amazon Redshift',
    type: 'builder',
    category: 'database',
    cost: 3,
    credit: 3,
    quantity: 2,
    description: '超高速クラウドDWH。大容量3c生成。',
  },

  // --- ネットワーク・配信 ---
  {
    name: 'Amazon CloudFront',
    nameJa: 'Amazon CloudFront',
    type: 'builder',
    category: 'networking',
    cost: 0,
    credit: 1,
    quantity: 2,
    description: '高速CDN配信。S3と連携で1ドロー。',
    comboWith: ['Amazon S3'],
    comboBonus: { draw: 1 },
    comboDesc: '【連携: S3】+1枚引く',
  },
  {
    name: 'Amazon VPC',
    nameJa: 'Amazon VPC',
    type: 'builder',
    category: 'networking',
    cost: 0,
    credit: 1,
    quantity: 2,
    description: '仮想ネットワーク。EC2と連携で+1c。',
    comboWith: ['Amazon EC2'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: EC2】+1c',
  },
  {
    name: 'Amazon Route 53',
    nameJa: 'Amazon Route 53',
    type: 'builder',
    category: 'networking',
    cost: 0,
    credit: 1,
    quantity: 2,
    description: '高可用性DNS。CloudFrontと連携で+1c。',
    comboWith: ['Amazon CloudFront'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: CloudFront】+1c',
  },
  {
    name: 'Elastic Load Balancing',
    nameJa: 'ロードバランサー (ELB)',
    type: 'builder',
    category: 'networking',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: 'トラフィック負荷分散。EC2と連携で+1c。',
    comboWith: ['Amazon EC2'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: EC2】+1c',
  },
  {
    name: 'Amazon API Gateway',
    nameJa: 'Amazon API Gateway',
    type: 'builder',
    category: 'networking',
    cost: 0,
    credit: 1,
    quantity: 2,
    description: 'API管理。Lambdaと連携で+1c。',
    comboWith: ['AWS Lambda'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: Lambda】+1c',
  },

  // --- アプリケーション統合 ---
  {
    name: 'Amazon SNS',
    nameJa: 'Amazon SNS',
    type: 'builder',
    category: 'integration',
    cost: 0,
    credit: 1,
    quantity: 3,
    description: 'Pub/Sub通知。SQSと連携で+1c。',
    comboWith: ['Amazon SQS'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: SQS】+1c',
  },
  {
    name: 'Amazon SQS',
    nameJa: 'Amazon SQS',
    type: 'builder',
    category: 'integration',
    cost: 0,
    credit: 1,
    quantity: 3,
    description: 'メッセージキュー。Lambdaと連携で+1c。',
    comboWith: ['AWS Lambda'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: Lambda】+1c',
  },
  {
    name: 'Amazon EventBridge',
    nameJa: 'Amazon EventBridge',
    type: 'builder',
    category: 'integration',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: 'イベントバス連携。2c生成＋1ドロー。',
    effects: { draw: 1 },
  },
  {
    name: 'AWS Step Functions',
    nameJa: 'AWS Step Functions',
    type: 'builder',
    category: 'integration',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: 'ワークフローオーケストレーション。カードを2枚引く。',
    effects: { draw: 2 },
  },

  // --- アナリティクス ---
  {
    name: 'Amazon Kinesis Data Streams',
    nameJa: 'Amazon Kinesis',
    type: 'builder',
    category: 'developer',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: 'ストリーミングデータ収集。2クレジット生成。',
  },
  {
    name: 'Amazon Data Firehose',
    nameJa: 'Data Firehose',
    type: 'builder',
    category: 'developer',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: 'S3への自動配信。S3と連携で+1c。',
    comboWith: ['Amazon S3'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: S3】+1c',
  },
  {
    name: 'Amazon Athena',
    nameJa: 'Amazon Athena',
    type: 'builder',
    category: 'developer',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: 'S3データを即座にSQLクエリ。S3と連携で+1c。',
    comboWith: ['Amazon S3'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: S3】+1c',
  },
  {
    name: 'Amazon OpenSearch Service',
    nameJa: 'OpenSearch Service',
    type: 'builder',
    category: 'developer',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: '検索・ログ分析。2c生成＋1ドロー。',
    effects: { draw: 1 },
  },

  // --- セキュリティ・管理・運用 ---
  {
    name: 'AWS IAM Identity Center',
    nameJa: 'IAM Identity Center',
    type: 'builder',
    category: 'security',
    cost: 0,
    credit: 1,
    quantity: 3,
    description: 'シングルサインオン。1クレジット生成。',
  },
  {
    name: 'Amazon CloudWatch',
    nameJa: 'Amazon CloudWatch',
    type: 'builder',
    category: 'management',
    cost: 0,
    credit: 1,
    quantity: 2,
    description: 'メトリクス監視・アラート。カードを1枚引く。',
    effects: { draw: 1 },
  },
  {
    name: 'AWS CloudTrail',
    nameJa: 'AWS CloudTrail',
    type: 'builder',
    category: 'security',
    cost: 0,
    credit: 1,
    quantity: 2,
    description: '監査ログ。1クレジット生成。',
  },
  {
    name: 'AWS Systems Manager',
    nameJa: 'AWS Systems Manager',
    type: 'builder',
    category: 'management',
    cost: 0,
    credit: 1,
    quantity: 2,
    description: 'ハイブリッド環境集中管理。EC2と連携で+1c。',
    comboWith: ['Amazon EC2'],
    comboBonus: { credit: 1 },
    comboDesc: '【連携: EC2】+1c',
  },
  {
    name: 'AWS Well-Architected Tool',
    nameJa: 'Well-Architected Tool',
    type: 'builder',
    category: 'management',
    cost: 3,
    credit: 2,
    quantity: 2,
    description: '設計レビュー。2c生成＋1ドロー。',
    effects: { draw: 1 },
  },
  {
    name: 'Cloud Financial Management',
    nameJa: 'クラウド財務管理 (CFM)',
    type: 'builder',
    category: 'management',
    cost: 3,
    credit: 2,
    quantity: 2,
    description: '2c生成＋購入枠+1。使用後リタイア（夕日）。',
    effects: { extraAcquire: 1, retireOnUse: true },
  },

  // --- デベロッパーツール・IaC ---
  {
    name: 'AWS CloudFormation',
    nameJa: 'AWS CloudFormation',
    type: 'builder',
    category: 'developer',
    cost: 2,
    credit: 2,
    quantity: 3,
    description: 'IaC自動構築。2c生成＋1ドロー。',
    effects: { draw: 1 },
  },
  {
    name: 'AWS CDK',
    nameJa: 'AWS CDK',
    type: 'builder',
    category: 'developer',
    cost: 3,
    credit: 2,
    quantity: 4,
    description: 'コードでインフラ定義。2c生成＋購入枠+1。',
    effects: { extraAcquire: 1 },
  },
  {
    name: 'Amazon CodeCatalyst',
    nameJa: 'CodeCatalyst',
    type: 'builder',
    category: 'developer',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: '統合開発環境・CI/CD。2c生成＋1ドロー。',
    effects: { draw: 1 },
  },
  {
    name: 'AWS Marketplace',
    nameJa: 'AWS Marketplace',
    type: 'builder',
    category: 'developer',
    cost: 2,
    credit: 2,
    quantity: 2,
    description: 'サードパーティ連携。2クレジット生成。',
  },
];

/**
 * コストなし・コストありの2つの山札（計91枚）を生成する
 */
export function createBuilderDecks(): { freeDeck: BuilderCard[]; costDeck: BuilderCard[] } {
  const freeDeck: BuilderCard[] = [];
  const costDeck: BuilderCard[] = [];

  let idCounter = 1;
  for (const def of ALL_BUILDER_DEFINITIONS) {
    for (let i = 0; i < def.quantity; i++) {
      const card: BuilderCard = {
        id: `builder-${idCounter++}`,
        name: def.name,
        nameJa: def.nameJa,
        type: 'builder',
        category: def.category,
        cost: def.cost,
        credit: def.credit,
        description: def.description,
        comboWith: def.comboWith,
        comboBonus: def.comboBonus,
        comboDesc: def.comboDesc,
        effects: def.effects,
      };

      if (def.cost === 0) {
        freeDeck.push(card);
      } else {
        costDeck.push(card);
      }
    }
  }

  return { freeDeck, costDeck };
}

/**
 * Well-Architected カード（勝利点スタック）
 */
export function createWellArchitectedStack(playerCount: number = 2): WellArchitectedCard[] {
  const cards: WellArchitectedCard[] = [];
  const count1Pt = playerCount === 2 ? 4 : 7;
  const count3Pt = playerCount === 2 ? 3 : 5;

  for (let i = 0; i < count3Pt; i++) {
    cards.push({
      id: `wa-3pt-${i + 1}`,
      name: '3-Point Well-Architected',
      nameJa: 'Well-Architected (3点)',
      type: 'well-architected',
      cost: 7,
      credit: 0,
      points: 3,
      description: 'ゲーム終了時の勝利点3ポイント。',
    });
  }

  for (let i = 0; i < count1Pt; i++) {
    cards.push({
      id: `wa-1pt-${i + 1}`,
      name: '1-Point Well-Architected',
      nameJa: 'Well-Architected (1点)',
      type: 'well-architected',
      cost: 4,
      credit: 0,
      points: 1,
      description: 'ゲーム終了時の勝利点1ポイント。',
    });
  }

  return cards;
}

/**
 * ドミニオン完全準拠のサプライセット生成
 * - 基本財宝（銅・銀・金）3種
 * - 勝利点（Well-Architected 1pt, 3pt）2種
 * - 王国AWSアクション 10種
 */
export function createDominionSupply(): {
  treasurePiles: SupplyPile[];
  victoryPiles: SupplyPile[];
  kingdomPiles: SupplyPile[];
} {
  // 1. 基本財宝（クレジット）カード
  const treasurePiles: SupplyPile[] = [
    {
      id: 'treasure-base',
      card: {
        id: 'c-base',
        name: 'Base Compute',
        nameJa: '基本コンピュート',
        type: 'starter',
        color: 'blue',
        cost: 0,
        credit: 1,
        description: '基本計算能力。1クレジット生成。(銅貨相当)',
      },
      count: 30,
      maxCount: 30,
    },
    {
      id: 'treasure-ec2',
      card: {
        id: 'c-ec2-silver',
        name: 'Amazon EC2 Standard',
        nameJa: 'Amazon EC2',
        type: 'builder',
        category: 'compute',
        cost: 2,
        credit: 2,
        description: '標準クラウドサーバー。2クレジット生成。(銀貨相当)',
        comboWith: ['Amazon S3', 'Amazon RDS'],
        comboBonus: { credit: 1 },
        comboDesc: '【連携: S3/RDS】+1c',
      },
      count: 20,
      maxCount: 20,
    },
    {
      id: 'treasure-aurora',
      card: {
        id: 'c-aurora-gold',
        name: 'Amazon Aurora Enterprise',
        nameJa: 'Amazon Aurora',
        type: 'builder',
        category: 'database',
        cost: 4,
        credit: 3,
        description: '高性能クラウドRDB。3クレジット生成。(金貨相当)',
      },
      count: 15,
      maxCount: 15,
    },
  ];

  // 2. 勝利点カード（Well-Architected）
  const victoryPiles: SupplyPile[] = [
    {
      id: 'victory-1pt',
      card: {
        id: 'wa-1pt-supply',
        name: '1-Point Well-Architected',
        nameJa: 'Well-Architected (1点)',
        type: 'well-architected',
        cost: 2,
        credit: 0,
        points: 1,
        description: 'ゲーム終了時の勝利点 1ポイント。(屋敷/公領相当)',
      },
      count: 8,
      maxCount: 8,
    },
    {
      id: 'victory-3pt',
      card: {
        id: 'wa-3pt-supply',
        name: '3-Point Well-Architected',
        nameJa: 'Well-Architected (3点)',
        type: 'well-architected',
        cost: 4,
        credit: 0,
        points: 3,
        description: 'ゲーム終了時の勝利点 3ポイント。(属州相当)',
      },
      count: 6,
      maxCount: 6,
    },
  ];

  // 3. 王国AWSアクションカード（厳選10種：コスト昇順 0c ➔ 1c ➔ 2c ➔ 4c）
  const kingdomPiles: SupplyPile[] = [
    // --- コスト 0c (3種) ---
    {
      id: 'k-route53',
      card: {
        id: 'k-card-route53',
        name: 'Amazon Route 53',
        nameJa: 'Amazon Route 53',
        type: 'builder',
        category: 'networking',
        cost: 0,
        credit: 1,
        description: 'クラウドDNS。CloudFront連携でボーナス。',
        comboWith: ['Amazon CloudFront'],
        comboBonus: { credit: 1 },
        comboDesc: '【連携: CloudFront】+1c',
      },
      count: 6,
      maxCount: 6,
    },
    {
      id: 'k-s3',
      card: {
        id: 'k-card-s3',
        name: 'Amazon S3',
        nameJa: 'Amazon S3',
        type: 'builder',
        category: 'storage',
        cost: 0,
        credit: 1,
        description: 'オブジェクトストレージ。Lambda連携でドロー。',
        comboWith: ['AWS Lambda'],
        comboBonus: { draw: 1 },
        comboDesc: '【連携: Lambda】+1枚引く',
      },
      count: 6,
      maxCount: 6,
    },
    {
      id: 'k-sqs',
      card: {
        id: 'k-card-sqs',
        name: 'Amazon SQS',
        nameJa: 'Amazon SQS',
        type: 'builder',
        category: 'integration',
        cost: 0,
        credit: 1,
        description: 'メッセージキュー。SNS連携でドロー。',
        comboWith: ['Amazon SNS'],
        comboBonus: { draw: 1 },
        comboDesc: '【連携: SNS】+1枚引く',
      },
      count: 6,
      maxCount: 6,
    },

    // --- コスト 1c (4種) ---
    {
      id: 'k-lambda',
      card: {
        id: 'k-card-lambda',
        name: 'AWS Lambda',
        nameJa: 'AWS Lambda',
        type: 'builder',
        category: 'compute',
        cost: 1,
        credit: 0,
        description: 'サーバーレス実行。即座に1枚引く。',
        effects: { draw: 1 },
        comboWith: ['Amazon S3'],
        comboBonus: { credit: 1 },
        comboDesc: '【連携: S3】+1c',
      },
      count: 6,
      maxCount: 6,
    },
    {
      id: 'k-cloudfront',
      card: {
        id: 'k-card-cloudfront',
        name: 'Amazon CloudFront',
        nameJa: 'Amazon CloudFront',
        type: 'builder',
        category: 'networking',
        cost: 1,
        credit: 0,
        description: '超高速CDN。1ドロー＆追加購入権+1。',
        effects: { draw: 1, extraAcquire: 1 },
      },
      count: 6,
      maxCount: 6,
    },
    {
      id: 'k-sns',
      card: {
        id: 'k-card-sns',
        name: 'Amazon SNS',
        nameJa: 'Amazon SNS',
        type: 'builder',
        category: 'integration',
        cost: 1,
        credit: 1,
        description: '通知配信。1c生成＋購入権+1。',
        effects: { extraAcquire: 1 },
        comboWith: ['Amazon SQS'],
        comboBonus: { credit: 1 },
        comboDesc: '【連携: SQS】+1c',
      },
      count: 6,
      maxCount: 6,
    },
    {
      id: 'k-cfm',
      card: {
        id: 'k-card-cfm',
        name: 'AWS CloudFormation',
        nameJa: 'CloudFormation',
        type: 'builder',
        category: 'management',
        cost: 1,
        credit: 0,
        description: '自動構築。2枚引き、使用後リタイア除外！',
        effects: { draw: 2, retireOnUse: true },
      },
      count: 6,
      maxCount: 6,
    },

    // --- コスト 2c (2種) ---
    {
      id: 'k-dynamodb',
      card: {
        id: 'k-card-dynamodb',
        name: 'Amazon DynamoDB',
        nameJa: 'Amazon DynamoDB',
        type: 'builder',
        category: 'database',
        cost: 2,
        credit: 2,
        description: '高速NoSQL。2c生成＋購入権+1。',
        effects: { extraAcquire: 1 },
      },
      count: 6,
      maxCount: 6,
    },
    {
      id: 'k-rds',
      card: {
        id: 'k-card-rds',
        name: 'Amazon RDS',
        nameJa: 'Amazon RDS',
        type: 'builder',
        category: 'database',
        cost: 2,
        credit: 2,
        description: 'マネージドRDB。EC2と連携で特大+2c。',
        comboWith: ['Amazon EC2 Standard'],
        comboBonus: { credit: 2 },
        comboDesc: '【連携: EC2】+2c (特大)',
      },
      count: 6,
      maxCount: 6,
    },

    // --- コスト 4c (1種) ---
    {
      id: 'k-bedrock',
      card: {
        id: 'k-card-bedrock',
        name: 'Amazon Bedrock',
        nameJa: 'Amazon Bedrock',
        type: 'builder',
        category: 'developer',
        cost: 4,
        credit: 3,
        description: '生成AI基盤。3c＋1ドロー＋購入権+1の超強力カード！',
        effects: { draw: 1, extraAcquire: 1 },
      },
      count: 5,
      maxCount: 5,
    },
  ];

  // 念のためコスト昇順を自動ソート保証
  kingdomPiles.sort((a, b) => a.card.cost - b.card.cost);

  return { treasurePiles, victoryPiles, kingdomPiles };
}
