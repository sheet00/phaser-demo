import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_CARDS, CARDS, FIRST_GAME, KINGDOM } from '../src/components/dominion/cards.ts';
import { botCommand, canBuy, canGain, createGame, inputPlayer, owned, reduceGame, score, supplyCards, choiceCards, canChoose } from '../src/components/dominion/engine.ts';

function fixture() {
  const state = createGame(41, FIRST_GAME);
  state.active = 0;
  state.phase = 'action';
  state.pending = null;
  state.players.forEach(player => {
    player.hand = [];
    player.deck = [];
    player.discard = [];
    player.played = [];
    player.turns = 1;
  });
  return state;
}

function cards(state, ...ids) {
  return ids.map(id => ({ uid: state.nextUid++, id }));
}

function play(state, id, actor = state.active) {
  const card = state.players[actor].hand.find(card => card.id === id);
  assert.ok(card, `${id} is in hand`);
  return reduceGame(state, actor, { type: 'play', uid: card.uid });
}

test('初期配布・サプライ枚数・固定シードの再現性', () => {
  const state = createGame(72);
  assert.deepEqual(state, createGame(72));
  assert.equal(state.supply.copper, 46);
  assert.equal(state.supply.estate, 8);
  assert.equal(state.supply.curse, 10);
  for (const player of state.players) {
    assert.equal(player.hand.length, 5);
    assert.equal(player.deck.length, 5);
    assert.equal(owned(player).filter(card => card.id === 'copper').length, 7);
    assert.equal(score(player), 3);
  }
});

test('購入後の財宝追加・相手の操作・二重使用を拒否し元の状態を変更しない', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'silver', 'gold');
  state = reduceGame(state, 0, { type: 'buy-phase' });
  const silver = state.players[0].hand[0];
  const before = structuredClone(state);
  const used = play(state, 'silver');
  assert.deepEqual(state, before);
  assert.equal(reduceGame(used, 0, { type: 'play', uid: silver.uid }), used);
  assert.equal(reduceGame(used, 1, { type: 'buy', card: 'estate' }), used);
  state = reduceGame(used, 0, { type: 'buy', card: 'estate' });
  assert.equal(state.coins, 0);
  assert.equal(state.players[0].discard[0].id, 'estate');
  assert.equal(play(state, 'gold'), state);
  assert.equal(reduceGame(state, 0, { type: 'treasures' }), state);
  assert.equal(canBuy(state, 'copper'), false);
});

test('商人2枚のボーナスは最初の銀貨だけに加算', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'merchant', 'merchant', 'silver', 'silver');
  state = play(play(state, 'merchant'), 'merchant');
  state = reduceGame(state, 0, { type: 'buy-phase' });
  state = play(state, 'silver');
  assert.equal(state.coins, 4);
  state = play(state, 'silver');
  assert.equal(state.coins, 6);
});

test('市場の追加購入とコイン消費を独立して管理する', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'market', 'gold', 'silver');
  state = play(state, 'market');
  assert.equal(state.actions, 1);
  assert.equal(state.buys, 2);
  state = reduceGame(state, 0, { type: 'buy-phase' });
  state = reduceGame(state, 0, { type: 'treasures' });
  state = reduceGame(state, 0, { type: 'buy', card: 'silver' });
  state = reduceGame(state, 0, { type: 'buy', card: 'village' });
  assert.equal(state.buys, 0);
  assert.equal(state.coins, 0);
  assert.deepEqual(state.players[0].discard.map(card => card.id), ['silver', 'village']);
});

test('村・鍛冶屋・堀が正しい枚数を引きアクションを消費する', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'village', 'smithy', 'moat');
  state.players[0].deck = cards(state, ...Array(8).fill('copper'));
  state = play(state, 'village');
  assert.equal(state.actions, 2);
  state = play(state, 'smithy');
  assert.equal(state.actions, 1);
  state = play(state, 'moat');
  assert.equal(state.actions, 0);
  assert.equal(state.players[0].hand.length, 6);
  assert.equal(state.players[0].deck.length, 2);
});

