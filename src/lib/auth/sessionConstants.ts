/**
 * Constants shared between session.ts (Node runtime — uses `crypto`) and
 * middleware.ts (Edge runtime — cannot load Node built-ins). Kept in their own
 * dependency-free file so middleware can import just the cookie name without
 * pulling in `crypto` and tripping the "Node.js module in Edge Runtime"
 * warning/failure.
 */
export const COOKIE_NAME = "askaneli_session";
