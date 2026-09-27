import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins, faMagnifyingGlass, faArrowLeft, faXmark } from '@fortawesome/free-solid-svg-icons';
import { BASE, KINGDOM, CARDS } from './cards';
import type { CardId, CardDefinition } from './cards';
import { INTRIGUE_KINGDOM } from './expansions/intrigueCards';
import { SEASIDE_KINGDOM } from './expansions/seasideCards';
import { ALCHEMY_KINGDOM } from './expansions/alchemyCards';
import { cardAppearance, getCardArtPath } from './cardAppearance';
import { FONT_FAMILY } from './typography';
import './styles.css';

const PACKS = [
  { id: 'base', name: '基本セット', cards: [...BASE, ...KINGDOM] },
  { id: 'intrigue', name: '陰謀（拡張）', cards: INTRIGUE_KINGDOM },
  { id: 'seaside', name: '海辺（拡張）', cards: SEASIDE_KINGDOM },
  { id: 'alchemy', name: '錬金術（拡張）', cards: ['potion' as CardId, ...ALCHEMY_KINGDOM] },
] as const;

export default function DominionCardsPage() {
  const [search, setSearch] = useState('');
  const [modalCard, setModalCard] = useState<{ id: CardId; def: CardDefinition; artUrl: string | null } | null>(null);

  const totalCount = PACKS.reduce((sum, p) => sum + p.cards.length, 0);

  return (
    <main className="dominion dominion-cards-page" style={{ fontFamily: FONT_FAMILY }}>
      <header className="dominion-cards-header">
        <div className="dominion-cards-header-nav">
          <Link to="/dominion" className="dominion-back-btn">
            <FontAwesomeIcon icon={faArrowLeft} /> 対戦に戻る
          </Link>
          <Link to="/" className="dominion-back-btn secondary">
            ゲーム一覧
          </Link>
        </div>
        <div className="dominion-cards-title-area">
          <p className="dominion-eyebrow">DOMINION CARD GALLERY</p>
          <h1>カードイラスト・タイトル一覧</h1>
          <p className="dominion-cards-subtitle">
            全{totalCount}種類のカードイラストと効果一覧（拡張パック別）
          </p>
        </div>
      </header>

      <section className="dominion-cards-toolbar" aria-label="カード検索">
        <div className="dominion-cards-search-box">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="dominion-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="カード名や効果テキストで検索…"
            aria-label="カード検索"
          />
          {search && (
            <button
              type="button"
              className="dominion-search-clear"
              onClick={() => setSearch('')}
              aria-label="検索をクリア"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>
      </section>

      {PACKS.map((pack) => {
        const packCards = pack.cards
          .map((id) => {
            const def = CARDS[id];
            const artPath = getCardArtPath(id);
            const artUrl = artPath ? `${import.meta.env.BASE_URL}${artPath}` : null;
            return { id, def, artUrl };
          })
          .filter(({ def }) => {
            if (!search.trim()) return true;
            const query = search.trim().toLowerCase();
            return (
              def.name.toLowerCase().includes(query) ||
              def.english.toLowerCase().includes(query) ||
              def.description.toLowerCase().includes(query) ||
              def.kind.toLowerCase().includes(query)
            );
          });

        if (packCards.length === 0) return null;

        return (
          <section key={pack.id} className="dominion-pack-section" aria-labelledby={`pack-title-${pack.id}`}>
            <div className="dominion-pack-header">
              <h2 id={`pack-title-${pack.id}`}>{pack.name}</h2>
              <span className="dominion-pack-count">{packCards.length}枚</span>
            </div>

            <div className="dominion-cards-grid">
              {packCards.map(({ id, def, artUrl }) => {
                const appearance = cardAppearance(def);
                const accentColor = `#${appearance.accent.toString(16).padStart(6, '0')}`;
                const bgColor = `#${appearance.background.toString(16).padStart(6, '0')}`;

                return (
                  <article
                    key={id}
                    className="dominion-gallery-card"
                    style={{ borderColor: accentColor, backgroundColor: bgColor }}
                    onClick={() => setModalCard({ id, def, artUrl })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setModalCard({ id, def, artUrl });
                      }
                    }}
                    aria-label={`${def.name}の詳細を表示`}
                  >
                    <div className="dominion-gallery-card-art">
                      {artUrl ? (
                        <img src={artUrl} alt={def.name} loading="lazy" />
                      ) : (
                        <div className="dominion-gallery-card-no-art">画像準備中</div>
                      )}
                    </div>

                    <div className="dominion-gallery-card-body">
                      <div className="dominion-gallery-card-header">
                        <h3 className="dominion-gallery-card-title">{def.name}</h3>
                        <span
                          className="dominion-gallery-cost"
                          aria-label={`コスト ${def.cost}コイン${def.potions ? ' 1ポーション' : ''}`}
                        >
                          <FontAwesomeIcon icon={faCoins} aria-hidden="true" />
                          {def.cost}
                          {def.potions ? ' ＋ ⚗️' : ''}
                        </span>
                      </div>
                      <p className="dominion-gallery-card-english">{def.english}</p>
                      <div className="dominion-gallery-card-kind" style={{ borderColor: accentColor }}>
                        {def.kind}
                      </div>
                      <p className="dominion-gallery-card-desc">{def.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {modalCard && (
        <div
          className="dominion-card-modal-backdrop"
          onClick={() => setModalCard(null)}
          role="presentation"
        >
          <div
            className="dominion-card-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-card-title"
          >
            <button
              type="button"
              className="dominion-modal-close"
              onClick={() => setModalCard(null)}
              aria-label="閉じる"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
            <div className="dominion-modal-art">
              {modalCard.artUrl ? (
                <img src={modalCard.artUrl} alt={modalCard.def.name} />
              ) : (
                <div className="dominion-gallery-card-no-art">画像準備中</div>
              )}
            </div>
            <div className="dominion-modal-info">
              <div className="dominion-modal-heading">
                <h2 id="modal-card-title">{modalCard.def.name}</h2>
                <span className="dominion-gallery-cost large">
                  <FontAwesomeIcon icon={faCoins} aria-hidden="true" />
                  {modalCard.def.cost}
                  {modalCard.def.potions ? ' ＋ ⚗️' : ''}
                </span>
              </div>
              <p className="dominion-gallery-card-english large">{modalCard.def.english}</p>
              <p className="dominion-modal-kind">{modalCard.def.kind}</p>
              <p className="dominion-modal-desc">{modalCard.def.description}</p>
              {modalCard.def.summary && (
                <div className="dominion-modal-summary">
                  <strong>効果の要約:</strong>
                  <span>{modalCard.def.summary}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
