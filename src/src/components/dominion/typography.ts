import Phaser from 'phaser';

export const FONT_FAMILY = '"BIZ UDPGothic", "M PLUS 1p", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';

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

const DOMINION_FONTS_SAMPLE = '銅貨銀貨金貨属州公領屋敷呪いアクション購入コイン勝利点廃棄獲得山札手札捨て札サプライ王国プレイ終了効果';

export function afterFontsReady(start: () => () => void, glyphs = ''): () => void {
  let cancelled = false;
  let dispose: (() => void) | undefined;

  fontsReady ??= Promise.all([
    document.fonts.load('400 16px "BIZ UDPGothic"', DOMINION_FONTS_SAMPLE),
    document.fonts.load('700 16px "BIZ UDPGothic"', DOMINION_FONTS_SAMPLE),
  ]).then(() => undefined).catch(() => {
    console.warn('BIZ UDPGothic を読み込めなかったため、代替フォントを使用します。');
    fontsReady = undefined;
  });

  const extraFontsReady = glyphs ? Promise.all([
    document.fonts.load('400 16px "BIZ UDPGothic"', glyphs),
    document.fonts.load('700 16px "BIZ UDPGothic"', glyphs),
  ]).catch(() => {
    console.warn('プレイヤー名のフォントを読み込めなかったため、代替フォントを使用します。');
  }) : Promise.resolve();

  void Promise.all([fontsReady, extraFontsReady]).then(() => {
    if (!cancelled) dispose = start();
  });

  return () => {
    cancelled = true;
    dispose?.();
  };
}
