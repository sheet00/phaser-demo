import ChapterGameHost from '../ChapterGameHost';
import DanielScene from './DanielScene';

export default function DanielChapterGame({ onNextChapter }: { onNextChapter?: () => void }) {
  return <ChapterGameHost scene={DanielScene} chapter={11} onNextChapter={onNextChapter} />;
}
