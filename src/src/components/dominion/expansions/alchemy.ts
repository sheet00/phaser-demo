import { ALL_CARDS, CARDS, hasType } from '../cards.ts';
import type { CardId } from '../cards.ts';
import type { Card, Command, GameState, PlayerId } from '../engine.ts';
import type { ExpansionAPI, ExpansionPending, ExpansionTask } from './types.ts';
import { ALCHEMY_KINGDOM } from './alchemyCards.ts';

const other = (player: PlayerId): PlayerId => (player === 0 ? 1 : 0);
const queue = (state: GameState, task: ExpansionTask) => state.effects.unshift({ kind: 'expansion', ...task });

function ask(
  state: GameState,
  task: ExpansionTask,
  zone: ExpansionPending['zone'],
  choices: string[],
  message: string,
  optional = false,
  options: ExpansionPending['options'] = [],
) {
  if (!choices.length) return false;
  state.pending = { ...task, kind: 'expansion', zone, choices, options, message, optional };
  return true;
}

function handChoice(
  state: GameState,
  task: ExpansionTask,
  message: string,
  optional = false,
  filter: (card: Card) => boolean = () => true,
) {
  return ask(
    state,
    task,
    'hand',
    state.players[task.player].hand.filter(filter).map((card) => String(card.uid)),
    message,
    optional,
  );
}

function optionsChoice(state: GameState, task: ExpansionTask, values: [string, string][], message: string) {
  return ask(
    state,
    task,
    'options',
    values.map(([value]) => value),
    message,
    false,
    values.map(([value, label]) => ({ value, label })),
  );
}

function supplyChoice(
  state: GameState,
  api: ExpansionAPI,
  task: ExpansionTask,
  predicate: (id: CardId) => boolean,
  message: string,
  optional = false,
) {
  return ask(
    state,
    task,
    'supply',
    api.supply(state).filter((id) => state.supply[id] > 0 && predicate(id)),
    message,
    optional,
  );
}

