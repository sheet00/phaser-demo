import { CARDS, hasType } from '../cards.ts';
import type { CardId } from '../cards.ts';
import type { Card, GameState, PlayerId, Command } from '../engine.ts';
import type { ExpansionAPI, ExpansionPending, ExpansionTask } from './types.ts';
import { SEASIDE_KINGDOM } from './seasideCards.ts';

const other = (who: PlayerId): PlayerId => who === 0 ? 1 : 0;

function ask(state: GameState, task: ExpansionTask, zone: ExpansionPending['zone'], choices: string[], message: string, optional = false, options: ExpansionPending['options'] = []) {
  if (!choices.length && !optional) return;
  state.pending = { ...task, kind: 'expansion', zone, choices, options, optional, message };
}

function handChoice(state: GameState, task: ExpansionTask, message: string, optional = false, predicate: (card: Card) => boolean = () => true) {
  const choices = state.players[task.player].hand.filter(predicate).map(card => String(card.uid));
  ask(state, task, 'hand', choices, message, optional);
}

function supplyChoice(state: GameState, api: ExpansionAPI, task: ExpansionTask, predicate: (id: CardId) => boolean, message: string) {
  ask(state, task, 'supply', api.supply(state).filter(id => state.supply[id] > 0 && predicate(id)), message);
}

function optionChoice(state: GameState, task: ExpansionTask, options: { value: string; label: string }[], message: string, optional = false) {
  ask(state, task, 'options', options.map(option => option.value), message, optional, options);
}

function revealHand(state: GameState, api: ExpansionAPI, who: PlayerId) {
  api.log(state, `${state.players[who].name}：手札を公開：${state.players[who].hand.map(card => CARDS[card.id].name).join('・') || 'なし'}。`);
}

function takeAside(state: GameState, api: ExpansionAPI, who: PlayerId, count: number) {
  for (let index = 0; index < count; index++) {
    const card = api.takeTop(state, who);
    if (card) state.players[who].aside.push(card);
  }
}

function resolveLookout(state: GameState, api: ExpansionAPI, task: ExpansionTask) {
  const player = state.players[task.player];
  if (!player.aside.length) return;
  if (task.step === 'lookoutTrash') {
    ask(state, task, 'aside', player.aside.map(card => String(card.uid)), '見張り：廃棄するカードを選択。');
  } else if (task.step === 'lookoutDiscard') {
    ask(state, task, 'aside', player.aside.map(card => String(card.uid)), '見張り：捨てるカードを選択。');
  } else if (task.step === 'lookoutTop') {
    const order = [...(task.order ?? [])];
    const rest = player.aside.filter(card => !order.includes(card.uid));
    player.deck.push(...[...order.map(uid => player.aside.find(card => card.uid === uid)!), ...rest].reverse());
    player.aside = [];
    api.log(state, `${player.name}：見張りで残りのカードを山札の上に戻す。`);
  }
}

function durationEffect(state: GameState, api: ExpansionAPI, task: ExpansionTask) {
  const { player: who, source, uid } = task;
  const player = state.players[who];
  switch (source) {
    case 'astrolabe': state.coins++; state.buys++; break;
    case 'caravan': api.draw(state, who, 1); break;
    case 'blockade': {
      const held = player.blockadeMat.filter(entry => entry.blockadeUid === uid);
      for (const entry of held) {
        player.hand.push(entry.card);
        api.log(state, `${player.name}：封鎖に置いた${CARDS[entry.card.id].name}を手札へ。`);
      }
      player.blockadeMat = player.blockadeMat.filter(entry => entry.blockadeUid !== uid);
      break;
    }
    case 'corsair': api.draw(state, who, 1); break;
    case 'fishingVillage': state.actions++; state.coins++; break;
    case 'haven': {
      const kept = player.havenMat.filter(entry => entry.sourceUid === uid);
      for (const entry of kept) {
        player.hand.push(entry.card);
        api.log(state, `${player.name}：避難所に置いた${CARDS[entry.card.id].name}を手札へ。`);
      }
      player.havenMat = player.havenMat.filter(entry => entry.sourceUid !== uid);
      break;
    }
    case 'lighthouse': state.coins++; break;
    case 'merchantShip': state.coins += 2; break;
    case 'monkey': api.draw(state, who, 1); break;
    case 'outpost': break;
    case 'pirate': supplyChoice(state, api, { ...task, step: 'pirateGain' }, id => hasType(id, 'treasure') && api.cost(state, id) <= 6, '海賊：6コスト以下の財宝を手札に獲得。'); break;
    case 'sailor':
      state.coins += 2;
      handChoice(state, { ...task, step: 'sailorTrash' }, '船乗り：手札1枚を廃棄してもよい。', true);
      break;
    case 'seaWitch':
      api.draw(state, who, 2);
      handChoice(state, { ...task, step: 'seaWitchDiscard', remaining: 2 }, '海の魔女：手札2枚を捨てる。', false);
      break;
    case 'tactician': api.draw(state, who, 5); state.actions++; state.buys++; break;
    case 'tidePools': handChoice(state, { ...task, step: 'tidePoolsDiscard', remaining: 2 }, '潮だまり：手札2枚を捨てる。', false); break;
    case 'wharf': api.draw(state, who, 2); state.buys++; break;
  }
}

