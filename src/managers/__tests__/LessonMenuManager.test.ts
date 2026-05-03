import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', async () => {
  const mock = await import('../../test-utils/phaserMock');
  return { default: mock.default };
});

import { LessonMenuManager } from '../LessonMenuManager';
import { createSceneStub } from '../../test-utils/phaserMock';
import type { LessonData } from '../../utils/types';

const lessons: LessonData[] = [
  { id: 1, name: 'Lesson 1', sentences: [] },
  { id: 2, name: 'Lesson 2', sentences: [] },
  { id: 3, name: 'Lesson 3', sentences: [] }
];

function getItemTexts(stub: any) {
  return (stub.add.text as any).mock.calls
    .map((c: any[]) => c[2])
    .filter((t: any) => typeof t === 'string');
}

function getItemStubs(stub: any) {
  return (stub.add.text as any).mock.results.map((r: any) => r.value);
}

describe('LessonMenuManager', () => {
  let stub: any;

  beforeEach(() => {
    stub = createSceneStub();
  });

  it('vertical layout renders one label per lesson (no heading)', () => {
    const menu = new LessonMenuManager(stub as any);
    menu.render({
      rect: { x: 0, y: 0, width: 128 },
      orientation: 'vertical',
      lessons,
      selectedLessonId: 1,
      onSelect: () => {}
    });
    const texts = getItemTexts(stub);
    expect(texts).not.toContain('LESSONS');
    expect(texts).toContain('Lesson 1');
    expect(texts).toContain('Lesson 2');
    expect(texts).toContain('Lesson 3');
  });

  it('horizontal layout renders just the lesson labels (no heading)', () => {
    const menu = new LessonMenuManager(stub as any);
    menu.render({
      rect: { x: 0, y: 0, width: 896, height: 60 } as any,
      orientation: 'horizontal',
      lessons,
      selectedLessonId: 1,
      onSelect: () => {}
    });
    const texts = getItemTexts(stub);
    expect(texts).not.toContain('LESSONS');
    expect(texts.filter((t: string) => /Lesson \d/.test(t))).toHaveLength(3);
  });

  it('the selected lesson is rendered in the active color', () => {
    const menu = new LessonMenuManager(stub as any);
    menu.render({
      rect: { x: 0, y: 0, width: 128 },
      orientation: 'vertical',
      lessons,
      selectedLessonId: 2,
      onSelect: () => {}
    });
    const items = getItemStubs(stub);
    const lesson2Call = (stub.add.text as any).mock.calls.findIndex(
      (c: any[]) => c[2] === 'Lesson 2'
    );
    const styleArg = (stub.add.text as any).mock.calls[lesson2Call][3];
    expect(styleArg.color).toBe('#FFD24A');
    // Lesson 1 should be inactive
    const lesson1Call = (stub.add.text as any).mock.calls.findIndex(
      (c: any[]) => c[2] === 'Lesson 1'
    );
    const inactiveStyle = (stub.add.text as any).mock.calls[lesson1Call][3];
    expect(inactiveStyle.color).toBe('#BBBBBB');
    expect(items.length).toBeGreaterThan(0);
  });

  it('clicking a lesson label invokes onSelect with that lesson id', () => {
    const onSelect = vi.fn();
    const menu = new LessonMenuManager(stub as any);
    menu.render({
      rect: { x: 0, y: 0, width: 128 },
      orientation: 'vertical',
      lessons,
      selectedLessonId: 1,
      onSelect
    });
    // Find the Lesson 3 stub and emit pointerdown on it.
    const lesson3 = getItemStubs(stub).find(
      (t: any) => t.text === 'Lesson 3'
    );
    expect(lesson3).toBeDefined();
    lesson3._emit('pointerdown');
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('setSelected swaps the active highlight without re-rendering', () => {
    const menu = new LessonMenuManager(stub as any);
    menu.render({
      rect: { x: 0, y: 0, width: 128 },
      orientation: 'vertical',
      lessons,
      selectedLessonId: 1,
      onSelect: () => {}
    });
    const lesson1 = getItemStubs(stub).find((t: any) => t.text === 'Lesson 1');
    const lesson2 = getItemStubs(stub).find((t: any) => t.text === 'Lesson 2');
    menu.setSelected(2);
    // setColor was called twice (once per item) by setSelected.
    expect(lesson1.setColor).toHaveBeenCalledWith('#BBBBBB');
    expect(lesson2.setColor).toHaveBeenCalledWith('#FFD24A');
  });

  it('destroy() cleans up all item texts and the heading', () => {
    const menu = new LessonMenuManager(stub as any);
    menu.render({
      rect: { x: 0, y: 0, width: 128 },
      orientation: 'vertical',
      lessons,
      selectedLessonId: 1,
      onSelect: () => {}
    });
    const items = getItemStubs(stub);
    menu.destroy();
    for (const item of items) {
      expect(item.destroy).toHaveBeenCalled();
    }
  });
});
