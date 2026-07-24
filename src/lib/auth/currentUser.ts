import { getSessionUserId } from "./session";
import { findUserById, type PublicUser } from "./users";

/**
 * Server-side: resolves the currently signed-in user (verified cookie → user
 * record), or null. Use in server components/pages to gate content and show
 * who's signed in. This is the authoritative check (middleware only does a
 * presence gate).
 */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return findUserById(userId);
}
