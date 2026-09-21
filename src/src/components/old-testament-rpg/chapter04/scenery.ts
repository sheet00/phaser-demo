import Phaser from 'phaser';
import { Scenery } from '../scenery';
import { TEXT_STYLE } from '../typography';

export type ChapterPhase = 'wrestling' | 'reconcile' | 'sold' | 'dream' | 'famine' | 'complete';

const TILE = 48;
const TOP = 104;
const TEXTURE = 'jacob_joseph_tiles';
const FRAMES = {
  grass: 5, sand: 8, dirt: 6, paving: 121,
  water: 0, waterLeft: 59, waterRight: 61,
  bush: 538,
  rock: 1137, barrel: 23, sack: 140, crate: 84,
  stool: 133, brazier: 473,
};

export function drawChapterScenery(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, phase: ChapterPhase) {
  const night = phase === 'wrestling';
  const art = new Scenery(scene, parent, TEXTURE);
  const tile = (col: number, row: number, frame: number, tint?: number) => {
    const image = scene.add.image(col * TILE, TOP + row * TILE, TEXTURE, frame).setOrigin(0).setScale(3);
    if (tint || night) image.setTint(tint ?? 0x829eae);
    parent.add(image);
    return image;
  };
  const fill = (x: number, y: number, width: number, height: number, frame: number, tint?: number) => {
    if (x === 0 && y === 0 && width === 20 && height === 12) {
      art.ground(frame, tint ?? (night ? 0x829eae : 0xe8dfc9));
      return;
    }
    for (let row = y; row < y + height; row++) for (let col = x; col < x + width; col++) tile(col, row, frame, tint);
  };
  const patch = (x: number, y: number, width: number, height: number, first: number) => {
    art.patch(x, y, width, height, first === 409 ? 'rug' : 'stone');
  };
  const prop = (col: number, row: number, frame: number, scale = 3) => {
    const image = scene.add.image((col + .5) * TILE, TOP + (row + 1) * TILE, TEXTURE, frame).setOrigin(.5, 1).setScale(scale);
    if (night) image.setTint(0x9fb4bb);
    parent.add(image);
    return image;
  };
  const tree = (col: number, row: number, autumn = false) => {
    art.tree(col, row, autumn ? 'gold' : 'green', night ? 0x829eae : 0xe4e8c5);
  };
  const person = (x: number, y: number, frame: number) => {
    const image = scene.add.image(x, y, 'roguelike_characters', frame).setScale(3);
    if (night) image.setTint(0xc5d5df);
    parent.add(image);
  };
  const fence = (x: number, y: number, length: number) => {
    for (let i = 0; i < length; i++) tile(x + i, y, i === 0 ? 1356 : i === length - 1 ? 1362 : 1359);
  };
  const building = (x: number, y: number, width: number) => {
    art.facade(x, y, width, 5, 0xead6ac);
  };

  if (phase === 'wrestling' || phase === 'reconcile') {
    fill(0, 0, 20, 12, FRAMES.grass);
    for (let row = 0; row < 12; row++) {
      tile(8, row, FRAMES.waterLeft);
      fill(9, row, 2, 1, FRAMES.water);
      tile(11, row, FRAMES.waterRight);
    }
    art.patch(0, 7, 8, 4, 'earth', 0x99a8ad);
    art.patch(12, 7, 8, 4, 'earth', 0x99a8ad);
    art.plants([[3, 5], [6, 3], [12, 2], [15, 6], [18, 9]], false, 0x8caaa7);
    for (const row of [2, 5, 11]) tile(10, row, 652, 0xa9c6d2);
    for (let col = 8; col <= 11; col++) {
      tile(col, 8, 179);
      tile(col, 9, 179);
      tile(col, 8, 1359);
      tile(col, 9, 1416);
    }
    for (const [x, y] of [[0, 0], [2, 1], [5, 0], [1, 4], [5, 4], [13, 0], [16, 1], [18, 0], [16, 4], [18, 5]]) tree(x, y);
    for (const [x, y] of [[3, 3], [6, 6], [13, 4], [17, 7], [1, 10], [18, 10]]) prop(x, y, FRAMES.bush);
    for (const [x, y] of [[7, 2], [12, 5], [7, 10], [12, 11], [19, 3]]) prop(x, y, 1252);
    if (phase === 'wrestling') {
      parent.add(scene.add.image(700, 506, 'angel_alien').setScale(.55).setTint(0xffedb0));
    }

    // 兄エサウと400人の手勢（追っ手）
    const soldiers = [
      { x: 55, y: 460, f: 487 },
      { x: 55, y: 550, f: 325 },
    ];
    soldiers.forEach((p, idx) => {
      const soldier = scene.add.image(p.x, p.y, 'roguelike_characters', p.f).setScale(3.6).setTint(0xcfa888);
      parent.add(soldier);
      scene.tweens.add({
        targets: soldier,
        x: p.x + 4,
        duration: 480 + idx * 80,
        yoyo: true,
        repeat: -1
      });
    });

    // 兄エサウ（赤毛の屈強な狩人・長子の猛将）
    const esau = scene.add.image(135, 505, 'roguelike_characters', 379).setScale(4.2).setTint(0xffd5b5);
    parent.add(esau);
    scene.tweens.add({ targets: esau, x: 141, duration: 650, yoyo: true, repeat: -1 });

    const esauBg = scene.add.rectangle(135, 442, 90, 26, 0x4a1814, 0.92).setStrokeStyle(1, 0xd26850);
    const esauTxt = scene.add.text(135, 442, '兄エサウ', {
      ...TEXT_STYLE,
      fontSize: '13px', color: '#ffd0b0', fontStyle: 'bold'
    }).setOrigin(0.5);
    esauBg.setSize(esauTxt.width + 12, esauTxt.height + 4);
    parent.add([esauBg, esauTxt]);

    const armyBg = scene.add.rectangle(70, 410, 120, 22, 0x221111, 0.88).setStrokeStyle(1, 0x884433);
    const armyTxt = scene.add.text(70, 410, 'エサウの軍勢（400人）', {
      ...TEXT_STYLE,
      fontSize: '11px', color: '#d0aaaa'
    }).setOrigin(0.5);
    armyBg.setSize(armyTxt.width + 8, armyTxt.height + 4);
    parent.add([armyBg, armyTxt]);
  } else if (phase === 'sold') {
    fill(0, 0, 20, 12, FRAMES.sand);
    art.patch(0, 7, 20, 4, 'earth', 0xd4bf9a);
    art.ridge(20, 0xc4b595);
    for (const [x, y] of [[0, 1], [1, 2], [2, 1], [4, 0], [7, 3], [9, 1], [13, 0], [17, 2], [18, 1], [19, 3], [0, 10], [17, 11]]) prop(x, y, FRAMES.rock, 4);
    for (const [x, y] of [[0, 4], [5, 1], [13, 3], [18, 6], [3, 11]]) {
      tile(x, y, 540);
      tile(x, y + 1, 597);
    }
    // 幕営はパックに含まれるテントの上下左右4枚を組み合わせる。
    for (const x of [10, 14]) {
      tile(x, 3, 618); tile(x + 1, 3, 619);
      tile(x, 4, 675); tile(x + 1, 4, 676);
      prop(x + 2, 5, FRAMES.barrel);
      prop(x, 5, FRAMES.sack);
    }
    patch(2, 4, 3, 3, 697);
    tile(3, 5, 425);
    prop(2, 6, FRAMES.barrel);
    prop(5, 6, FRAMES.sack);
    fence(9, 6, 8);
    for (const [x, y] of [[10, 5], [12, 5], [16, 5]]) prop(x, y, FRAMES.crate);
    person(679, 502, 325); person(732, 520, 486); person(775, 500, 379);
  } else if (phase === 'dream') {
    fill(0, 0, 20, 12, FRAMES.paving);
    art.facade(0, 0, 20, 5, 0xf2deb4);
    art.terrace(0, 5, 20, 7, 0xe4d7bc);
    for (const x of [2, 6, 11, 17]) {
      tile(x, 2, 158); tile(x, 3, 215);
    }
    for (const x of [4, 9, 15]) {
      tile(x, 1, 50); tile(x, 2, 107); tile(x, 3, 164);
    }
    patch(12, 5, 5, 7, 409);
    patch(12, 4, 5, 3, 697);
    tile(14, 5, FRAMES.stool);
    for (const x of [1, 5, 18]) {
      tile(x, 5, 1096); tile(x, 6, 1153);
    }
    for (const x of [11, 17]) {
      prop(x, 5, FRAMES.brazier);
      prop(x, 7, 475);
      art.glow(x, 5, 0xffd294, 2);
    }
    for (const x of [7, 8]) tile(x, 5, 361);
    prop(7, 5, 898); prop(8, 5, 900);
    person(696, 377, 486);
    person(525, 443, 325); person(856, 443, 325);
  } else {
    const reunion = phase === 'complete';
    fill(0, 0, 20, 12, reunion ? FRAMES.grass : FRAMES.sand);
    art.terrace(0, 7, 20, 5, 0xe4d7bb);
    art.patch(7, 7, 7, 5, 'stone', 0xf1e4c9);
    building(1, 1, 6); building(8, 1, 5); building(14, 1, 5);
    for (const [x, y] of [[1, 6], [2, 6], [4, 6], [5, 6], [9, 6], [10, 6], [15, 6], [16, 6]]) prop(x, y, FRAMES.sack);
    for (const [x, y] of [[0, 6], [6, 6], [13, 6], [19, 6]]) prop(x, y, FRAMES.barrel);
    for (const [x, y] of [[1, 9], [2, 9], [17, 9], [18, 9]]) prop(x, y, FRAMES.crate);
    tile(17, 10, 361); tile(18, 10, 361);
    prop(17, 10, 240); prop(18, 10, 239);
    if (reunion) {
      for (const x of [0, 6, 13, 19]) tree(x, 4);
      for (const x of [0, 3, 16, 19]) {
        prop(x, 10, 595);
        prop(x, 11, 652);
      }
      patch(8, 8, 6, 3, 409);
      for (let i = 0; i < 5; i++) person(445 + i * 50, 529 + Math.abs(i - 2) * 12, [325, 486, 379][i % 3]);
    } else {
      person(683, 502, 325); person(730, 520, 486); person(775, 500, 379);
    }
  }
}
