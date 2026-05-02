import { describe, it, expect, beforeEach } from 'vitest';
import { SentenceManager } from '../SentenceManager';
import { createSceneStub } from '../../test-utils/phaserMock';
import { BOARD_PIXEL_WIDTH } from '../../entities/Maze';
import type { LevelData } from '../../utils/types';

const level: LevelData = {
  id: 1,
  sentence: '我 你',
  correctChars: ['愛'],
  wrongChars: ['恨'],
  translation: 'I love you'
};

const twoBlankLevel: LevelData = {
  id: 2,
  sentence: ' b c d ',
  correctChars: ['X', 'Y'],
  wrongChars: [],
  translation: 'two blanks'
};

function lastTexts(scene: any): any[] {
  return (scene.add.text as any).mock.results.map((r: any) => r.value);
}

describe('SentenceManager', () => {
  let scene: any;
  let mgr: SentenceManager;

  beforeEach(() => {
    scene = createSceneStub();
    mgr = new SentenceManager(scene);
  });

  it('initialize draws sentence and translation text', () => {
    mgr.initialize(level);
    const created = lastTexts(scene);
    const sentenceText = created.find((t: any) => t.text.includes('?'));
    const translationText = created.find((t: any) => t.text.includes('I love you'));
    expect(sentenceText).toBeDefined();
    expect(translationText).toBeDefined();
  });

  it('derives blank positions from spaces in the sentence', () => {
    mgr.initialize(twoBlankLevel);
    const created = lastTexts(scene);
    const sentenceText = created.find((t: any) => t.text.includes('?'));
    // ' b c d ' has spaces at indices 0, 2, 4, 6 — but only the leading and
    // trailing positions are meaningful (correctChars has length 2). The
    // helper returns all space indices; SentenceManager fills the first
    // collected.length and shows '?' for the rest.
    expect((sentenceText.text.match(/\?/g) || []).length).toBe(4);
  });

  it('renders blanks as ? with surrounding spaces when nothing has been collected', () => {
    mgr.initialize(level);
    const created = lastTexts(scene);
    const sentenceText = created.find((t: any) => t.text.includes('?'));
    expect(sentenceText.text).toBe('我 ? 你');
  });

  it('collectCharacter fills the matching blank', () => {
    mgr.initialize(level);
    mgr.collectCharacter('愛', 0);
    const created = lastTexts(scene);
    const filled = created[created.length - 2];
    expect(filled.text).toBe('我 愛 你');
    expect(mgr.isComplete()).toBe(true);
  });

  it('isComplete is false until all correctChars are collected', () => {
    mgr.initialize(twoBlankLevel);
    expect(mgr.isComplete()).toBe(false);
    mgr.collectCharacter('X', 0);
    expect(mgr.isComplete()).toBe(false);
    mgr.collectCharacter('Y', 1);
    expect(mgr.isComplete()).toBe(true);
  });

  it('getCollectedChars returns a defensive copy', () => {
    mgr.initialize(level);
    mgr.collectCharacter('愛', 0);
    const snap = mgr.getCollectedChars();
    snap.push({ char: 'Z', blankIndex: 5 });
    expect(mgr.getCollectedChars()).toHaveLength(1);
  });

  it('initialize on a second level discards prior collected characters', () => {
    mgr.initialize(level);
    mgr.collectCharacter('愛', 0);
    mgr.initialize(twoBlankLevel);
    expect(mgr.getCollectedChars()).toEqual([]);
    expect(mgr.isComplete()).toBe(false);
  });

  it('isComplete returns false before any level is initialized', () => {
    expect(mgr.isComplete()).toBe(false);
  });

  it('sentence and translation are centered on the maze midpoint, not the canvas midpoint', () => {
    // Simulate the production canvas being wider than the maze so that
    // the test would fail if the centering ever regresses to cameras.main.width / 2.
    scene.cameras.main.width = BOARD_PIXEL_WIDTH + 256;
    mgr.initialize(level);

    const calls = (scene.add.text as any).mock.calls as Array<any[]>;
    const sentenceCall = calls.find(c => typeof c[2] === 'string' && c[2].includes('?'));
    const translationCall = calls.find(c => typeof c[2] === 'string' && c[2].includes('I love you'));

    expect(sentenceCall![0]).toBe(BOARD_PIXEL_WIDTH / 2);
    expect(translationCall![0]).toBe(BOARD_PIXEL_WIDTH / 2);
  });
});
