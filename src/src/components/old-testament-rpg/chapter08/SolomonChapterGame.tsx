import ChapterGameHost from '../ChapterGameHost';
import SolomonScene from './SolomonScene';

export default function SolomonChapterGame({ onNextChapter }: { onNextChapter?: () => void }) {
  return <ChapterGameHost scene={SolomonScene} chapter={8} onNextChapter={onNextChapter} />;
}
