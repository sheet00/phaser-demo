import { useCallback, useState } from 'react';
import ChapterMenu from './ChapterMenu';
import EdenChapterGame from './chapter01/EdenChapterGame';
import NoahChapterGame from './chapter02/NoahChapterGame';
import AbrahamChapterGame from './chapter03/AbrahamChapterGame';
import './styles.css';

export default function OldTestamentRpgGame() {
  const [activeChapter, setActiveChapter] = useState(1);
  const startChapterTwo = useCallback(() => setActiveChapter(2), []);
  const startChapterThree = useCallback(() => setActiveChapter(3), []);
  const [chapterSession, setChapterSession] = useState(0);

  return (
    <div className="old-testament-game">
      <ChapterMenu activeChapter={activeChapter} onSelectChapter={chapter => {
        setActiveChapter(chapter);
        setChapterSession(session => session + 1);
      }} />
      {activeChapter === 1
        ? <EdenChapterGame key={`eden-${chapterSession}`} onNextChapter={startChapterTwo} />
        : activeChapter === 2
          ? <NoahChapterGame key={`noah-${chapterSession}`} onNextChapter={startChapterThree} />
          : <AbrahamChapterGame key={`abraham-${chapterSession}`} />}
    </div>
  );
}
