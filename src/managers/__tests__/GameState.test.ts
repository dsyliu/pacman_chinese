import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../GameState';
import { GameState } from '../../utils/types';

describe('GameStateManager', () => {
  let mgr: GameStateManager;

  beforeEach(() => {
    mgr = new GameStateManager();
  });

  it('starts in MENU state', () => {
    expect(mgr.getState()).toBe(GameState.MENU);
  });

  it('starts with score 0 and no collected characters', () => {
    expect(mgr.getScore()).toBe(0);
    expect(mgr.getCollectedChars()).toEqual([]);
  });

  it('setState changes the current state', () => {
    mgr.setState(GameState.PLAYING);
    expect(mgr.getState()).toBe(GameState.PLAYING);
    mgr.setState(GameState.GAME_OVER);
    expect(mgr.getState()).toBe(GameState.GAME_OVER);
  });

  it('initializeLevel transitions to PLAYING and resets state', () => {
    mgr.collectCharacter('愛', 0);
    mgr.initializeLevel(3);
    expect(mgr.getState()).toBe(GameState.PLAYING);
    expect(mgr.getScore()).toBe(0);
    expect(mgr.getCollectedChars()).toEqual([]);
  });

  it('collectCharacter appends and adds 100 to score per pickup', () => {
    mgr.initializeLevel(3);
    mgr.collectCharacter('愛', 0);
    mgr.collectCharacter('你', 1);
    expect(mgr.getScore()).toBe(200);
    expect(mgr.getCollectedChars()).toEqual([
      { char: '愛', blankIndex: 0 },
      { char: '你', blankIndex: 1 }
    ]);
  });

  it('getCollectedChars returns a copy, not the internal array', () => {
    mgr.initializeLevel(2);
    mgr.collectCharacter('愛', 0);
    const snapshot = mgr.getCollectedChars();
    snapshot.push({ char: 'X', blankIndex: 99 });
    expect(mgr.getCollectedChars()).toHaveLength(1);
  });

  it('isAllCollected reports false until target count is reached', () => {
    mgr.initializeLevel(2);
    expect(mgr.isAllCollected()).toBe(false);
    mgr.collectCharacter('a', 0);
    expect(mgr.isAllCollected()).toBe(false);
    mgr.collectCharacter('b', 1);
    expect(mgr.isAllCollected()).toBe(true);
  });

  it('isAllCollected handles zero-target levels (vacuously true)', () => {
    mgr.initializeLevel(0);
    expect(mgr.isAllCollected()).toBe(true);
  });

  it('reset clears state, collected chars, and score; returns to MENU', () => {
    mgr.initializeLevel(2);
    mgr.collectCharacter('a', 0);
    mgr.setState(GameState.VICTORY);
    mgr.reset();
    expect(mgr.getState()).toBe(GameState.MENU);
    expect(mgr.getScore()).toBe(0);
    expect(mgr.getCollectedChars()).toEqual([]);
    expect(mgr.isAllCollected()).toBe(true);
  });
});
