import ChapterGameHost from '../ChapterGameHost';
import DavidScene from './DavidScene';

export default function DavidChapterGame({ onNextChapter }: { onNextChapter?: () => void }) {
  return <ChapterGameHost scene={DavidScene} chapter={7} onNextChapter={onNextChapter} />;
}
