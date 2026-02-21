import { describe, it, expect } from 'vitest';

import { formatDictationText } from './dictationTextFormatter';

describe('formatDictationText', () => {
  it('returns empty string for blank input', () => {
    expect(formatDictationText('   ')).toBe('');
  });

  it('normalizes spacing, capitalizes first letter, and adds trailing period', () => {
    expect(formatDictationText('  hello   world  ')).toBe('Hello world.');
  });

  it('capitalizes sentence starts when punctuation already exists', () => {
    expect(formatDictationText('hello world. this is second sentence')).toBe('Hello world. This is second sentence.');
  });

  it('preserves existing punctuation in text', () => {
    expect(formatDictationText('hello, world?')).toBe('Hello, world?');
  });

  it('handles text that already ends with punctuation', () => {
    expect(formatDictationText('hello world!')).toBe('Hello world!');
  });
});

