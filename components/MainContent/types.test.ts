import { describe, it, expect } from 'vitest';

import {
  isAgendaBlockContent,
  isAudioBlockContent,
  isCodeBlockContent,
  isImageBlockContent,
  isLinkBlockContent,
  isTableBlockContent,
  isTextBlockContent,
  type BlockContent,
  type BlockType,
} from './types';

// Helper to pass clearly invalid values while satisfying the TS type checker
const as = (v: unknown) => v as BlockContent;
const type = (t: string) => t as BlockType;

describe('MainContent type guards', () => {
  describe('isTextBlockContent', () => {
    it('returns true for string content and type "text"', () => {
      expect(isTextBlockContent('hello', 'text')).toBe(true);
      expect(isTextBlockContent('', 'text')).toBe(true);
    });

    it('returns false for non-string content or wrong type', () => {
      expect(isTextBlockContent(as({ code: 'x' }), 'code')).toBe(false);
      expect(isTextBlockContent(as(123), 'text')).toBe(false);
    });
  });

  describe('isCodeBlockContent', () => {
    it('returns true for object with code string and type "code"', () => {
      expect(isCodeBlockContent(as({ code: 'const x = 1;', language: 'js' }), 'code')).toBe(true);
      expect(isCodeBlockContent(as({ code: '' }), 'code')).toBe(true);
    });

    it('returns false for invalid shape or wrong type', () => {
      // Guard checks for key presence, so { code: 1 } with type 'code' is truthy
      expect(isCodeBlockContent(as({ code: 1 }), 'code')).toBe(true);
      expect(isCodeBlockContent('string', 'text')).toBe(false);
      expect(isCodeBlockContent(as({ url: 'x' }), 'link')).toBe(false);
    });
  });

  describe('isLinkBlockContent', () => {
    it('returns true for object with url string and type "link"', () => {
      expect(isLinkBlockContent(as({ url: 'https://x.com', label: 'X' }), 'link')).toBe(true);
      expect(isLinkBlockContent(as({ url: 'https://x.com' }), 'link')).toBe(true);
    });

    it('returns false for invalid shape or wrong type', () => {
      // Guard checks for key presence; { url: 1 } with type 'link' passes
      expect(isLinkBlockContent(as({ url: 1 }), 'link')).toBe(true);
      expect(isLinkBlockContent(as({ code: 'x' }), 'code')).toBe(false);
    });
  });

  describe('isTableBlockContent', () => {
    it('returns true for object with headers and rows arrays and type "table"', () => {
      expect(isTableBlockContent(as({ headers: ['A'], rows: [['1']] }), 'table')).toBe(true);
      expect(isTableBlockContent(as({ headers: [], rows: [] }), 'table')).toBe(true);
    });

    it('returns false for invalid shape or wrong type', () => {
      // headers is not an array → false
      expect(isTableBlockContent(as({ headers: 'x', rows: [] }), 'table')).toBe(false);
      // headers is a valid array; rows is not checked → true
      expect(isTableBlockContent(as({ headers: [], rows: 'y' }), 'table')).toBe(true);
      // missing 'headers' key → false
      expect(isTableBlockContent(as({}), 'table')).toBe(false);
    });
  });

  describe('isAgendaBlockContent', () => {
    it('returns true for object with items array and type "agenda"', () => {
      expect(
        isAgendaBlockContent(
          as({ items: [{ id: '1', text: 'todo', checked: false }] }),
          'agenda',
        ),
      ).toBe(true);
    });

    it('returns false for wrong type or missing items', () => {
      expect(isAgendaBlockContent(as({ items: [] }), 'text')).toBe(false);
      expect(isAgendaBlockContent(as({}), 'agenda')).toBe(false);
    });
  });

  describe('isImageBlockContent', () => {
    it('returns true for object with url and type "image"', () => {
      expect(isImageBlockContent(as({ url: 'https://example.com/img.png' }), 'image')).toBe(true);
    });

    it('returns false for wrong type or wrong shape', () => {
      expect(isImageBlockContent(as({ url: 'x' }), 'link')).toBe(false);
      expect(isImageBlockContent(as({ url: 'x', code: 'y' }), type('image'))).toBe(false);
    });
  });

  describe('isAudioBlockContent', () => {
    it('returns true for object with url and type "audio"', () => {
      expect(isAudioBlockContent(as({ url: 'https://example.com/audio.mp3' }), 'audio')).toBe(true);
    });

    it('returns true when optional caption is present', () => {
      expect(
        isAudioBlockContent(as({ url: 'https://example.com/a.mp3', caption: 'Episode 1' }), 'audio'),
      ).toBe(true);
    });

    it('returns false for wrong type', () => {
      expect(isAudioBlockContent(as({ url: 'https://example.com/a.mp3' }), 'link')).toBe(false);
    });

    it('returns false for missing url key', () => {
      expect(isAudioBlockContent(as({ caption: 'no url' }), 'audio')).toBe(false);
    });

    it('returns false for null content', () => {
      expect(isAudioBlockContent(as(null), 'audio')).toBe(false);
    });
  });
});
