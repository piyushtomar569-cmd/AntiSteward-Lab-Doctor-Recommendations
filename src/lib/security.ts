import DOMPurify from 'dompurify';
import type { Role } from './types';

/**
 * AntiSteward Security Engineering Module
 * Provides defense-in-depth security controls:
 * - XSS Prevention and DOMPurify sanitization
 * - File upload validation (size, MIME, extension, path traversal)
 * - Safe filename generation
 * - Role-Based Authorization and IDOR mitigation
 * - ReDoS / DoS resource limit guards
 * - Safe error message formatting (no stack trace exposure)
 */

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_TEXT_INPUT_LENGTH = 50000; // 50,000 characters

export const ALLOWED_EXTENSIONS = ['.txt', '.pdf', '.csv', '.json', '.hl7', '.png', '.jpg', '.jpeg'] as const;
export const ALLOWED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'text/csv',
  'application/json',
  'image/png',
  'image/jpeg',
] as const;

/**
 * Sanitizes raw string input by stripping all HTML tags and dangerous attributes.
 * Prevents Cross-Site Scripting (XSS) in patient notes, prescriptions, and lab reports.
 */
export function sanitizeInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  // Strip all HTML tags and attributes for plain text fields
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
}

/**
 * Sanitizes rich HTML string allowing only safe formatting tags.
 */
export function sanitizeHtml(raw: string): string {
  if (typeof raw !== 'string') return '';
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'span', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class'],
  });
}

/**
 * Validates URLs to prevent javascript:, data:, and vbscript: execution.
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  if (clean.startsWith('javascript:') || clean.startsWith('data:') || clean.startsWith('vbscript:')) {
    return false;
  }
  return true;
}

/**
 * Sanitizes filenames to prevent Path Traversal attacks (e.g., ../../../etc/passwd).
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'report_unnamed.txt';
  
  // Remove path traversal characters and directory delimiters
  let clean = filename.replace(/^.*[\\/]/, '');
  clean = clean.replace(/(\.\.[/\\])+/g, '');
  clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Truncate to maximum 120 characters while preserving extension
  if (clean.length > 120) {
    const ext = clean.substring(clean.lastIndexOf('.'));
    clean = clean.substring(0, 120 - ext.length) + ext;
  }
  
  return clean || 'report_sanitized.txt';
}

/**
 * Validates uploaded file size, MIME type, and extension before processing.
 */
export function validateFileUpload(file: { name: string; size: number; type: string }): {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
} {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // 1. File size validation
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 5 MB limit (Received: ${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'Uploaded file is empty (0 bytes).' };
  }

  // 2. Extension validation
  const lowerName = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasAllowedExt) {
    return {
      valid: false,
      error: `Unsupported file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}.`,
    };
  }

  // 3. MIME type validation (when MIME type is reported by browser)
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Unsupported MIME type "${file.type}". Please upload a supported medical text, CSV, PDF, or image file.`,
    };
  }

  // 4. Safe filename generation
  const safeName = sanitizeFilename(file.name);

  return { valid: true, sanitizedName: safeName };
}

/**
 * Validates input text length to protect against ReDoS and memory exhaustion.
 */
export function validateInputLength(text: string, maxLen: number = MAX_TEXT_INPUT_LENGTH): {
  valid: boolean;
  error?: string;
} {
  if (typeof text !== 'string') {
    return { valid: true };
  }
  if (text.length > maxLen) {
    return {
      valid: false,
      error: `Input exceeds maximum allowed length of ${maxLen.toLocaleString()} characters.`,
    };
  }
  return { valid: true };
}

/**
 * Role-Based Access Control (RBAC) verification.
 * Prevents privilege escalation and unauthorized operations.
 */
export function hasRequiredRole(userRole: Role, allowedRoles: Role | Role[]): boolean {
  if (!userRole) return false;
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(userRole);
}

/**
 * Insecure Direct Object Reference (IDOR) mitigation for patient records.
 * Doctors and Administrators can access all clinical records.
 * Patients are strictly restricted to their own patient ID.
 */
export function canAccessPatientData(
  userRole: Role,
  userProfileId: string,
  targetPatientId: string,
  userPatientId?: string
): boolean {
  if (userRole === 'doctor' || userRole === 'admin') {
    return true;
  }
  if (userRole === 'patient') {
    // Patient can only access records where targetPatientId matches their assigned patient identity
    return !!(userPatientId && userPatientId === targetPatientId);
  }
  return false;
}

/**
 * Formats error objects into safe, user-facing error messages.
 * Prevents leakage of internal stack traces, database schema details, or API keys.
 */
export function toSafeErrorMessage(err: unknown, fallbackMessage: string = 'An unexpected error occurred.'): string {
  if (!err) return fallbackMessage;
  if (err instanceof Error) {
    const msg = err.message || '';
    // Mask sensitive operational errors
    if (
      msg.includes('connection refused') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('fetch failed') ||
      msg.includes('AuthRetryableFetchError')
    ) {
      return 'The clinical server is currently unreachable. Operating securely in offline verification mode.';
    }
    if (msg.toLowerCase().includes('duplicate key') || msg.toLowerCase().includes('violates foreign key')) {
      return 'Database constraint error: Invalid or duplicate reference.';
    }
    if (msg.includes('JWT') || msg.includes('token')) {
      return 'Authentication session expired or invalid. Please sign in again.';
    }
    // Return sanitized message without stack traces
    return sanitizeInput(msg.split('\n')[0]);
  }
  return fallbackMessage;
}
