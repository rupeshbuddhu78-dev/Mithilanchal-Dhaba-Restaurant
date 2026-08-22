import { createHash, timingSafeEqual } from "node:crypto";

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;

type AttemptWindow = { count: number; resetsAt: number };

const attemptsByClient = new Map<string, AttemptWindow>();

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function secureEqual(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

export function getLocalAdminCredentials() {
  const email = process.env.ADMIN_LOGIN_EMAIL;
  const password = process.env.ADMIN_LOGIN_PASSWORD;
  if (!email?.trim() || !password) return null;
  return { email: normalizeAdminEmail(email), password };
}

export function localAdminCredentialsMatch(
  email: string,
  password: string,
  expected: { email: string; password: string },
) {
  // Evaluate both comparisons before returning so an email mismatch does not
  // shortcut the password comparison.
  const emailMatches = secureEqual(normalizeAdminEmail(email), expected.email);
  const passwordMatches = secureEqual(password, expected.password);
  return emailMatches && passwordMatches;
}

export function createLocalAdminOpenId(email: string) {
  return `render_admin_${createHash("sha256").update(normalizeAdminEmail(email)).digest("hex").slice(0, 32)}`;
}

export function isAdminLoginAttemptAllowed(clientKey: string, now = Date.now()) {
  const window = attemptsByClient.get(clientKey);
  if (!window || window.resetsAt <= now) {
    attemptsByClient.delete(clientKey);
    return true;
  }
  return window.count < MAX_ATTEMPTS_PER_WINDOW;
}

export function recordFailedAdminLogin(clientKey: string, now = Date.now()) {
  const window = attemptsByClient.get(clientKey);
  if (!window || window.resetsAt <= now) {
    attemptsByClient.set(clientKey, { count: 1, resetsAt: now + ATTEMPT_WINDOW_MS });
    return;
  }
  window.count += 1;
}

export function clearAdminLoginAttempts(clientKey: string) {
  attemptsByClient.delete(clientKey);
}
