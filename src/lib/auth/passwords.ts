import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

/**
 * Password hashing with Node's built-in scrypt — no external dependency. Each
 * password gets a unique random salt; we store only the salt and the derived
 * hash, never the raw password. Verification uses a constant-time compare so
 * an attacker can't learn the hash byte-by-byte via timing.
 */

const scrypt = promisify(scryptCb);
const KEY_LENGTH = 64;

export async function hashPassword(
  password: string
): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return { hash: derived.toString("hex"), salt };
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const stored = Buffer.from(hash, "hex");
  // Both buffers must be the same length for timingSafeEqual; a stored hash of
  // the wrong length can only mean a corrupt/forged record, so reject it.
  if (stored.length !== derived.length) return false;
  return timingSafeEqual(stored, derived);
}
