import "server-only";

import crypto from "crypto";
import sanitize from "sanitize-html";

// ============================================================================
// Security Utilities — Encryption, Hashing, Sanitization
// ============================================================================

// ---------------------------------------------------------------------------
// AES-256-GCM Encryption with key rotation support
// ---------------------------------------------------------------------------

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Key version prefix: first byte of encrypted payload identifies which key was used
const KEY_VERSION_LENGTH = 1;

interface DerivedKey {
  version: number;
  key: Buffer;
}

/** Cache derived keys so scryptSync isn't called on every operation */
let derivedKeysCache: DerivedKey[] | null = null;

/**
 * Parse encryption keys from environment.
 * Supports key rotation via comma-separated keys:
 *   ENCRYPTION_KEY="current_key"
 *   ENCRYPTION_KEYS_PREVIOUS="old_key_1,old_key_2"
 *
 * The first key (ENCRYPTION_KEY) is always used for encryption.
 * Previous keys are only tried during decryption.
 */
function getDerivedKeys(): DerivedKey[] {
  if (derivedKeysCache) return derivedKeysCache;

  const currentKey = process.env.ENCRYPTION_KEY;
  if (!currentKey) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for data encryption. " +
        "Generate one with: openssl rand -hex 32",
    );
  }

  const keys: string[] = [currentKey];

  // Previous keys for decryption during rotation
  const previousKeys = process.env.ENCRYPTION_KEYS_PREVIOUS;
  if (previousKeys) {
    keys.push(
      ...previousKeys
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    );
  }

  derivedKeysCache = keys.map((rawKey, index) => ({
    version: index, // 0 = current, 1+ = previous versions
    key: crypto.scryptSync(rawKey, `kovo-app-key-v${index}`, KEY_LENGTH),
  }));

  return derivedKeysCache;
}

/** Get the current (primary) encryption key */
function getCurrentKey(): DerivedKey {
  return getDerivedKeys()[0];
}

/**
 * Encrypt sensitive data using AES-256-GCM.
 * Format: KeyVersion (1 byte) + IV (16) + AuthTag (16) + CipherText
 * Always uses the current (primary) key.
 */
export function encrypt(plaintext: string): string {
  const { version, key } = getCurrentKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: Version (1) + IV (16) + AuthTag (16) + CipherText
  const result = Buffer.concat([
    Buffer.from([version]),
    iv,
    authTag,
    encrypted,
  ]);
  return result.toString("base64");
}

/**
 * Decrypt data encrypted with encrypt().
 * Supports key rotation: tries the key version stored in the payload,
 * then falls back to trying all available keys.
 */
export function decrypt(encryptedBase64: string): string {
  const data = Buffer.from(encryptedBase64, "base64");
  const keys = getDerivedKeys();

  // Read key version from first byte
  const keyVersion = data[0];
  const payload = data.subarray(KEY_VERSION_LENGTH);

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  // Try the specified key version first
  const primaryKey = keys.find((k) => k.version === keyVersion);
  if (primaryKey) {
    try {
      return decryptWithKey(primaryKey.key, iv, authTag, ciphertext);
    } catch {
      // Key version mismatch or corruption — try others
    }
  }

  // Fallback: try all keys (handles data encrypted before version tagging)
  for (const derivedKey of keys) {
    if (derivedKey.version === keyVersion) continue; // Already tried
    try {
      return decryptWithKey(derivedKey.key, iv, authTag, ciphertext);
    } catch {
      continue;
    }
  }

  throw new Error("Decryption failed: no matching key found. Data may be corrupted or key rotated without migration.");
}

function decryptWithKey(
  key: Buffer,
  iv: Buffer,
  authTag: Buffer,
  ciphertext: Buffer,
): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Re-encrypt data with the current key.
 * Use this during key rotation to migrate old encrypted values.
 */
export function reEncrypt(encryptedBase64: string): string {
  const plaintext = decrypt(encryptedBase64);
  return encrypt(plaintext);
}

/**
 * Check if encrypted data was created with the current key.
 * Returns false if data needs re-encryption after key rotation.
 */
export function isCurrentKeyVersion(encryptedBase64: string): boolean {
  const data = Buffer.from(encryptedBase64, "base64");
  return data[0] === 0; // Version 0 = current key
}

// ---------------------------------------------------------------------------
// Secure Hashing (for tokens, API keys, etc.)
// ---------------------------------------------------------------------------

const SALT_LENGTH = 32;

/**
 * Hash a value using SHA-256 with a random salt.
 * Returns "salt:hash" format.
 */