test('地下貯蔵庫は選択完了まで引かず、捨てたカードもシャッフル対象にする', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'cellar', 'estate', 'copper');
  state = play(state, 'cellar');
  assert.equal(reduceGame(state, 0, { type: 'buy-phase' }), state);
  const choices = [...state.players[0].hand];
  for (const card of choices) state = reduceGame(state, 0, { type: 'choose', uid: card.uid });
  assert.equal(state.players[0].hand.length, 0);
  assert.equal(state.pending.discarded, 2);
  state = reduceGame(state, 0, { type: 'done' });
  assert.equal(state.players[0].hand.length, 2);
  assert.equal(state.players[0].discard.length, 0);
  assert.equal(state.players[0].played[0].id, 'cellar');
  assert.equal(state.pending, null);
});

test('鉱山は財宝だけを廃棄し、獲得した財宝を同ターンに使用できる', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'mine', 'silver', 'estate');
  state = play(state, 'mine');
  const estate = state.players[0].hand.find(card => card.id === 'estate');
  assert.equal(reduceGame(state, 0, { type: 'choose', uid: estate.uid }), state);
  state = reduceGame(state, 0, { type: 'choose', uid: state.players[0].hand[0].uid });
  assert.equal(canGain(state, 'gold'), true);
  assert.equal(canGain(state, 'duchy'), false);
  state = reduceGame(state, 0, { type: 'gain', card: 'gold' });
  assert.equal(state.trash[0].id, 'silver');
  assert.equal(state.players[0].hand.some(card => card.id === 'gold'), true);
  state = reduceGame(state, 0, { type: 'buy-phase' });
  state = play(state, 'gold');
  assert.equal(state.coins, 3);
});

test('鉱山の省略・手札なしの改築・工房の獲得上限', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'mine', 'copper');
  state = play(state, 'mine');
  state = reduceGame(state, 0, { type: 'done' });
  assert.equal(state.trash.length, 0);
  state = fixture();
  state.players[0].hand = cards(state, 'remodel');
  state = play(state, 'remodel');
  assert.equal(state.pending, null);
  state = fixture();
  state.players[0].hand = cards(state, 'workshop');
  state = play(state, 'workshop');
  assert.equal(canGain(state, 'smithy'), true);
  assert.equal(canGain(state, 'market'), false);
  state = reduceGame(state, 0, { type: 'gain', card: 'smithy' });
  assert.equal(state.players[0].discard[0].id, 'smithy');
});

test('改築はコインと無関係に廃棄価格+2以下を捨て札へ獲得する', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'remodel', 'estate');
  state.coins = 20;
  state = play(state, 'remodel');
  state = reduceGame(state, 0, { type: 'choose', uid: state.players[0].hand[0].uid });
  assert.equal(canGain(state, 'smithy'), true);
  assert.equal(canGain(state, 'market'), false);
  state = reduceGame(state, 0, { type: 'gain', card: 'smithy' });
  assert.equal(state.trash[0].id, 'estate');
  assert.equal(state.players[0].discard[0].id, 'smithy');
  assert.equal(state.coins, 20);
});

test('CPUの民兵を人間の堀で防ぎ、手札に堀を残す', () => {
  let state = fixture();
  state.active = 1;
  state.players[1].hand = cards(state, 'militia');
  state.players[0].hand = cards(state, 'moat', 'copper', 'copper', 'estate', 'silver');
  state = play(state, 'militia');
  assert.equal(inputPlayer(state), 0);
  assert.equal(botCommand(state), null);
  assert.equal(state.coins, 2);
  const blocked = reduceGame(state, 0, { type: 'reveal' });
  assert.equal(blocked.players[0].hand.length, 5);
  assert.equal(blocked.players[0].hand[0].id, 'moat');
  assert.equal(blocked.pending, null);
  assert.equal(inputPlayer(blocked), 1);
  assert.ok(botCommand(blocked));
});

test('堀を公開しなければ人間が捨て札を選び、3枚まで減ったらCPUを再開', () => {
  let state = fixture();
  state.active = 1;
  state.players[1].hand = cards(state, 'militia');
  state.players[0].hand = cards(state, 'moat', 'copper', 'copper', 'estate', 'silver');
  state = play(state, 'militia');
  state = reduceGame(state, 0, { type: 'decline' });
  assert.equal(reduceGame(state, 1, { type: 'buy-phase' }), state);
  state = reduceGame(state, 0, { type: 'choose', uid: state.players[0].hand[0].uid });
  assert.equal(state.pending.kind, 'militia');
  state = reduceGame(state, 0, { type: 'choose', uid: state.players[0].hand[0].uid });
  assert.equal(state.pending, null);
  assert.equal(state.players[0].hand.length, 3);
  assert.equal(state.players[0].discard.length, 2);
  assert.ok(botCommand(state));
});

