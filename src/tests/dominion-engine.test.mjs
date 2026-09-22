import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_CARDS, CARDS } from '../src/components/dominion/cards.ts';
import { botCommand, canBuy, canGain, createGame, inputPlayer, owned, reduceGame, score } from '../src/components/dominion/engine.ts';

function fixture() {
  const state = createGame(41);
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
      const view = structuredClone(state);
      if (actor === 0) {
        view.players = [view.players[1], view.players[0]];
        view.active = view.active === 0 ? 1 : 0;
        if (view.pending) view.pending.player = view.pending.player === 0 ? 1 : 0;
      }
      const command = botCommand(view);
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
    assert.ok(state.supply.province === 0 || ALL_CARDS.filter(id => state.supply[id] === 0).length >= 3);
    assert.ok(state.players.every(player => score(player) === owned(player).reduce((sum, card) => sum + (CARDS[card.id].points ?? 0), 0)));
  }
});