export function alchemyEffect(state: GameState, api: ExpansionAPI, task: ExpansionTask): boolean {
  const { player: who, source, step } = task;
  const player = state.players[who];
  if (!ALCHEMY_KINGDOM.includes(source as typeof ALCHEMY_KINGDOM[number])) return false;

  // アタックのリアクション解決後の処理
  if (step === 'attack') {
    if (source === 'familiar') {
      api.gain(state, who, 'curse');
      api.log(state, `${player.name}：使い魔の効果で呪いを獲得。`);
    } else if (source === 'scryingPool') {
      const top = api.takeTop(state, who);
      if (top) {
        player.aside.push(top);
        api.log(state, `${player.name}：山札の上は「${CARDS[top.id].name}」。`);
        optionsChoice(
          state,
          { ...task, player: state.active, target: who, uid: top.uid, step: 'scryingPoolOpponent' },
          [
            ['discard', `${player.name}のカードを捨てる`],
            ['keep', `${player.name}のカードを山札に戻す`],
          ],
          `念術師：相手の山札「${CARDS[top.id].name}」の処理を選択。`,
        );
      }
    }
    return true;
  }

  if (step === 'play') {
    switch (source) {
      case 'herbalist': {
        state.buys += 1;
        state.coins += 1;
        api.log(state, `${player.name}：薬草商で+1購入、+1コイン。`);
        break;
      }
      case 'apothecary': {
        api.draw(state, who, 1);
        state.actions += 1;
        // 山札の上4枚をめくる
        const revealed: Card[] = [];
        for (let i = 0; i < 4; i++) {
          const card = api.takeTop(state, who);
          if (card) revealed.push(card);
        }
        if (!revealed.length) {
          api.log(state, `${player.name}：薬師：山札にカードがありません。`);
          break;
        }
        api.log(state, `${player.name}：薬師で公開：${revealed.map((c) => CARDS[c.id].name).join('・')}。`);
        const copperOrPotion = revealed.filter((c) => c.id === 'copper' || c.id === 'potion');
        const others = revealed.filter((c) => c.id !== 'copper' && c.id !== 'potion');
        player.hand.push(...copperOrPotion);
        if (copperOrPotion.length > 0) {
          api.log(state, `${player.name}：${copperOrPotion.map((c) => CARDS[c.id].name).join('・')}を手札に加えました。`);
        }
        // 残りのカードを山札へ戻す（そのまま戻す）
        player.deck.unshift(...others);
        break;
      }
      case 'apprentice': {
        state.actions += 1;
        if (!handChoice(state, { ...task, step: 'apprenticeTrash' }, '弟子：廃棄する手札を1枚選択してください。')) {
          api.log(state, `${player.name}：弟子：廃棄できる手札がありません。`);
        }
        break;
      }
      case 'transmute': {
        if (!handChoice(state, { ...task, step: 'transmuteTrash' }, '変成：廃棄する手札を1枚選択してください。')) {
          api.log(state, `${player.name}：変成：廃棄できる手札がありません。`);
        }
        break;
      }
      case 'alchemist': {
        api.draw(state, who, 2);
        state.actions += 1;
        api.log(state, `${player.name}：錬金術師で2枚引き、+1アクション。`);
        break;
      }
      case 'scryingPool': {
        state.actions += 1;
        state.effects.unshift({
          kind: 'attack',
          player: other(who),
          card: 'scryingPool' as any,
        });
        const selfTop = api.takeTop(state, who);
        if (selfTop) {
          player.aside.push(selfTop);
          api.log(state, `${player.name}：自分の山札の上は「${CARDS[selfTop.id].name}」。`);
          optionsChoice(
            state,
            { ...task, uid: selfTop.uid, step: 'scryingPoolSelf' },
            [
              ['discard', '捨てる'],
              ['keep', '山札の上に戻す'],
            ],
            `念術師：自分の山札「${CARDS[selfTop.id].name}」の処理を選択。`,
          );
        } else {
          queue(state, { ...task, step: 'scryingPoolDraw' });
        }
        break;
      }
      case 'familiar': {
        api.draw(state, who, 1);
        state.actions += 1;
        state.effects.unshift({
          kind: 'attack',
          player: other(who),
          card: 'familiar' as any,
        });
        api.log(state, `${player.name}：使い魔で1枚引き、+1アクション。`);
        break;
      }
      case 'golem': {
        // ゴーレム以外のアクションカードを2枚探す
        const actionsFound: Card[] = [];
        const others: Card[] = [];
        while (actionsFound.length < 2) {
          const card = api.takeTop(state, who);
          if (!card) break;
          if (hasType(card.id, 'action') && card.id !== 'golem') {
            actionsFound.push(card);
          } else {
            others.push(card);
          }
        }
        // 他のカードは捨てる
        player.discard.push(...others);
        if (others.length > 0) {
          api.log(state, `${player.name}：ゴーレムで公開して捨て札：${others.map((c) => CARDS[c.id].name).join('・')}。`);
        }
        if (actionsFound.length === 0) {
          api.log(state, `${player.name}：ゴーレム：アクションカードが見つかりませんでした。`);
        } else if (actionsFound.length === 1) {
          player.aside.push(actionsFound[0]);
          api.log(state, `${player.name}：ゴーレムで${CARDS[actionsFound[0].id].name}を使用。`);
          api.playFree(state, who, actionsFound[0].uid, 'aside');
        } else {
          player.aside.push(...actionsFound);
          api.log(state, `${player.name}：ゴーレムで${CARDS[actionsFound[0].id].name}と${CARDS[actionsFound[1].id].name}を発見。`);
          optionsChoice(
            state,
            {
              ...task,
              step: 'golemOrder',
              selected: [String(actionsFound[0].uid), String(actionsFound[1].uid)],
            },
            [
              [String(actionsFound[0].uid), `${CARDS[actionsFound[0].id].name} → ${CARDS[actionsFound[1].id].name}`],
              [String(actionsFound[1].uid), `${CARDS[actionsFound[1].id].name} → ${CARDS[actionsFound[0].id].name}`],
            ],
            'ゴーレム：先に使用するカードを選んでください。',
          );
        }
        break;
      }
      case 'university': {
        state.actions += 2;
        supplyChoice(
          state,
          api,
          { ...task, step: 'universityGain' },
          (id) => hasType(id, 'action') && api.cost(state, id) <= 5 && !CARDS[id].potions,
          '大学：コスト5以下のアクションカードを獲得（任意）。',
          true,
        );
        break;
      }
      case 'possession': {
        state.extraTurnRequested = true;
        api.log(state, `${player.name}：支配を使用。このターン終了後、相手を支配する追加ターンが発生します。`);
        break;
      }
    }
    return true;
  }

  return false;
}