test('獲得候補の山が空なら選択待ちにならない', () => {
  let state = fixture();
  for (const id of ALL_CARDS) state.supply[id] = 0;
  state.players[0].hand = cards(state, 'workshop');
  state = play(state, 'workshop');
  assert.equal(state.pending, null);
  assert.equal(canBuy(state, 'copper'), false);
});

test('属州切れは購入時に即終了せずターン終了時に全所有カードで採点', () => {
  let state = fixture();
  state.phase = 'buy';
  state.coins = 8;
  state.supply.province = 1;
  state.players[0].hand = cards(state, 'estate');
  state.players[0].played = cards(state, 'duchy');
  state = reduceGame(state, 0, { type: 'buy', card: 'province' });
  assert.equal(state.phase, 'buy');
  assert.equal(score(state.players[0]), 10);
  state = reduceGame(state, 0, { type: 'end-turn' });
  assert.equal(state.phase, 'ended');
  assert.equal(state.winner, 0);
  assert.equal(score(state.players[0]), 10);
  assert.equal(reduceGame(state, 0, { type: 'buy-phase' }), state);
});

test('3山切れ・同点で手番が少ない側の勝利・同手番の引き分け', () => {
  let state = fixture();
  state.phase = 'buy';
  state.supply.copper = state.supply.curse = state.supply.cellar = 0;
  state.players[0].turns = 5;
  state.players[1].turns = 4;
  let finished = reduceGame(state, 0, { type: 'end-turn' });
  assert.equal(finished.winner, 1);
  assert.equal(finished.phase, 'ended');
  state.players[1].turns = 5;
  finished = reduceGame(state, 0, { type: 'end-turn' });
  assert.equal(finished.winner, 'tie');
});

test('クリーンアップで手札と場を捨て、次の手番の資源と商人をリセット', () => {
  let state = fixture();
  state.phase = 'buy';
  state.coins = 5;
  state.buys = 3;
  state.actions = 4;
  state.bought = true;
  state.merchants = 2;
  state.silverPlayed = true;
  state.players[0].hand = cards(state, 'estate', 'estate');
  state.players[0].played = cards(state, 'copper', 'silver', 'gold');
  state = reduceGame(state, 0, { type: 'end-turn' });
  assert.equal(state.players[0].hand.length, 5);
  assert.equal(state.players[0].played.length, 0);
  assert.equal(state.active, 1);
  assert.equal(state.phase, 'action');
  assert.deepEqual([state.coins, state.actions, state.buys, state.merchants, state.silverPlayed, state.bought], [0, 1, 1, 0, false, false]);
});

function countCards(state) {
  return Object.fromEntries(ALL_CARDS.map(id => [id, state.supply[id] + [...owned(state.players[0]), ...owned(state.players[1]), ...state.trash].filter(card => card.id === id).length]));
}

test('24シードでCPU同士が合法操作のみで終局し、カード総数・UIDを保存', () => {
  for (let seed = 1; seed <= 24; seed++) {
    let state = createGame(seed * 9137);
    const initialCounts = countCards(state);
    let steps = 0;
    while (state.phase !== 'ended' && steps++ < 2500) {
      const actor = inputPlayer(state);
      const command = botCommand(state, actor);
      assert.ok(command, `seed ${seed}, step ${steps}: command exists`);
      const next = reduceGame(state, actor, command);
      assert.notEqual(next, state, `seed ${seed}, step ${steps}: legal command`);
      state = next;
      assert.deepEqual(countCards(state), initialCounts);
      const all = [...owned(state.players[0]), ...owned(state.players[1]), ...state.trash];
      assert.equal(new Set(all.map(card => card.uid)).size, all.length);
      assert.ok(state.actions >= 0 && state.buys >= 0 && state.coins >= 0);
      assert.ok(ALL_CARDS.every(id => state.supply[id] >= 0));
    }
    assert.equal(state.phase, 'ended', `seed ${seed}: finishes within 2500 commands`);
    assert.ok(state.winner !== null);
    assert.ok(state.supply.province === 0 || supplyCards(state).filter(id => state.supply[id] === 0).length >= 3);
    assert.ok(state.players.every(player => score(player) === owned(player).reduce((sum, card) => sum + (card.id === 'gardens' ? Math.floor(owned(player).length / 10) : CARDS[card.id].points ?? 0), 0)));
  }
});

