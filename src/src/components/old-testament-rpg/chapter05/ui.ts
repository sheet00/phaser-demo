export { FONT_FAMILY } from '../typography';
import { FONT_FAMILY } from '../typography';
import Phaser from 'phaser';


export function textStyle(size = 17, color = '#ffffff'): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, resolution: 3, padding: { top: 6, bottom: 4, left: 4, right: 4 } };
}

export class ExodusHud {
  private root: Phaser.GameObjects.Container;
  private header: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;
  private objective: Phaser.GameObjects.Text;
  private progress: Phaser.GameObjects.Text;
  private action: Phaser.GameObjects.Text;
  private dialogue: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Rectangle;
  private speaker: Phaser.GameObjects.Text;
  private body: Phaser.GameObjects.Text;
  private next: Phaser.GameObjects.Text;
  private width = 960;
  private height = 720;

  constructor(scene: Phaser.Scene, onAction: () => void, onAdvance: () => void) {
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);
    this.header = scene.add.rectangle(0, 0, 100, 100, 0x101c2d, .96).setOrigin(0).setStrokeStyle(1, 0xc6aa6b);
    this.title = scene.add.text(0, 0, '第5章  出エジプトと十戒', { ...textStyle(20, '#efd18c'), fontStyle: 'bold' });
    this.objective = scene.add.text(0, 0, '', textStyle());
    this.progress = scene.add.text(0, 0, '', textStyle(14, '#b9d8e8'));
    this.action = scene.add.text(0, 0, '', {
      ...textStyle(15, '#fff0c2'), backgroundColor: '#15283c', align: 'center',
      padding: { top: 10, bottom: 10, left: 14, right: 14 },
    }).setOrigin(.5, 1).setInteractive({ useHandCursor: true });
    this.action.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onAction();
    });
    this.dialogue = scene.add.container(0, 0).setVisible(false);
    this.panel = scene.add.rectangle(0, 0, 100, 100, 0x101c2d, .98).setOrigin(0).setStrokeStyle(2, 0xc6aa6b);
    this.speaker = scene.add.text(0, 0, '', { ...textStyle(20, '#efd18c'), fontStyle: 'bold' });
    this.body = scene.add.text(0, 0, '', { ...textStyle(18), lineSpacing: 6, padding: { top: 8, bottom: 6, left: 4, right: 4 } });
    this.next = scene.add.text(0, 0, 'SPACE / タップで次へ', textStyle(14, '#efd18c')).setOrigin(1, 1);
    this.panel.setInteractive().on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onAdvance();
    });
    this.dialogue.add([this.panel, this.speaker, this.body, this.next]);
    this.root.add([this.header, this.title, this.objective, this.progress, this.action, this.dialogue]);
    this.resize(scene.scale.width, scene.scale.height);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const left = Math.max(8, (width - 1000) / 2);
    const contentWidth = Math.min(1000, width - 16);
    this.title.setPosition(left + 12, 12).setFontSize(width < 500 ? 18 : 20);
    this.objective.setPosition(left + 12, 49).setWordWrapWidth(contentWidth - 24);
    this.progress.setPosition(left + 12, 54 + this.objective.height);
    this.header.setPosition(left, 6).setSize(contentWidth, 58 + this.objective.height + this.progress.height);
    this.action.setPosition(width / 2, height - 12).setWordWrapWidth(Math.max(100, width - 64));
    this.layoutDialogue();
  }

  private layoutDialogue() {
    const width = Math.min(920, this.width - 24);
    const left = (this.width - width) / 2;
    this.body.setFontSize(this.width < 500 ? 16 : 18).setWordWrapWidth(width - 32);
    const height = this.body.height + 94;
    const top = Math.max(8, this.height - height - 12);
    this.panel.setPosition(left, top).setSize(width, height);
    this.speaker.setPosition(left + 12, top + 8);
    this.body.setPosition(left + 12, top + 46);
    this.next.setPosition(left + width - 12, top + height - 8);
  }

  setObjective(text: string) {
    this.objective.setText(text);
    this.resize(this.width, this.height);
  }

  setProgress(text: string) {
    if (this.progress.text !== text) this.progress.setText(text);
  }

  setAction(text: string) { this.action.setText(text); }

  showDialogue(speaker: string, body: string) {
    this.speaker.setText(speaker);
    this.body.setText(body);
    this.dialogue.setVisible(true);
    this.action.setVisible(false);
    this.layoutDialogue();
  }

  hideDialogue() {
    this.dialogue.setVisible(false);
    this.action.setVisible(true);
  }
}
