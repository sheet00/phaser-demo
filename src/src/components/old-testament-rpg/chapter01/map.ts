import Phaser from 'phaser';
import { TILE_SCALE, TILE_SIZE, MAP_COLS, MAP_ROWS } from './constants';

export function buildEdenMap(scene: Phaser.Scene, obstaclesGroup: Phaser.Physics.Arcade.StaticGroup) {
  const random = new Phaser.Math.RandomDataGenerator(['eden-tile-map']);
  const terrain = Array.from({ length: MAP_ROWS }, () => Array<number>(MAP_COLS).fill(5));
  const paths = Array.from({ length: MAP_ROWS }, () => Array<boolean>(MAP_COLS).fill(false));
  const water = Array.from({ length: MAP_ROWS }, () => Array<boolean>(MAP_COLS).fill(false));
  const bridges = Array.from({ length: MAP_ROWS }, () => Array<boolean>(MAP_COLS).fill(false));
  const mark = (grid: boolean[][], left: number, top: number, right: number, bottom: number) => {
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) grid[row][col] = true;
    }
  };
  mark(paths, 1, 13, 34, 14);
  mark(paths, 9, 2, 10, 13);
  mark(paths, 10, 9, 14, 10);
  mark(paths, 13, 13, 14, 19);
  mark(paths, 13, 18, 22, 19);
  mark(paths, 21, 10, 22, 19);
  mark(paths, 21, 9, 25, 10);
  mark(paths, 24, 2, 25, 13);
  mark(paths, 15, 11, 20, 15);
  for (let col = 0; col < MAP_COLS; col++) {
    const top = col < 7 ? 4 : col < 15 ? 5 : col < 24 ? 4 : 3;
    mark(water, col, top, col, top + 3);
  }
  mark(water, 3, 18, 7, 21);
  mark(water, 4, 17, 6, 22);
  mark(bridges, 9, 4, 10, 9);
  mark(bridges, 24, 2, 25, 7);

  const tile = (col: number, row: number, frame: number, depth = -10) =>
    scene.add.image(col * TILE_SIZE, row * TILE_SIZE, 'roguelike_sheet', frame)
      .setOrigin(0).setScale(TILE_SCALE).setDepth(depth);
  const blocker = (x: number, y: number, width: number, height: number) => {
    const body = scene.add.rectangle(x, y, width, height).setVisible(false);
    obstaclesGroup.add(body);
  };
  // 素材の岸辺・土道の外周タイルを、隣接する地形に合わせて選ぶ。
  const edgeFrame = (grid: boolean[][], col: number, row: number, frames: number[]) => {
    const top = row > 0 && !grid[row - 1][col];
    const bottom = row < MAP_ROWS - 1 && !grid[row + 1][col];
    const left = col > 0 && !grid[row][col - 1];
    const right = col < MAP_COLS - 1 && !grid[row][col + 1];
    return frames[(top ? 0 : bottom ? 2 : 1) * 3 + (left ? 0 : right ? 2 : 1)];
  };
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (water[row][col]) {
        terrain[row][col] = edgeFrame(water, col, row, [2, 3, 4, 59, 0, 61, 116, 117, 118]);
        if (!bridges[row][col]) {
          blocker((col + 0.5) * TILE_SIZE, (row + 0.5) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }
  const map = scene.make.tilemap({ data: terrain, tileWidth: 16, tileHeight: 16 });
  const tileset = map.addTilesetImage('eden', 'roguelike_sheet', 16, 16, 0, 1);
  if (!tileset) throw new Error('エデンの園のタイルセットを読み込めませんでした。');
  map.createLayer(0, tileset, 0, 0)!.setScale(TILE_SCALE).setDepth(-30);
  for (let row = 0; row < MAP_ROWS; row++) for (let col = 0; col < MAP_COLS; col++) {
    const terrainTile = map.getTileAt(col, row);
    if (terrainTile) terrainTile.tint = water[row][col] ? 0xb2e0dd
      : [0xd6e5b3, 0xcbdca7, 0xdeebbf][Math.floor((Math.sin(col * .42) + Math.cos(row * .53) + 2) * .7)];
  }
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (bridges[row][col]) {
        tile(col, row, 179, -20);
        if (col === 9 || col === 24) tile(col, row, 1356, -19);
        if (col === 10 || col === 25) tile(col, row, 1362, -19);
      } else if (paths[row][col] && !water[row][col]) {
        tile(col, row, edgeFrame(paths, col, row, [518, 519, 522, 575, 6, 579, 632, 635, 636]), -20);
      }
    }
  }
  const clearings = [[820, 720], [1650, 720], [950, 1200], [1550, 1200], [1280, 880], [1100, 950], [1140, 1040], [1296, 980], [2472, 936]];
  const occupied = new Set<string>();
  const canPlant = (col: number, row: number) => {
    if (row < 1 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
    if (occupied.has(`${col},${row}`) || occupied.has(`${col},${row - 1}`)) return false;
    if (water[row][col] || water[row - 1][col] || paths[row][col] || paths[row - 1][col]) return false;
    const x = (col + 0.5) * TILE_SIZE;
    const y = (row + 0.5) * TILE_SIZE;
    return !clearings.some(([cx, cy]) => Math.hypot(x - cx, y - cy) < 145);
  };
  const tree = (col: number, row: number, fruit = false) => {
    const depth = (row + 1) * TILE_SIZE;
    const frames = fruit ? [593, 650] : random.pick([[583, 640], [585, 642], [586, 643]]);
    scene.add.ellipse((col + .65) * TILE_SIZE, (row + .85) * TILE_SIZE,
      TILE_SIZE * 1.35, TILE_SIZE * .42, 0x1c3d35, .16).setDepth(-15);
    tile(col, row - 1, frames[0], depth);
    tile(col, row, frames[1], depth);
    occupied.add(`${col},${row - 1}`);
    occupied.add(`${col},${row}`);
    blocker((col + 0.5) * TILE_SIZE, (row + 0.82) * TILE_SIZE, TILE_SIZE * 0.45, TILE_SIZE * 0.3);
  };
  for (let row = 1; row < MAP_ROWS; row += 2) {
    for (let col = 0; col < MAP_COLS; col++) {
      const border = col < 2 || col >= MAP_COLS - 2 || row < 3 || row >= MAP_ROWS - 2;
      const grove = (col < 8 || col > 27 || row > 20) && random.frac() < 0.6;
      if ((border || grove || random.frac() < 0.12) && canPlant(col, row)) tree(col, row);
    }
  }
  for (let row = 2; row < MAP_ROWS - 2; row++) {
    for (let col = 2; col < MAP_COLS - 2; col++) {
      if (water[row][col] || paths[row][col] || occupied.has(`${col},${row}`)) continue;
      const flowerBed = Math.hypot((col - 10.5) / 2, (row - 17.5) / 2) < 1
        || Math.hypot((col - 25) / 2.5, (row - 16.5) / 2) < 1;
      if (flowerBed) {
        tile(col, row, random.pick([513, 514, 570, 571, 684, 685]));
      } else if (random.frac() < 0.18) {
        tile(col, row, random.pick([533, 534, 651, 652, 653]));
      }
    }
  }
  for (let row = 1; row < MAP_ROWS - 1; row++) for (let col = 1; col < MAP_COLS - 1; col++) {
    if (!water[row][col] || bridges[row][col]) continue;
    const bank = !water[row - 1][col] || !water[row + 1][col];
    if (bank && (col + row) % 4 === 0) tile(col, row, (col + row) % 8 === 0 ? 652 : 651, -18);
  }
  // 木は上下2枚の原寸タイルで構成し、中央の木も同じ縮尺に揃える。
  tree(18, 13, true);
  tree(16, 11, true);
  tree(20, 11, true);
  const treeCenterX = 18.5 * TILE_SIZE;
  const treeCenterY = 13.5 * TILE_SIZE;
  const exitX = 34 * TILE_SIZE;
  const exitY = 13.5 * TILE_SIZE;
  for (const row of [11, 15]) {
    for (let col = 31; col <= 34; col++) {
      tile(col, row, col === 31 ? 1359 : col === 34 ? 1360 : 1363, (row + 1) * TILE_SIZE);
      blocker((col + 0.5) * TILE_SIZE, (row + 0.65) * TILE_SIZE, TILE_SIZE, 18);
    }
  }
  tile(32, 12, 21, 12.8 * TILE_SIZE);
  tile(11, 10, 19, 10.8 * TILE_SIZE);
  tile(23, 18, 20, 18.8 * TILE_SIZE);

  return { treeCenterX, treeCenterY, exitX, exitY };
}
