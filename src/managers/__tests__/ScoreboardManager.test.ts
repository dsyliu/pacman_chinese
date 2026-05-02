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

  it('horizontal layout places SCORE on the left and CONTROLS on the right', () => {
    const scene = createSceneStub();
    new ScoreboardManager(scene).render(0, 896, 'keyboard', 0, 'horizontal');

    const find = (label: string) =>
      (scene.add.text as any).mock.calls.find((c: any[]) => c[2] === label);

    const score = find('SCORE');
    const controls = find('CONTROLS');
    expect(score, 'SCORE missing').toBeDefined();
    expect(controls, 'CONTROLS missing').toBeDefined();
    expect(score![0]).toBeLessThan(controls![0]);
  });

  it('horizontal layout: SCORE label and CONTROLS label share the same y baseline (single horizontal band)', () => {
    const scene = createSceneStub();
    new ScoreboardManager(scene).render(0, 896, 'keyboard', 0, 'horizontal');
    const find = (label: string) =>
      (scene.add.text as any).mock.calls.find((c: any[]) => c[2] === label);
    const score = find('SCORE');
    const controls = find('CONTROLS');
    expect(score![1]).toBe(controls![1]);
  });

  it('horizontal layout: SCORE, Played, Won, Lost, CONTROLS labels are all on the same row (same y)', () => {
    const scene = createSceneStub();
    new ScoreboardManager(scene).render(0, 896, 'keyboard', 0, 'horizontal');
    const calls = (scene.add.text as any).mock.calls as Array<any[]>;
    const find = (label: string) => calls.find(c => c[2] === label);

    const score = find('SCORE');
    const played = find('Played');
    const won = find('Won');
    const lost = find('Lost');
    const controls = find('CONTROLS');
    expect(score, 'SCORE missing').toBeDefined();
    expect(played, 'Played missing').toBeDefined();
    expect(won, 'Won missing').toBeDefined();
    expect(lost, 'Lost missing').toBeDefined();
    expect(controls, 'CONTROLS missing').toBeDefined();

    expect(played![1]).toBe(score![1]);
    expect(won![1]).toBe(score![1]);
    expect(lost![1]).toBe(score![1]);
    expect(controls![1]).toBe(score![1]);
  });

  it('horizontal layout: numeric values share a single row directly below the labels', () => {
    const scene = createSceneStub();
    new ScoreboardManager(scene).render(0, 896, 'keyboard', 0, 'horizontal');
    const calls = (scene.add.text as any).mock.calls as Array<any[]>;
    const findLabel = (label: string) => calls.find(c => c[2] === label);

    const labelY = findLabel('SCORE')![1];
    const zeros = calls.filter(c => c[2] === '0');
    expect(zeros.length).toBeGreaterThanOrEqual(4); // score + played + won + lost
    const valueYs = new Set(zeros.map(c => c[1]));
    expect(valueYs.size).toBe(1);
    expect([...valueYs][0]).toBeGreaterThan(labelY);
  });

  it('horizontal layout: labels arrange left-to-right in order Score, Played, Won, Lost, Controls', () => {
    const scene = createSceneStub();
    new ScoreboardManager(scene).render(0, 896, 'keyboard', 0, 'horizontal');
    const calls = (scene.add.text as any).mock.calls as Array<any[]>;
    const findLabel = (label: string) => calls.find(c => c[2] === label);

    const scoreX = findLabel('SCORE')![0];
    const playedX = findLabel('Played')![0];
    const wonX = findLabel('Won')![0];
    const lostX = findLabel('Lost')![0];
    const controlsX = findLabel('CONTROLS')![0];
    expect(scoreX).toBeLessThan(playedX);
    expect(playedX).toBeLessThan(wonX);
    expect(wonX).toBeLessThan(lostX);
    expect(lostX).toBeLessThan(controlsX);
  });

  it('horizontal layout places Played, Won, Lost labels on the same row, in order', () => {
    const scene = createSceneStub();
    new ScoreboardManager(scene).render(0, 896, 'keyboard', 0, 'horizontal');

    const calls = (scene.add.text as any).mock.calls as Array<any[]>;
    const played = calls.find(c => c[2] === 'Played');
    const won = calls.find(c => c[2] === 'Won');
    const lost = calls.find(c => c[2] === 'Lost');
    expect(played).toBeDefined();
    expect(won).toBeDefined();
    expect(lost).toBeDefined();

    expect(played![1]).toBe(won![1]);
    expect(won![1]).toBe(lost![1]);
    expect(played![0]).toBeLessThan(won![0]);
    expect(won![0]).toBeLessThan(lost![0]);
  });

  it('horizontal layout uses substantially less vertical space than vertical', () => {
    const sceneV = createSceneStub();
    new ScoreboardManager(sceneV).render(0, 896, 'keyboard', 0, 'vertical');
    const sceneH = createSceneStub();
    new ScoreboardManager(sceneH).render(0, 896, 'keyboard', 0, 'horizontal');

    const ysV = (sceneV.add.text as any).mock.calls.map((c: any[]) => c[1]);
    const ysH = (sceneH.add.text as any).mock.calls.map((c: any[]) => c[1]);
    const spanV = Math.max(...ysV) - Math.min(...ysV);
    const spanH = Math.max(...ysH) - Math.min(...ysH);

    expect(spanH).toBeLessThan(spanV * 0.5);
  });

  it('horizontal layout renders Played/Won/Lost as standalone labels (separate from numeric values)', () => {
    const scene = createSceneStub();
    new ScoreboardManager(scene).render(0, 896, 'keyboard', 0, 'horizontal');
    const labels = (scene.add.text as any).mock.calls.map((c: any[]) => c[2]);
    expect(labels).toContain('Played');
    expect(labels).toContain('Won');
    expect(labels).toContain('Lost');
    // No combined "Label: value" texts.
    expect(labels.every((t: string) => !/Played:\s*\d/.test(t))).toBe(true);
  });

  it('vertical layout still uses separate Played/Won/Lost labels (landscape unchanged)', () => {
    const scene = createSceneStub();
    new ScoreboardManager(scene).render(0, 896, 'keyboard', 0, 'vertical');
    const labels = (scene.add.text as any).mock.calls.map((c: any[]) => c[2]);
    expect(labels).toContain('Played');
    expect(labels).toContain('Won');
    expect(labels).toContain('Lost');
  });

  it('horizontal layout updates the numeric value texts on recordWin / recordLoss / addPoints', () => {
    const scene = createSceneStub();
    const mgr = new ScoreboardManager(scene);
    mgr.render(0, 896, 'keyboard', 0, 'horizontal');

    mgr.addPoints(7);
    mgr.recordWin();
    mgr.recordLoss();

    const valueTexts = (scene.add.text as any).mock.results.map((r: any) => r.value.text);
    // score=7, played=2, won=1, lost=1 — all as plain numerics now.
    expect(valueTexts).toContain('7');
    expect(valueTexts).toContain('2');
    expect(valueTexts.filter((t: string) => t === '1').length).toBeGreaterThanOrEqual(2);
  });

  it('panelY shifts every text element by the same offset (so portrait can place the panel below the maze)', () => {
    const sceneTop = createSceneStub();
    new ScoreboardManager(sceneTop).render(0, 896, 'keyboard', 0);
    const sceneBelow = createSceneStub();
    new ScoreboardManager(sceneBelow).render(0, 896, 'keyboard', 1140);

    const findCall = (scene: any, label: string) =>
      (scene.add.text as any).mock.calls.find((c: any[]) => c[2] === label);

    for (const label of ['SCORE', 'STATS', 'Played', 'Won', 'Lost', 'HOW TO PLAY', 'CONTROLS']) {
      const top = findCall(sceneTop, label);
      const below = findCall(sceneBelow, label);
      expect(top, `top scene missing ${label}`).toBeDefined();
      expect(below, `below scene missing ${label}`).toBeDefined();
      expect(below[1] - top[1]).toBe(1140);
    }
  });
});
