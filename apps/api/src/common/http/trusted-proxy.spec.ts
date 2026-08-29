import { parseTrustProxy } from './trusted-proxy';

describe('parseTrustProxy', () => {
  it('keeps proxy trust disabled by default', () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy('false')).toBe(false);
  });

  it('parses explicit address lists and local hop-count values', () => {
    expect(parseTrustProxy('10.0.0.0/8, 127.0.0.1')).toEqual(['10.0.0.0/8', '127.0.0.1']);
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('true')).toBe(true);
  });
});
