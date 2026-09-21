import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { afterFontsReady, CRISP_RENDERING } from './typography';

type ChapterGameHostProps = {
  scene: new (onNextChapter?: () => void) => Phaser.Scene;
  chapter: number;
  onNextChapter?: () => void;
};

export default function ChapterGameHost({ scene: Scene, chapter, onNextChapter }: ChapterGameHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    return afterFontsReady(() => {
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host,
        width: window.innerWidth,
        height: Math.max(1, window.innerHeight - 78),
        ...CRISP_RENDERING,
        backgroundColor: '#111b30',
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        input: { keyboard: { target: host } },
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
        scene: new Scene(onNextChapter),
      });
      gameRef.current = game;
      const resize = () => gameRef.current?.scale.resize(window.innerWidth, Math.max(1, window.innerHeight - 78));
      window.addEventListener('resize', resize);
      host.focus({ preventScroll: true });
      return () => {
        window.removeEventListener('resize', resize);
        game.destroy(true);
        if (gameRef.current === game) gameRef.current = null;
      };
    });
  }, [Scene, onNextChapter]);

  return <div ref={hostRef} tabIndex={0}
    aria-label={`第${chapter}章。矢印・WASD・タップで移動、SPACE・タップで調べる`}
    onPointerDown={event => event.currentTarget.focus({ preventScroll: true })}
    style={{ position: 'absolute', top: 78, left: 0, width: '100%', height: 'calc(100% - 78px)', overflow: 'hidden' }} />;
}
