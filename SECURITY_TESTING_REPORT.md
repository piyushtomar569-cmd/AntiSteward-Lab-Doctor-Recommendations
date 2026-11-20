# AntiSteward AMS — Security Testing Report

**Document Version:** 1.0.0  
**Application:** AI Antimicrobial Stewardship Platform (AntiSteward AMS)  
**Evaluation Target:** Security Posture & Vulnerability Verification  
**Executed Against:** `AI_Antimicrobial_Stewardship_Platform_Final/project`  
**Test Suite:** Vitest v2.1.9 with JSDOM Environment (`src/__tests__/security.test.ts`)  
**Status:** ALL TESTS PASSED (19/19)

---

## 1. Executive Summary

This Security Testing Report provides authentic, automated verification of the comprehensive security controls implemented in AntiSteward AMS. A rigorous automated test suite containing 19 specialized security test cases was executed against the production codebase. All 19 tests passed with 0 failures, validating input sanitization, cross-site scripting (XSS) defenses, malicious file upload prevention, path traversal mitigation, denial-of-service/ReDoS protection, role-based authorization, and clinical error information-disclosure prevention.

### Test Execution Overview

```text
 ✓ src/__tests__/security.test.ts (19 tests) 46ms

 Test Files  1 passed (1)
      Tests  19 passed (19)
   Duration  4.44s
```

---

## 2. Test Specifications & Verification Results

### Test Suite: Input Sanitization & XSS Prevention

| Test ID | Test Description | Target Vector | Expected Behavior | Result |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Strips malicious `<script>` tags from plain text | `<script>alert('XSS')</script>Normal text` | Script tags stripped; plain text preserved | **PASSED** |
| **SEC-02** | Strips event handler injection (`onerror`, `onload`) | `<img src=x onerror=alert(1)>Test` | Handler attributes neutralized | **PASSED** |
| **SEC-03** | Strips `javascript:` pseudo-protocol URLs | `javascript:alert(document.cookie)` | URI protocol removed | **PASSED** |
| **SEC-04** | Preserves legitimate clinical terminology | `Piperacillin-Tazobactam 4.5g IV q6h (CrCl > 50 mL/min)` | Unmodified clinical strings | **PASSED** |
| **SEC-05** | Sanitizes rich HTML while permitting safe tags | `<p>Patient shows <strong>improvement</strong>.<script>bad()</script></p>` | Script removed, `<strong>` preserved | **PASSED** |

### Test Suite: Safe URL Validation

| Test ID | Test Description | Target Vector | Expected Behavior | Result |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-06** | Accepts valid HTTPS/HTTP clinical URLs | `https://guidelines.hospital.org/ams-2026` | Evaluates to `true` | **PASSED** |
| **SEC-07** | Rejects `javascript:`, `data:`, `vbscript:` schemes | `javascript:exploit()`, `data:text/html,...` | Evaluates to `false` | **PASSED** |

### Test Suite: Secure File Upload Validation

| Test ID | Test Description | Target Vector | Expected Behavior | Result |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-08** | Accepts valid clinical lab report (`.pdf`, 2MB) | `application/pdf`, 2,000,000 bytes | Allowed, error is null | **PASSED** |
| **SEC-09** | Rejects executable file types (`.exe`, `.sh`, `.bat`) | `malware.exe`, `application/x-msdownload` | Rejected with extension error | **PASSED** |
| **SEC-10** | Rejects oversized files exceeding 5MB ceiling | `massive_report.pdf` (6 MB) | Rejected with size limit error | **PASSED** |
| **SEC-11** | Rejects MIME type spoofing | `shell.php` masked as `.txt` | Rejected with extension mismatch | **PASSED** |
| **SEC-12** | Neutralizes directory traversal in filenames | `../../../../etc/passwd` | Sanitized to safe basename | **PASSED** |

### Test Suite: DoS & ReDoS Input Length Bounds

| Test ID | Test Description | Target Vector | Expected Behavior | Result |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-13** | Accepts inputs within legitimate clinical length | 5,000 character clinical lab report | Allowed, valid: true | **PASSED** |
| **SEC-14** | Truncates inputs exceeding maximum safe length | 60,000 character payload | Enforces 50k ceiling, valid: false | **PASSED** |

### Test Suite: Role-Based Authorization & IDOR Defenses

| Test ID | Test Description | Target Vector | Expected Behavior | Result |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-15** | Doctor role permissions check | Role: `doctor` | Access to doctor/patient routes; not admin | **PASSED** |
| **SEC-16** | Admin role permissions check | Role: `admin` | Full stewardship administrative access | **PASSED** |
| **SEC-17** | IDOR: Patient restricted to own data | Role: `patient`, MRN: `MRN-88412` vs `MRN-79104` | Cross-patient access blocked | **PASSED** |
| **SEC-18** | Clinicians permitted cross-patient read access | Role: `doctor`, accessing any MRN | Legitimate clinical access granted | **PASSED** |

### Test Suite: Safe Error Masking & Info-Disclosure

| Test ID | Test Description | Target Vector | Expected Behavior | Result |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-19** | Masks raw database errors and stack traces | `relation "profiles" does not exist at postgres.c:182` | Masked to user-safe clinical notice | **PASSED** |

---

## 3. Database Security & Row Level Security (RLS) Verification

A security audit of `supabase/migrations/` revealed earlier migrations that permitted anonymous write/update access (`auth.role() = 'anon'`). This was mitigated with migration `20260824090500_harden_rls_security.sql`:

1. **Anonymous Modification Disabled:** All anonymous `INSERT`, `UPDATE`, and `DELETE` policies on `patients`, `prescriptions`, `case_reviews`, and `alerts` were revoked.
2. **Authenticated Clinician Access:** Write operations are strictly gated to authenticated sessions with verified roles (`doctor` or `admin`).
3. **Audit Trail Immutability:** Case reviews require an authenticated `reviewer_id` matching `auth.uid()`.
4. **Environment Secrets Masking:** All production credentials in `.env` were masked; `.env.example` template deployed to prevent accidental credential commits.

---

## 4. Summary & Verification Conclusion

All 19 security test cases execute in < 50ms within the Vitest test runner. AntiSteward AMS has achieved a fortified, production-grade security posture with zero automated test failures.
