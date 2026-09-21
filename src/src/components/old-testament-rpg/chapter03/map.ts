import Phaser from 'phaser';
import { Scenery } from '../scenery';

export function addAbrahamTile(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, col: number, row: number, frame: number, tint = 0xffffff) {
  const image = scene.add.image(col * 48, 110 + row * 48, 'abraham_tiles', frame).setOrigin(0).setScale(3).setTint(tint);
  parent.add(image);
  return image;
}

export function buildAbrahamMap(scene: Phaser.Scene, scenery: Phaser.GameObjects.Container) {
  scenery.removeAll(true);
  const art = new Scenery(scene, scenery, 'abraham_tiles', 110);
  art.ground(5, 0x839b9e);
  art.patch(2, 3, 16, 6, 'earth', 0x9aa8b6);
  art.patch(3, 7, 10, 4, 'earth', 0xb3b5ac);
  art.ridge(20, 0x8194b1);
  art.plants([[0, 8], [2, 6], [4, 2], [7, 4], [16, 6], [18, 9]], true, 0x929da9);
  art.tree(1, 2, 'fir', 0x809e9f);
  art.tree(17, 1, 'fir', 0x809e9f);

  // 3. 山肌の木々・岩（左右の崖沿い）
  const trees = [[0, 2], [1, 5], [18, 2], [19, 6]];
  for (const [tc, tr] of trees) {
    addAbrahamTile(scene, scenery, tc, tr, tr <= 2 ? 540 : 583);
    addAbrahamTile(scene, scenery, tc, tr + 1, tr <= 2 ? 597 : 640);
  }
  for (const [rc, rr] of [[3, 3], [5, 4], [15, 3], [17, 5], [2, 9], [17, 10]]) {
    addAbrahamTile(scene, scenery, rc, rr, 1137, 0x7c8577);
  }

  art.terrace(10, 6, 6, 6, 0xc0c6cb);

  // 5. 祭壇と薪・篝火
  const altar = scene.add.container(0, 0).setDepth(12);
  for (const [col, row] of [[12, 7], [13, 7], [12, 8], [13, 8]]) addAbrahamTile(scene, altar, col, row, 120, 0xc2c8d1);
  addAbrahamTile(scene, altar, 12, 7, 179);
  addAbrahamTile(scene, altar, 13, 7, 179);
  addAbrahamTile(scene, altar, 11, 7, 473);
  addAbrahamTile(scene, altar, 14, 7, 473);
  art.glow(11, 7, 0xffd6a0, 2);
  art.glow(14, 7, 0xffd6a0, 2);
  scenery.add(scene.add.text(624, 408, 'モリア山の祭壇', {
    fontFamily: '"Noto Sans JP", -apple-system, BlinkMacSystemFont, "Hiragino Sans", Meiryo, sans-serif',
    fontSize: '17px', color: '#fff0c2', backgroundColor: '#513c27',
    resolution: 3, padding: { top: 6, bottom: 4, left: 6, right: 6 }
  }).setOrigin(0.5).setDepth(30));

  // 6. 山頂の草花・小低木
  for (const [bc, br] of [[4, 7], [6, 9], [15, 8], [16, 11]]) {
    addAbrahamTile(scene, scenery, bc, br, 538);
  }

  return altar;
}

export function createBush(scene: Phaser.Scene, x: number, y: number) {
  const container = scene.add.container(x, y).setDepth(24);
  const left = scene.add.image(-22, 10, 'abraham_tiles', 538).setScale(3.5);
  const center = scene.add.image(2, 0, 'abraham_tiles', 538).setScale(4.2);
  const right = scene.add.image(26, 8, 'abraham_tiles', 538).setScale(3.5);
  const plant1 = scene.add.image(-10, 16, 'abraham_tiles', 513).setScale(2.6);
  const plant2 = scene.add.image(18, 14, 'abraham_tiles', 570).setScale(2.6);
  container.add([left, center, right, plant1, plant2]);
  return container;
}

export function createSheep(scene: Phaser.Scene, x: number, y: number) {
  const sheep = scene.add.container(x, y).setDepth(26);
  const body = scene.add.image(0, 0, 'abraham_ram').setScale(0.95);
  const horns = scene.add.graphics();
  horns.lineStyle(3, 0xd4a048, 1);
  // 左の巻き角
  horns.arc(-16, -18, 6, Math.PI * 0.25, Math.PI * 1.75);
  horns.strokePath();
  // 右の巻き角
  horns.arc(10, -16, 6, Math.PI * 1.25, Math.PI * 2.75);
  horns.strokePath();
  sheep.add([body, horns]);
  return sheep;
}
