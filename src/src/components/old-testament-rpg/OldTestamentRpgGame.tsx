import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import ChapterMenu from './ChapterMenu';
import { CHAPTERS, getChapterPath } from './chapters';
import EdenChapterGame from './chapter01/EdenChapterGame';
import NoahChapterGame from './chapter02/NoahChapterGame';
import AbrahamChapterGame from './chapter03/AbrahamChapterGame';
import JacobJosephChapterGame from './chapter04/JacobJosephChapterGame';
import ExodusChapterGame from './chapter05/ExodusChapterGame';
import JoshuaChapterGame from './chapter06/JoshuaChapterGame';
import DavidChapterGame from './chapter07/DavidChapterGame';
import SolomonChapterGame from './chapter08/SolomonChapterGame';
import ElijahChapterGame from './chapter09/ElijahChapterGame';
import ExileChapterGame from './chapter10/ExileChapterGame';
import DanielChapterGame from './chapter11/DanielChapterGame';
import ReturnChapterGame from './chapter12/ReturnChapterGame';
import './styles.css';

const CHAPTER_GAMES = [
  EdenChapterGame, NoahChapterGame, AbrahamChapterGame, JacobJosephChapterGame,
  ExodusChapterGame, JoshuaChapterGame, DavidChapterGame, SolomonChapterGame,
  ElijahChapterGame, ExileChapterGame, DanielChapterGame, ReturnChapterGame,
];

export default function OldTestamentRpgGame() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const chapter = CHAPTERS.find(entry =>
    entry.available && chapterId === `chapter-${String(entry.number).padStart(2, '0')}`,
  );
  const nextChapter = useCallback(() => {
    if (chapter && chapter.number < CHAPTERS.length) {
      navigate(getChapterPath(chapter.number + 1));
    } else {
      navigate('/');
    }
  }, [chapter, navigate]);
  const [chapterSession, setChapterSession] = useState(0);

  if (!chapter) return <Navigate to={getChapterPath(1)} replace />;
  const activeChapter = chapter.number;
  const ChapterGame = CHAPTER_GAMES[activeChapter - 1];

  return (
    <div className="old-testament-game">
      <ChapterMenu activeChapter={activeChapter} onSelectChapter={selectedChapter => {
        if (selectedChapter === activeChapter) setChapterSession(session => session + 1);
        else navigate(getChapterPath(selectedChapter));
      }} />
      <ChapterGame key={`${activeChapter}-${chapterSession}`} onNextChapter={nextChapter} />
    </div>
  );
}
