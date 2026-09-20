import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import NoahChapterScene from './NoahScene';

export default function NoahChapterGame() {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new NoahChapterScene();
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent: host, width: 960, height: 720, pixelArt: true,
      backgroundColor: '#17251d',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { keyboard: { target: host } },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
      scene
    });
    host.focus({ preventScroll: true });
    const blur = () => { if (scene.sys.isActive()) scene.stopMovement(); };
    host.addEventListener('blur', blur);
    return () => { host.removeEventListener('blur', blur); game.destroy(true); };
  }, []);
  return <div ref={hostRef} tabIndex={0} aria-label="第2章。矢印キーまたはWASDで移動、スペースで調べる"
    onPointerDown={event => event.currentTarget.focus({ preventScroll: true })}
    style={{ position: 'absolute', top: 78, left: 0, width: '100%', height: 'calc(100% - 78px)', overflow: 'hidden' }} />;
}
