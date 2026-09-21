import ChapterGameHost from '../ChapterGameHost';
import ElijahScene from './ElijahScene';

export default function ElijahChapterGame({ onNextChapter }: { onNextChapter?: () => void }) {
  return <ChapterGameHost scene={ElijahScene} chapter={9} onNextChapter={onNextChapter} />;
}