export function seasideEffect(state: GameState, api: ExpansionAPI, task: ExpansionTask): boolean {
  const { player: who, source, step, uid } = task;
  if (!SEASIDE_KINGDOM.includes(source as typeof SEASIDE_KINGDOM[number])) return false;
  const player = state.players[who];

  if (step === 'duration') {
    durationEffect(state, api, task);
    return true;
  }
  if (step === 'lookoutTrash' || step === 'lookoutDiscard' || step === 'lookoutTop') {
    resolveLookout(state, api, task);
    return true;
  }
  if (step === 'attack') {
    if (source === 'seaWitch') api.gain(state, who, 'curse');
    else if (source === 'cutpurse') {
      const copper = player.hand.find(card => card.id === 'copper');
      if (copper) api.move(state, who, 'hand', copper.uid, 'discard');
      else revealHand(state, api, who);
    } else if (source === 'corsair') {
      player.aside = [];
      takeAside(state, api, who, 2);
      api.log(state, `${player.name}：私掠船で公開：${player.aside.map(card => CARDS[card.id].name).join('・') || 'なし'}。`);
      const targets = player.aside.filter(card => card.id === 'silver' || card.id === 'gold');
      if (targets.length) ask(state, { ...task, step: 'corsairTrash' }, 'aside', targets.map(card => String(card.uid)), '私掠船：廃棄する銀貨または金貨を選択。');
      else player.discard.push(...player.aside.splice(0));
    }
    return true;
  }
  if (step === 'sailorGain') {
    if (uid === undefined || player.sailorUsed.includes(uid) || (task.gainUid !== undefined && player.sailorGainedUsed.includes(task.gainUid))) return true;
    const gained = [...player.hand, ...player.discard, ...player.deck, ...player.blockadeMat.map(entry => entry.card)].find(card => card.uid === task.gainUid);
    if (!gained) return true;
    optionChoice(state, task, [{ value: 'play', label: `${CARDS[gained.id].name}を使用する` }, { value: 'skip', label: '見送る' }], '船乗り：獲得した持続カードを使用しますか？');
    return true;
  }
  if (step === 'pirateReaction') {
    if (!player.hand.some(card => card.id === 'pirate')) return true;
    handChoice(state, task, '海賊：獲得した財宝に反応して使用する。', true, card => card.id === 'pirate');
    return true;
  }
  if (step === 'treasuryEnd') return true;
  if (step !== 'play' && step !== 'afterReaction') return false;

  const attack = (card: 'cutpurse' | 'corsair' | 'seaWitch') => state.effects.unshift({ kind: 'attack', player: other(who), card });
  switch (source) {
    case 'bazaar': api.draw(state, who, 1); state.actions += 2; state.coins++; break;
    case 'blockade': supplyChoice(state, api, { ...task, step: 'blockadeGain' }, id => api.cost(state, id) <= 4, '封鎖：4コスト以下のカードを獲得。'); break;
    case 'caravan': api.draw(state, who, 1); state.actions++; api.duration(state, who, source, uid!); break;
    case 'corsair': state.coins += 2; api.duration(state, who, source, uid!); attack(source); break;
    case 'cutpurse': state.coins += 2; attack(source); break;
    case 'fishingVillage': state.actions += 2; state.coins++; api.duration(state, who, source, uid!); break;
    case 'haven':
      api.draw(state, who, 1); state.actions++;
      handChoice(state, { ...task, step: 'havenKeep' }, '避難所：次のターンまで保管する手札1枚を選択。', true);
      break;
    case 'island':
      if (uid !== undefined && player.played.some(card => card.uid === uid)) api.move(state, who, 'played', uid, 'island');
      handChoice(state, { ...task, step: 'islandKeep' }, '島：島マットに置く手札1枚を選択。', true);
      break;
    case 'lighthouse': state.actions++; state.coins++; api.duration(state, who, source, uid!); break;
    case 'lookout':
      state.actions++; takeAside(state, api, who, 3);
      if (player.aside.length) resolveLookout(state, api, { ...task, step: 'lookoutTrash' });
      break;
    case 'merchantShip': state.coins += 2; api.duration(state, who, source, uid!); break;
    case 'monkey': api.duration(state, who, source, uid!); break;
    case 'nativeVillage':
      state.actions += 2;
      optionChoice(state, { ...task, step: 'nativeVillage' }, [
        ...(player.nativeVillageMat.length ? [{ value: 'take', label: 'マット上のカードを全て手札へ' }] : []),
        { value: 'put', label: '山札の一番上をマットへ置く' },
      ], '原住民の村の効果を選択。');
      break;
    case 'outpost':
      if (!player.outpostPlayed) {
        player.outpostPlayed = true;
        if (!state.isExtraTurn && state.lastTurnPlayer !== who) {
          state.extraTurnRequested = true;
          api.duration(state, who, source, uid!);
        }
      }
      break;
    case 'pirate': api.duration(state, who, source, uid!); break;
    case 'sailor': state.actions++; api.duration(state, who, source, uid!); break;
    case 'salvager':
      state.buys++;
      handChoice(state, { ...task, step: 'salvagerTrash' }, '引揚水夫：コインを得るため廃棄する手札を選択。', true);
      break;
    case 'seaChart': {
      api.draw(state, who, 1); state.actions++;
      const revealed = api.takeTop(state, who);
      if (revealed) {
        api.log(state, `${player.name}：海図で${CARDS[revealed.id].name}を公開。`);
        const sameInPlay = player.played.some(card => card.id === revealed.id);
        (sameInPlay ? player.hand : player.deck).push(revealed);
        if (sameInPlay) api.log(state, `${CARDS[revealed.id].name}を手札に加える。`);
      }
      break;
    }
    case 'seaWitch': api.draw(state, who, 2); api.duration(state, who, source, uid!); attack(source); break;
    case 'smugglers': {
      const candidateIds = [...new Set(state.players[other(who)].lastTurnGains)]
        .filter(id => api.cost(state, id) <= 6 && state.supply[id] > 0);
      supplyChoice(state, api, { ...task, step: 'smugglersGain' }, id => candidateIds.includes(id), '密輸人：右隣が前のターンに獲得したカードを選択。');
      break;
    }
    case 'tactician':
      if (player.hand.length) {
        player.discard.push(...player.hand.splice(0));
        api.duration(state, who, source, uid!);
      }
      break;
    case 'tidePools': api.draw(state, who, 3); state.actions++; api.duration(state, who, source, uid!); break;
    case 'treasureMap':
      if (player.hand.some(card => card.id === 'treasureMap')) optionChoice(state, { ...task, step: 'treasureMap' }, [
        { value: 'trash', label: '宝の地図2枚を廃棄して金貨4枚を山札へ' }, { value: 'keep', label: '何もしない' },
      ], '宝の地図の効果を選択。');
      break;
    case 'treasury': api.draw(state, who, 1); state.actions++; state.coins++; break;
    case 'warehouse':
      api.draw(state, who, 3); state.actions++;
      handChoice(state, { ...task, step: 'warehouseDiscard', remaining: 3 }, '倉庫：手札を最大3枚捨てる。');
      break;
    case 'wharf': api.draw(state, who, 2); state.buys++; api.duration(state, who, source, uid!); break;
  }
  return true;
}

