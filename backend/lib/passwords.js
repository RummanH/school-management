import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt";

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${HASH_PREFIX}$${salt}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password, storedHash) {
  const [prefix, salt, hashValue] = String(storedHash || "").split("$");
  if (prefix !== HASH_PREFIX || !salt || !hashValue) {
    return false;
  }

  const expected = Buffer.from(hashValue, "base64url");
  const actual = await scrypt(password, salt, expected.length);

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
