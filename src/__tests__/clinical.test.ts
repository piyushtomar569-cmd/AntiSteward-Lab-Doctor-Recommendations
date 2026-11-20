import { describe, it, expect } from 'vitest';
import {
  calculateCrCl,
  checkRenalDosingAdjustment,
  detectAllergyConflict,
  hospitalAntibiogram,
  checkDeEscalationOpportunity,
} from '../lib/clinical';
import { getAWaReCategory } from '../lib/labInterpreter';

describe('Clinical Engine: Cockcroft-Gault Creatinine Clearance', () => {
  it('calculates normal CrCl for a 52-year-old female (Sofia Martinez)', () => {
    // Age 52, Weight 64 kg, Serum Cr 0.9 mg/dL, Female (0.85 factor)
    // CrCl = ((140 - 52) * 64) / (72 * 0.9) * 0.85 = (88 * 64) / 64.8 * 0.85 = 86.9 * 0.85 = 73.88 mL/min
    const result = calculateCrCl(52, 64, 0.9, true);
    expect(result.crCl).toBeCloseTo(73.9, 1);
    expect(result.staging).toBe('Mild Impairment');
    expect(result.isImpaired).toBe(false);
    expect(result.needsRenalDoseReview).toBe(false);
  });

  it('calculates moderate-to-severe renal impairment for John Miller', () => {
    // Age 68, Weight 76 kg, Serum Cr 1.8 mg/dL, Male (1.0 factor)
    // CrCl = ((140 - 68) * 76) / (72 * 1.8) = (72 * 76) / 129.6 = 42.2 mL/min
    const result = calculateCrCl(68, 76, 1.8, false);
    expect(result.crCl).toBeCloseTo(42.2, 1);
    expect(result.staging).toBe('Moderate Impairment');
    expect(result.isImpaired).toBe(true);
    expect(result.needsRenalDoseReview).toBe(true);
    expect(result.warningNote).toContain('Moderate renal impairment');
  });

  it('calculates severe renal impairment for Robert Chen', () => {
    // Age 71, Weight 82 kg, Serum Cr 2.1 mg/dL, Male
    // CrCl = ((140 - 71) * 82) / (72 * 2.1) = (69 * 82) / 151.2 = 37.4 mL/min
    const result = calculateCrCl(71, 82, 2.1, false);
    expect(result.crCl).toBeCloseTo(37.4, 1);
    expect(result.staging).toBe('Moderate Impairment');
    expect(result.isImpaired).toBe(true);
  });

  it('correctly applies the female gender coefficient (0.85 multiplier)', () => {
    const maleResult = calculateCrCl(40, 70, 1.0, false);
    const femaleResult = calculateCrCl(40, 70, 1.0, true);
    expect(femaleResult.crCl).toBeCloseTo(maleResult.crCl * 0.85, 1);
  });

  it('enforces a minimum serum creatinine floor (0.4 mg/dL) to prevent overestimation in cachectic patients', () => {
    const veryLowCrResult = calculateCrCl(50, 50, 0.2, false);
    const flooredCrResult = calculateCrCl(50, 50, 0.4, false);
    expect(veryLowCrResult.crCl).toBe(flooredCrResult.crCl);
  });

  it('handles invalid clinical parameters safely without throwing', () => {
    const zeroAge = calculateCrCl(0, 70, 1.0, false);
    expect(zeroAge.crCl).toBe(0);
    expect(zeroAge.isImpaired).toBe(true);

    const negativeCr = calculateCrCl(50, 70, -1.0, false);
    expect(negativeCr.crCl).toBe(0);
    expect(negativeCr.isImpaired).toBe(true);
  });
});

