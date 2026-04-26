import { describe, it, expect, beforeEach } from 'vitest';
import { SentenceManager } from '../SentenceManager';
import { createSceneStub } from '../../test-utils/phaserMock';
import type { LevelData } from '../../utils/types';

const level: LevelData = {
  id: 1,
  sentence: '我_你',
  blanks: [1],
  correctChars: ['愛'],
  wrongChars: ['恨'],
  translation: 'I love you'
};

const twoBlankLevel: LevelData = {
  id: 2,
  sentence: 'a b c',
  blanks: [0, 4],
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
    const sentenceText = created.find((t: any) => t.text.includes('□'));
    const translationText = created.find((t: any) => t.text.includes('I love you'));
    expect(sentenceText).toBeDefined();
    expect(translationText).toBeDefined();
  });

  it('strips literal underscores from the displayed sentence', () => {
    mgr.initialize(level);
    const created = lastTexts(scene);
    const sentenceText = created.find((t: any) => t.text.includes('□'));
    expect(sentenceText.text).not.toContain('_');
  });

  it('renders blanks as □ when nothing has been collected', () => {
    mgr.initialize(level);
    const created = lastTexts(scene);
    const sentenceText = created.find((t: any) => t.text.includes('□'));
    expect(sentenceText.text).toBe('我□你');
  });

  it('collectCharacter fills the matching blank', () => {
    mgr.initialize(level);
    mgr.collectCharacter('愛', 0);
    const created = lastTexts(scene);
    const filled = created[created.length - 2];
    expect(filled.text).toBe('我愛你');
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
});
