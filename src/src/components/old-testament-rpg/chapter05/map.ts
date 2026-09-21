import Phaser from 'phaser';
import { Scenery } from '../scenery';

export const TILE = 48;
export const CALL_WIDTH = 960;
export const CALL_HEIGHT = 720;
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
  const art = new Scenery(scene, parent, TILES, 0);
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 42; col++) {
      tile(scene, parent, col, row, row >= 9 && row <= 12 ? 8 : 65,
        row >= 9 && row <= 12 ? 0xf1dfb8 : 0xcec6b0);
    }
  }
  art.patch(0, 7, 10, 7, 'earth', 0xdcc79f);
  art.patch(36, 7, 6, 7, 'earth', 0xdcc79f);
  for (const col of [1, 4, 37, 40]) {
    art.plants([[col, 1], [col, 16], [col, 18]], true, 0xc9b99b);
  }
  art.supplies(3, 7);
  art.supplies(38, 14);
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
      const nearShore = col === 10 || col === 35;
      tile(scene, row < 11 ? north : south, col, row,
        nearShore ? (col === 10 ? 59 : 61) : (row + col) % 7 === 0 ? 1 : 0,
        nearShore ? 0x8ac4ce : seaTint);
    }
  }
  return { north, south };
}

export function buildMountain(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
  const art = new Scenery(scene, parent, TILES, 0);
  for (let row = 0; row < 30; row++) {
    for (let col = 0; col < 20; col++) {
      const path = col >= 8 && col <= 11;
      const frame = row >= 24 ? 8 : path ? (row % 4 === 0 ? 120 : 7) : 9;
      tile(scene, parent, col, row, frame, row < 8 ? 0x98a7bd : path ? 0xd9d1bc : 0xa4acaa);
    }
  }
  art.ridge(20, 0x75879c);
  art.patch(1, 24, 6, 5, 'earth', 0xd4c39f);
  art.patch(13, 24, 6, 5, 'earth', 0xd4c39f);
  for (const row of [6, 11, 16, 21]) {
    for (const col of [0, 2, 4, 14, 16, 18]) art.tile(col, row, 1252, 0x8f9b9f);
  }
  art.supplies(4, 27);
  art.supplies(14, 27);
  art.tree(1, 25, 'dry');
  art.tree(18, 26, 'dry');
  for (let row = 2; row < 24; row += 3) {
    for (const col of [1, 4, 6, 13, 15, 18]) {
      prop(scene, parent, col * TILE + (row % 2) * 16, row * TILE, 1251 + col % 3, col === 6 || col === 13 ? 4 : 6);
    }
  }
  for (const row of [8, 13, 18, 23]) {
    for (let col = 8; col < 12; col++) tile(scene, parent, col, row, 177);
    prop(scene, parent, 350, row * TILE + 45, 473);
    prop(scene, parent, 610, row * TILE + 45, 473);
    art.glow(7, row, 0xffd39b);
    art.glow(12, row, 0xffd39b);
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

export function buildCallStage(scene: Phaser.Scene, parent: Phaser.GameObjects.Container) {
  const art = new Scenery(scene, parent, TILES, 0);
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 20; col++) {
      const isMountain = row < 4;
      const frame = isMountain ? (row === 3 ? 120 : 9) : 8;
      const tint = isMountain ? 0x98a7bd : 0xdcc79f;
      tile(scene, parent, col, row, frame, tint);
    }
  }
  for (let col = 0; col < 20; col += 2) {
    prop(scene, parent, col * TILE + 24, 3 * TILE + 24, 1137 + (col % 3));
    if (col % 4 === 0) {
      prop(scene, parent, col * TILE + 36, 2 * TILE, 1251 + (col % 3), 4);
    }
  }
  art.plants([[2, 6], [5, 11], [8, 8], [11, 13], [14, 7], [17, 10]], true, 0xc9b99b);
  art.tree(3, 7, 'dry', 0xbfa882);
  art.tree(17, 8, 'dry', 0xbfa882);

  // 羊飼いモーセの羊たち（荒野の草を食む羊の群れ）
  for (const [sx, sy] of [[150, 560], [260, 600], [130, 470], [280, 480]]) {
    const sheep = scene.add.image(sx, sy, 'golden_calf').setScale(0.55).setTint(0xf4efe4);
    parent.add(sheep);
    scene.tweens.add({
      targets: sheep,
      y: sy - 4,
      duration: 700 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // 燃え盛る柴（Burning Bush: 出エジプト記3章）
  const bushContainer = scene.add.container(720, 510);
  parent.add(bushContainer);

  const bush = scene.add.image(0, 0, TILES, 538).setScale(3.6).setOrigin(0.5, 0.85);
  const fire1 = scene.add.image(-12, -26, TILES, 398).setScale(3).setOrigin(0.5, 0.85);
  const fire2 = scene.add.image(14, -20, TILES, 398).setScale(2.6).setOrigin(0.5, 0.85).setFlipX(true);
  const fire3 = scene.add.image(0, -40, TILES, 398).setScale(3.2).setOrigin(0.5, 0.85);

  const aura = scene.add.graphics();
  aura.fillStyle(0xffe066, 0.28).fillCircle(0, -25, 55);
  aura.fillStyle(0xffaa00, 0.18).fillCircle(0, -25, 80);

  bushContainer.add([aura, bush, fire1, fire2, fire3]);

  scene.tweens.add({
    targets: [fire1, fire3],
    y: '-=10',
    scaleY: 3.5,
    scaleX: 2.7,
    duration: 350,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: fire2,
    y: '-=8',
    scaleY: 3.0,
    scaleX: 2.3,
    duration: 420,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: aura,
    alpha: 0.12,
    scale: 1.25,
    duration: 650,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  return { bushContainer };
}