function chooseId(state, id, actor = inputPlayer(state)) {
  const card = choiceCards(state).find(card => card.id === id && canChoose(state, card));
  assert.ok(card, `${id} is selectable`);
  const next = reduceGame(state, actor, { type: 'choose', uid: card.uid });
  assert.notEqual(next, state);
  return next;
}

function done(state) { return reduceGame(state, inputPlayer(state), { type: 'done' }); }

function include(state, id) {
  if (!state.kingdom.includes(id)) {
    const removed = state.kingdom.pop();
    state.supply[removed] = 0;
    state.kingdom.push(id);
    state.supply[id] = CARDS[id].type === 'victory' ? 8 : 10;
  }
}

test('26種類から重複なしの10種類を選出し、非採用の16山は購入も終了判定も対象外', () => {
  assert.equal(KINGDOM.length, 26);
  const combinations = new Set();
  const selected = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const gameSeed = Math.imul(seed, 0x9e3779b9) >>> 0;
    let state = createGame(gameSeed);
    assert.equal(new Set(state.kingdom).size, 10);
    assert.equal(supplyCards(state).length, 17);
    assert.deepEqual(state, createGame(gameSeed));
    state.kingdom.forEach(id => selected.add(id));
    combinations.add(state.kingdom.join(','));
    for (const id of KINGDOM) assert.equal(state.supply[id], state.kingdom.includes(id) ? id === 'gardens' ? 8 : 10 : 0);
    state.phase = 'buy'; state.coins = 20;
    for (const id of KINGDOM.filter(id => !state.kingdom.includes(id))) assert.equal(canBuy(state, id), false);
    state = reduceGame(state, state.active, { type: 'end-turn' });
    assert.equal(state.phase, 'action');
  }
  assert.equal(selected.size, 26);
  assert.ok(combinations.size > 90);
});

test('礼拝堂は0〜4枚を廃棄し、4枚で終了する', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'chapel', 'curse', 'estate', 'copper', 'copper', 'silver');
  state = play(state, 'chapel');
  assert.equal(done(state).trash.length, 0);
  for (const id of ['curse', 'estate', 'copper', 'copper']) state = chooseId(state, id);
  assert.equal(state.pending, null);
  assert.equal(state.trash.length, 4);
  assert.deepEqual(state.players[0].hand.map(card => card.id), ['silver']);
});

test('前駆者はドロー後の捨て札から戻す／シャッフルで捨て札が消えた場合は終了', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'harbinger');
  state.players[0].deck = cards(state, 'copper');
  state.players[0].discard = cards(state, 'gold', 'silver');
  state = play(state, 'harbinger');
  assert.equal(state.actions, 1);
  assert.equal(done(state).players[0].discard.length, 2);
  state = chooseId(state, 'gold');
  assert.equal(state.players[0].deck.at(-1).id, 'gold');
  assert.deepEqual(state.players[0].hand.map(card => card.id), ['copper']);
  state = fixture();
  state.players[0].hand = cards(state, 'harbinger');
  state.players[0].discard = cards(state, 'silver');
  state = play(state, 'harbinger');
  assert.equal(state.pending, null);
  assert.equal(state.players[0].hand[0].id, 'silver');
});

test('家臣は捨てたアクションだけを任意使用し、追加アクションを消費しない', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'vassal');
  state.players[0].deck = cards(state, 'gold', 'village');
  state = play(state, 'vassal');
  assert.equal(state.coins, 2);
  assert.equal(state.actions, 0);
  assert.equal(done(state).players[0].discard[0].id, 'village');
  state = reduceGame(state, 0, { type: 'accept' });
  assert.equal(state.actions, 2);
  assert.equal(state.players[0].hand[0].id, 'gold');
  assert.deepEqual(state.players[0].played.map(card => card.id), ['vassal', 'village']);
});

