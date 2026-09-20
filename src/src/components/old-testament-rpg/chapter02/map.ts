import Phaser from 'phaser';

export function addNoahTile(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, col: number, row: number, frame: number) {
  const image = scene.add.image(col * 48, 110 + row * 48, 'noah_tiles', frame).setOrigin(0).setScale(3);
  parent.add(image);
  return image;
}

export function buildArkMap(scene: Phaser.Scene, scenery: Phaser.GameObjects.Container) {
  const tile = (col: number, row: number, frame: number, parent = scenery) => addNoahTile(scene, parent, col, row, frame);
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 20; c++) {
      tile(c, r, r > 9 ? 0 : 5);
      if (r >= 6 && r <= 8 && c > 2 && c < 17) tile(c, r, 6);
      if (r < 4 && (c < 3 || c > 16)) tile(c, r, r % 2 === 0 ? 583 : 640);
    }
  }
  const boat = scene.add.container(0, 0).setDepth(12);
  for (let r = 1; r <= 4; r++) {
    for (let c = 5; c <= 14; c++) {
      tile(c, r, r === 1 || r === 4 ? 119 : 123, boat);
    }
  }
  for (let c = 6; c <= 13; c++) tile(c, 1, 1363, boat);
  for (const c of [6, 8, 11, 13]) tile(c, 2, 194, boat);
  tile(9, 4, 123, boat);
  tile(10, 4, 123, boat);
  tile(9, 5, 123);
  tile(10, 5, 123);
  boat.add(scene.add.text(480, 163, 'ノアの箱舟', { padding: { top: 6, bottom: 4, left: 4, right: 4 }, fontSize: '19px', color: '#fff0c2', backgroundColor: '#513c27' }).setOrigin(0.5));
  scenery.add(scene.add.rectangle(480, 390, 960, 560, 0x172b44, 0.28));
  return boat;
}

export function buildBabelMap(scene: Phaser.Scene, scenery: Phaser.GameObjects.Container) {
  const tile = (col: number, row: number, frame: number, parent = scenery) => addNoahTile(scene, parent, col, row, frame);
  scenery.removeAll(true);
  for (let r = 0; r < 12; r++) for (let c = 0; c < 20; c++) tile(c, r, 8);
  for (let r = 6; r < 12; r++) for (let c = 8; c <= 11; c++) tile(c, r, 121);
  // 塔も同じ素材の壁・床タイルを積み、見下ろし2Dの縮尺を保つ。
  for (let tier = 0; tier < 3; tier++) {
    const left = 6 + tier;
    const right = 13 - tier;
    const row = 4 - tier * 2;
    for (let c = left; c <= right; c++) {
      tile(c, row, 121);
      tile(c, row + 1, 178);
    }
  }
  for (const [c, r] of [[4, 4], [14, 5], [5, 7], [15, 8]]) {
    tile(c, r, 119);
    tile(c + 1, r, 22);
  }
  scenery.add(scene.add.text(480, 398, 'バベルの塔', { padding: { top: 6, bottom: 4, left: 4, right: 4 }, fontSize: '19px', color: '#ffffff', backgroundColor: '#675132' }).setOrigin(0.5));
}
