import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBasketShopping, faBolt, faCircleQuestion, faCoins, faFlag, faTableCellsLarge, faVolumeHigh, faVolumeXmark } from '@fortawesome/free-solid-svg-icons';
import Phaser from 'phaser';
import { afterFontsReady, CRISP_RENDERING, FONT_FAMILY } from '../old-testament-rpg/typography';
import { ALL_CARDS, CARDS, hasType } from './cards';
import { cardAppearance } from './cardAppearance';
import type { CardInspection } from './cardAppearance';
import { botCommand, canReactDiplomat, canChoose, canDone, choiceCards, inputPlayer, instruction, owned, score } from './engine';
import type { Command, GameState } from './engine';
import { basicKingdomFor, createStore } from './store';
import type { DominionStore, ExpansionId, GameMode } from './store';
import { DominionScene } from './DominionScene';
import './styles.css';

function Table({ store, onInspect }: { store: DominionStore; onInspect: (card: CardInspection | null) => void }) {
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

  return <div className="dominion-table-scroll" onPointerLeave={() => onInspect(null)} onScroll={() => onInspect(null)}>
    <div className="dominion-canvas" ref={hostRef} role="img" aria-label="ドミニオンの卓" />
    {!ready && <div className="dominion-loading" role="status">{failed
      ? '卓を表示できませんでした。ページを再読み込みしてください。'
      : '卓を準備しています…'}</div>}
  </div>;
}

function CardTooltip({ inspection }: { inspection: CardInspection }) {
  const ref = useRef<HTMLDivElement>(null);
  const card = CARDS[inspection.id];
  const appearance = cardAppearance(card);
  useLayoutEffect(() => {
    const tooltip = ref.current;
    if (!tooltip) return;
    const { width, height } = tooltip.getBoundingClientRect();
    const left = inspection.x + 18 + width <= window.innerWidth - 8
      ? inspection.x + 18 : inspection.x - width - 18;
    const top = inspection.y + 18 + height <= window.innerHeight - 8
      ? inspection.y + 18 : inspection.y - height - 18;
    tooltip.style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`;
  }, [inspection]);
  return <div ref={ref} className="dominion-card-tooltip" role="tooltip" style={{
    borderColor: `#${appearance.accent.toString(16).padStart(6, '0')}`,
    backgroundColor: `#${appearance.background.toString(16).padStart(6, '0')}`,
  }}>
    <div className="dominion-tooltip-heading"><h2>{card.name}</h2><span className="dominion-cost" aria-label={`購入コスト ${card.cost}コイン`}><FontAwesomeIcon icon={faCoins} aria-hidden="true" />{card.cost}</span></div>
    <p className="dominion-english">{card.english}</p>
    <p className="dominion-card-kind">{card.kind}</p>
    <p className="dominion-description">{card.description}</p>
  </div>;
}

function ChoicePanel({ state, send, onInspect }: {
  state: GameState; send: (command: Command) => void; onInspect: (card: CardInspection | null) => void;
}) {
  const pending = state.pending;
  const panelRef = useRef<HTMLElement>(null);
  const visibleKind = pending?.player === 0 ? pending.kind : null;
  useEffect(() => { panelRef.current?.scrollIntoView({ block: 'nearest' }); }, [visibleKind]);
  if (!pending || pending.player !== 0 || !['harbinger', 'vassal', 'library', 'sentry', 'bandit', 'expansion', 'durationOrder'].includes(pending.kind)) return null;
  const cards = choiceCards(state);
  return <section ref={panelRef} className="dominion-choice-panel" aria-label="効果で選択するカード">
    <p>{instruction(state)}</p>
    <div className="dominion-choice-cards">{(pending.kind === 'expansion' || pending.kind === 'durationOrder') && pending.options.map(option => <button key={option.value} onClick={() => send({ type: 'option', value: option.value })}>{option.label}</button>)}{cards.map(card => {
      const definition = CARDS[card.id];
      const appearance = cardAppearance(definition);
      const selectable = canChoose(state, card);
      return <button key={card.uid} className="dominion-choice-card" aria-disabled={!selectable}
        style={{ backgroundColor: `#${appearance.background.toString(16)}`, borderColor: `#${appearance.accent.toString(16)}` }}
        onMouseEnter={event => onInspect({ id: card.id, x: event.clientX, y: event.clientY })}
        onMouseLeave={() => onInspect(null)}
        onFocus={event => { const box = event.currentTarget.getBoundingClientRect(); onInspect({ id: card.id, x: box.right, y: box.top }); }}
        onBlur={() => onInspect(null)}
        onClick={() => { if (selectable) { onInspect(null); send({ type: 'choose', uid: card.uid }); } }}>
        <strong>{definition.name}</strong><span>{definition.kind}</span>
        <span className="dominion-cost"><FontAwesomeIcon icon={faCoins} aria-hidden="true" />{definition.cost}</span>
      </button>;
    })}</div>
  </section>;
}