test('金貸しは銅貨だけを廃棄でき、省略時にはコインを得ない', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'moneylender', 'copper', 'silver');
  state = play(state, 'moneylender');
  assert.equal(canChoose(state, state.players[0].hand.find(card => card.id === 'silver')), false);
  assert.equal(done(state).coins, 0);
  state = chooseId(state, 'copper');
  assert.equal(state.coins, 3);
  assert.equal(state.trash[0].id, 'copper');
});

test('密猟者は採用サプライの空山だけを数え、ドロー後に必要枚数を捨てる', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'poacher', 'estate');
  state.players[0].deck = cards(state, 'copper');
  const noEmpty = play(state, 'poacher');
  assert.equal(noEmpty.pending, null);
  assert.equal(noEmpty.coins, 1);
  state.supply.curse = state.supply.silver = state.supply.gold = 0;
  state = play(state, 'poacher');
  assert.equal(state.pending.remaining, 2);
  state = chooseId(chooseId(state, 'estate'), 'copper');
  assert.equal(state.pending, null);
  assert.equal(state.players[0].hand.length, 0);
});

test('祝祭・研究所・議事堂の資源とドロー、議事堂は堀を無視する', () => {
  for (const [id, draws, actions, buys, coins] of [
    ['festival', 0, 2, 2, 2], ['laboratory', 2, 1, 1, 0], ['councilRoom', 4, 0, 2, 0],
  ]) {
    let state = fixture();
    state.players[0].hand = cards(state, id);
    state.players[0].deck = cards(state, ...Array(5).fill('copper'));
    state.players[1].hand = cards(state, 'moat');
    state.players[1].deck = cards(state, 'silver');
    state = play(state, id);
    assert.deepEqual([state.players[0].hand.length, state.actions, state.buys, state.coins], [draws, actions, buys, coins]);
    assert.equal(state.pending, null);
    assert.equal(state.players[1].hand.length, id === 'councilRoom' ? 2 : 1);
  }
});

test('庭園は全所有領域の10枚ごとに各1点で、2人戦の山は8枚', () => {
  const state = fixture();
  include(state, 'gardens');
  assert.equal(state.supply.gardens, 8);
  const player = state.players[0];
  player.hand = cards(state, 'gardens');
  player.played = cards(state, 'gardens');
  player.discard = cards(state, 'copper');
  player.aside = cards(state, 'copper');
  player.deck = cards(state, ...Array(15).fill('copper'));
  assert.equal(score(player), 2);
  player.deck.push(...cards(state, 'copper'));
  assert.equal(score(player), 4);
});

test('役人は銀貨を山札へ獲得し、相手は勝利点を選んで公開して戻す', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'bureaucrat');
  state.players[1].hand = cards(state, 'estate', 'gardens', 'curse');
  state = play(state, 'bureaucrat');
  assert.equal(state.players[0].deck.at(-1).id, 'silver');
  assert.equal(canChoose(state, state.players[1].hand.find(card => card.id === 'curse')), false);
  state = chooseId(state, 'gardens');
  assert.equal(state.players[1].deck.at(-1).id, 'gardens');
  assert.equal(state.pending, null);
});

test('役人は銀貨切れでも攻撃し、勝利点がなければ手札を公開して終了', () => {
  let state = fixture();
  state.supply.silver = 0;
  state.players[0].hand = cards(state, 'bureaucrat');
  state.players[1].hand = cards(state, 'copper', 'curse');
  state = play(state, 'bureaucrat');
  assert.equal(state.pending, null);
  assert.equal(state.players[0].deck.length, 0);
  assert.ok(state.log.at(-1).text.includes('銅貨・呪い'));
});