export function alchemyChoice(
  state: GameState,
  api: ExpansionAPI,
  pending: ExpansionPending,
  value: string | null,
): boolean {
  const { player: who, source, step } = pending;
  const player = state.players[who];
  if (!ALCHEMY_KINGDOM.includes(source as typeof ALCHEMY_KINGDOM[number])) return false;

  state.pending = null;

  if (step === 'apprenticeTrash' && value) {
    const uid = Number(value);
    const card = api.move(state, who, 'hand', uid, 'trash');
    const baseCost = api.cost(state, card.id);
    const potionBonus = CARDS[card.id].potions ? 2 : 0;
    const drawCount = baseCost + potionBonus;
    api.log(state, `${player.name}：弟子で${CARDS[card.id].name}を廃棄し、${drawCount}枚引く。`);
    api.draw(state, who, drawCount);
    return true;
  }

  if (step === 'transmuteTrash' && value) {
    const uid = Number(value);
    const card = api.move(state, who, 'hand', uid, 'trash');
    api.log(state, `${player.name}：変成で${CARDS[card.id].name}を廃棄。`);
    if (hasType(card.id, 'action')) {
      api.gain(state, who, 'duchy');
      api.log(state, `${player.name}：アクションを廃棄したため公領を獲得。`);
    }
    if (hasType(card.id, 'treasure')) {
      api.gain(state, who, 'transmute');
      api.log(state, `${player.name}：財宝を廃棄したため変成を獲得。`);
    }
    if (hasType(card.id, 'victory')) {
      api.gain(state, who, 'gold');
      api.log(state, `${player.name}：勝利点を廃棄したため金貨を獲得。`);
    }
    return true;
  }

  if (step === 'scryingPoolOpponent' && value) {
    const target = pending.target ?? other(who);
    const targetPlayer = state.players[target];
    const uid = pending.uid!;
    const cardIndex = targetPlayer.aside.findIndex((c) => c.uid === uid);
    if (cardIndex >= 0) {
      const card = targetPlayer.aside.splice(cardIndex, 1)[0];
      if (value === 'discard') {
        targetPlayer.discard.push(card);
        api.log(state, `${player.name}：相手の${CARDS[card.id].name}を捨て札にさせました。`);
      } else {
        targetPlayer.deck.push(card);
        api.log(state, `${player.name}：相手のカードを山札の上に残しました。`);
      }
    }
    return true;
  }

  if (step === 'scryingPoolSelf' && value) {
    const uid = pending.uid!;
    const cardIndex = player.aside.findIndex((c) => c.uid === uid);
    if (cardIndex >= 0) {
      const card = player.aside.splice(cardIndex, 1)[0];
      if (value === 'discard') {
        player.discard.push(card);
        api.log(state, `${player.name}：自分の${CARDS[card.id].name}を捨て札にしました。`);
      } else {
        player.deck.push(card);
        api.log(state, `${player.name}：自分のカードを山札の上に残しました。`);
      }
    }
    // ドローフェイズへ
    const revealed: Card[] = [];
    while (true) {
      const drawn = api.takeTop(state, who);
      if (!drawn) break;
      revealed.push(drawn);
      if (!hasType(drawn.id, 'action')) {
        break;
      }
    }
    player.hand.push(...revealed);
    api.log(
      state,
      `${player.name}：念術師で手札に加えたカード：${revealed.map((c) => CARDS[c.id].name).join('・') || 'なし'}。`,
    );
    return true;
  }

  if (step === 'scryingPoolDraw') {
    const revealed: Card[] = [];
    while (true) {
      const drawn = api.takeTop(state, who);
      if (!drawn) break;
      revealed.push(drawn);
      if (!hasType(drawn.id, 'action')) break;
    }
    player.hand.push(...revealed);
    api.log(
      state,
      `${player.name}：念術師で手札に加えたカード：${revealed.map((c) => CARDS[c.id].name).join('・') || 'なし'}。`,
    );
    return true;
  }

  if (step === 'golemOrder' && value) {
    const uids = pending.selected!.map(Number);
    const firstUid = Number(value);
    const secondUid = uids.find((u) => u !== firstUid)!;
    api.playFree(state, who, firstUid, 'aside');
    api.playFree(state, who, secondUid, 'aside');
    return true;
  }

  if (step === 'universityGain') {
    if (value) {
      const card = value as CardId;
      api.gain(state, who, card);
      api.log(state, `${player.name}：大学で${CARDS[card].name}を獲得。`);
    } else {
      api.log(state, `${player.name}：大学：カードを獲得しませんでした。`);
    }
    return true;
  }

  return false;
}

export function alchemyBot(state: GameState, pending: ExpansionPending): Command | null {
  const { source, step, zone, choices, options } = pending;
  if (!ALCHEMY_KINGDOM.includes(source as typeof ALCHEMY_KINGDOM[number])) return null;

  if (step === 'apprenticeTrash') {
    // コストの高いカードまたは不要なカードを優先廃棄
    return { type: 'choose', uid: Number(choices[0]) };
  }
  if (step === 'transmuteTrash') {
    // アクションか勝利点を優先廃棄
    return { type: 'choose', uid: Number(choices[0]) };
  }
  if (step === 'scryingPoolOpponent') {
    // 相手の良いカードなら捨てさせ、悪いカードなら残す
    return { type: 'option', value: 'discard' };
  }
  if (step === 'scryingPoolSelf') {
    // 自分のカードなら基本残す
    return { type: 'option', value: 'keep' };
  }
  if (step === 'golemOrder') {
    return { type: 'option', value: choices[0] };
  }
  if (step === 'universityGain') {
    return choices.length ? { type: 'gain', card: choices[0] as CardId } : { type: 'done' };
  }
  if (zone === 'options' && options.length) {
    return { type: 'option', value: options[0].value };
  }
  return null;
}
