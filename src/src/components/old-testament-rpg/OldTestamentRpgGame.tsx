import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import ChapterMenu from './ChapterMenu';
import { CHAPTERS, getChapterPath } from './chapters';
import EdenChapterGame from './chapter01/EdenChapterGame';
import NoahChapterGame from './chapter02/NoahChapterGame';
import AbrahamChapterGame from './chapter03/AbrahamChapterGame';
import JacobJosephChapterGame from './chapter04/JacobJosephChapterGame';
import './styles.css';

export default function OldTestamentRpgGame() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const chapter = CHAPTERS.find(entry =>
    entry.available && chapterId === `chapter-${String(entry.number).padStart(2, '0')}`,
  );
  const startChapterTwo = useCallback(() => navigate(getChapterPath(2)), [navigate]);
  const startChapterThree = useCallback(() => navigate(getChapterPath(3)), [navigate]);
  const [chapterSession, setChapterSession] = useState(0);

  if (!chapter) return <Navigate to={getChapterPath(1)} replace />;
  const activeChapter = chapter.number;

  return (
    <div className="old-testament-game">
      <ChapterMenu activeChapter={activeChapter} onSelectChapter={selectedChapter => {
        if (selectedChapter === activeChapter) setChapterSession(session => session + 1);
        else navigate(getChapterPath(selectedChapter));
      }} />
      {activeChapter === 1
        ? <EdenChapterGame key={`eden-${chapterSession}`} onNextChapter={startChapterTwo} />
        : activeChapter === 2
          ? <NoahChapterGame key={`noah-${chapterSession}`} onNextChapter={startChapterThree} />
          : activeChapter === 3
            ? <AbrahamChapterGame key={`abraham-${chapterSession}`} />
            : <JacobJosephChapterGame key={`jacob-joseph-${chapterSession}`} />}
    </div>
  );
}
