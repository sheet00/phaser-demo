import Phaser from 'phaser';

export function addAbrahamTile(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, col: number, row: number, frame: number) {
  const image = scene.add.image(col * 48, 110 + row * 48, 'abraham_tiles', frame).setOrigin(0).setScale(3);
  parent.add(image);
  return image;
}

export function buildAbrahamMap(scene: Phaser.Scene, scenery: Phaser.GameObjects.Container) {
  scenery.removeAll(true);
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 20; col++) addAbrahamTile(scene, scenery, col, row, row < 3 ? 8 : 5);
  }
  for (let row = 6; row < 12; row++) {
    for (let col = 11; col < 15; col++) addAbrahamTile(scene, scenery, col, row, 121);
  }
  const altar = scene.add.container(0, 0).setDepth(12);
  for (const [col, row] of [[12, 7], [13, 7], [12, 8], [13, 8]]) addAbrahamTile(scene, altar, col, row, 119);
  for (const [col, row] of [[11, 7], [14, 7], [11, 8], [14, 8]]) addAbrahamTile(scene, altar, col, row, 178);
  scenery.add(scene.add.text(624, 408, 'モリア山の祭壇', {
    padding: { top: 6, bottom: 4, left: 4, right: 4 }, fontSize: '17px', color: '#fff0c2', backgroundColor: '#513c27'
  }).setOrigin(0.5).setDepth(30));
  return altar;
}

export function createBush(scene: Phaser.Scene, x: number, y: number) {
  const bush = scene.add.graphics().setDepth(24);
  bush.fillStyle(0x355c3b, 1).fillCircle(x - 24, y + 8, 24).fillCircle(x + 2, y - 4, 30).fillCircle(x + 28, y + 10, 22);
  bush.lineStyle(4, 0x9c6b38, 1).lineBetween(x - 30, y + 28, x + 30, y + 28);
  return bush;
}

export function createSheep(scene: Phaser.Scene, x: number, y: number) {
  const sheep = scene.add.container(x, y).setDepth(26);
  const wool = scene.add.graphics();
  wool.fillStyle(0xf5efe1, 1).fillCircle(-25, 0, 22).fillCircle(0, -9, 28).fillCircle(25, 0, 22);
  const face = scene.add.graphics();
  face.fillStyle(0x403c3b, 1).fillCircle(40, -4, 15);
  face.lineStyle(4, 0xd4b36a, 1).arc(42, -12, 15, Math.PI * 1.15, Math.PI * 1.8).strokePath();
  face.fillCircle(45, -7, 2);
  const legs = scene.add.graphics();
  legs.lineStyle(6, 0x403c3b, 1).lineBetween(-18, 17, -18, 35).lineBetween(14, 17, 14, 35);
  sheep.add([wool, face, legs]);
  return sheep;
}
