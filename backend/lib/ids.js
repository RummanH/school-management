import crypto from 'node:crypto';

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}
