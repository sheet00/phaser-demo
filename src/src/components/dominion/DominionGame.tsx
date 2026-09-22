import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBasketShopping, faBolt, faCircleQuestion, faCoins, faFlag, faTableCellsLarge, faVolumeHigh, faVolumeXmark } from '@fortawesome/free-solid-svg-icons';
import Phaser from 'phaser';
import { afterFontsReady, CRISP_RENDERING, FONT_FAMILY } from '../old-testament-rpg/typography';
import { ALL_CARDS, CARDS } from './cards';
import type { CardId } from './cards';
import { botCommand, inputPlayer, instruction, owned, score } from './engine';
import type { Command, GameState } from './engine';
import { createStore } from './store';
import type { DominionStore } from './store';
import { DominionScene } from './DominionScene';
import './styles.css';

function Table({ store, onInspect }: { store: DominionStore; onInspect: (id: CardId) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    return afterFontsReady(() => {
      let game: Phaser.Game;
      try {
        game = new Phaser.Game({
          type: Phaser.AUTO, parent: host, width: host.clientWidth, height: host.clientHeight,
          ...CRISP_RENDERING, backgroundColor: '#173f35',
          scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
          scene: new DominionScene(store, onInspect, () => setReady(true)),
        });
      } catch {
        setFailed(true);
        return () => undefined;
      }
      gameRef.current = game;
      const observer = new ResizeObserver(() => {
        if (gameRef.current === game) game.scale.resize(host.clientWidth, host.clientHeight);
      });
      observer.observe(host);
      return () => {
        observer.disconnect();
        game.destroy(true);
        if (gameRef.current === game) gameRef.current = null;
      };
    });
  }, [store, onInspect]);

  return <div className="dominion-table-scroll">
    <div className="dominion-canvas" ref={hostRef} role="img" aria-label="ドミニオンの卓" />
    {!ready && <div className="dominion-loading" role="status">{failed
      ? '卓を表示できませんでした。ページを再読み込みしてください。'
      : '卓を準備しています…'}</div>}
  </div>;
}

