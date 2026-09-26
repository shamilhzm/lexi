import { describe, it, expect } from 'vitest';
import { withoutRef } from './ref.ts';

describe('withoutRef', () => {
  it('leaves a URL without a tag alone', () => {
    expect(withoutRef('https://lexi.example/#/words')).toBeNull();
  });

  it('removes the tag and keeps the hash route', () => {
    expect(withoutRef('https://lexi.example/?ref=r-german#/session')).toBe('https://lexi.example/#/session');
  });

  it('removes only `ref` — every other parameter survives, in order', () => {
    expect(withoutRef('https://lexi.example/lexi/?seed=b1&ref=hn&x=1')).toBe('https://lexi.example/lexi/?seed=b1&x=1');
  });

  it('removes a repeated or empty tag too', () => {
    expect(withoutRef('https://lexi.example/?ref=a&ref=b')).toBe('https://lexi.example/');
    expect(withoutRef('https://lexi.example/?ref=')).toBe('https://lexi.example/');
  });

  it('does not throw on something that is not a URL', () => {
    expect(withoutRef('not a url')).toBeNull();
  });
});
