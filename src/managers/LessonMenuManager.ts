import Phaser from 'phaser';
import type { LessonData } from '../utils/types';
import type { PanelRect } from '../utils/layout';

export type LessonMenuOrientation = 'vertical' | 'horizontal';

export interface LessonMenuOptions {
  rect: PanelRect;
  // Vertical menu sits in the left landscape column; horizontal menu sits
  // in the top portrait bar.
  orientation: LessonMenuOrientation;
  lessons: LessonData[];
  selectedLessonId: number;
  onSelect: (lessonId: number) => void;
}

const ACTIVE_COLOR = '#FFD24A';
const INACTIVE_COLOR = '#BBBBBB';
const HOVER_COLOR = '#FFFFFF';

export class LessonMenuManager {
  private scene: Phaser.Scene;
  private items: Phaser.GameObjects.Text[] = [];
  private selectedId: number = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  render(opts: LessonMenuOptions): void {
    this.destroy();
    this.selectedId = opts.selectedLessonId;

    if (opts.orientation === 'vertical') {
      this.renderVertical(opts);
    } else {
      this.renderHorizontal(opts);
    }

    for (const item of this.items) {
      item.on('pointerdown', () => {
        const id = item.getData('lessonId') as number;
        opts.onSelect(id);
      });
    }
  }

  setSelected(lessonId: number): void {
    this.selectedId = lessonId;
    for (const item of this.items) {
      const id = (item.getData('lessonId') as number) | 0;
      item.setColor(id === lessonId ? ACTIVE_COLOR : INACTIVE_COLOR);
    }
  }

  destroy(): void {
    for (const t of this.items) t.destroy();
    this.items = [];
  }

  private renderVertical(opts: LessonMenuOptions): void {
    const cx = opts.rect.x + opts.rect.width / 2;
    let y = opts.rect.y + 60;
    for (const lesson of opts.lessons) {
      const t = this.makeItem(lesson, cx, y);
      this.items.push(t);
      y += 56;
    }
  }

  private renderHorizontal(opts: LessonMenuOptions): void {
    const count = opts.lessons.length;
    if (count === 0) return;
    const slotWidth = opts.rect.width / count;
    const height = opts.rect.height ?? 60;
    const cy = opts.rect.y + height / 2;
    for (let i = 0; i < count; i++) {
      const cx = opts.rect.x + slotWidth * (i + 0.5);
      const t = this.makeItem(opts.lessons[i], cx, cy);
      this.items.push(t);
    }
  }

  private makeItem(
    lesson: LessonData,
    x: number,
    y: number
  ): Phaser.GameObjects.Text {
    const isActive = lesson.id === this.selectedId;
    const t = this.scene.add.text(x, y, lesson.name, {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
      align: 'center',
      padding: { x: 8, y: 4 }
    });
    t.setOrigin(0.5, 0.5);
    t.setData('lessonId', lesson.id);
    t.setInteractive({ useHandCursor: true });
    t.on('pointerover', () => {
      if (lesson.id !== this.selectedId) t.setColor(HOVER_COLOR);
    });
    t.on('pointerout', () => {
      if (lesson.id !== this.selectedId) t.setColor(INACTIVE_COLOR);
    });
    return t;
  }

}
