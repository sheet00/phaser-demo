import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleQuestion, faCoins, faFlag, faTableCellsLarge, faVolumeHigh, faVolumeXmark } from '@fortawesome/free-solid-svg-icons';
import Phaser from 'phaser';
import { afterFontsReady, CRISP_RENDERING, FONT_FAMILY } from '../old-testament-rpg/typography';
import { ALL_CARDS, CARDS, hasType } from './cards';
import { cardAppearance } from './cardAppearance';
import type { CardInspection } from './cardAppearance';
import { botCommand, canReactDiplomat, canChoose, canDone, choiceCards, instruction, owned, score } from './engine';
import type { Command, GameState } from './engine';
import { basicKingdomFor, createStore } from './store';
import type { DominionStore, ExpansionId, GameMode } from './store';
import { OnlineStore, createOnlineRoom, joinOnlineRoom, savedOnlineSession } from './onlineStore';
import type { OnlineSession } from './onlineStore';
import { normalizePlayerName, PLAYER_NAME_MAX_LENGTH } from './playerName';
import { DOMINION_CANVAS_MIN_HEIGHT, DOMINION_CANVAS_MIN_WIDTH, DominionScene } from './DominionScene';
import './styles.css';

function Table({ store, onInspect, handActions }: { store: DominionStore; onInspect: (card: CardInspection | null) => void; handActions?: ReactNode }) {
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
    }, store.online ? store.getSnapshot().players.map(player => player.name).join('') : '');
  }, [store, onInspect]);

  return <div className="dominion-table-scroll" onPointerLeave={() => onInspect(null)} onScroll={() => onInspect(null)}>
    <div className="dominion-canvas" ref={hostRef} role="group" aria-label="ドミニオンの卓"
      style={{ minWidth: DOMINION_CANVAS_MIN_WIDTH, minHeight: DOMINION_CANVAS_MIN_HEIGHT }}>
      {handActions && <div className="dominion-hand-actions" role="group" aria-label="手札の操作">{handActions}</div>}
    </div>
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

