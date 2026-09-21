import ChapterGameHost from '../ChapterGameHost';
import ExileScene from './ExileScene';

export default function ExileChapterGame({ onNextChapter }: { onNextChapter?: () => void }) {
  return <ChapterGameHost scene={ExileScene} chapter={10} onNextChapter={onNextChapter} />;
}
