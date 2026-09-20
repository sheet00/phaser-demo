import { useRef } from 'react';
import { CHAPTERS } from './chapters';

export default function ChapterMenu({ activeChapter, onSelectChapter }: {
  activeChapter: number;
  onSelectChapter: (chapter: number) => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  return (
      <nav className="old-testament-chapter-bar" aria-label="章の選択">
        <details ref={menuRef} className="old-testament-chapter-menu"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }
          }}
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
          }}>
          <summary>章を選ぶ <span>第{activeChapter}章 / 全12章</span></summary>
          <div className="old-testament-chapter-panel">
            <p>遊びたい章を選んで、その章の最初から開始</p>
            <div className="old-testament-chapter-grid">
              {CHAPTERS.map(chapter => (
                <button key={chapter.number} type="button" disabled={!chapter.available}
                  aria-current={chapter.number === activeChapter ? 'step' : undefined}
                  onClick={() => {
                    if (!chapter.available) return;
                    if (menuRef.current) menuRef.current.open = false;
                    onSelectChapter(chapter.number);
                  }}>
                  <strong>第{chapter.number}章</strong>
                  {chapter.title && <span>{chapter.title}</span>}
                  <small>{chapter.available ? chapter.number === activeChapter ? 'プレイ中 · 最初から開始' : 'この章から開始' : '準備中'}</small>
                </button>
              ))}
            </div>
            <p>第1・2章をプレイできます。選び直すと章内の進行はリセットされます。</p>
          </div>
        </details>
      </nav>
  );
}
