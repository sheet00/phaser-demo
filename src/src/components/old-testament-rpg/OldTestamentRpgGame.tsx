import { useCallback, useState } from 'react';
import ChapterMenu from './ChapterMenu';
import EdenChapterGame from './chapter01/EdenChapterGame';
import NoahChapterGame from './chapter02/NoahChapterGame';
import './styles.css';

export default function OldTestamentRpgGame() {
  const [activeChapter, setActiveChapter] = useState(1);
  const startChapterTwo = useCallback(() => setActiveChapter(2), []);
  const [chapterSession, setChapterSession] = useState(0);

  return (
    <div className="old-testament-game">
      <ChapterMenu activeChapter={activeChapter} onSelectChapter={chapter => {
        setActiveChapter(chapter);
        setChapterSession(session => session + 1);
      }} />
      {activeChapter === 2
        ? <NoahChapterGame key={`noah-${chapterSession}`} />
        : <EdenChapterGame key={`eden-${chapterSession}`} onNextChapter={startChapterTwo} />}
    </div>
  );
}