describe('Clinical Engine: Renal Dose Adjustment Rules', () => {
  it('triggers critical dose reduction for Meropenem when CrCl < 26 mL/min', () => {
    const adj = checkRenalDosingAdjustment('Meropenem', 22, '1 g IV q8h');
    expect(adj.requiresAdjustment).toBe(true);
    expect(adj.riskSeverity).toBe('critical');
    expect(adj.recommendedDose).toContain('500 mg');
    expect(adj.clinicalRationale).toContain('neurotoxicity');
  });

  it('triggers moderate-to-high dose reduction for Meropenem when CrCl is 26-50 mL/min', () => {
    const adj = checkRenalDosingAdjustment('Meropenem', 42, '1 g IV q8h');
    expect(adj.requiresAdjustment).toBe(true);
    expect(adj.riskSeverity).toBe('high');
    expect(adj.recommendedDose).toContain('q12h');
  });

  it('permits standard Meropenem dosing when CrCl > 50 mL/min', () => {
    const adj = checkRenalDosingAdjustment('Meropenem', 85, '1 g IV q8h');
    expect(adj.requiresAdjustment).toBe(false);
    expect(adj.riskSeverity).toBe('low');
  });

  it('recommends Piperacillin-Tazobactam reduction when CrCl < 20 mL/min', () => {
    const adj = checkRenalDosingAdjustment('Piperacillin-Tazobactam', 18, '4.5 g IV q6h');
    expect(adj.requiresAdjustment).toBe(true);
    expect(adj.riskSeverity).toBe('high');
    expect(adj.recommendedDose).toBe('2.25 g IV q8h');
  });

  it('recommends Vancomycin extended interval and mandatory TDM when CrCl < 50 mL/min', () => {
    const adj = checkRenalDosingAdjustment('Vancomycin', 35, '1.25 g IV q12h');
    expect(adj.requiresAdjustment).toBe(true);
    expect(adj.recommendedDose).toContain('trough');
  });

  it('alerts on Cefepime-induced neurotoxicity risk when CrCl < 30 mL/min', () => {
    const adj = checkRenalDosingAdjustment('Cefepime', 25, '2 g IV q8h');
    expect(adj.requiresAdjustment).toBe(true);
    expect(adj.riskSeverity).toBe('critical');
    expect(adj.clinicalRationale).toContain('neurotoxicity');
  });
});

describe('Clinical Engine: Allergy Contraindication Detection', () => {
  it('flags direct penicillin allergy conflict with Piperacillin-Tazobactam', () => {
    const conflict = detectAllergyConflict(
      'Piperacillin-Tazobactam',
      'Penicillin (hives & anaphylaxis risk)'
    );
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.severity).toBe('critical');
    expect(conflict.conflictType).toContain('Direct Penicillin');
  });

  it('flags beta-lactam cross-reactivity caution for cephalosporin with penicillin allergy', () => {
    const conflict = detectAllergyConflict(
      'Ceftriaxone',
      'Penicillin (anaphylaxis)'
    );
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.severity).toBe('moderate');
    expect(conflict.warning).toContain('cross-reactivity');
  });

  it('flags direct cephalosporin allergy conflict with Cefepime', () => {
    const conflict = detectAllergyConflict(
      'Cefepime',
      'Cephalosporins (severe rash)'
    );
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.severity).toBe('critical');
  });

  it('flags direct sulfa allergy conflict with Bactrim', () => {
    const conflict = detectAllergyConflict(
      'Trimethoprim-Sulfamethoxazole',
      'Sulfa antibiotics (severe skin rash)'
    );
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.severity).toBe('critical');
  });

  it('returns no conflict when patient has no known allergies', () => {
    const conflict = detectAllergyConflict(
      'Vancomycin',
      'No known drug allergies'
    );
    expect(conflict.hasConflict).toBe(false);
    expect(conflict.severity).toBe('none');
  });
});

describe('Clinical Engine: Antibiogram & Pathogen Susceptibility Matrix', () => {
  it('contains institutional isolates for major Gram-negative and Gram-positive pathogens', () => {
    expect(hospitalAntibiogram.length).toBeGreaterThanOrEqual(4);
    const organisms = hospitalAntibiogram.map((e) => e.organism);
    expect(organisms.some((o) => o.includes('Escherichia coli'))).toBe(true);
    expect(organisms.some((o) => o.includes('Pseudomonas aeruginosa'))).toBe(true);
    expect(organisms.some((o) => o.includes('Staphylococcus aureus'))).toBe(true);
  });

  it('classifies antimicrobial agents under WHO AWaRe categories', () => {
    expect(getAWaReCategory('Amoxicillin')).toBe('Access');
    expect(getAWaReCategory('Ceftriaxone')).toBe('Watch');
    expect(getAWaReCategory('Meropenem')).toBe('Watch');
    expect(getAWaReCategory('Colistin')).toBe('Reserve');
    expect(getAWaReCategory('Linezolid')).toBe('Reserve');
  });
});

describe('Clinical Engine: De-escalation Opportunity Rules', () => {
  it('recommends de-escalating from Meropenem to Ceftriaxone when E. coli is sensitive', () => {
    const deesc = checkDeEscalationOpportunity(
      'Meropenem',
      'Escherichia coli',
      ['Ceftriaxone', 'Ciprofloxacin', 'Meropenem']
    );
    expect(deesc.canDeEscalate).toBe(true);
    expect(deesc.recommendedNarrowerDrug).toContain('Ceftriaxone');
    expect(deesc.rationale).toContain('preserves carbapenem utility');
  });

  it('does not prompt de-escalation when current drug matches narrowest susceptibility', () => {
    const deesc = checkDeEscalationOpportunity(
      'Ceftriaxone',
      'Escherichia coli',
      ['Ceftriaxone', 'Meropenem']
    );
    expect(deesc.canDeEscalate).toBe(false);
  });
});