test('山賊は公開2枚から被攻撃側が財宝を選び、残りを捨てる', () => {
  let state = fixture();
  state.active = 1;
  state.players[1].hand = cards(state, 'bandit');
  state.players[0].deck = cards(state, 'gold');
  state.players[0].discard = cards(state, 'silver');
  state = play(state, 'bandit');
  assert.equal(state.players[1].discard[0].id, 'gold');
  assert.equal(state.pending.player, 0);
  assert.equal(botCommand(state), null);
  assert.deepEqual(state.players[0].aside.map(card => card.id), ['gold', 'silver']);
  state = chooseId(state, 'silver');
  assert.equal(state.trash[0].id, 'silver');
  assert.equal(state.players[0].discard[0].id, 'gold');
  assert.equal(state.players[0].aside.length, 0);
});

test('山賊は銅貨を廃棄せず、金貨切れでも攻撃を解決', () => {
  let state = fixture();
  state.supply.gold = 0;
  state.players[0].hand = cards(state, 'bandit');
  state.players[1].deck = cards(state, 'copper', 'estate');
  state = play(state, 'bandit');
  assert.equal(state.pending, null);
  assert.equal(state.trash.length, 0);
  assert.equal(state.players[1].discard.length, 2);
});

test('魔女は呪いを獲得させ、呪い切れでも2枚引く', () => {
  for (const curses of [0, 1]) {
    let state = fixture();
    state.supply.curse = curses;
    state.players[0].hand = cards(state, 'witch');
    state.players[0].deck = cards(state, 'copper', 'silver');
    state = play(state, 'witch');
    assert.equal(state.players[0].hand.length, 2);
    assert.equal(state.players[1].discard.length, curses);
    assert.equal(state.supply.curse, 0);
  }
});

test('堀は追加した3種類の攻撃を防ぎ、攻撃側の獲得やドローは維持', () => {
  for (const id of ['witch', 'bandit', 'bureaucrat']) {
    let state = fixture();
    state.players[0].hand = cards(state, id);
    state.players[0].deck = cards(state, 'copper', 'silver');
    state.players[1].hand = cards(state, 'moat', 'estate');
    state.players[1].deck = cards(state, 'gold', 'silver');
    const defender = structuredClone(state.players[1]);
    state = play(state, id);
    assert.equal(state.pending.attack, id);
    state = reduceGame(state, 1, { type: 'reveal' });
    assert.deepEqual(state.players[1], defender);
    assert.equal(state.pending, null);
    assert.equal(state.players[0].hand.length, id === 'witch' ? 2 : 0);
  }
});

test('職人は手札へ獲得後に手札1枚を山札へ戻し、途中では別操作不可', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'artisan', 'estate');
  state = play(state, 'artisan');
  assert.equal(canGain(state, 'gold'), false);
  assert.equal(canGain(state, 'market'), true);
  state = reduceGame(state, 0, { type: 'gain', card: 'market' });
  assert.equal(state.pending.kind, 'topdeck');
  assert.equal(reduceGame(state, 0, { type: 'buy-phase' }), state);
  state = chooseId(state, 'market');
  assert.equal(state.players[0].deck.at(-1).id, 'market');
  assert.equal(state.players[0].hand[0].id, 'estate');
});

test('職人は獲得できない場合も、残った手札を山札へ戻す', () => {
  let state = fixture();
  for (const id of ALL_CARDS) state.supply[id] = 0;
  state.players[0].hand = cards(state, 'artisan', 'copper');
  state = play(state, 'artisan');
  assert.equal(state.pending.kind, 'topdeck');
  state = chooseId(state, 'copper');
  assert.equal(state.pending, null);
});

test('書庫で脇に置いた行動は効果終了まで再シャッフルに混ぜない', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'library');
  state.players[0].deck = cards(state, 'village');
  state.players[0].discard = cards(state, 'gold', 'silver');
  state = play(state, 'library');
  assert.equal(state.pending.kind, 'library');
  assert.equal(state.players[0].aside[0].id, 'village');
  state = done(state);
  assert.equal(state.pending, null);
  assert.equal(state.players[0].hand.length, 2);
  assert.deepEqual(state.players[0].discard.map(card => card.id), ['village']);
  assert.equal(state.players[0].aside.length, 0);
});

test('書庫は行動を手札に加える選択と、手札7枚で止まる処理に対応', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'library', ...Array(6).fill('copper'));
  state.players[0].deck = cards(state, 'gold', 'village');
  state = play(state, 'library');
  state = reduceGame(state, 0, { type: 'accept' });
  assert.equal(state.players[0].hand.length, 7);
  assert.equal(state.players[0].hand.at(-1).id, 'village');
  assert.equal(state.players[0].deck.at(-1).id, 'gold');
  assert.equal(state.pending, null);
});

