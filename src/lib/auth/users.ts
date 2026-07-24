import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { hashPassword, verifyPassword } from "./passwords";

/**
 * User accounts persisted to data/users.json (which is gitignored, so password
 * hashes never leave the machine). Same single-process lock pattern as the
 * report store: all read-modify-writes are serialized so two concurrent
 * signups can't clobber the file.
 */

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

/** The public shape we hand around — never includes the hash/salt. */
export interface PublicUser {
  id: string;
  email: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_PATH = path.join(DATA_DIR, "users.json");

let usersLock: Promise<unknown> = Promise.resolve();

function withUsersLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = usersLock.then(fn, fn);
  usersLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function readUsers(): Promise<UserRecord[]> {
  try {
    const raw = await readFile(USERS_PATH, "utf-8");
    return JSON.parse(raw) as UserRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeUsers(users: UserRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf-8");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const users = await readUsers();
  const user = users.find((u) => u.id === id);
  return user ? { id: user.id, email: user.email } : null;
}

/**
 * Creates a new account. Returns { ok: false, reason } if the email is already
 * registered, so the caller can show a friendly message without leaking timing.
 */
export async function createUser(
  email: string,
  password: string
): Promise<{ ok: true; user: PublicUser } | { ok: false; reason: string }> {
  const normalized = normalizeEmail(email);
  const { hash, salt } = await hashPassword(password);

  return withUsersLock(async () => {
    const users = await readUsers();
    if (users.some((u) => normalizeEmail(u.email) === normalized)) {
      return { ok: false, reason: "An account with this email already exists." };
    }
    const record: UserRecord = {
      id: randomUUID(),
      email: normalized,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
    };
    users.push(record);
    await writeUsers(users);
    return { ok: true, user: { id: record.id, email: record.email } };
  });
}

/**
 * Verifies an email + password. Returns the public user on success, or null on
 * any failure (unknown email OR wrong password) — the caller must not reveal
 * which, to avoid leaking whether an email is registered.
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<PublicUser | null> {
  const normalized = normalizeEmail(email);
  const users = await readUsers();
  const user = users.find((u) => normalizeEmail(u.email) === normalized);
  if (!user) {
    // Still run a hash to keep timing roughly constant whether or not the email
    // exists, so login timing doesn't reveal registered emails.
    await verifyPassword(password, "00", "00");
    return null;
  }
  const valid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
  return valid ? { id: user.id, email: user.email } : null;
}

/** Convenience: does at least one account exist? (used to steer login vs signup) */
export async function hasAnyUser(): Promise<boolean> {
  const users = await readUsers();
  return users.length > 0;
}
