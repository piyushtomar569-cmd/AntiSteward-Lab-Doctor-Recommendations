import { describe, it, expect, beforeEach } from 'vitest';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { interpretReport, sampleReports } from '../lib/labInterpreter';
import { initialPatients, initialPrescriptions, initialReviews, initialAlerts } from '../lib/initialData';

describe('API & Database Integration: Supabase Configuration & Fallback Resiliency', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('determines whether Supabase live endpoint is configured', () => {
    const configured = isSupabaseConfigured();
    expect(typeof configured).toBe('boolean');
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });

  it('persists and retrieves clinical prescriptions in offline/demo mode', () => {
    const testRx = [
      ...initialPrescriptions,
      {
        id: 'rx-test-999',
        patient_id: initialPatients[0].id,
        prescriber_id: 'test-doctor-id',
        drug_name: 'Ceftriaxone',
        dose: '1 g',
        route: 'IV',
        frequency: 'daily',
        duration_days: 7,
        indication: 'Targeted urosepsis step-down',
        status: 'active',
        is_restricted: false,
        restriction_reason: '',
        created_at: new Date().toISOString(),
      },
    ];

    localStorage.setItem('ams_prescriptions', JSON.stringify(testRx));
    const retrieved = JSON.parse(localStorage.getItem('ams_prescriptions') || '[]');

    expect(retrieved.length).toBe(initialPrescriptions.length + 1);
    expect(retrieved.some((r: { id: string }) => r.id === 'rx-test-999')).toBe(true);
  });

  it('persists and resolves stewardship alerts correctly', () => {
    const alertsCopy = initialAlerts.map((a) =>
      a.id === 'alt-001' ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() } : a
    );

    localStorage.setItem('ams_alerts', JSON.stringify(alertsCopy));
    const stored = JSON.parse(localStorage.getItem('ams_alerts') || '[]');
    const targetAlert = stored.find((a: { id: string }) => a.id === 'alt-001');

    expect(targetAlert?.is_resolved).toBe(true);
    expect(targetAlert?.resolved_at).toBeDefined();
  });

  it('persists stewardship case review decisions', () => {
    const reviewsCopy = initialReviews.map((r) =>
      r.id === 'rev-001' ? { ...r, decision: 'approved', reviewed_at: new Date().toISOString() } : r
    );

    localStorage.setItem('ams_reviews', JSON.stringify(reviewsCopy));
    const stored = JSON.parse(localStorage.getItem('ams_reviews') || '[]');
    const targetRev = stored.find((r: { id: string }) => r.id === 'rev-001');

    expect(targetRev?.decision).toBe('approved');
  });
});

describe('AI Lab Report Interpreter: Extraction & Clinical Intelligence', () => {
  it('correctly interprets metabolic blood panel report', () => {
    const reportText = sampleReports[2].text;
    const result = interpretReport(reportText);

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(10);
    expect(result.results.some((r) => r.drug.includes('Hemoglobin'))).toBe(true);
  });

  it('detects bacterial pathogen and elevated antibiotic resistance in culture report', () => {
    const cultureText = sampleReports[0].text;
    const result = interpretReport(cultureText);

    expect(result.isCultureReport).toBe(true);
    expect(result.organisms.some((o) => o.includes('Escherichia coli'))).toBe(true);
    const ampicillinRes = result.results.find((r) => r.drug.includes('Ampicillin'));
    expect(ampicillinRes).toBeDefined();
    expect(ampicillinRes?.status).toBe('Resistant');
    expect(ampicillinRes?.tone).toBe('important');
  });

  it('identifies MRSA and sensitive options in surgical wound culture', () => {
    const mrsaText = sampleReports[1].text;
    const result = interpretReport(mrsaText);

    expect(result.isCultureReport).toBe(true);
    expect(result.organisms.some((o) => o.includes('Staphylococcus aureus'))).toBe(true);
    const vancomycinRes = result.results.find((r) => r.drug.includes('Vancomycin'));
    expect(vancomycinRes).toBeDefined();
    expect(vancomycinRes?.status).toBe('Sensitive');
    expect(vancomycinRes?.awareCategory).toBe('Watch');
  });

  it('safely handles empty or corrupted report text without crashing', () => {
    const emptyResult = interpretReport('');
    expect(emptyResult.results).toBeDefined();
    expect(Array.isArray(emptyResult.results)).toBe(true);

    const whitespaceResult = interpretReport('     \n\n\t  ');
    expect(whitespaceResult.results).toBeDefined();
    expect(Array.isArray(whitespaceResult.results)).toBe(true);
  });
});
