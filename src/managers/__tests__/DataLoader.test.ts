import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataLoader } from '../DataLoader';

const sampleData = {
  levels: [
    {
      id: 1,
      sentence: '我 你',
      blanks: [1],
      correctChars: ['愛'],
      wrongChars: ['恨', '怕'],
      translation: 'I love you'
    },
    {
      id: 2,
      sentence: '今 好',
      blanks: [1],
      correctChars: ['天'],
      wrongChars: ['月'],
      translation: 'Today is good'
    }
  ]
};

describe('DataLoader', () => {
  beforeEach(() => {
    (DataLoader as any).data = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (DataLoader as any).data = null;
  });

  it('loadData fetches and parses sentences.json on first call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleData
    });
    vi.stubGlobal('fetch', fetchMock);

    const data = await DataLoader.loadData();
    expect(data).toEqual(sampleData);
    expect(fetchMock).toHaveBeenCalledWith('/data/sentences.json');
  });

  it('loadData caches the result and does not fetch twice', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleData
    });
    vi.stubGlobal('fetch', fetchMock);

    await DataLoader.loadData();
    await DataLoader.loadData();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('loadData falls back to a default level when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});

    const data = await DataLoader.loadData();
    expect(data.levels).toHaveLength(1);
    expect(data.levels[0].correctChars).toEqual(['爱']);
    expect(consoleErr).toHaveBeenCalled();
  });

  it('loadData falls back when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
      json: async () => ({})
    }));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const data = await DataLoader.loadData();
    expect(data.levels).toHaveLength(1);
    expect(data.levels[0].id).toBe(1);
  });

  it('getLevel returns null when data has not been loaded', () => {
    expect(DataLoader.getLevel(1)).toBeNull();
  });

  it('getLevel finds a level by id after data is loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleData
    }));
    await DataLoader.loadData();
    expect(DataLoader.getLevel(2)?.translation).toBe('Today is good');
  });

  it('getLevel returns null for an unknown id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleData
    }));
    await DataLoader.loadData();
    expect(DataLoader.getLevel(999)).toBeNull();
  });

  it('getAllLevels returns [] before load and the array after', async () => {
    expect(DataLoader.getAllLevels()).toEqual([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleData
    }));
    await DataLoader.loadData();
    expect(DataLoader.getAllLevels()).toHaveLength(2);
  });
});
