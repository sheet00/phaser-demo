import Phaser from 'phaser';

export const TILE = 48;
export const SEA_WIDTH = 2016;
export const SEA_HEIGHT = 960;
export const MOUNTAIN_WIDTH = 960;
export const MOUNTAIN_HEIGHT = 1440;
export const TILES = 'exodus_tiles';

function tile(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, col: number, row: number, frame: number, tint = 0xffffff) {
  const image = scene.add.image(col * TILE, row * TILE, TILES, frame).setOrigin(0).setScale(3).setTint(tint);
  parent.add(image);
  return image;
}

function prop(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, x: number, y: number, frame: number, scale = 3) {
  const image = scene.add.image(x, y, TILES, frame).setOrigin(.5, 1).setScale(scale);
  parent.add(image);
  return image;
}

function tent(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, col: number, row: number) {
  tile(scene, parent, col, row, 618);
  tile(scene, parent, col + 1, row, 619);
  tile(scene, parent, col, row + 1, 675);
  tile(scene, parent, col + 1, row + 1, 676);
}

export function buildSea(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 42; col++) {
      tile(scene, parent, col, row, row >= 9 && row <= 12 ? 8 : 65);
    }
  }
  for (const col of [1, 3, 6, 37, 39, 41]) {
    for (const row of [2, 5, 15, 18]) prop(scene, parent, col * TILE + 24, row * TILE + 36, 1137 + col % 3);
  }
  for (const [col, row] of [[2, 4], [5, 15], [37, 3], [40, 15]]) {
    tile(scene, parent, col, row, 540);
    tile(scene, parent, col, row + 1, 597);
  }
  tent(scene, parent, 2, 6);
  tent(scene, parent, 38, 6);
  prop(scene, parent, 180, 395, 140);
  prop(scene, parent, 1820, 392, 23);

  // 乾いた道の上に海を重ね、海のコンテナだけを退かせて道を開く。
  const north = scene.add.container(0, 0);
  const south = scene.add.container(0, 0);
  parent.add([north, south]);
  const seaTint = 0x4294c2;
  for (let row = -2; row < 23; row++) {
    for (let col = 10; col < 36; col++) {
      tile(scene, row < 11 ? north : south, col, row, (row + col) % 7 === 0 ? 1 : 0, seaTint);
    }
  }
  return { north, south };
}

export function buildMountain(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
  for (let row = 0; row < 30; row++) {
    for (let col = 0; col < 20; col++) {
      const path = col >= 8 && col <= 11;
      const frame = row >= 24 ? 8 : path ? (row % 4 === 0 ? 120 : 7) : 9;
      tile(scene, parent, col, row, frame, row < 8 ? 0x98a7bd : 0xffffff);
    }
  }
  for (let row = 2; row < 24; row += 3) {
    for (const col of [1, 4, 6, 13, 15, 18]) {
      prop(scene, parent, col * TILE + (row % 2) * 16, row * TILE, 1251 + col % 3, col === 6 || col === 13 ? 4 : 6);
    }
  }
  for (const row of [8, 13, 18, 23]) {
    for (let col = 8; col < 12; col++) tile(scene, parent, col, row, 177);
    prop(scene, parent, 350, row * TILE + 45, 398);
    prop(scene, parent, 610, row * TILE + 45, 398);
  }
  tent(scene, parent, 3, 25);
  tent(scene, parent, 15, 25);
  prop(scene, parent, 275, 1325, 140);
  prop(scene, parent, 740, 1325, 23);
  for (let row = 4; row < 7; row++) {
    for (let col = 8; col < 12; col++) tile(scene, parent, col, row, 120, 0xb5c4d8);
  }
  const tablets = [prop(scene, parent, 454, 266, 146, 3), prop(scene, parent, 504, 266, 146, 3)];
  return tablets;
}
