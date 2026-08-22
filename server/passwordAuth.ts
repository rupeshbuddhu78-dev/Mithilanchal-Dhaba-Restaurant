import crypto from "node:crypto";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function normaliseEmail(email: string) { return email.trim().toLowerCase(); }
export function localOpenId(email: string) { return `local_${crypto.createHash("sha256").update(normaliseEmail(email)).digest("hex").slice(0, 52)}`; }
export function canAttemptPasswordLogin(key: string) { const entry = attempts.get(key); return !entry || entry.resetAt <= Date.now() || entry.count < MAX_ATTEMPTS; }
export function recordFailedPasswordLogin(key: string) { const current = attempts.get(key); if (!current || current.resetAt <= Date.now()) attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS }); else attempts.set(key, { ...current, count: current.count + 1 }); }
export function clearPasswordLoginAttempts(key: string) { attempts.delete(key); }
export async function hashPassword(password: string) { const salt = crypto.randomBytes(16).toString("hex"); const digest = await new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, salt, 64, (error, result) => error ? reject(error) : resolve(result as Buffer))); return `scrypt$${salt}$${digest.toString("hex")}`; }
export async function verifyPassword(password: string, stored: string | null) { if (!stored) return false; const [algorithm, salt, expected] = stored.split("$"); if (algorithm !== "scrypt" || !salt || !expected) return false; const digest = await new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, salt, 64, (error, result) => error ? reject(error) : resolve(result as Buffer))); const candidate = Buffer.from(expected, "hex"); return candidate.length === digest.length && crypto.timingSafeEqual(candidate, digest); }
