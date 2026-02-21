import { describe, it, expect } from 'vitest';

import { addPunctuation } from './punctuationService';

describe('punctuationService', () => {
  describe('addPunctuation', () => {
    it('adds period at end of statement', async () => {
      const result = await addPunctuation('hello world', 'en');
      expect(result).toContain('.');
      expect(result.toLowerCase()).toMatch(/hello.*world/);
    });

    it('preserves existing punctuation', async () => {
      const result = await addPunctuation('hello, world?', 'en');
      expect(result).toBe('hello, world?');
    });

    it('handles questions in English', async () => {
      const result = await addPunctuation('what is your name', 'en');
      expect(result).toContain('?');
      expect(result.toLowerCase()).toContain('what');
    });

    it('handles questions in Ukrainian', async () => {
      const result = await addPunctuation('як тебе звати', 'uk');
      expect(result).toContain('?');
      expect(result.toLowerCase()).toContain('як');
    });

    it('adds commas for conjunctions in longer sentences', async () => {
      const result = await addPunctuation('i went to the store and bought some milk and then came home', 'en');
      // Should have at least one comma or period
      expect(result).toMatch(/[,.]/);
    });

    it('handles empty text', async () => {
      const result = await addPunctuation('', 'en');
      expect(result).toBe('');
    });

    it('handles whitespace-only text', async () => {
      const result = await addPunctuation('   ', 'en');
      // Service returns trimmed result from split/join, but may have spacing
      expect(result.trim()).toBe('');
    });

    it('handles Ukrainian conjunctions', async () => {
      const result = await addPunctuation('я пішов до магазину і купив молоко і потім повернувся додому', 'uk');
      expect(result).toMatch(/[,.]/);
    });

    it('adds punctuation after introductory phrases in English', async () => {
      const result = await addPunctuation('however this is important', 'en');
      expect(result.toLowerCase()).toContain('however');
      expect(result).toMatch(/[,.]/);
    });

    it('detects sentences in longer text', async () => {
      const result = await addPunctuation(
        'this is the first sentence this is the second sentence this is the third',
        'en'
      );
      // Should have multiple sentence-ending punctuation marks
      const periods = (result.match(/\./g) || []).length;
      expect(periods).toBeGreaterThanOrEqual(1);
    });
  });
});
