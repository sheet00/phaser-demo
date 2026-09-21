import { TEXT_STYLE } from '../typography';
import Phaser from 'phaser';

export function createEdenUI(scene: Phaser.Scene) {
  // 接近時アクションフキダシ（可変幅・対象名連動）
  const promptBubble = scene.add.container(0, 0).setDepth(5000);
  promptBubble.setVisible(false);

  const promptBubbleBg = scene.add.rectangle(0, 0, 220, 44, 0x0a0a0a, 0.92).setStrokeStyle(2, 0xf1c40f);
  const promptBubbleText = scene.add.text(0, 0, 'SPACE: 調べる', {
    ...TEXT_STYLE,
    fontSize: '17px',
    color: '#ffffff',
    fontStyle: 'bold',
    padding: { top: 6, bottom: 4, left: 4, right: 4 }
  }).setOrigin(0.5);
  promptBubble.add([promptBubbleBg, promptBubbleText]);

  const hudX = 24;
  const hudY = 100;
  const hudWidth = 450;
  const hudHeight = 224;

  const hudBg = scene.add.rectangle(hudX, hudY, hudWidth, hudHeight, 0x110f0d, 0.94)
    .setOrigin(0, 0)
    .setStrokeStyle(3, 0x27ae60)
    .setScrollFactor(0).setDepth(6000);

  const hudTitle = scene.add.text(hudX + 20, hudY + 16, '第1章：エデンの園（創世記）', {
    ...TEXT_STYLE,
    fontSize: '22px',
    color: '#2ecc71',
    fontStyle: 'bold',
    padding: { top: 6, bottom: 4, left: 4, right: 4 }
  }).setScrollFactor(0).setDepth(6000);

  const hudChar = scene.add.text(hudX + 20, hudY + 54, '操作キャラ: 最初の人間 アダム', {
    ...TEXT_STYLE,
    fontSize: '16px',
    color: '#ecf0f1',
    padding: { top: 5, bottom: 4, left: 4, right: 4 }
  }).setScrollFactor(0).setDepth(6000);

  scene.add.text(hudX + 20, hudY + 94, '神からの司令', {
    ...TEXT_STYLE,
    fontSize: '19px',
    color: '#e5c77e',
    fontStyle: 'bold',
    padding: { top: 6, bottom: 4 }
  }).setScrollFactor(0).setDepth(6000);

  const hudCommandText = scene.add.text(hudX + 20, hudY + 132, '', {
    ...TEXT_STYLE,
    fontSize: '17px',
    color: '#f3e6c6',
    lineSpacing: 8,
    wordWrap: { width: hudWidth - 48 },
    padding: { top: 6, bottom: 4, left: 4, right: 4 }
  }).setScrollFactor(0).setDepth(6000);

  scene.add.existing(hudBg);
  scene.add.existing(hudTitle);
  scene.add.existing(hudChar);
  scene.add.existing(hudCommandText);

  const dialogueContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(6000);
  dialogueContainer.setVisible(false);

  const { width, height } = scene.scale;
  const boxWidth = Math.min(1050, width - 48);
  const boxHeight = 230;
  const boxX = width / 2;
  const boxY = height - boxHeight / 2 - 24;

  const dBoxBg = scene.add.rectangle(boxX, boxY, boxWidth, boxHeight, 0x0e0b08, 0.96)
    .setStrokeStyle(4, 0x27ae60);

  const dialogueSpeakerText = scene.add.text(boxX - boxWidth / 2 + 32, boxY - boxHeight / 2 + 20, '', {
    ...TEXT_STYLE,
    fontSize: '20px',
    color: '#2ecc71',
    fontStyle: 'bold',
    padding: { top: 8, bottom: 4, left: 4, right: 4 }
  });

  const dialogueBodyText = scene.add.text(boxX - boxWidth / 2 + 32, boxY - boxHeight / 2 + 66, '', {
    ...TEXT_STYLE,
    fontSize: '19px',
    color: '#ffffff',
    lineSpacing: 8,
    wordWrap: { width: boxWidth - 64 },
    padding: { top: 8, bottom: 6, left: 4, right: 4 }
  });

  const dNextHint = scene.add.text(boxX + boxWidth / 2 - 28, boxY + boxHeight / 2 - 24, '▼ SPACE / クリックで閉じる', {
    ...TEXT_STYLE,
    fontSize: '16px',
    color: '#f39c12',
    fontStyle: 'bold',
    padding: { top: 5, bottom: 4, left: 4, right: 4 }
  }).setOrigin(1, 1);

  dialogueContainer.add([dBoxBg, dialogueSpeakerText, dialogueBodyText, dNextHint]);
  return { promptBubble, promptBubbleBg, promptBubbleText, hudCommandText, dialogueContainer, dialogueSpeakerText, dialogueBodyText, dNextHint };
}