function doneLabel(state: GameState): string {
  const pending = state.pending;
  if (!pending) return '';
  switch (pending.kind) {
    case 'expansion': return '選択を終了';
    case 'cellar': return `選択完了 · ${pending.discarded}枚引く`;
    case 'chapel': return '廃棄を終了';
    case 'sentry': return pending.stage === 'trash' ? '廃棄を終えて次へ' : pending.stage === 'discard' ? '捨て札を終えて次へ' : 'この順番で戻す';
    case 'library': return '脇に置いて次を引く';
    case 'harbinger': return '戻さない';
    case 'throneRoom': case 'vassal': return '使用しない';
    default: return '廃棄しない';
  }
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

function Match({ store, onRestart }: { store: DominionStore; onRestart: () => void }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const muted = useSyncExternalStore(store.subscribeSound, store.getMuted);
  const [inspected, setInspected] = useState<CardInspection | null>(null);
  const [help, setHelp] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const canInput = state.phase !== 'ended' && inputPlayer(state) === 0;
  const ownTurn = canInput && !state.pending && state.active === 0;
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

  useEffect(() => {
    const dismiss = () => setInspected(null);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('blur', dismiss);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const ended = state.phase === 'ended';

  return <main className="dominion" style={{ fontFamily: FONT_FAMILY }}>
    <header className="dominion-header">
      <div className="dominion-brand"><span className="dominion-crest" aria-hidden="true">D</span><div><h1>DOMINION</h1><span>ドミニオン</span></div></div>
      <div className="dominion-match"><span className="dominion-live-dot" /> あなた vs CPU <span className="dominion-muted">／ {store.expansions.map(id => id === 'base' ? '基本' : id === 'intrigue' ? '陰謀' : '海辺').join('＋')} · {store.mode === 'basic' ? 'おすすめ' : 'ランダム'}</span></div>
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
      <p>{store.mode === 'basic' ? '選んだカード群に対応したおすすめの10種類で遊びます。' : '選んだカード群から王国カード10種類をランダムに選びます。'}</p>
      <p>カードにマウスを重ねるか右クリックすると詳細を表示します。マウスを離すと説明が閉じます。</p>
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
        {ended ? <Result state={state} restart={onRestart} /> : <Table store={store} onInspect={setInspected} />}
        {!ended && <ChoicePanel state={state} send={send} onInspect={setInspected} />}
        <div className={`dominion-controls ${state.pending && canInput ? 'needs-choice' : ''}`}>
          <p role="status">{instruction(state)}</p>
          <div className="dominion-buttons">
            {state.pending && canInput ? <>
              {canDone(state) && <button onClick={() => send({ type: 'done' })}>{doneLabel(state)}</button>}
              {(state.pending.kind === 'library' || state.pending.kind === 'vassal') && <button className="primary" onClick={() => send({ type: 'accept' })}>{state.pending.kind === 'library' ? '手札に加える' : 'このカードを使用'}</button>}
              {state.pending.kind === 'reaction' && <>{!state.pending.blocked && state.players[0].hand.some(card => card.id === 'moat') && <button className="primary" onClick={() => send({ type: 'reveal' })}>堀を公開して防ぐ</button>}{!state.pending.diplomatUsed && canReactDiplomat(state, 0) && <button onClick={() => send({ type: 'diplomat' })}>外交官を公開する</button>}<button onClick={() => send({ type: 'decline' })}>公開しない</button></>}
            </> : !ended && <>
              <button disabled={!ownTurn || state.phase !== 'action'} onClick={() => send({ type: 'buy-phase' })}>購入へ →</button>
              <button className="primary" disabled={!ownTurn || state.phase !== 'buy' || state.bought || !state.players[0].hand.some(card => hasType(card.id, 'treasure'))} onClick={() => send({ type: 'treasures' })}>財宝をすべて使用</button>
              <button disabled={!ownTurn || state.phase !== 'buy'} onClick={() => send({ type: 'end-turn' })}>ターン終了 →</button>
            </>}
          </div>
        </div>
      </section>

      <aside className="dominion-sidebar">
        <section className="dominion-log-panel"><h2>対戦履歴 <span>GAME LOG</span></h2><div className="dominion-log" ref={logRef} tabIndex={0} aria-label="対戦履歴">{state.log.map(entry => <p className={entry.text.startsWith('──') ? 'log-turn' : ''} key={entry.id}>{entry.text}</p>)}</div></section>

        <details className="dominion-trash"><summary>廃棄置き場 · {state.trash.length}枚</summary><p>{state.trash.length ? state.trash.map(card => CARDS[card.id].name).join('、') : '廃棄されたカードはありません。'}</p></details>
      </aside>
    </div>
    {inspected && !ended && !help && !confirmResign && <CardTooltip inspection={inspected} />}
  </main>;
}


export default function DominionGame() {
  const [mode, setMode] = useState<GameMode>('basic');
  const [expansions, setExpansions] = useState<ExpansionId[]>(['base']);
  const [store, setStore] = useState<DominionStore | null>(null);
  if (store) return <Match store={store} onRestart={() => setStore(null)} />;

  return <main className="dominion dominion-setup" style={{ fontFamily: FONT_FAMILY }}>
    <section className="dominion-setup-inner" aria-labelledby="dominion-setup-title">
      <p className="dominion-eyebrow">DOMINION</p>
      <h1 id="dominion-setup-title">対戦の準備</h1>
      <p className="dominion-muted">あなた vs CPU · 使用するセットとカードの選び方を選択</p>
      <fieldset className="dominion-mode-options">
        <legend>使用するセット</legend>
        {([['base', '基本 · 26種類'], ['intrigue', '陰謀（拡張） · 26種類'], ['seaside', '海辺（拡張） · 27種類']] as const).map(([id, label]) => <label key={id} className={expansions.includes(id) ? 'selected' : ''}>
          <input type="checkbox" checked={expansions.includes(id)} onChange={event => {
            const next = event.target.checked ? [...expansions, id] : expansions.filter(value => value !== id);
            setExpansions(next);
            if (next.length > 1) setMode('random');
          }} />
          <span>{label}</span>
        </label>)}
      </fieldset>
      <fieldset className="dominion-mode-options">
        <legend>王国カード10種類の決め方</legend>
        <label className={`${mode === 'basic' ? 'selected' : ''}${expansions.length > 1 ? ' unavailable' : ''}`}>
          <input type="radio" name="dominion-mode" value="basic" checked={mode === 'basic'} disabled={expansions.length > 1} onChange={() => setMode('basic')} />
          <span><strong>おすすめ</strong><span>選んだカード群に対応する固定10種類で遊びます。</span></span>
        </label>
        <label className={mode === 'random' ? 'selected' : ''}>
          <input type="radio" name="dominion-mode" value="random" checked={mode === 'random'} onChange={() => setMode('random')} />
          <span><strong>ランダム</strong><span>選んだカード群から、毎回10種類を抽選します。</span></span>
        </label>
        {expansions.length > 1 && <p className="dominion-mode-unavailable" role="status">複数のセットを選択中は、おすすめを選べません。</p>}
      </fieldset>
      <div className="dominion-mode-description" aria-live="polite">
        {mode === 'basic' ? <><h2>使用する王国カード</h2><p>{basicKingdomFor(expansions).map(id => CARDS[id].name).join('・')}</p></>
          : <><h2>毎回違う組み合わせ</h2><p>対戦を始めるたびに、選択したセットから重複のない10種類をランダムで選びます。</p></>}
      </div>
      <div className="dominion-result-actions">
        <button className="primary" disabled={!expansions.length} onClick={() => setStore(createStore(mode, expansions))}>対戦を始める</button>
        <Link to="/">ゲーム一覧へ</Link>
      </div>
    </section>
  </main>;
}
