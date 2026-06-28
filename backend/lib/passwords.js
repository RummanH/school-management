import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt";

export function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

export function validatePasswordStrength(password) {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

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
