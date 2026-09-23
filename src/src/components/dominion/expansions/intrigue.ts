import { ALL_CARDS, CARDS, cardTypes, hasType } from '../cards.ts';
import type { CardId } from '../cards.ts';
import type { Card, Command, GameState, PlayerId } from '../engine.ts';
import type { ExpansionAPI, ExpansionPending, ExpansionTask } from './types.ts';
import { INTRIGUE_KINGDOM } from './intrigueCards.ts';

const other = (player: PlayerId): PlayerId => player === 0 ? 1 : 0;
const queue = (state: GameState, task: ExpansionTask) => state.effects.unshift({ kind: 'expansion', ...task });

function ask(state: GameState, task: ExpansionTask, zone: ExpansionPending['zone'], choices: string[], message: string, optional = false, options: ExpansionPending['options'] = []) {
  if (!choices.length) return false;
  state.pending = { ...task, kind: 'expansion', zone, choices, options, message, optional };
  return true;
}

function handChoice(state: GameState, task: ExpansionTask, message: string, optional = false, filter: (card: Card) => boolean = () => true) {
  return ask(state, task, 'hand', state.players[task.player].hand.filter(filter).map(card => String(card.uid)), message, optional);
}

function options(state: GameState, task: ExpansionTask, values: [string, string][], message: string) {
  return ask(state, task, 'options', values.map(([value]) => value), message, false, values.map(([value, label]) => ({ value, label })));
}

function supplyChoice(state: GameState, api: ExpansionAPI, task: ExpansionTask, predicate: (id: CardId) => boolean, message: string) {
  return ask(state, task, 'supply', api.supply(state).filter(id => state.supply[id] > 0 && predicate(id)), message);
}

function trashCards(state: GameState, api: ExpansionAPI, task: ExpansionTask) {
  if (!handChoice(state, task, `廃棄する手札を選択。あと${task.remaining}枚。`)) {
    if (task.source === 'tradingPost' && task.count === 2) api.gain(state, task.player, 'silver', true);
  }
}

const rewards: [string, string][] = [['cards', '1枚引く'], ['actions', 'アクション+1'], ['buys', '購入+1'], ['coins', 'コイン+1']];
const courtRewards: [string, string][] = [['actions', 'アクション+1'], ['buys', '購入+1'], ['coins', 'コイン+3'], ['gold', '金貨を獲得']];

function rewardChoices(state: GameState, task: ExpansionTask) {
  options(state, task, (task.source === 'pawn' ? rewards : courtRewards).filter(([key]) => !task.selected?.includes(key)), `異なる効果をあと${task.remaining}つ選択。`);
}

function revealHand(state: GameState, api: ExpansionAPI, who: PlayerId) {
  api.log(state, `${state.players[who].name}：手札を公開：${state.players[who].hand.map(card => CARDS[card.id].name).join('・') || 'なし'}。`);
}

