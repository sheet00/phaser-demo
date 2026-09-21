import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { afterFontsReady, CRISP_RENDERING } from '../typography';
import NoahChapterScene from './NoahScene';

export default function NoahChapterGame({ onNextChapter }: { onNextChapter?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    return afterFontsReady(() => {
      const scene = new NoahChapterScene(onNextChapter);
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host,
        width: window.innerWidth,
        height: window.innerHeight - 78,
        ...CRISP_RENDERING,
        backgroundColor: '#17251d',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        input: { keyboard: { target: host } },
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
        scene
      });
      host.focus({ preventScroll: true });
      const blur = () => { if (scene.sys.isActive()) scene.stopMovement(); };
      host.addEventListener('blur', blur);
  
      const handleResize = () => {
        if (!game) return;
        game.scale.resize(window.innerWidth, window.innerHeight - 78);
      };
      window.addEventListener('resize', handleResize);
  
      return () => {
        window.removeEventListener('resize', handleResize);
        host.removeEventListener('blur', blur);
        game.destroy(true);
      };
    });
  }, [onNextChapter]);
  return <div ref={hostRef} tabIndex={0} aria-label="第2章。矢印キーまたはWASDで移動、スペースで調べる"
    onPointerDown={event => event.currentTarget.focus({ preventScroll: true })}
    style={{ position: 'absolute', top: 78, left: 0, width: '100%', height: 'calc(100% - 78px)', overflow: 'hidden' }} />;
}
