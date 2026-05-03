import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataLoader } from '../DataLoader';

const sampleData = {
  lessons: [
    {
      id: 1,
      name: 'Lesson 1',
      sentences: [
        {
          id: 1,
          sentence: '我 你',
          correctChars: ['愛'],
          wrongChars: ['恨', '怕'],
          translation: 'I love you'
        },
        {
          id: 2,
          sentence: '今 好',
          correctChars: ['天'],
          wrongChars: ['月'],
          translation: 'Today is good'
        }
      ]
    },
    {
      id: 2,
      name: 'Lesson 2',
      sentences: [
        {
          id: 1,
          sentence: '我 媽',
          correctChars: ['媽'],
          wrongChars: ['爸'],
          translation: 'My mom'
        }
      ]
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

  it('loadData falls back to a default lesson when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});

    const data = await DataLoader.loadData();
    expect(data.lessons).toHaveLength(1);
    expect(data.lessons[0].sentences[0].correctChars).toEqual(['爱']);
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
    expect(data.lessons).toHaveLength(1);
    expect(data.lessons[0].id).toBe(1);
  });

  it('getLesson returns null when data has not been loaded', () => {
    expect(DataLoader.getLesson(1)).toBeNull();
  });

  it('getLesson finds a lesson by id after data is loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleData
    }));
    await DataLoader.loadData();
    expect(DataLoader.getLesson(2)?.name).toBe('Lesson 2');
  });

  it('getLesson returns null for an unknown id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleData
    }));
    await DataLoader.loadData();
    expect(DataLoader.getLesson(999)).toBeNull();
  });

  it('getAllLessons returns [] before load and the array after', async () => {
    expect(DataLoader.getAllLessons()).toEqual([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleData
    }));
    await DataLoader.loadData();
    expect(DataLoader.getAllLessons()).toHaveLength(2);
  });

  it('getLevel returns a sentence by lesson id and sentence id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleData
    }));
    await DataLoader.loadData();
    expect(DataLoader.getLevel(1, 2)?.translation).toBe('Today is good');
    expect(DataLoader.getLevel(1, 999)).toBeNull();
    expect(DataLoader.getLevel(99, 1)).toBeNull();
  });
});
