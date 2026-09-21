import Phaser from 'phaser';
import { FONT_GLYPHS } from './fontGlyphs';

export const FONT_FAMILY = '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';

export const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: FONT_FAMILY,
  resolution: 3,
  padding: { top: 6, bottom: 4, left: 4, right: 4 },
};

export const CRISP_RENDERING: Phaser.Types.Core.GameConfig = {
  pixelArt: false,
  antialias: true,
  antialiasGL: true,
  roundPixels: false,
  callbacks: {
    preBoot(game: Phaser.Game) {
      // Text の CanvasTexture は線形補間、読み込んだ画像素材は最近傍補間にする。
      const filterImage = (_key: string, texture: Phaser.Textures.Texture) => {
        if (texture.source.some(source => source.source instanceof HTMLImageElement)) {
          texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      };
      game.textures.on(Phaser.Textures.Events.ADD, filterImage);
      game.events.once(Phaser.Core.Events.DESTROY, () => {
        game.textures.off(Phaser.Textures.Events.ADD, filterImage);
      });
    },
  },
};

let fontsReady: Promise<void> | undefined;

export function afterFontsReady(start: () => () => void): () => void {
  let cancelled = false;
  let dispose: (() => void) | undefined;

  // 日本語フォントは分割配信されるため、空白だけでなくゲームの使用文字を渡す。
  fontsReady ??= Promise.all([
    document.fonts.load('400 19px "Noto Sans JP"', FONT_GLYPHS),
    document.fonts.load('700 20px "Noto Sans JP"', FONT_GLYPHS),
  ]).then(() => undefined).catch(() => {
    console.warn('Noto Sans JP を読み込めなかったため、システムの日本語フォントを使用します。');
    fontsReady = undefined;
  });

  void fontsReady.then(() => {
    if (!cancelled) dispose = start();
  });

  return () => {
    cancelled = true;
    dispose?.();
  };
}