export function intrigueEffect(state: GameState, api: ExpansionAPI, task: ExpansionTask): boolean {
  const { player: who, source, step } = task;
  const player = state.players[who];
  if (!INTRIGUE_KINGDOM.includes(source as typeof INTRIGUE_KINGDOM[number])) return false;
  if (step === 'attack') {
    if (source === 'swindler') {
      const card = api.takeTop(state, who);
      if (card) {
        state.trash.push(card);
        api.log(state, `${player.name}：詐欺師で${CARDS[card.id].name}を廃棄。`);
        supplyChoice(state, api, { ...task, player: state.active, target: who, step: 'swindlerGain' }, id => api.cost(state, id) === api.cost(state, card.id), '相手に獲得させる同じコストのカードを選択。');
      }
    } else if (source === 'torturer') options(state, { ...task, step: 'torturerChoice' }, [['discard', '手札2枚を捨てる'], ['curse', '呪いを手札に獲得']], '拷問人への対応を選択。');
    else if (source === 'minion') {
      if (player.hand.length >= 5) { player.discard.push(...player.hand.splice(0)); api.draw(state, who, 4); }
    } else if (source === 'replace') api.gain(state, who, 'curse');
    return true;
  }
  if (step === 'reaction') {
    api.draw(state, who, 2);
    handChoice(state, { ...task, step: 'discard', remaining: 3 }, '外交官：手札を3枚捨ててください。');
    return true;
  }
  if (step === 'masqueradeFinish') {
    const passed = state.masqueradePass;
    for (const from of [0, 1] as const) {
      const card = passed[from];
      if (card) {
        const index = state.players[from].aside.findIndex(entry => entry.uid === card.uid);
        if (index >= 0) state.players[other(from)].hand.push(...state.players[from].aside.splice(index, 1));
      }
    }
    state.masqueradePass = [null, null];
    handChoice(state, { ...task, step: 'optionalTrash' }, '任意で手札1枚を廃棄。', true);
    return true;
  }
  if (step === 'masqueradePass') {
    handChoice(state, task, '相手に渡す手札1枚を選択。両者が選んでから交換します。');
    return true;
  }
  if (step === 'play' && (source === 'minion' || source === 'replace')) {
    state.effects.unshift({ kind: 'attack', player: other(who), card: source, resume: { ...task, step: 'afterReaction' } });
    return true;
  }
  if (step === 'play' || step === 'afterReaction') {
    const attack = (card: 'swindler' | 'minion' | 'replace' | 'torturer') => state.effects.unshift({ kind: 'attack', player: other(who), card });
    switch (source) {
      case 'courtyard': api.draw(state, who, 3); state.effects.unshift({ kind: 'topdeck', player: who }); break;
      case 'lurker': state.actions++; options(state, { ...task, step: 'lurkerChoice' }, [['trash', 'サプライのアクションを廃棄'], ['gain', '廃棄置き場のアクションを獲得']], '待ち伏せの効果を選択。'); break;
      case 'pawn': rewardChoices(state, { ...task, step: 'reward', remaining: 2, selected: [] }); break;
      case 'masquerade':
        api.draw(state, who, 2);
        queue(state, { ...task, step: 'masqueradeFinish' });
        if (state.players.every(entry => entry.hand.length > 0)) {
          queue(state, { ...task, player: other(who), step: 'masqueradePass' });
          queue(state, { ...task, step: 'masqueradePass' });
        }
        break;
      case 'shantyTown': state.actions += 2; revealHand(state, api, who); if (!player.hand.some(card => hasType(card.id, 'action'))) api.draw(state, who, 2); break;
      case 'steward': options(state, { ...task, step: 'stewardChoice' }, [['cards', '2枚引く'], ['coins', 'コイン+2'], ['trash', '手札2枚を廃棄']], '執事の効果を選択。'); break;
      case 'swindler': state.coins += 2; attack(source); break;
      case 'wishingWell':
        api.draw(state, who, 1); state.actions++;
        options(state, { ...task, step: 'wish' }, ALL_CARDS.map(id => [id, CARDS[id].name]), '山札の一番上のカード名を予想。');
        break;
      case 'baron':
        state.buys++;
        if (!handChoice(state, { ...task, step: 'baron' }, '屋敷を1枚捨てると4コイン。省略すると屋敷を獲得。', true, card => card.id === 'estate')) api.gain(state, who, 'estate');
        break;
      case 'bridge': state.buys++; state.coins++; state.costReduction++; break;
      case 'conspirator': state.coins += 2; if (state.actionsPlayed >= 3) { api.draw(state, who, 1); state.actions++; } break;
      case 'diplomat': api.draw(state, who, 2); if (player.hand.length <= 5) state.actions += 2; break;
      case 'ironworks': supplyChoice(state, api, { ...task, step: 'ironworks' }, id => api.cost(state, id) <= 4, '鉄工所：4コスト以下を獲得。'); break;
      case 'mill':
        api.draw(state, who, 1); state.actions++;
        if (player.hand.length) handChoice(state, { ...task, step: 'mill', remaining: 2, count: 0 }, '手札2枚を捨てると2コイン。省略できます。', true);
        break;
      case 'miningVillage':
        api.draw(state, who, 1); state.actions += 2;
        if (player.played.some(card => card.uid === task.uid)) options(state, { ...task, step: 'miningVillage' }, [['keep', '場に残す'], ['trash', '自身を廃棄して2コイン']], '鉱山の村を廃棄しますか？');
        break;
      case 'secretPassage': api.draw(state, who, 2); state.actions++; handChoice(state, { ...task, step: 'passageCard' }, '山札に入れる手札1枚を選択。'); break;
      case 'courtier': handChoice(state, { ...task, step: 'courtier' }, 'タイプ数を数えるために公開する手札を選択。'); break;
      case 'minion': state.actions++; options(state, { ...task, step: 'minionChoice' }, [['coins', 'コイン+2'], ['redraw', '手札を全て捨てて4枚引く']], '寵臣の効果を選択。'); break;
      case 'patrol':
        api.draw(state, who, 3);
        for (let i = 0; i < 4; i++) { const card = api.takeTop(state, who); if (card) player.aside.push(card); }
        api.log(state, `${player.name}：パトロールで公開：${player.aside.map(card => CARDS[card.id].name).join('・') || 'なし'}。`);
        for (const card of [...player.aside]) if (hasType(card.id, 'victory') || hasType(card.id, 'curse')) api.move(state, who, 'aside', card.uid, 'hand');
        ask(state, { ...task, step: 'patrolOrder', order: [] }, 'aside', player.aside.map(card => String(card.uid)), '次に引くカードから順に選択。', true);
        break;
      case 'replace': case 'upgrade':
        if (source === 'upgrade') { api.draw(state, who, 1); state.actions++; }
        handChoice(state, { ...task, step: 'upgradeTrash' }, '廃棄する手札1枚を選択。');
        break;
      case 'torturer': api.draw(state, who, 3); attack(source); break;
      case 'tradingPost': trashCards(state, api, { ...task, step: 'trash', remaining: 2, count: 0 }); break;
      case 'nobles': options(state, { ...task, step: 'nobles' }, [['cards', '3枚引く'], ['actions', 'アクション+2']], '貴族の効果を選択。'); break;
    }
    return true;
  }
  return false;
}