export function seasideChoice(state: GameState, api: ExpansionAPI, pending: ExpansionPending, value: string | null): boolean {
  if (!SEASIDE_KINGDOM.includes(pending.source as typeof SEASIDE_KINGDOM[number])) return false;
  const { player: who, source, step, uid } = pending;
  const player = state.players[who];
  state.pending = null;
  const chooseAside = (destination: 'trash' | 'discard') => {
    if (value) api.move(state, who, 'aside', Number(value), destination);
  };
  switch (step) {
    case 'blockadeGain': {
      if (value && uid !== undefined) {
        const id = value as CardId;
        api.gainBlockade(state, who, id, uid);
        if (player.blockadeMat.some(entry => entry.blockadeUid === uid)) api.duration(state, who, source, uid);
      }
      break;
    }
    case 'havenKeep':
      if (value && uid !== undefined) {
        const index = player.hand.findIndex(card => card.uid === Number(value));
        if (index >= 0) {
          const card = player.hand.splice(index, 1)[0];
          player.havenMat.push({ sourceUid: uid, card });
          api.duration(state, who, source, uid);
        }
      }
      break;
    case 'islandKeep': if (value) api.move(state, who, 'hand', Number(value), 'island'); break;
    case 'lookoutTrash':
      if (value) {
        api.move(state, who, 'aside', Number(value), 'trash');
        if (player.aside.length) resolveLookout(state, api, { ...pending, step: 'lookoutDiscard' });
        else resolveLookout(state, api, { ...pending, step: 'lookoutTop', order: [] });
      }
      break;
    case 'lookoutDiscard':
      if (value) {
        api.move(state, who, 'aside', Number(value), 'discard');
        resolveLookout(state, api, { ...pending, step: 'lookoutTop', order: [] });
      }
      break;
    case 'lookoutTop': break;
    case 'nativeVillage':
      if (value === 'take') player.hand.push(...player.nativeVillageMat.splice(0));
      else if (value === 'put') {
        const card = api.takeTop(state, who);
        if (card) player.nativeVillageMat.push(card);
      }
      break;
    case 'corsairTrash':
      chooseAside('trash');
      player.discard.push(...player.aside.splice(0));
      break;
    case 'sailorGain':
      if (value === 'play' && uid !== undefined && pending.gainUid !== undefined) {
        player.sailorUsed.push(uid);
        player.sailorGainedUsed.push(pending.gainUid);
        const from = player.hand.some(card => card.uid === pending.gainUid) ? 'hand'
          : player.discard.some(card => card.uid === pending.gainUid) ? 'discard'
            : player.deck.some(card => card.uid === pending.gainUid) ? 'deck' : 'blockade';
        api.playFree(state, who, pending.gainUid, from);
      }
      break;
    case 'pirateReaction':
      if (value) {
        const pirate = api.move(state, who, 'hand', Number(value), 'played');
        api.duration(state, who, 'pirate', pirate.uid);
        api.log(state, `${player.name}：海賊を使用。`);
        if (player.hand.some(card => card.id === 'pirate')) state.effects.unshift({ kind: 'expansion', player: who, source: 'pirate', step: 'pirateReaction' });
      }
      break;
    case 'pirateGain': if (value) api.gain(state, who, value as CardId, true); break;
    case 'sailorTrash': if (value) api.move(state, who, 'hand', Number(value), 'trash'); break;
    case 'seaWitchDiscard': case 'tidePoolsDiscard': case 'warehouseDiscard': case 'cutpurseDiscard': case 'corsairDiscard': case 'salvagerTrash': {
      if (value) {
        const card = api.move(state, who, 'hand', Number(value), step === 'salvagerTrash' ? 'trash' : 'discard');
        if (step === 'salvagerTrash') state.coins += api.cost(state, card.id);
        const remaining = (pending.remaining ?? 1) - 1;
        if (remaining > 0 && player.hand.length && step !== 'salvagerTrash') {
          handChoice(state, { ...pending, remaining }, `${CARDS[source].name}：あと${remaining}枚を捨てる。`);
        }
      }
      break;
    }
    case 'smugglersGain': if (value) api.gain(state, who, value as CardId); break;
    case 'treasureMap':
      if (value === 'trash' && uid !== undefined) {
        const another = player.hand.find(card => card.id === 'treasureMap');
        if (another) {
          api.move(state, who, 'played', uid, 'trash');
          api.move(state, who, 'hand', another.uid, 'trash');
          for (let index = 0; index < 4; index++) api.gain(state, who, 'gold', false, true);
        }
      }
      break;
    case 'treasuryEnd': {
      if (value === 'topdeck' && uid !== undefined && player.played.some(card => card.uid === uid)) api.move(state, who, 'played', uid, 'deck');
      const rest = [...(pending.selected ?? [])];
      const next = rest.shift();
      if (next !== undefined) {
        optionChoice(state, { ...pending, uid: Number(next), selected: rest }, [{ value: 'topdeck', label: '国庫を山札の上に置く' }, { value: 'keep', label: '場に残す' }], '国庫を山札の上に置きますか？');
      } else api.finishTurn(state);
      break;
    }
    case 'corsairAttack': break;
    default: break;
  }
  return true;
}

