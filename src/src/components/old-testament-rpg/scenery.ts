import Phaser from 'phaser';

type Surface = 'earth' | 'water' | 'rug' | 'stone';

// 各素材で実画像を確認した角・辺・中央。シート上の隣接番号から推測しない。
const SURFACES: Record<Surface, readonly number[]> = {
  earth: [518, 519, 522, 575, 6, 579, 632, 635, 636],
  water: [2, 3, 4, 59, 0, 61, 116, 117, 118],
  rug: [409, 410, 411, 466, 467, 468, 523, 524, 525],
  stone: [697, 698, 699, 754, 121, 756, 757, 868, 758],
};

export class Scenery {
  private readonly scene: Phaser.Scene;
  private readonly parent: Phaser.GameObjects.Container;
  private readonly texture: string;
  private readonly top: number;
  private readonly size: number;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    texture: string,
    top = 104,
    size = 48,
  ) {
    this.scene = scene;
    this.parent = parent;
    this.texture = texture;
    this.top = top;
    this.size = size;
  }

  tile(col: number, row: number, frame: number, tint = 0xffffff) {
    const image = this.scene.add.image(col * this.size, this.top + row * this.size, this.texture, frame)
      .setOrigin(0).setScale(this.size / 16).setTint(tint);
    this.parent.add(image);
    return image;
  }

  ground(frame: number, tint = 0xffffff, columns = 20, rows = 12) {
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      this.tile(col, row, frame, this.shade(tint, col, row));
    }
  }

  private shade(tint: number, col: number, row: number) {
    // 低いコントラストの大きな色むらで、床を市松模様にせず反復を和らげる。
    const amount = .94 + .06 * (Math.sin(col * .61 + Math.cos(row * .47)) + 1) / 2;
    return (Math.round((tint >> 16 & 255) * amount) << 16)
      | (Math.round((tint >> 8 & 255) * amount) << 8)
      | Math.round((tint & 255) * amount);
  }

  patch(x: number, y: number, width: number, height: number, surface: Surface, tint = 0xffffff) {
    const frames = SURFACES[surface];
    const pieces: Phaser.GameObjects.Image[] = [];
    for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
      const edgeX = col === 0 ? 0 : col === width - 1 ? 2 : 1;
      const edgeY = row === 0 ? 0 : row === height - 1 ? 2 : 1;
      pieces.push(this.tile(x + col, y + row, frames[edgeY * 3 + edgeX], tint));
    }
    return pieces;
  }

  shadow(col: number, row: number, width = 1, height = .35) {
    const shadow = this.scene.add.ellipse((col + .5) * this.size, this.top + (row + .9) * this.size,
      this.size * width, this.size * height, 0x15252d, .14);
    this.parent.add(shadow);
  }

  tree(col: number, row: number, kind: 'green' | 'fir' | 'dry' | 'gold' = 'green', tint = 0xffffff) {
    const frames = { green: [585, 642], fir: [586, 643], dry: [540, 597], gold: [584, 641] }[kind];
    this.shadow(col, row + 1, 1.35);
    this.tile(col, row, frames[0], tint);
    this.tile(col, row + 1, frames[1], tint);
  }

  plants(positions: number[][], dry = false, tint = 0xffffff) {
    positions.forEach(([col, row], index) => {
      this.shadow(col, row, .65, .18);
      this.tile(col, row, dry ? [1137, 1138, 533][index % 3] : [538, 651, 653, 534][index % 4], tint);
    });
  }

  supplies(col: number, row: number, tint = 0xffffff) {
    this.shadow(col + .5, row, 2.3);
    this.tile(col, row, 84, tint);
    this.tile(col + 1, row, 23, tint);
    this.tile(col + .45, row + .4, 140, tint);
  }

  column(col: number, row: number, tint = 0xffffff) {
    this.shadow(col, row + 1, 1.4);
    return [this.tile(col, row, 1096, tint), this.tile(col, row + 1, 1153, tint)];
  }

  facade(x: number, y: number, width: number, height = 4, tint = 0xffffff) {
    const pieces: Phaser.GameObjects.Image[] = [];
    for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
      const side = col === 0 ? 0 : col === width - 1 ? 2 : 1;
      const frame = row === 0 ? [697, 698, 699][side]
        : row === height - 1 ? [869, 868, 871][side] : [872, 873, 874][side];
      pieces.push(this.tile(x + col, y + row, frame, tint));
    }
    for (let col = 1; col < width - 1; col += 3) {
      if (height >= 4) {
        pieces.push(this.tile(x + col, y + height - 3, 158));
        pieces.push(this.tile(x + col, y + height - 2, 215));
      } else pieces.push(this.tile(x + col, y + 1, 98));
    }
    pieces.push(this.tile(x + Math.floor(width / 2), y + height - 1, 37));
    return pieces;
  }

  temple(x: number, y: number, width: number, tint = 0xffffff) {
    const pieces = this.facade(x, y + 2, width, 4, tint);
    const middle = x + width / 2;
    pieces.push(this.tile(middle - 1, y, 1210, tint), this.tile(middle, y, 1211, tint));
    for (let col = x + 1; col < x + width - 1; col++) {
      pieces.push(this.tile(col, y + 1, col === x + 1 ? 1210 : col === x + width - 2 ? 1211 : 1215, tint));
      pieces.push(this.tile(col, y + 2, 1269, tint));
    }
    for (const col of [x, x + width - 1]) pieces.push(...this.column(col, y + 3, tint));
    for (let col = x + 1; col < x + width - 1; col++) pieces.push(this.tile(col, y + 6, 983, tint));
    return pieces;
  }

  terrace(x: number, y: number, width: number, height: number, tint = 0xffffff) {
    this.patch(x, y, width, height, 'stone', tint);
    for (let col = x + 1; col < x + width - 1; col++) this.tile(col, y + height - 1, 983, tint);
  }

  ridge(columns = 20, tint = 0xb1b3a1) {
    for (let col = 0; col < columns; col++) {
      this.tile(col, col % 5 === 0 ? 1 : 0, col % 3 === 0 ? 1251 : 1252, tint);
      if (col % 3 !== 1) this.tile(col, col % 5 === 0 ? 2 : 1, 1137, tint);
    }
  }

  glow(col: number, row: number, color = 0xffd997, radius = 1.5) {
    const light = this.scene.add.graphics();
    for (let ring = 4; ring > 0; ring--) {
      light.fillStyle(color, .025).fillCircle((col + .5) * this.size,
        this.top + (row + .5) * this.size, this.size * radius * ring / 4);
    }
    this.parent.add(light);
  }
}
