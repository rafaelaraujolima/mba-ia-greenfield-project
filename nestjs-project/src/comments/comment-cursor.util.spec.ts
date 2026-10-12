import { InvalidCursorException } from '../common/exceptions/domain.exception';
import {
  decodeCommentCursor,
  encodeCommentCursor,
} from './comment-cursor.util';

describe('comment cursor', () => {
  const cursor = {
    createdAt: new Date('2026-03-04T05:06:07.890Z'),
    id: '11111111-2222-4333-8444-555555555555',
  };

  it('should round-trip a cursor preserving timestamp and id', () => {
    const decoded = decodeCommentCursor(encodeCommentCursor(cursor));

    expect(decoded.createdAt.toISOString()).toBe('2026-03-04T05:06:07.890Z');
    expect(decoded.id).toBe(cursor.id);
  });

  it('should produce an opaque url-safe string', () => {
    const encoded = encodeCommentCursor(cursor);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded).not.toContain(cursor.id);
  });

  it.each([
    ['garbage', 'not-a-cursor'],
    ['empty', ''],
    ['json without fields', Buffer.from('{}', 'utf8').toString('base64url')],
    [
      'invalid date',
      Buffer.from(
        JSON.stringify({ t: 'yesterday', i: cursor.id }),
        'utf8',
      ).toString('base64url'),
    ],
    [
      'invalid id',
      Buffer.from(
        JSON.stringify({ t: cursor.createdAt.toISOString(), i: 'abc' }),
        'utf8',
      ).toString('base64url'),
    ],
  ])('should throw INVALID_CURSOR for a %s cursor', (_label, raw) => {
    expect(() => decodeCommentCursor(raw)).toThrow(InvalidCursorException);
  });
});
