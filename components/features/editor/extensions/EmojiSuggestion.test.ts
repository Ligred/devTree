import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmojiSuggestion } from './EmojiSuggestion';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@emoji-mart/data', () => ({ default: {} }));

// vi.mock factories are hoisted above variable declarations, so we must use
// vi.hoisted to create the spy before the factory runs.
const { mockSearch } = vi.hoisted(() => ({ mockSearch: vi.fn() }));

vi.mock('emoji-mart', () => ({
  init: vi.fn(),
  SearchIndex: { search: mockSearch },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConfig() {
  return (EmojiSuggestion as unknown as { config: Record<string, unknown> }).config;
}

function getSuggestion() {
  const config = getConfig();
  const addOptions = config.addOptions as () => { suggestion: Record<string, unknown> };
  return addOptions().suggestion;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EmojiSuggestion extension', () => {
  describe('extension metadata', () => {
    it('has the correct name', () => {
      const config = getConfig();
      expect(config.name).toBe('emojiSuggestion');
    });
  });

  describe('addOptions / suggestion config', () => {
    it('returns a suggestion object with char set to ":"', () => {
      const suggestion = getSuggestion();
      expect(suggestion.char).toBe(':');
    });

    it('has allowSpaces set to false', () => {
      const suggestion = getSuggestion();
      expect(suggestion.allowSpaces).toBe(false);
    });
  });

  describe('items()', () => {
    beforeEach(() => {
      mockSearch.mockReset();
    });

    it('returns DEFAULT_EMOJIS when query is empty', async () => {
      const suggestion = getSuggestion();
      const items = suggestion.items as (args: {
        query: string;
      }) => Promise<{ id: string; name: string; native: string }[]>;

      const result = await items({ query: '' });

      expect(result.length).toBeGreaterThan(0);
      const first = result[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('native');
    });

    it('returns empty array when query >= 2 chars and search yields no results', async () => {
      mockSearch.mockResolvedValue([]);

      const suggestion = getSuggestion();
      const items = suggestion.items as (args: {
        query: string;
      }) => Promise<{ id: string; name: string; native: string }[]>;

      const result = await items({ query: 'zzzzzz' });
      expect(result).toEqual([]);
    });

    it('returns mapped results when SearchIndex returns matches', async () => {
      mockSearch.mockResolvedValue([
        { id: 'smile', name: 'Smiling Face', skins: [{ native: '😊' }] },
      ]);

      const suggestion = getSuggestion();
      const items = suggestion.items as (args: {
        query: string;
      }) => Promise<{ id: string; name: string; native: string }[]>;

      const result = await items({ query: 'smi' });
      expect(result).toEqual([{ id: 'smile', name: 'Smiling Face', native: '😊' }]);
    });

    it('filters out results that have no native skin', async () => {
      mockSearch.mockResolvedValue([
        { id: 'smile', name: 'Smiling Face', skins: [{ native: '😊' }] },
        { id: 'empty', name: 'No Native', skins: [{}] },
      ]);

      const suggestion = getSuggestion();
      const items = suggestion.items as (args: {
        query: string;
      }) => Promise<{ id: string; name: string; native: string }[]>;

      const result = await items({ query: 'smi' });
      expect(result).toEqual([{ id: 'smile', name: 'Smiling Face', native: '😊' }]);
    });
  });

  describe('command()', () => {
    it('calls deleteRange with the provided range and insertContent with the native emoji', () => {
      const run = vi.fn();
      const insertContent = vi.fn(() => chainMock);
      const deleteRange = vi.fn(() => chainMock);
      const focus = vi.fn(() => chainMock);
      const chainMock = { focus, deleteRange, insertContent, run };

      const fakeEditor = { chain: vi.fn(() => chainMock) };

      const suggestion = getSuggestion();
      const command = suggestion.command as (args: {
        editor: typeof fakeEditor;
        range: { from: number; to: number };
        props: { id: string; name: string; native: string };
      }) => void;

      command({
        editor: fakeEditor,
        range: { from: 0, to: 2 },
        props: { id: 'smile', name: 'Smiling', native: '😊' },
      });

      expect(fakeEditor.chain).toHaveBeenCalledOnce();
      expect(focus).toHaveBeenCalledOnce();
      expect(deleteRange).toHaveBeenCalledWith({ from: 0, to: 2 });
      expect(insertContent).toHaveBeenCalledWith('😊');
      expect(run).toHaveBeenCalledOnce();
    });

    it('inserts the correct native character for a different emoji', () => {
      const run = vi.fn();
      const insertContent = vi.fn(() => chainMock);
      const deleteRange = vi.fn(() => chainMock);
      const focus = vi.fn(() => chainMock);
      const chainMock = { focus, deleteRange, insertContent, run };

      const fakeEditor = { chain: vi.fn(() => chainMock) };

      const suggestion = getSuggestion();
      const command = suggestion.command as (args: {
        editor: typeof fakeEditor;
        range: { from: number; to: number };
        props: { id: string; name: string; native: string };
      }) => void;

      command({
        editor: fakeEditor,
        range: { from: 5, to: 10 },
        props: { id: 'rocket', name: 'Rocket', native: '🚀' },
      });

      expect(deleteRange).toHaveBeenCalledWith({ from: 5, to: 10 });
      expect(insertContent).toHaveBeenCalledWith('🚀');
    });
  });
});