function Result({ state, restart }: { state: GameState; restart: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return <section className="dominion-result" aria-labelledby="dominion-result-title">
    <div className="dominion-result-inner">
      <p className="dominion-eyebrow">GAME OVER</p>
      <h2 id="dominion-result-title" ref={titleRef} tabIndex={-1}>{state.winner === 'tie' ? '引き分け' : state.winner === 0 ? 'あなたの勝利' : 'CPUの勝利'}</h2>
      <p>{state.endReason}</p>
      <div className="dominion-scores">{state.players.map((player, index) => <div key={player.name} className={state.winner === index ? 'winner' : ''}>
        <h3>{player.name}</h3><strong>{score(player)} <small>VP</small></strong><p>{player.turns}ターン · {owned(player).length}枚</p>
      </div>)}</div>
      <p className="dominion-muted">同点の場合は、手番数が少ないプレイヤーの勝利です。</p>
      <div className="dominion-result-actions"><button className="primary" onClick={restart}>もう一度プレイ</button><Link to="/">ゲーム一覧へ</Link></div>
      <details><summary>最終デッキの内訳</summary>
        <table><thead><tr><th>カード</th><th>あなた</th><th>CPU</th></tr></thead><tbody>
          {ALL_CARDS.map(id => {
            const counts = state.players.map(player => owned(player).filter(card => card.id === id).length);
            return counts.some(Boolean) ? <tr key={id}><th>{CARDS[id].name}</th><td>{counts[0]}</td><td>{counts[1]}</td></tr> : null;
          })}
        </tbody></table>
      </details>
    </div>
  </section>;
}

export default function DominionGame() {
  const [store] = useState(createStore);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const muted = useSyncExternalStore(store.subscribeSound, store.getMuted);
  const [inspected, setInspected] = useState<CardId>('village');
  const [help, setHelp] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const canInput = state.phase !== 'ended' && inputPlayer(state) === 0;
  const ownTurn = canInput && !state.pending && state.active === 0;
  const definition = CARDS[inspected];
  const send = (command: Command) => store.dispatch(0, command);

  useEffect(() => {
    if (confirmResign || help) return;
    const command = botCommand(state);
    if (!command) return;
    const timer = window.setTimeout(() => store.dispatch(1, command), 550);
    return () => window.clearTimeout(timer);
  }, [state, store, confirmResign, help]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [state.log]);

  const ended = state.phase === 'ended';

  return <main className="dominion" style={{ fontFamily: FONT_FAMILY }}>
    <header className="dominion-header">
      <div className="dominion-brand"><span className="dominion-crest" aria-hidden="true">D</span><div><h1>DOMINION</h1><span>ドミニオン</span></div></div>
      <div className="dominion-match"><span className="dominion-live-dot" /> あなた vs CPU <span className="dominion-muted">／ 最初のゲーム</span></div>
      <nav aria-label="ゲームメニュー">
        <button onClick={() => store.setMuted(!muted)} aria-pressed={muted} aria-label="消音" title={muted ? '効果音をオン' : '効果音をオフ'}><FontAwesomeIcon icon={muted ? faVolumeXmark : faVolumeHigh} aria-hidden="true" /></button>
        <button onClick={() => setHelp(!help)} aria-expanded={help} aria-label="遊び方" title="遊び方"><FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" /><span className="dominion-menu-label">遊び方</span></button>
        <button onClick={() => setConfirmResign(true)} disabled={ended} aria-label="投了" title="投了"><FontAwesomeIcon icon={faFlag} aria-hidden="true" /><span className="dominion-menu-label">投了</span></button>
        <Link to="/" aria-label="ゲーム一覧" title="ゲーム一覧"><FontAwesomeIcon icon={faTableCellsLarge} aria-hidden="true" /><span className="dominion-menu-label">ゲーム一覧</span></Link>
      </nav>
    </header>

    {help && <section className="dominion-help">
      <h2>王国を育て、勝利点を集めよう</h2>
      <ol><li>手札のアクションカードをクリックして使用します。</li><li>「購入へ」→「財宝をすべて使用」でコインを用意します。</li><li>金色のサプライをクリックして購入。「ターン終了」でCPUへ交代します。</li></ol>
      <p>購入したカードは捨て札に入り、山札の補充後に引けるようになります。属州の山、またはサプライの3山が空になると、そのターンで終了。勝利点の多い方が勝ちです。</p>
      <p>カードにマウスを重ねるか右クリックすると詳細を表示します。右側の「カード一覧」からも説明を確認できます。</p>
      <button onClick={() => setHelp(false)}>ゲームに戻る</button>
    </section>}

    {confirmResign && !ended && <section className="dominion-confirm" aria-label="投了の確認">
      <p>この対戦を投了しますか？</p><button onClick={() => { send({ type: 'resign' }); setConfirmResign(false); }}>投了する</button><button className="primary" autoFocus onClick={() => setConfirmResign(false)}>続ける</button>
    </section>}

    <div className="dominion-layout">
      <section className="dominion-main" aria-label="対戦卓">
        <div className="dominion-status">
          <div><span className={`dominion-turn ${state.active === 0 ? 'your-turn' : ''}`}>{ended ? '終了' : state.active === 0 ? 'あなたのターン' : 'CPUのターン'}</span><span className="dominion-turn-number">{state.players[state.active].turns}</span></div>
          <div className="dominion-resources">
            <span><FontAwesomeIcon icon={faBolt} aria-hidden="true" /><strong>{state.actions}</strong> アクション</span>
            <span><FontAwesomeIcon icon={faBasketShopping} aria-hidden="true" /><strong>{state.buys}</strong> 購入</span>
            <span><FontAwesomeIcon icon={faCoins} aria-hidden="true" /><strong>{state.coins}</strong> コイン</span>
          </div>
          <div className="dominion-phases"><span className={state.phase === 'action' ? 'active' : ''}>アクション</span><span aria-hidden="true">›</span><span className={state.phase === 'buy' ? 'active' : ''}>購入</span></div>
        </div>
        {ended ? <Result state={state} restart={() => { setConfirmResign(false); store.restart(); }} /> : <Table store={store} onInspect={setInspected} />}
        <div className={`dominion-controls ${state.pending && canInput ? 'needs-choice' : ''}`}>
          <p role="status">{instruction(state)}</p>
          <div className="dominion-buttons">
            {state.pending && canInput ? <>
              {state.pending.kind === 'cellar' && <button className="primary" onClick={() => send({ type: 'done' })}>選択完了 · {state.pending.discarded}枚引く</button>}
              {state.pending.kind === 'trash' && state.pending.source === 'mine' && <button onClick={() => send({ type: 'done' })}>廃棄しない</button>}
              {state.pending.kind === 'reaction' && <><button className="primary" onClick={() => send({ type: 'reveal' })}>堀を公開して防ぐ</button><button onClick={() => send({ type: 'decline' })}>公開しない</button></>}
            </> : !ended && <>
              <button disabled={!ownTurn || state.phase !== 'action'} onClick={() => send({ type: 'buy-phase' })}>購入へ →</button>
              <button className="primary" disabled={!ownTurn || state.phase !== 'buy' || state.bought || !state.players[0].hand.some(card => CARDS[card.id].type === 'treasure')} onClick={() => send({ type: 'treasures' })}>財宝をすべて使用</button>
              <button disabled={!ownTurn || state.phase !== 'buy'} onClick={() => send({ type: 'end-turn' })}>ターン終了 →</button>
            </>}
          </div>
        </div>
      </section>

      <aside className="dominion-sidebar">
        <section className={`dominion-inspector type-${definition.type}`}>
          <div className="dominion-section-title"><span>カード詳細</span><span className="dominion-cost" aria-label={`購入コスト ${definition.cost}コイン`}><FontAwesomeIcon icon={faCoins} aria-hidden="true" />{definition.cost}</span></div>
          <h2>{definition.name}</h2><p className="dominion-english">{definition.english}</p>
          <p className="dominion-card-kind">{definition.kind}</p><p className="dominion-description">{definition.description}</p>
          <label className="dominion-card-picker">カード一覧<select value={inspected} onChange={event => setInspected(event.target.value as CardId)}>{ALL_CARDS.map(id => <option key={id} value={id}>{CARDS[id].name} · {CARDS[id].cost}コスト</option>)}</select></label>
        </section>

        <section className="dominion-log-panel"><h2>対戦履歴 <span>GAME LOG</span></h2><div className="dominion-log" ref={logRef} tabIndex={0} aria-label="対戦履歴">{state.log.map(entry => <p className={entry.text.startsWith('──') ? 'log-turn' : ''} key={entry.id}>{entry.text}</p>)}</div></section>

        <details className="dominion-trash"><summary>廃棄置き場 · {state.trash.length}枚</summary><p>{state.trash.length ? state.trash.map(card => CARDS[card.id].name).join('、') : '廃棄されたカードはありません。'}</p></details>
      </aside>
    </div>
  </main>;
}