export function hashSecure(value: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto
    .createHmac("sha256", salt)
    .update(value)
    .digest("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a value against a "salt:hash" string.
 */
export function verifyHash(value: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const computed = crypto
    .createHmac("sha256", salt)
    .update(value)
    .digest("hex");

  // Timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computed));
}

// ---------------------------------------------------------------------------
// Secure Token Generation
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure random token.
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate a CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// ---------------------------------------------------------------------------
// Input Sanitization — using battle-tested sanitize-html library
// ---------------------------------------------------------------------------

/**
 * Default sanitize-html options.
 * Strips all HTML by default. Use sanitizeRichHtml() for content that
 * legitimately needs limited formatting.
 */
const STRIP_ALL_OPTIONS: sanitize.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "escape" as const,
};

/**
 * Options for rich-text content (e.g. news posts, comments).
 * Allows safe formatting tags but blocks scripts, iframes, forms, etc.
 * Explicitly blocks dangerous URI schemes in href/src attributes.
 */
const RICH_TEXT_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    "b", "i", "em", "strong", "u", "s", "p", "br", "ul", "ol", "li",
    "blockquote", "code", "pre", "a", "h1", "h2", "h3", "h4", "h5", "h6",
    "span", "div", "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    span: ["class"],
    div: ["class"],
    code: ["class"],
    pre: ["class"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  // Force all links to open in new tab with noopener
  transformTags: {
    a: sanitize.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer nofollow",
    }),
  },
  // Remove dangerous attributes like onload, onclick, etc.
  disallowedTagsMode: "escape" as const,
};

/**
 * Sanitize user input — strip ALL HTML tags.
 * Use for plain-text fields (names, titles, comments without formatting).
 */
export function sanitizeUserInput(input: string): string {
  return sanitize(input, STRIP_ALL_OPTIONS).trim();
}

/**
 * Sanitize rich-text content — allow safe formatting tags only.
 * Use for news posts, descriptions, etc. that support Markdown/HTML.
 * Blocks javascript: URIs, event handlers, and dangerous tags.
 */
export function sanitizeRichHtml(input: string): string {
  return sanitize(input, RICH_TEXT_OPTIONS);
}

/**
 * Escape HTML entities (legacy compatibility — use sanitizeUserInput instead).
 * Only escapes characters, does NOT strip tags.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Sanitize a string for safe use in SQL-like contexts.
 * Note: Always use Prisma parameterized queries — this is an additional layer.
 */
export function sanitizeForQuery(input: string): string {
  return input
    .replace(/['";\\]/g, "") // Remove SQL-dangerous characters
    .replace(/--/g, "") // Remove SQL comments
    .replace(/\/\*/g, "") // Remove block comment start
    .replace(/\*\//g, "") // Remove block comment end
    .trim();
}

/**
 * Validate and sanitize email input.
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim().slice(0, 254); // Max email length per RFC
}

/**
 * Strip potentially dangerous characters from filenames.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Only allow safe characters
    .replace(/\.{2,}/g, ".") // No double dots (directory traversal)
    .slice(0, 255); // Max filename length
}

// ---------------------------------------------------------------------------
// Password Strength Validation
// ---------------------------------------------------------------------------

interface PasswordStrengthResult {
  isStrong: boolean;
  errors: string[];
  score: number; // 0-5
}

/**
 * Validate password strength with multiple criteria.
 */
export function validatePasswordStrength(
  password: string,
): PasswordStrengthResult {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else errors.push("Heslo musí mít alespoň 8 znaků");

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password)) score++;
  else errors.push("Heslo musí obsahovat malé písmeno");

  if (/[A-Z]/.test(password)) score++;
  else errors.push("Heslo musí obsahovat velké písmeno");

  if (/[0-9]/.test(password)) score++;
  else errors.push("Heslo musí obsahovat číslo");

  if (/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password)) score++;
  else errors.push("Heslo musí obsahovat speciální znak");

  return {
    isStrong: score >= 4 && errors.length === 0,
    errors,
    score: Math.min(score, 5),
  };
}

// ---------------------------------------------------------------------------
// IP Address Extraction
// ---------------------------------------------------------------------------

/**
 * Extract client IP address from request headers.
 * Handles proxied requests (X-Forwarded-For, X-Real-IP).
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP (client IP) from the chain
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

// ---------------------------------------------------------------------------
// Suspicious Activity Detection
// ---------------------------------------------------------------------------

const suspiciousPatterns = [
  /<script\b/i,
  /javascript:/i,
  /on\w+\s*=/i, // onload=, onclick=, etc.
  /data:text\/html/i,
  /vbscript:/i,
  /expression\s*\(/i,
  /url\s*\(/i,
  /import\s*\(/i, // Dynamic imports in user input
  /eval\s*\(/i,
  /document\./i,
  /window\./i,
  /\.constructor/i,
  /__proto__/i,
  /prototype\[/i,
];

/**
 * Check if input contains potentially malicious patterns.
 */
export function containsSuspiciousContent(input: string): boolean {
  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Deep sanitize an object — recursively sanitize all string values.
 * Uses sanitize-html to strip all HTML tags from every string.
 */
export function deepSanitize<T>(obj: T): T {
  if (typeof obj === "string") {
    return sanitizeUserInput(obj) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSanitize) as T;
  }
  if (obj && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = deepSanitize(value);
    }
    return sanitized as T;
  }
  return obj;
}