export function intrigueChoice(state: GameState, api: ExpansionAPI, pending: ExpansionPending, value: string | null) {
  const { player: who, source, step } = pending;
  const player = state.players[who];
  state.pending = null;
  switch (step) {
    case 'baron': if (value) { api.move(state, who, 'hand', Number(value), 'discard'); state.coins += 4; } else api.gain(state, who, 'estate'); break;
    case 'reward': {
      const selected = [...(pending.selected ?? []), value!];
      const remaining = (pending.remaining ?? 1) - 1;
      if (remaining) rewardChoices(state, { ...pending, selected, remaining });
      else for (const reward of selected) {
        if (reward === 'cards') api.draw(state, who, 1);
        if (reward === 'actions') state.actions++;
        if (reward === 'buys') state.buys++;
        if (reward === 'coins') state.coins += source === 'courtier' ? 3 : 1;
        if (reward === 'gold') api.gain(state, who, 'gold');
      }
      break;
    }
    case 'courtier': {
      const card = player.hand.find(card => String(card.uid) === value)!;
      api.log(state, `${player.name}：廷臣で${CARDS[card.id].name}を公開。`);
      rewardChoices(state, { ...pending, step: 'reward', remaining: Math.min(4, cardTypes(card.id).length), selected: [] });
      break;
    }
    case 'lurkerChoice':
      if (value === 'trash') supplyChoice(state, api, { ...pending, step: 'lurkerTrash' }, id => hasType(id, 'action'), 'サプライから廃棄するアクションを選択。');
      else ask(state, { ...pending, step: 'lurkerGain' }, 'trash', state.trash.filter(card => hasType(card.id, 'action')).map(card => String(card.uid)), '廃棄置き場から獲得するアクションを選択。');
      break;
    case 'lurkerTrash': {
      const id = value as CardId;
      state.supply[id]--; state.trash.push({ uid: state.nextUid++, id });
      api.log(state, `${player.name}：サプライの${CARDS[id].name}を廃棄。`);
      break;
    }
    case 'lurkerGain': api.move(state, who, 'trash', Number(value), 'discard'); break;
    case 'masqueradePass':
      state.masqueradePass[who] = api.move(state, who, 'hand', Number(value), 'hand');
      player.aside.push(player.hand.pop()!);
      break;
    case 'optionalTrash': if (value) api.move(state, who, 'hand', Number(value), 'trash'); break;
    case 'stewardChoice':
      if (value === 'cards') api.draw(state, who, 2);
      else if (value === 'coins') state.coins += 2;
      else trashCards(state, api, { ...pending, step: 'trash', remaining: 2, count: 0 });
      break;
    case 'trash': {
      api.move(state, who, 'hand', Number(value), 'trash');
      const remaining = (pending.remaining ?? 1) - 1;
      const count = (pending.count ?? 0) + 1;
      if (remaining && player.hand.length) trashCards(state, api, { ...pending, remaining, count });
      else if (source === 'tradingPost' && count === 2) api.gain(state, who, 'silver', true);
      break;
    }
    case 'discard':
      api.move(state, who, 'hand', Number(value), 'discard');
      if ((pending.remaining ?? 1) > 1 && player.hand.length) handChoice(state, { ...pending, remaining: pending.remaining! - 1 }, `あと${pending.remaining! - 1}枚捨ててください。`);
      break;
    case 'swindlerGain': api.gain(state, pending.target!, value as CardId); break;
    case 'wish': {
      const card = api.takeTop(state, who);
      if (card) {
        api.log(state, `${player.name}：${CARDS[value as CardId].name}を宣言。公開した札は${CARDS[card.id].name}。`);
        (card.id === value ? player.hand : player.deck).push(card);
      }
      break;
    }
    case 'ironworks': {
      const id = value as CardId;
      api.gain(state, who, id);
      if (hasType(id, 'action')) state.actions++;
      if (hasType(id, 'treasure')) state.coins++;
      if (hasType(id, 'victory')) api.draw(state, who, 1);
      break;
    }
    case 'mill':
      if (value) {
        api.move(state, who, 'hand', Number(value), 'discard');
        const count = (pending.count ?? 0) + 1;
        if (count === 2) state.coins += 2;
        else handChoice(state, { ...pending, count, remaining: 1 }, '風車：もう1枚捨ててください。');
      }
      break;
    case 'miningVillage':
      if (value === 'trash' && player.played.some(card => card.uid === pending.uid)) { api.move(state, who, 'played', pending.uid!, 'trash'); state.coins += 2; }
      break;
    case 'passageCard':
      options(state, { ...pending, step: 'passagePosition', uid: Number(value) }, Array.from({ length: player.deck.length + 1 }, (_, index) => [String(index), index === 0 ? '一番上' : index === player.deck.length ? '一番下' : `上から${index + 1}枚目`]), '山札に入れる位置を選択。');
      break;
    case 'passagePosition': {
      const index = player.hand.findIndex(card => card.uid === pending.uid);
      const card = player.hand.splice(index, 1)[0];
      player.deck.splice(player.deck.length - Number(value), 0, card);
      break;
    }
    case 'minionChoice':
      if (value === 'coins') state.coins += 2;
      else {
        player.discard.push(...player.hand.splice(0)); api.draw(state, who, 4);
        if (!pending.blocked) intrigueEffect(state, api, { player: other(who), source: 'minion', step: 'attack' });
      }
      break;
    case 'patrolOrder': {
      const order = [...(pending.order ?? []), ...(value ? [Number(value)] : [])];
      const rest = player.aside.filter(card => !order.includes(card.uid));
      if (value && rest.length > 1) ask(state, { ...pending, order }, 'aside', rest.map(card => String(card.uid)), '次に引くカードを選択。', true);
      else {
        const ordered = [...order.map(uid => player.aside.find(card => card.uid === uid)!), ...rest];
        player.deck.push(...ordered.reverse()); player.aside = [];
      }
      break;
    }
    case 'upgradeTrash': {
      const card = api.move(state, who, 'hand', Number(value), 'trash');
      const cost = api.cost(state, card.id) + (source === 'upgrade' ? 1 : 2);
      supplyChoice(state, api, { ...pending, step: 'upgradeGain' }, id => source === 'upgrade' ? api.cost(state, id) === cost : api.cost(state, id) <= cost, source === 'upgrade' ? `${cost}コストのカードを獲得。` : `${cost}コスト以下のカードを獲得。`);
      break;
    }
    case 'upgradeGain': {
      const id = value as CardId;
      api.gain(state, who, id, false, source === 'replace' && (hasType(id, 'action') || hasType(id, 'treasure')));
      if (source === 'replace' && hasType(id, 'victory') && !pending.blocked) intrigueEffect(state, api, { player: other(who), source: 'replace', step: 'attack' });
      break;
    }
    case 'torturerChoice':
      if (value === 'curse') api.gain(state, who, 'curse', true);
      else handChoice(state, { ...pending, step: 'discard', remaining: 2 }, '拷問人：手札2枚を捨ててください。');
      break;
    case 'nobles': if (value === 'cards') api.draw(state, who, 3); else state.actions += 2; break;
  }
}