export function seasideOnGain(state: GameState, api: ExpansionAPI, who: PlayerId, gained: Card) {
  for (const owner of [0, 1] as const) {
    if (owner !== who) {
      const blockades = state.players[owner].blockadeMat.filter(entry => entry.card.id === gained.id);
      for (let index = 0; index < blockades.length; index++) api.gain(state, who, 'curse');
    }
  }
  for (const owner of [0, 1] as const) {
    if (owner !== who && state.players[owner].durations.some(entry => entry.source === 'monkey')) api.draw(state, owner, 1);
  }
  if (hasType(gained.id, 'treasure')) {
    for (const reactor of [0, 1] as const) {
      if (state.players[reactor].hand.some(card => card.id === 'pirate')) state.effects.unshift({ kind: 'expansion', player: reactor, source: 'pirate', step: 'pirateReaction' });
    }
  }
  if (hasType(gained.id, 'duration')) {
    for (const sailor of state.players[who].durations.filter(entry => entry.source === 'sailor' && !state.players[who].sailorUsed.includes(entry.uid))) {
      state.effects.unshift({ kind: 'expansion', player: who, source: 'sailor', step: 'sailorGain', uid: sailor.uid, gainUid: gained.uid });
    }
  }
}

export function seasideOnTreasurePlayed(state: GameState, api: ExpansionAPI, who: PlayerId, card: Card) {
  if (card.id !== 'silver' && card.id !== 'gold') return;
  for (const attacker of [0, 1] as const) {
    const activeCorsairs = state.players[attacker].durations.filter(entry => entry.source === 'corsair').length;
    if (attacker === who || state.players[attacker].corsairUsed >= activeCorsairs) continue;
    state.players[attacker].corsairUsed++;
    if (state.players[who].durations.some(entry => entry.source === 'lighthouse')) {
      api.log(state, `${state.players[who].name}：灯台の効果で私掠船を防ぐ。`);
      return;
    }
    api.move(state, who, 'played', card.uid, 'trash');
    api.log(state, `${state.players[who].name}：私掠船で使用した${CARDS[card.id].name}を廃棄。コインは得る。`);
    return;
  }
}

