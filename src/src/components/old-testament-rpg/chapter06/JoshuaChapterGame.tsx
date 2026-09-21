import ChapterGameHost from '../ChapterGameHost';
import JoshuaScene from './JoshuaScene';

export default function JoshuaChapterGame({ onNextChapter }: { onNextChapter?: () => void }) {
  return <ChapterGameHost scene={JoshuaScene} chapter={6} onNextChapter={onNextChapter} />;
}
