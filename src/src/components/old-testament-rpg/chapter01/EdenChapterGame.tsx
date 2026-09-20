import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createEdenScene } from './EdenScene';

export default function EdenChapterGame({ onNextChapter }: { onNextChapter: () => void }) {
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const scene = createEdenScene(onNextChapter);
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: gameRef.current,
      pixelArt: true,
      input: {
        keyboard: { target: gameRef.current }
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      }
    };

    const game = new Phaser.Game(config);
    const gameHost = gameRef.current;
    gameHost.focus({ preventScroll: true });
    const stopMovement = () => { if (scene.sys.isActive()) scene.stopMovement(); };
    gameHost.addEventListener('blur', stopMovement);

    const handleResize = () => {
      if (!game) return;
      game.scale.resize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      gameHost.removeEventListener('blur', stopMovement);
      game.destroy(true);
    };
  }, [onNextChapter]);

  return (
    <div
      ref={gameRef}
      tabIndex={0}
      aria-label="エデンの園。矢印キーまたはWASDで移動、スペースで調べる"
      onPointerDown={event => event.currentTarget.focus({ preventScroll: true })}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
        padding: 0
      }}
    />
  );
}
