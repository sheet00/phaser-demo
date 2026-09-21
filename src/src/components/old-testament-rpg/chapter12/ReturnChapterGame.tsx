import ChapterGameHost from '../ChapterGameHost';
import ReturnScene from './ReturnScene';

export default function ReturnChapterGame({ onNextChapter }: { onNextChapter?: () => void }) {
  return <ChapterGameHost scene={ReturnScene} chapter={12} onNextChapter={onNextChapter} />;
}
