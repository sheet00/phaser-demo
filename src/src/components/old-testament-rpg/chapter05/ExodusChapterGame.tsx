import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import ExodusScene from './ExodusScene';

export default function ExodusChapterGame() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: window.innerWidth,
      height: Math.max(1, window.innerHeight - 78),
      pixelArt: true,
      backgroundColor: '#182736',
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { keyboard: { target: host } },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
      scene: ExodusScene,
    });
    const resize = () => game.scale.resize(window.innerWidth, Math.max(1, window.innerHeight - 78));
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener('resize', resize);
    host.focus({ preventScroll: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      game.destroy(true);
    };
  }, []);

  return <div ref={hostRef} tabIndex={0}
    aria-label="第5章。矢印キーまたはWASDで移動、スペースまたはタップで調べる"
    onPointerDown={event => event.currentTarget.focus({ preventScroll: true })}
    style={{ position: 'absolute', top: 78, left: 0, width: '100%', height: 'calc(100% - 78px)', overflow: 'hidden' }} />;
}
