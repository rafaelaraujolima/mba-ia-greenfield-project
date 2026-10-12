import { InvalidCursorException } from '../common/exceptions/domain.exception';

export interface CommentCursor {
  createdAt: Date;
  id: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Opaque keyset cursor (social-interactions/TD-05): base64url of the
 * `(created_at, id)` pair of the last item of the page, matching the
 * `created_at DESC, id DESC` ordering of the comment listings.
 */
export function encodeCommentCursor(cursor: CommentCursor): string {
  const payload = JSON.stringify({
    t: cursor.createdAt.toISOString(),
    i: cursor.id,
  });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

export function decodeCommentCursor(raw: string): CommentCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidCursorException();
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new InvalidCursorException();
  }
  const { t, i } = parsed as { t?: unknown; i?: unknown };
  if (typeof t !== 'string' || typeof i !== 'string') {
    throw new InvalidCursorException();
  }

  const createdAt = new Date(t);
  if (Number.isNaN(createdAt.getTime()) || !UUID_PATTERN.test(i)) {
    throw new InvalidCursorException();
  }
  return { createdAt, id: i };
}
