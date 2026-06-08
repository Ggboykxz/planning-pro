/**
 * Simple CUID generator (compatible with Prisma's @default(cuid()))
 * Used by the data store fallback when Prisma is not available
 */

let _counter = 0;

export function createId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  _counter = (_counter || 0) + 1;
  return `cl${timestamp}${random}${_counter.toString(36)}`;
}