export function intrigueBot(state: GameState, pending: ExpansionPending): Command {
  const player = state.players[pending.player];
  const values = pending.choices;
  const quality = (id: CardId) => id === 'curse' ? -100 : id === 'province' ? 100 : id === 'gold' ? 80 : id === 'duchy' ? 50 : (CARDS[id].coins ?? 0) * 10 + CARDS[id].cost * 3;
  if (pending.zone === 'supply') {
    const ids = values as CardId[];
    const direction = pending.step === 'swindlerGain' ? 1 : -1;
    const id = [...ids].sort((a, b) => direction * (quality(a) - quality(b)))[0];
    return { type: 'gain', card: id };
  }
  if (pending.zone === 'options') {
    let preferred = values[0];
    switch (pending.step) {
      case 'reward': preferred = ['actions', 'coins', 'cards', 'gold', 'buys'].find(value => values.includes(value))!; break;
      case 'lurkerChoice': preferred = state.trash.some(card => hasType(card.id, 'action')) ? 'gain' : 'trash'; break;
      case 'stewardChoice': preferred = player.hand.filter(card => card.id === 'curse' || (card.id === 'estate' && state.supply.province > 3)).length >= 2 ? 'trash' : 'coins'; break;
      case 'wish': {
        const counts = new Map<CardId, number>();
        // 山札の順番は参照せず、含まれるカードの枚数から予想する。
        for (const card of [...player.deck, ...player.discard]) counts.set(card.id, (counts.get(card.id) ?? 0) + 1);
        preferred = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'copper';
        break;
      }
      case 'miningVillage': preferred = 'keep'; break;
      case 'minionChoice': preferred = player.hand.reduce((sum, card) => sum + (CARDS[card.id].coins ?? 0), 0) < 3 ? 'redraw' : 'coins'; break;
      case 'torturerChoice': preferred = state.supply.curse === 0 ? 'curse' : 'discard'; break;
      case 'nobles': preferred = state.actions === 0 && player.hand.some(card => hasType(card.id, 'action')) ? 'actions' : 'cards'; break;
    }
    return { type: 'option', value: preferred };
  }
  const zone = pending.zone === 'trash' ? state.trash : pending.zone === 'aside' ? player.aside : player.hand;
  const choices = zone.filter(card => values.includes(String(card.uid)));
  const keep = (card: Card) => hasType(card.id, 'victory') && !hasType(card.id, 'action') && !hasType(card.id, 'treasure') ? -10 : quality(card.id);
  if (pending.optional && pending.step === 'optionalTrash' && !choices.some(card => card.id === 'curse' || (card.id === 'estate' && state.supply.province > 3))) return { type: 'done' };
  if (pending.optional && pending.step === 'mill' && player.hand.length < 2) return { type: 'done' };
  const direction = ['courtier', 'lurkerGain', 'patrolOrder'].includes(pending.step) ? -1 : 1;
  choices.sort((a, b) => direction * (pending.step === 'courtier' ? cardTypes(a.id).length - cardTypes(b.id).length : keep(a) - keep(b)));
  return choices[0] ? { type: 'choose', uid: choices[0].uid } : { type: 'done' };
}