test('衛兵はドロー後の2枚から廃棄と捨て札を選び、全所有枚数を保存', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'sentry');
  state.players[0].deck = cards(state, 'estate', 'curse', 'silver');
  state = play(state, 'sentry');
  assert.equal(state.players[0].hand[0].id, 'silver');
  assert.equal(owned(state.players[0]).length, 4);
  state = chooseId(state, 'curse');
  state = done(state);
  assert.equal(state.pending.stage, 'discard');
  state = chooseId(state, 'estate');
  assert.equal(state.pending, null);
  assert.equal(state.trash[0].id, 'curse');
  assert.equal(state.players[0].discard[0].id, 'estate');
});

test('衛兵は残す2枚の順番を選べる／1枚だけでも正常終了', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'sentry');
  state.players[0].deck = cards(state, 'gold', 'silver', 'copper');
  state = done(done(play(state, 'sentry')));
  assert.equal(state.pending.stage, 'order');
  state = chooseId(state, 'gold');
  assert.deepEqual(state.players[0].deck.map(card => card.id), ['silver', 'gold']);
  assert.equal(state.pending, null);
  state = fixture();
  state.players[0].hand = cards(state, 'sentry');
  state.players[0].deck = cards(state, 'gold', 'copper');
  state = done(done(play(state, 'sentry')));
  assert.equal(state.pending, null);
  assert.equal(state.players[0].deck.at(-1).id, 'gold');
});

test('玉座の間→村は1枚を2回使用し、アクションを追加消費しない', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'throneRoom', 'village');
  state.players[0].deck = cards(state, 'copper', 'silver');
  state = chooseId(play(state, 'throneRoom'), 'village');
  assert.equal(state.actions, 4);
  assert.equal(state.players[0].hand.length, 2);
  assert.deepEqual(state.players[0].played.map(card => card.id), ['throneRoom', 'village']);
  assert.equal(state.effects.length, 0);
});

test('玉座の間→工房は獲得を1回ずつ完了してから次を解決する', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'throneRoom', 'workshop');
  state = chooseId(play(state, 'throneRoom'), 'workshop');
  assert.equal(state.pending.kind, 'gain');
  state = reduceGame(state, 0, { type: 'gain', card: 'silver' });
  assert.equal(state.pending.kind, 'gain');
  assert.equal(state.players[0].discard.length, 1);
  state = reduceGame(state, 0, { type: 'gain', card: 'smithy' });
  assert.equal(state.pending, null);
  assert.deepEqual(state.players[0].discard.map(card => card.id), ['silver', 'smithy']);
});

test('玉座の間→玉座の間は別の2枚をそれぞれ2回使用する', () => {
  let state = fixture();
  state.players[0].hand = cards(state, 'throneRoom', 'throneRoom', 'festival', 'market');
  state = chooseId(play(state, 'throneRoom'), 'throneRoom');
  state = chooseId(state, 'festival');
  assert.equal(state.pending.kind, 'throneRoom');
  assert.equal(state.actions, 4);
  state = chooseId(state, 'market');
  assert.equal(state.actions, 6);
  assert.equal(state.coins, 6);
  assert.equal(state.buys, 5);
  assert.equal(state.players[0].played.length, 4);
  assert.equal(state.pending, null);
});

test('玉座の間の攻撃は毎回堀を選び、人間の選択待ちでCPUが停止する', () => {
  let state = fixture();
  state.active = 1;
  state.players[1].hand = cards(state, 'throneRoom', 'witch');
  state.players[0].hand = cards(state, 'moat');
  state = chooseId(play(state, 'throneRoom'), 'witch');
  assert.equal(botCommand(state), null);
  state = reduceGame(state, 0, { type: 'reveal' });
  assert.equal(state.pending.kind, 'reaction');
  assert.equal(state.pending.player, 0);
  state = reduceGame(state, 0, { type: 'decline' });
  assert.equal(state.players[0].discard[0].id, 'curse');
  assert.equal(state.pending, null);
  assert.equal(inputPlayer(state), 1);
});
