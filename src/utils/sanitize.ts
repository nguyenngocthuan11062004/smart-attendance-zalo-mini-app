/**
 * Input sanitization and validation utilities
 */

/** Strip HTML tags to prevent XSS */
export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/** Validate class code format: 2-10 alphanumeric chars */
export function isValidClassCode(code: string): boolean {
  return /^[A-Za-z0-9]{2,10}$/.test(code.trim());
}

/** Validate MSSV format: 8 digits starting with 20 */
export function isValidMSSV(mssv: string): boolean {
  return /^20\d{6}$/.test(mssv.trim());
}

/** Validate Vietnamese phone number */
export function isValidPhone(phone: string): boolean {
  return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phone.replace(/\s/g, ""));
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Validate session ID format (Firestore document ID) */
export function isValidDocId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

/** Sanitize and validate a name (Vietnamese characters allowed) */
export function sanitizeName(name: string): string {
  // Allow Vietnamese diacritics, spaces, and basic punctuation
  return name.replace(/[^\p{L}\p{N}\s.\-']/gu, "").trim().slice(0, 100);
}

/** Validate QR payload has required fields and reasonable size */
export function isValidQRPayload(payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== "object") return false;
  const json = JSON.stringify(payload);
  return json.length < 2048; // Prevent oversized payloads
}

/** Validate HUST Microsoft 365 email */
export function isValidHUSTEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@sis.hust.edu.vn");
}

/** Extract MSSV from HUST email: name.XX123456@sis.hust.edu.vn → "20123456" */
export function extractMSSV(email: string): string | null {
  const match = email.trim().toLowerCase().match(/\.(\w{2})(\d{6})@sis\.hust\.edu\.vn$/);
  if (!match) return null;
  return "20" + match[2];
}
