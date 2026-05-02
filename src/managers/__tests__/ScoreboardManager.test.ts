import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreboardManager } from '../ScoreboardManager';
import { createSceneStub } from '../../test-utils/phaserMock';

const STORAGE_KEY = 'pacman_chinese.scoreboard.v1';

function lastTexts(scene: any): any[] {
  return (scene.add.text as any).mock.results.map((r: any) => r.value);
}

describe('ScoreboardManager', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('starts with zero played, won, lost, points when no prior session', () => {
    const mgr = new ScoreboardManager(createSceneStub());
    expect(mgr.getStats()).toEqual({ played: 0, won: 0, lost: 0, points: 0 });
  });

  it('recordWin increments won and played', () => {
    const mgr = new ScoreboardManager(createSceneStub());
    mgr.recordWin();
    mgr.recordWin();
    expect(mgr.getStats()).toMatchObject({ played: 2, won: 2, lost: 0 });
  });

  it('recordLoss increments lost and played', () => {
    const mgr = new ScoreboardManager(createSceneStub());
    mgr.recordLoss();
    expect(mgr.getStats()).toMatchObject({ played: 1, won: 0, lost: 1 });
  });

  it('addPoints adds the given amount to points', () => {
    const mgr = new ScoreboardManager(createSceneStub());
    mgr.addPoints(1);
    mgr.addPoints(1);
    mgr.addPoints(3);
    expect(mgr.getStats().points).toBe(5);
  });

  it('addWinBonus adds 100 points', () => {
    const mgr = new ScoreboardManager(createSceneStub());
    mgr.addPoints(7);
    mgr.addWinBonus();
    expect(mgr.getStats().points).toBe(107);
  });

  it('persists counters and points across instances within the same session', () => {
    const first = new ScoreboardManager(createSceneStub());
    first.recordWin();
    first.recordLoss();
    first.recordWin();
    first.addPoints(15);
    first.addWinBonus();

    const second = new ScoreboardManager(createSceneStub());
    expect(second.getStats()).toEqual({ played: 3, won: 2, lost: 1, points: 115 });
  });

  it('treats a missing or malformed storage entry as zero', () => {
    sessionStorage.setItem(STORAGE_KEY, 'not-json');
    const mgr = new ScoreboardManager(createSceneStub());
    expect(mgr.getStats()).toEqual({ played: 0, won: 0, lost: 0, points: 0 });
  });

  it('render creates SCORE/STATS labels and refresh updates the displayed values', () => {
    const scene = createSceneStub();
    const mgr = new ScoreboardManager(scene);
    mgr.render(896, 256);

    const texts = lastTexts(scene);
    const labels = texts.map((t: any) => t.text);
    expect(labels).toContain('SCORE');
    expect(labels).toContain('STATS');
    expect(labels).toContain('Played');
    expect(labels).toContain('Won');
    expect(labels).toContain('Lost');

    mgr.addPoints(42);
    mgr.recordWin();

    const updated = lastTexts(scene);
    const updatedLabels = updated.map((t: any) => t.text);
    expect(updatedLabels).toContain('42');
  });

  it('render in keyboard mode shows arrow-key controls and a SPACE Restart hint', () => {
    const scene = createSceneStub();
    const mgr = new ScoreboardManager(scene);
    mgr.render(896, 256, 'keyboard');

    const texts = lastTexts(scene);
    const labels = texts.map((t: any) => t.text);
    expect(labels).toContain('HOW TO PLAY');
    expect(labels).toContain('CONTROLS');
    expect(labels.some((t: string) => /SPACE/.test(t) && /Restart/.test(t))).toBe(true);
    expect(labels.some((t: string) => /Move Up/.test(t) && /Move Down/.test(t))).toBe(true);
    expect(labels.some((t: string) => /Move Left/.test(t) && /Move Right/.test(t))).toBe(true);
    expect(labels.every((t: string) => !/Swipe/i.test(t))).toBe(true);
    expect(labels.some((t: string) => /correct/i.test(t) && /blanks/i.test(t))).toBe(true);
  });

  it('render in touch mode hides keyboard arrow text and shows a Tap-to-restart hint (D-pad is drawn by GameScene)', () => {
    const scene = createSceneStub();
    const mgr = new ScoreboardManager(scene);
    mgr.render(896, 256, 'touch');

    const texts = lastTexts(scene);
    const labels = texts.map((t: any) => t.text);
    expect(labels).toContain('HOW TO PLAY');
    expect(labels).toContain('CONTROLS');
    // Touch mode should NOT advertise swipe controls (replaced by the D-pad)
    // or keyboard-only affordances.
    expect(labels.every((t: string) => !/Swipe/i.test(t))).toBe(true);
    expect(labels.every((t: string) => !/SPACE/.test(t))).toBe(true);
    expect(labels.every((t: string) => !/Move Up/.test(t))).toBe(true);
    expect(labels.some((t: string) => /Tap/i.test(t) && /restart/i.test(t))).toBe(true);
  });

  it('render defaults to keyboard mode when input mode is omitted', () => {
    const scene = createSceneStub();
    const mgr = new ScoreboardManager(scene);
    mgr.render(896, 256);

    const labels = lastTexts(scene).map((t: any) => t.text);
    expect(labels.some((t: string) => /SPACE/.test(t) && /Restart/.test(t))).toBe(true);
  });
});