function ChoicePanel({ state, seat, canInput, send, onInspect }: {
  state: GameState; seat: 0 | 1; canInput: boolean; send: (command: Command) => void; onInspect: (card: CardInspection | null) => void;
}) {
  const pending = state.pending;
  const panelRef = useRef<HTMLElement>(null);
  const visibleKind = pending?.player === seat ? pending.kind : null;
  useEffect(() => { panelRef.current?.scrollIntoView({ block: 'nearest' }); }, [visibleKind]);
  if (!pending || pending.player !== seat || !['harbinger', 'vassal', 'library', 'sentry', 'bandit', 'expansion', 'durationOrder'].includes(pending.kind)) return null;
  const cards = choiceCards(state);
  return <section ref={panelRef} className="dominion-choice-panel" aria-label="効果で選択するカード">
    <div className="dominion-choice-cards">{(pending.kind === 'expansion' || pending.kind === 'durationOrder') && pending.options.map(option => <button key={option.value} disabled={!canInput} onClick={() => send({ type: 'option', value: option.value })}>{option.label}</button>)}{cards.map(card => {
      const definition = CARDS[card.id];
      const appearance = cardAppearance(definition);
      const selectable = canInput && canChoose(state, card);
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

function Result({ state, seat, restart, online }: { state: GameState; seat: 0 | 1; restart: () => void; online: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return <section className="dominion-result" aria-labelledby="dominion-result-title">
    <div className="dominion-result-inner">
      <p className="dominion-eyebrow">GAME OVER</p>
      <h2 id="dominion-result-title" ref={titleRef} tabIndex={-1}>{state.winner === 'tie' ? '引き分け' : state.winner === seat ? 'あなたの勝利' : online ? '相手の勝利' : 'CPUの勝利'}</h2>
      <p>{state.endReason}</p>
      <div className="dominion-scores">{state.players.map((player, index) => <div key={index} className={state.winner === index ? 'winner' : ''}>
        <h3>{player.name}</h3><strong>{score(player)} <small>VP</small></strong><p>{player.turns}ターン · {owned(player).length}枚</p>
      </div>)}</div>
      <p className="dominion-muted">同点の場合は、手番数が少ないプレイヤーの勝利です。</p>
      <div className="dominion-result-actions"><button className="primary" onClick={restart}>{online ? '新しい対戦' : 'もう一度プレイ'}</button><Link to="/">ゲーム一覧へ</Link></div>
      <details><summary>最終デッキの内訳</summary>
        <table><thead><tr><th>カード</th><th>あなた</th><th>{online ? '相手' : 'CPU'}</th></tr></thead><tbody>
          {ALL_CARDS.map(id => {
            const counts = state.players.map(player => owned(player).filter(card => card.id === id).length);
            return counts.some(Boolean) ? <tr key={id}><th>{CARDS[id].name}</th><td>{counts[seat]}</td><td>{counts[seat === 0 ? 1 : 0]}</td></tr> : null;
          })}
        </tbody></table>
      </details>
    </div>
  </section>;
}

function Match({ store, onRestart }: { store: DominionStore; onRestart: () => void }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const muted = useSyncExternalStore(store.subscribeSound, store.getMuted);
  const meta = useSyncExternalStore(store.subscribeMeta, store.getMeta);
  const seat = store.playerId;
  const [inspected, setInspected] = useState<CardInspection | null>(null);
  const [help, setHelp] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const leaveDialogRef = useRef<HTMLDialogElement>(null);
  const leaveButtonRef = useRef<HTMLButtonElement>(null);
  const canInput = state.phase !== 'ended' && store.getInputPlayer() === seat && meta.connection === 'connected' && meta.opponentConnected && !meta.busy;
  const ownTurn = canInput && !state.pending && state.active === seat;
  const send = (command: Command) => store.dispatch(seat, command);
  const closeLeave = () => {
    setConfirmLeave(false);
    requestAnimationFrame(() => leaveButtonRef.current?.focus());
  };

  useEffect(() => {
    if (confirmResign || confirmLeave || help) return;
    if (store.online) return;
    const command = botCommand(state);
    if (!command) return;
    const timer = window.setTimeout(() => store.dispatch(1, command), 550);
    return () => window.clearTimeout(timer);
  }, [state, store, confirmResign, confirmLeave, help]);

  useEffect(() => {
    if (confirmLeave && !leaveDialogRef.current?.open) leaveDialogRef.current?.showModal();
  }, [confirmLeave]);

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
  const opponentPlayer = state.players[seat === 0 ? 1 : 0];
  const hasChoicePanel = state.pending !== null && ['harbinger', 'vassal', 'library', 'sentry', 'bandit', 'expansion', 'durationOrder'].includes(state.pending.kind);
  const showPendingActions = state.pending && canInput && (!hasChoicePanel || canDone(state) || state.pending.kind === 'library' || state.pending.kind === 'vassal' || state.pending.kind === 'reaction');

  return <main className="dominion dominion-playing" style={{ fontFamily: FONT_FAMILY }}>
    <h1 className="dominion-sr-only">ドミニオン</h1>

    {help && <section className="dominion-help">
      <h2>王国を育て、勝利点を集めよう</h2>
      <ol><li>手札のアクションカードをクリックして使用します。</li><li>「購入へ」→「財宝を使用」でコインを用意します。</li><li>金色のサプライをクリックして購入。「ターン終了」で{store.online ? '相手' : 'CPU'}へ交代します。</li></ol>
      <p>購入したカードは捨て札に入り、山札の補充後に引けるようになります。属州の山、またはサプライの3山が空になると、そのターンで終了。勝利点の多い方が勝ちです。</p>
      <p>{store.mode === 'basic' ? '選んだカード群に対応したおすすめの10種類で遊びます。' : '選んだカード群から王国カード10種類をランダムに選びます。'}</p>
      <p>カードにマウスを重ねるか右クリックすると詳細を表示します。マウスを離すと説明が閉じます。</p>
      <button onClick={() => setHelp(false)}>ゲームに戻る</button>
    </section>}

    {confirmResign && !ended && <section className="dominion-confirm" aria-label="投了の確認">
      <p>この対戦を投了しますか？</p><button onClick={() => { send({ type: 'resign' }); setConfirmResign(false); }}>投了する</button><button className="primary" autoFocus onClick={() => setConfirmResign(false)}>続ける</button>
    </section>}

    {confirmLeave && <dialog ref={leaveDialogRef} className="dominion-leave-dialog" aria-labelledby="dominion-leave-title" onCancel={closeLeave}>
      <h2 id="dominion-leave-title">ゲーム一覧へ戻りますか？</h2>
      <p>現在の対戦から離れます。</p>
      <div className="dominion-leave-actions"><Link to="/">はい</Link><button autoFocus onClick={closeLeave}>いいえ</button></div>
    </dialog>}

    {store.online && !ended && (!meta.opponentConnected || meta.connection !== 'connected') && <div className="dominion-online-notice" role="status">{meta.connection !== 'connected' ? '通信の再接続を待っています。' : '相手の再接続を待っています。'} {meta.canClaim && <button onClick={() => store.claimDisconnectedWin()}>切断勝ちを確定</button>}</div>}
    <div className="dominion-layout">
      <section className="dominion-main" aria-label="対戦卓">
        <div className="dominion-status">
          <span className={`dominion-turn ${state.active === seat ? 'your-turn' : ''}`}>{ended ? '終了' : `${store.online ? state.players[state.active].name : state.active === seat ? 'あなた' : 'CPU'} · ${state.players[state.active].turns}ターン目 · ${state.phase === 'action' ? 'アクション中' : '購入中'}`}</span>
          {state.active === seat && <span className="dominion-sr-only">アクション回数 {state.actions}、購入回数 {state.buys}、コイン合計 {state.coins}</span>}
          <nav className="dominion-menu" aria-label="ゲームメニュー">
            <button onClick={() => store.setMuted(!muted)} aria-pressed={muted} aria-label="消音" title={muted ? '効果音をオン' : '効果音をオフ'}><FontAwesomeIcon icon={muted ? faVolumeXmark : faVolumeHigh} aria-hidden="true" /></button>
            <button onClick={() => setHelp(!help)} aria-expanded={help} aria-label="遊び方" title="遊び方"><FontAwesomeIcon icon={faCircleQuestion} aria-hidden="true" /></button>
            <button onClick={() => setConfirmResign(true)} disabled={ended} aria-label="投了" title="投了"><FontAwesomeIcon icon={faFlag} aria-hidden="true" /></button>
            <button ref={leaveButtonRef} onClick={() => { setInspected(null); setHelp(false); setConfirmResign(false); setConfirmLeave(true); }} aria-label="ゲーム一覧へ戻る" title="ゲーム一覧へ戻る"><FontAwesomeIcon icon={faTableCellsLarge} aria-hidden="true" /></button>
          </nav>
        </div>
        {state.pending?.player === seat && <div className="dominion-notice" role="status">
          <strong>操作が必要です</strong>
          <span>{instruction(state, seat)}</span>
          {showPendingActions && <div className="dominion-notice-actions">
            {canDone(state) && <button className="primary" onClick={() => send({ type: 'done' })}>{doneLabel(state)}</button>}
            {(state.pending.kind === 'library' || state.pending.kind === 'vassal') && <button className="primary" onClick={() => send({ type: 'accept' })}>{state.pending.kind === 'library' ? '手札に加える' : 'このカードを使用'}</button>}
            {state.pending.kind === 'reaction' && <>{!state.pending.blocked && state.players[seat].hand.some(card => card.id === 'moat') && <button className="primary" onClick={() => send({ type: 'reveal' })}>堀を公開して防ぐ</button>}{!state.pending.diplomatUsed && canReactDiplomat(state, seat) && <button onClick={() => send({ type: 'diplomat' })}>外交官を公開する</button>}<button onClick={() => send({ type: 'decline' })}>公開しない</button></>}
          </div>}
        </div>}
        {ended ? <Result state={state} seat={seat} restart={onRestart} online={store.online} /> : <Table store={store} onInspect={setInspected} handActions={ownTurn && <>
          <button disabled={state.phase !== 'action'} onClick={() => send({ type: 'buy-phase' })}>購入へ</button>
          <button className="primary" disabled={state.phase !== 'buy' || state.bought || !state.players[seat].hand.some(card => hasType(card.id, 'treasure'))} onClick={() => send({ type: 'treasures' })}>財宝を使用</button>
          <button disabled={state.phase !== 'buy'} onClick={() => send({ type: 'end-turn' })}>ターン終了</button>
        </>} />}
        {!ended && <ChoicePanel state={state} seat={seat} canInput={canInput} send={send} onInspect={setInspected} />}
      </section>

      <aside className="dominion-sidebar">
        <section className="dominion-opponent" aria-label="相手のカード枚数">
          <h2>{store.online ? opponentPlayer.name : 'CPU'}</h2>
          <div className="dominion-opponent-hand">
            <span>手札 <strong>{opponentPlayer.hand.length}枚</strong></span>
            <div className="dominion-opponent-card-backs" aria-hidden="true">{Array.from({ length: Math.min(opponentPlayer.hand.length, 5) }, (_, index) => <span key={index} />)}</div>
          </div>
          <div className="dominion-opponent-counts">
            <span>山札 <strong>{opponentPlayer.deck.length}</strong></span>
            <span>捨て札 <strong>{opponentPlayer.discard.length}</strong></span>
            <span>島 <strong>{opponentPlayer.islandMat.length}</strong></span>
            <span>村 <strong>{opponentPlayer.nativeVillageMat.length}</strong></span>
          </div>
        </section>
        <section className="dominion-log-panel"><h2>直近の出来事</h2><div className="dominion-log">{state.log.slice(-5).reverse().map(entry => <p className={entry.text.startsWith('──') ? 'log-turn' : ''} key={entry.id}>{entry.text}</p>)}</div></section>

        <details className="dominion-trash"><summary>廃棄置き場 · {state.trash.length}枚</summary><p>{state.trash.length ? state.trash.map(card => CARDS[card.id].name).join('、') : '廃棄されたカードはありません。'}</p></details>
      </aside>
    </div>
    {inspected && !ended && !help && !confirmResign && !confirmLeave && <CardTooltip inspection={inspected} />}
  </main>;
}


function OnlineMatch({ session, onLeave }: { session: OnlineSession; onLeave: () => void }) {
  const [store] = useState(() => new OnlineStore(session));
  const inviteRef = useRef<HTMLInputElement>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const status = useSyncExternalStore(store.subscribeOnlineStatus, store.getOnlineStatus);
  useEffect(() => { store.start(); return () => store.dispose(); }, [store]);
  if (status.stage === 'playing') return <Match store={store} onRestart={onLeave} />;
  const invite = `${location.origin}/dominion?room=${session.roomId}`;
  return <main className="dominion dominion-setup" style={{ fontFamily: FONT_FAMILY }}>
    <section className="dominion-setup-inner" aria-labelledby="online-lobby-title">
      <p className="dominion-eyebrow">ONLINE MATCH</p>
      <h1 id="online-lobby-title">対戦部屋</h1>
      {status.message && <p role="status">{status.message}</p>}
      {status.stage === 'lobby' && <>
        <p>{status.seat === 0 ? '招待リンクを相手に送ってください。' : '部屋に参加しました。両者が準備完了すると対戦が始まります。'}</p>
        <p>使用セット：{store.expansions.map(id => id === 'base' ? '基本' : id === 'intrigue' ? '陰謀' : '海辺').join('＋')} ／ {store.mode === 'basic' ? 'おすすめ' : 'ランダム'}</p>
        {store.mode === 'basic' && <p>王国カード：{store.basicKingdom.map(id => CARDS[id].name).join('・')}</p>}
        {status.seat === 0 && <><div className="dominion-invite"><input ref={inviteRef} readOnly value={invite} aria-label="招待リンク" onFocus={event => event.currentTarget.select()} /><button onClick={() => {
          if (!navigator.clipboard) { inviteRef.current?.select(); setCopyMessage('リンクを選択しました。コピーしてください。'); return; }
          void navigator.clipboard.writeText(invite).then(() => setCopyMessage('リンクをコピーしました。'), () => { inviteRef.current?.select(); setCopyMessage('リンクを選択しました。コピーしてください。'); });
        }}>リンクをコピー</button></div>{copyMessage && <p role="status">{copyMessage}</p>}</>}
        <p>プレイヤー1：{status.names[0]}（{status.ready[0] ? '準備完了' : '待機中'}） ／ プレイヤー2：{status.names[1] ? `${status.names[1]}（${status.ready[1] ? '準備完了' : '待機中'}）` : '参加待ち'}</p>
        <button className="primary" disabled={status.ready[status.seat]} onClick={() => store.ready()}>{status.ready[status.seat] ? '準備完了' : '準備完了にする'}</button>
      </>}
      <div className="dominion-result-actions"><button onClick={onLeave}>対戦準備に戻る</button><Link to="/">ゲーム一覧へ</Link></div>
    </section>
  </main>;
}

export default function DominionGame() {
  const [mode, setMode] = useState<GameMode>('basic');
  const [expansions, setExpansions] = useState<ExpansionId[]>(['base']);
  const [store, setStore] = useState<DominionStore | null>(null);
  const [opponent, setOpponent] = useState<'cpu' | 'friend'>('cpu');
  const roomId = new URLSearchParams(location.search).get('room');
  const [session, setSession] = useState<OnlineSession | null>(() => roomId ? savedOnlineSession(roomId) : null);
  const [onlineError, setOnlineError] = useState('');
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('dominion-player-name') ?? '');
  const validPlayerName = normalizePlayerName(playerName) !== null;
  const leaveOnline = () => { setSession(null); setOpponent('friend'); history.replaceState(null, '', '/dominion'); };
  const createRoom = async () => {
    setOnlineBusy(true); setOnlineError('');
    try {
      const next = await createOnlineRoom(mode, expansions, playerName);
      localStorage.setItem('dominion-player-name', playerName.trim());
      history.replaceState(null, '', `/dominion?room=${next.roomId}`);
      setSession(next);
    } catch (error) { setOnlineError(error instanceof Error ? error.message : '部屋を作成できませんでした。'); }
    finally { setOnlineBusy(false); }
  };
  const joinRoom = async () => {
    if (!roomId) return;
    setOnlineBusy(true); setOnlineError('');
    try {
      const next = await joinOnlineRoom(roomId, playerName);
      localStorage.setItem('dominion-player-name', playerName.trim());
      setSession(next);
    }
    catch (error) { setOnlineError(error instanceof Error ? error.message : '部屋に参加できませんでした。'); }
    finally { setOnlineBusy(false); }
  };
  if (session) return <OnlineMatch key={session.roomId} session={session} onLeave={leaveOnline} />;
  if (store) return <Match store={store} onRestart={() => setStore(null)} />;

  if (roomId) return <main className="dominion dominion-setup" style={{ fontFamily: FONT_FAMILY }}>
    <section className="dominion-setup-inner">
      <p className="dominion-eyebrow">ONLINE MATCH</p><h1>ドミニオンの対戦に参加</h1>
      <p>招待された部屋のプレイヤー2として参加します。</p>
      <label className="dominion-player-name">プレイヤー名（1〜16文字）<input type="text" value={playerName} onChange={event => setPlayerName(event.target.value)} maxLength={PLAYER_NAME_MAX_LENGTH} autoComplete="nickname" placeholder="対戦で表示する名前" /></label>
      {onlineError && <p role="alert">{onlineError}</p>}
      <div className="dominion-result-actions"><button className="primary" disabled={onlineBusy || !validPlayerName} onClick={() => { void joinRoom(); }}>{onlineBusy ? '参加しています…' : '対戦部屋に参加'}</button><button onClick={leaveOnline}>対戦準備に戻る</button></div>
    </section>
  </main>;

  return <main className="dominion dominion-setup" style={{ fontFamily: FONT_FAMILY }}>
    <section className="dominion-setup-inner" aria-labelledby="dominion-setup-title">
      <p className="dominion-eyebrow">DOMINION</p>
      <h1 id="dominion-setup-title">対戦の準備</h1>
      <p className="dominion-muted">対戦相手と、使用するセット・カードの選び方を選択</p>
      <fieldset className="dominion-mode-options"><legend>対戦相手</legend>
        <label className={opponent === 'cpu' ? 'selected' : ''}><input type="radio" name="opponent" checked={opponent === 'cpu'} onChange={() => setOpponent('cpu')} /><span>CPUと対戦</span></label>
        <label className={opponent === 'friend' ? 'selected' : ''}><input type="radio" name="opponent" checked={opponent === 'friend'} onChange={() => setOpponent('friend')} /><span>友達とネット対戦</span></label>
      </fieldset>
      {opponent === 'friend' && <label className="dominion-player-name">プレイヤー名（1〜16文字）<input type="text" value={playerName} onChange={event => setPlayerName(event.target.value)} maxLength={PLAYER_NAME_MAX_LENGTH} autoComplete="nickname" placeholder="対戦で表示する名前" /></label>}
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
        <button className="primary" disabled={!expansions.length || onlineBusy || (opponent === 'friend' && !validPlayerName)} onClick={() => { if (opponent === 'friend') void createRoom(); else setStore(createStore(mode, expansions)); }}>{onlineBusy ? '部屋を作成しています…' : opponent === 'friend' ? '対戦部屋を作る' : '対戦を始める'}</button>
        <Link to="/">ゲーム一覧へ</Link>
      </div>
      {onlineError && <p role="alert">{onlineError}</p>}
    </section>
  </main>;
}
