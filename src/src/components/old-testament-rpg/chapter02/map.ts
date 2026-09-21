import Phaser from 'phaser';
import { Scenery } from '../scenery';

export function addNoahTile(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, col: number, row: number, frame: number) {
  const image = scene.add.image(col * 48, 110 + row * 48, 'noah_tiles', frame).setOrigin(0).setScale(3);
  parent.add(image);
  return image;
}

export function buildArkMap(scene: Phaser.Scene, scenery: Phaser.GameObjects.Container) {
  const tile = (col: number, row: number, frame: number, parent = scenery) => addNoahTile(scene, parent, col, row, frame);
  const art = new Scenery(scene, scenery, 'noah_tiles', 110);
  art.ground(5, 0xb6cbb0);
  art.patch(2, 5, 16, 5, 'earth', 0xd1c4a9);
  for (let col = 0; col < 20; col++) {
    tile(col, 10, 3);
    tile(col, 11, 0);
  }
  for (const [col, row] of [[0, 0], [2, 1], [0, 4], [17, 0], [19, 1], [18, 4]]) art.tree(col, row, 'fir', 0xaac1ad);
  art.plants([[1, 7], [2, 9], [17, 8], [19, 9]], false, 0xbdcbb5);
  art.supplies(3, 3);
  art.supplies(15, 4);
  const boat = scene.add.container(0, 0).setDepth(12);
  const ship = new Scenery(scene, boat, 'noah_tiles', 110);
  for (let r = 1; r <= 4; r++) {
    for (let c = 5; c <= 14; c++) {
      ship.tile(c, r, r === 1 || r === 4 ? 123 : 179, r === 4 ? 0xa78c6f : 0xe0c397);
    }
  }
  for (let c = 5; c <= 14; c++) {
    tile(c, 1, c === 5 ? 1356 : c === 14 ? 1362 : 1359, boat);
    if (c !== 9 && c !== 10) tile(c, 4, 1416, boat);
  }
  for (const c of [5, 14]) for (const r of [2, 3]) tile(c, r, 1360, boat);
  for (const c of [7, 11]) {
    ship.tile(c, 2, 123, 0xceb18a); ship.tile(c + 1, 2, 123, 0xceb18a);
    tile(c, 2, 158, boat); tile(c, 3, 215, boat);
  }
  tile(9, 3, 37, boat);
  ship.supplies(12, 3);
  for (const col of [9, 10]) {
    tile(col, 4, 179, boat);
    tile(col, 5, 179);
  }
  boat.add(scene.add.text(480, 163, 'ノアの箱舟', {
    fontFamily: '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif',
    fontSize: '19px', color: '#fff0c2', backgroundColor: '#513c27', fontStyle: 'bold',
    resolution: 3, padding: { top: 6, bottom: 4, left: 6, right: 6 }
  }).setOrigin(0.5));
  scenery.add(scene.add.rectangle(480, 390, 960, 560, 0x172b44, 0.28));
  return boat;
}

export function buildBabelMap(scene: Phaser.Scene, scenery: Phaser.GameObjects.Container) {
  const tile = (col: number, row: number, frame: number, parent = scenery) => addNoahTile(scene, parent, col, row, frame);
  scenery.removeAll(true);
  const art = new Scenery(scene, scenery, 'noah_tiles', 110);
  art.ground(8, 0xe5d5b6);
  art.patch(4, 3, 12, 9, 'earth', 0xc8b593);
  art.terrace(5, 5, 10, 3, 0xd9c4a0);
  art.patch(8, 7, 4, 5, 'stone', 0xe5d4b4);
  art.facade(0, 1, 4, 4, 0xc6b99c);
  art.facade(16, 1, 4, 4, 0xc6b99c);
  art.supplies(1, 6);
  art.supplies(17, 7);
  art.plants([[0, 9], [3, 10], [16, 10], [19, 5]], true);
  addBabelTier(scene, scenery, 0);
  for (const [c, r] of [[4, 4], [14, 5], [5, 7], [15, 8]]) {
    tile(c, r, 119);
    tile(c + 1, r, 22);
  }
  scenery.add(scene.add.text(480, 398, 'バベルの塔', {
    fontFamily: '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif',
    fontSize: '19px', color: '#ffffff', backgroundColor: '#675132', fontStyle: 'bold',
    resolution: 3, padding: { top: 6, bottom: 4, left: 6, right: 6 }
  }).setOrigin(0.5));
}

export function addBabelTier(scene: Phaser.Scene, scenery: Phaser.GameObjects.Container, tier: number) {
  const left = 6 + tier;
  const right = 13 - tier;
  const row = 4 - tier * 2;
  for (let c = left; c <= right; c++) {
    addBabelBlock(scene, scenery, c, row);
    addBabelBlock(scene, scenery, c, row + 1);
  }
}

export function addBabelBlock(scene: Phaser.Scene, scenery: Phaser.GameObjects.Container, col: number, row: number) {
  const tier = Math.floor((5 - row) / 2);
  const left = 6 + tier;
  const right = 13 - tier;
  const edge = col === left ? 0 : col === right ? 2 : 1;
  const frame = row % 2 === 0 ? [697, 698, 699][edge] : [869, 868, 871][edge];
  return addNoahTile(scene, scenery, col, row, frame).setTint(0xe0bc85);
}