export function seasideBot(state: GameState, pending: ExpansionPending): Command | null {
  if (!SEASIDE_KINGDOM.includes(pending.source as typeof SEASIDE_KINGDOM[number])) return null;
  if (pending.zone === 'options') {
    const prefer = pending.step === 'nativeVillage'
      ? pending.choices.includes('take') ? 'take' : pending.choices[0]
      : pending.step === 'treasureMap' || pending.step === 'sailorGain' ? pending.choices[0]
        : pending.step === 'treasuryEnd' ? 'topdeck' : pending.choices[0];
    return prefer ? { type: 'option', value: prefer } : { type: 'done' };
  }
  if (pending.zone === 'supply') {
    const ids = pending.choices as CardId[];
    const id = [...ids].sort((a, b) => (CARDS[b].cost - CARDS[a].cost) || (CARDS[b].coins ?? 0) - (CARDS[a].coins ?? 0))[0];
    return id ? { type: 'gain', card: id } : { type: 'done' };
  }
  const player = state.players[pending.player];
  const zone = pending.zone === 'trash' ? state.trash : pending.zone === 'aside' ? player.aside : player.hand;
  const choices = zone.filter(card => pending.choices.includes(String(card.uid)));
  if (pending.optional && ['salvagerTrash', 'sailorTrash'].includes(pending.step)
    && !choices.some(card => card.id === 'curse' || (card.id === 'estate' && state.supply.province > 3))) return { type: 'done' };
  if (pending.optional && pending.step === 'havenKeep' && !choices.length) return { type: 'done' };
  const value = (card: Card) => card.id === 'curse' ? -100 : card.id === 'estate' ? (state.supply.province > 3 ? -30 : 4)
    : hasType(card.id, 'treasure') ? CARDS[card.id].coins ?? 0 : CARDS[card.id].cost + 4;
  const direction = pending.step === 'corsairTrash' ? -1
    : ['islandKeep', 'havenKeep', 'lookoutTrash', 'lookoutDiscard', 'warehouseDiscard', 'seaWitchDiscard', 'tidePoolsDiscard', 'salvagerTrash', 'sailorTrash'].includes(pending.step) ? 1 : -1;
  choices.sort((a, b) => direction * (value(a) - value(b)));
  return choices[0] ? { type: 'choose', uid: choices[0].uid } : pending.optional ? { type: 'done' } : null;
}
