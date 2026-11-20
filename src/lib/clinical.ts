/**
 * AI Antimicrobial Stewardship Platform (AntiSteward AMS)
 * Clinical Decision Support & Pharmacokinetic Calculation Engine
 * 
 * Compliant with:
 * - Cockcroft-Gault Creatinine Clearance (CrCl) calculation guidelines
 * - IDSA / SHEA Antimicrobial Stewardship Guidelines
 * - CDC Core Elements of Hospital Antibiotic Stewardship Programs
 * - WHO AWaRe Classification (Access, Watch, Reserve)
 */

export interface CrClResult {
  crCl: number;
  staging: 'Normal / Stage 1' | 'Mild Impairment' | 'Moderate Impairment' | 'Severe Impairment' | 'Kidney Failure (ESRD)';
  isImpaired: boolean;
  needsRenalDoseReview: boolean;
  warningNote?: string;
}

export interface RenalDoseAdjustment {
  requiresAdjustment: boolean;
  currentDose: string;
  recommendedDose: string;
  riskSeverity: 'low' | 'moderate' | 'high' | 'critical';
  clinicalRationale: string;
}

export interface AllergyConflictResult {
  hasConflict: boolean;
  severity: 'none' | 'moderate' | 'critical';
  conflictType: string;
  warning: string;
}

export interface AntibiogramEntry {
  id: string;
  organism: string;
  isolateCount: number;
  gramStain: 'Gram-Negative' | 'Gram-Positive';
  susceptibilities: {
    antibiotic: string;
    susceptibleRate: number; // 0 to 100%
    awareCategory: 'Access' | 'Watch' | 'Reserve';
  }[];
}

/**
 * Calculates estimated Creatinine Clearance using the Cockcroft-Gault Equation.
 * 
 * Formula:
 * CrCl (mL/min) = [ (140 - age) * weightKg ] / [ 72 * serumCrMgDl ] * (0.85 if female)
 */
export function calculateCrCl(
  age: number,
  weightKg: number,
  serumCrMgDl: number,
  isFemale: boolean
): CrClResult {
  if (age <= 0 || weightKg <= 0 || serumCrMgDl <= 0) {
    return {
      crCl: 0,
      staging: 'Kidney Failure (ESRD)',
      isImpaired: true,
      needsRenalDoseReview: true,
      warningNote: 'Invalid clinical parameters provided for CrCl calculation.',
    };
  }

  // Cap serum creatinine at min 0.4 mg/dL to avoid overestimating clearance in cachectic patients
  const adjustedCr = Math.max(serumCrMgDl, 0.4);
  const factor = isFemale ? 0.85 : 1.0;
  const rawCrCl = ((140 - age) * weightKg) / (72 * adjustedCr) * factor;
  const crCl = Math.round(rawCrCl * 10) / 10;

  if (crCl >= 90) {
    return {
      crCl,
      staging: 'Normal / Stage 1',
      isImpaired: false,
      needsRenalDoseReview: false,
    };
  } else if (crCl >= 60) {
    return {
      crCl,
      staging: 'Mild Impairment',
      isImpaired: false,
      needsRenalDoseReview: false,
    };
  } else if (crCl >= 30) {
    return {
      crCl,
      staging: 'Moderate Impairment',
      isImpaired: true,
      needsRenalDoseReview: true,
      warningNote: 'Moderate renal impairment: Review renally cleared antimicrobials for dose reduction.',
    };
  } else if (crCl >= 15) {
    return {
      crCl,
      staging: 'Severe Impairment',
      isImpaired: true,
      needsRenalDoseReview: true,
      warningNote: 'Severe renal impairment: Mandatory dose/frequency adjustment required to prevent toxicity.',
    };
  } else {
    return {
      crCl,
      staging: 'Kidney Failure (ESRD)',
      isImpaired: true,
      needsRenalDoseReview: true,
      warningNote: 'ESRD / severe failure: Nephrology and clinical pharmacy consultation strongly advised.',
    };
  }
}

/**
 * Evaluates whether a prescribed antibiotic requires renal dosage adjustment
 * based on Cockcroft-Gault CrCl and known drug clearance pathways.
 */
export function checkRenalDosingAdjustment(
  drugName: string,
  crCl: number,
  currentDose: string
): RenalDoseAdjustment {
  const normDrug = drugName.toLowerCase().trim();

  // Meropenem
  if (normDrug.includes('meropenem')) {
    if (crCl < 26) {
      return {
        requiresAdjustment: true,
        currentDose,
        recommendedDose: '500 mg IV q12h or 500 mg IV q24h',
        riskSeverity: 'critical',
        clinicalRationale: `CrCl is ${crCl} mL/min (< 26 mL/min). Standard Meropenem dosing causes systemic accumulation and increases seizure/neurotoxicity risk.`,
      };
    } else if (crCl <= 50) {
      return {
        requiresAdjustment: true,
        currentDose,
        recommendedDose: '1 g IV q12h or 500 mg IV q8h',
        riskSeverity: 'high',
        clinicalRationale: `CrCl is ${crCl} mL/min (26-50 mL/min). Moderate renal insufficiency warrants reduction from standard 1g q8h.`,
      };
    }
  }

  // Piperacillin-Tazobactam (Zosyn)
  if (normDrug.includes('piperacillin') || normDrug.includes('tazobactam')) {
    if (crCl < 20) {
      return {
        requiresAdjustment: true,
        currentDose,
        recommendedDose: '2.25 g IV q8h',
        riskSeverity: 'high',
        clinicalRationale: `CrCl is ${crCl} mL/min (< 20 mL/min). Standard 4.5g q6h causes piperacillin accumulation and acute kidney injury risk.`,
      };
    } else if (crCl <= 40) {
      return {
        requiresAdjustment: true,
        currentDose,
        recommendedDose: '3.375 g IV q6h',
        riskSeverity: 'moderate',
        clinicalRationale: `CrCl is ${crCl} mL/min (20-40 mL/min). Recommend moderate dose reduction to 3.375g q6h.`,
      };
    }
  }

  // Vancomycin
  if (normDrug.includes('vancomycin')) {
    if (crCl < 30) {
      return {
        requiresAdjustment: true,
        currentDose,
        recommendedDose: 'Weight-based 15 mg/kg IV q24-48h with mandatory pre-dose trough level',
        riskSeverity: 'critical',
        clinicalRationale: `Severe renal impairment (CrCl ${crCl} mL/min). High risk of vancomycin-induced nephrotoxicity and ototoxicity.`,
      };
    } else if (crCl < 50) {
      return {
        requiresAdjustment: true,
        currentDose,
        recommendedDose: 'Weight-based 15 mg/kg IV q24h with trough level monitoring',
        riskSeverity: 'high',
        clinicalRationale: `CrCl ${crCl} mL/min (< 50 mL/min). Extended interval dosing required.`,
      };
    }
  }

  // Cefepime
  if (normDrug.includes('cefepime')) {
    if (crCl < 30) {
      return {
        requiresAdjustment: true,
        currentDose,
        recommendedDose: '1 g IV q24h',
        riskSeverity: 'critical',
        clinicalRationale: `CrCl ${crCl} mL/min (< 30 mL/min). Unadjusted Cefepime carries severe risk of Cefepime-induced neurotoxicity (CIN) and encephalopathy.`,
      };
    } else if (crCl <= 50) {
      return {
        requiresAdjustment: true,
        currentDose,
        recommendedDose: '2 g IV q12h or 1 g IV q12h',
        riskSeverity: 'high',
        clinicalRationale: `CrCl ${crCl} mL/min (30-50 mL/min). Reduce dosing interval to every 12 hours.`,
      };
    }
  }

  // Ciprofloxacin
  if (normDrug.includes('ciprofloxacin')) {
    if (crCl < 30) {
      return {
        requiresAdjustment: true,
        currentDose,
        recommendedDose: '250-500 mg PO/IV q24h',
        riskSeverity: 'moderate',
        clinicalRationale: `CrCl ${crCl} mL/min (< 30 mL/min). Renal clearance reduced; reduce dose frequency to q24h.`,
      };
    }
  }

  return {
    requiresAdjustment: false,
    currentDose,
    recommendedDose: currentDose,
    riskSeverity: 'low',
    clinicalRationale: 'Current renal clearance is sufficient for standard dosing protocol.',
  };
}

/**
 * Detects potential allergy contraindications and cross-reactivity risks.
 */
export function detectAllergyConflict(drugName: string, allergyNotes: string): AllergyConflictResult {
  const normDrug = drugName.toLowerCase();
  const normAllergy = allergyNotes.toLowerCase();

  if (!normAllergy || normAllergy.includes('no known') || normAllergy.includes('none known')) {
    return {
      hasConflict: false,
      severity: 'none',
      conflictType: 'None',
      warning: 'No known drug allergies reported.',
    };
  }

  // Penicillin allergy cross-reactivity
  if (normAllergy.includes('penicillin')) {
    if (normDrug.includes('penicillin') || normDrug.includes('ampicillin') || normDrug.includes('amoxicillin') || normDrug.includes('piperacillin')) {
      return {
        hasConflict: true,
        severity: 'critical',
        conflictType: 'Direct Penicillin Class Allergy',
        warning: `CRITICAL CONTRAINDICATION: Patient has documented Penicillin allergy. Prescribed drug (${drugName}) contains penicillin moiety. High risk of anaphylaxis/severe reaction.`,
      };
    }
    // Carbapenems or Cephalosporins cross-reactivity check (low cross-reactivity, moderate alert)
    if (normDrug.includes('cef') || normDrug.includes('meropenem') || normDrug.includes('ertapenem')) {
      return {
        hasConflict: true,
        severity: 'moderate',
        conflictType: 'Beta-Lactam Cross-Reactivity Risk',
        warning: `CAUTION: Patient has documented Penicillin allergy. Beta-lactam cross-reactivity with ${drugName} is estimated at 1-3%. Monitor closely for hypersensitivity.`,
      };
    }
  }

  // Cephalosporin allergy
  if (normAllergy.includes('cephalosporin') && (normDrug.includes('cef') || normDrug.includes('keflex'))) {
    return {
      hasConflict: true,
      severity: 'critical',
      conflictType: 'Direct Cephalosporin Allergy',
      warning: `CRITICAL CONTRAINDICATION: Documented Cephalosporin allergy conflicts directly with prescribed ${drugName}.`,
    };
  }

  // Sulfa allergy
  if (normAllergy.includes('sulfa') && (normDrug.includes('bactrim') || normDrug.includes('sulfamethoxazole') || normDrug.includes('trimethoprim-sulfamethoxazole'))) {
    return {
      hasConflict: true,
      severity: 'critical',
      conflictType: 'Sulfonamide Class Allergy',
      warning: `CRITICAL CONTRAINDICATION: Documented Sulfa allergy conflicts directly with ${drugName}.`,
    };
  }

  // Vancomycin allergy
  if (normAllergy.includes('vancomycin') && normDrug.includes('vancomycin')) {
    return {
      hasConflict: true,
      severity: 'critical',
      conflictType: 'Glycopeptide Allergy',
      warning: `CRITICAL CONTRAINDICATION: Documented Vancomycin allergy.`,
    };
  }

  return {
    hasConflict: false,
    severity: 'none',
    conflictType: 'None',
    warning: 'No cross-reactivity detected with documented allergies.',
  };
}

/**
 * Standard local hospital Antibiogram dataset.
 */
export const hospitalAntibiogram: AntibiogramEntry[] = [
  {
    id: 'abg-001',
    organism: 'Escherichia coli (Urinary & Blood)',
    isolateCount: 428,
    gramStain: 'Gram-Negative',
    susceptibilities: [
      { antibiotic: 'Ampicillin', susceptibleRate: 42, awareCategory: 'Access' },
      { antibiotic: 'Ceftriaxone', susceptibleRate: 88, awareCategory: 'Watch' },
      { antibiotic: 'Ciprofloxacin', susceptibleRate: 74, awareCategory: 'Watch' },
      { antibiotic: 'Nitrofurantoin', susceptibleRate: 94, awareCategory: 'Access' },
      { antibiotic: 'Piperacillin-Tazobactam', susceptibleRate: 93, awareCategory: 'Watch' },
      { antibiotic: 'Meropenem', susceptibleRate: 99, awareCategory: 'Watch' },
      { antibiotic: 'Amikacin', susceptibleRate: 98, awareCategory: 'Access' },
    ],
  },
  {
    id: 'abg-002',
    organism: 'Klebsiella pneumoniae',
    isolateCount: 215,
    gramStain: 'Gram-Negative',
    susceptibilities: [
      { antibiotic: 'Ampicillin', susceptibleRate: 2, awareCategory: 'Access' },
      { antibiotic: 'Ceftriaxone', susceptibleRate: 81, awareCategory: 'Watch' },
      { antibiotic: 'Ciprofloxacin', susceptibleRate: 78, awareCategory: 'Watch' },
      { antibiotic: 'Piperacillin-Tazobactam', susceptibleRate: 89, awareCategory: 'Watch' },
      { antibiotic: 'Meropenem', susceptibleRate: 97, awareCategory: 'Watch' },
      { antibiotic: 'Ceftazidime-Avibactam', susceptibleRate: 99, awareCategory: 'Reserve' },
    ],
  },
  {
    id: 'abg-003',
    organism: 'Pseudomonas aeruginosa',
    isolateCount: 142,
    gramStain: 'Gram-Negative',
    susceptibilities: [
      { antibiotic: 'Ceftazidime', susceptibleRate: 86, awareCategory: 'Watch' },
      { antibiotic: 'Cefepime', susceptibleRate: 88, awareCategory: 'Watch' },
      { antibiotic: 'Piperacillin-Tazobactam', susceptibleRate: 85, awareCategory: 'Watch' },
      { antibiotic: 'Meropenem', susceptibleRate: 82, awareCategory: 'Watch' },
      { antibiotic: 'Ciprofloxacin', susceptibleRate: 76, awareCategory: 'Watch' },
      { antibiotic: 'Tobramycin', susceptibleRate: 94, awareCategory: 'Access' },
      { antibiotic: 'Colistin', susceptibleRate: 99, awareCategory: 'Reserve' },
    ],
  },
  {
    id: 'abg-004',
    organism: 'Staphylococcus aureus (MRSA & MSSA)',
    isolateCount: 310,
    gramStain: 'Gram-Positive',
    susceptibilities: [
      { antibiotic: 'Oxacillin (MSSA)', susceptibleRate: 68, awareCategory: 'Access' },
      { antibiotic: 'Vancomycin', susceptibleRate: 100, awareCategory: 'Watch' },
      { antibiotic: 'Daptomycin', susceptibleRate: 99, awareCategory: 'Reserve' },
      { antibiotic: 'Linezolid', susceptibleRate: 99, awareCategory: 'Reserve' },
      { antibiotic: 'Trimethoprim-Sulfamethoxazole', susceptibleRate: 92, awareCategory: 'Access' },
      { antibiotic: 'Clindamycin', susceptibleRate: 76, awareCategory: 'Access' },
    ],
  },
];

/**
 * Checks if a de-escalation opportunity exists based on the cultured pathogen and susceptibilities.
 */
export function checkDeEscalationOpportunity(
  currentDrug: string,
  organism: string,
  susceptibleAntibiotics: string[]
): {
  canDeEscalate: boolean;
  recommendedNarrowerDrug: string;
  rationale: string;
} {
  const normCurrent = currentDrug.toLowerCase();

  // If currently on Meropenem or Piperacillin-Tazobactam and narrower drug is available
  if (normCurrent.includes('meropenem') || normCurrent.includes('piperacillin')) {
    if (susceptibleAntibiotics.some((a) => a.toLowerCase().includes('ceftriaxone'))) {
      return {
        canDeEscalate: true,
        recommendedNarrowerDrug: 'Ceftriaxone 1 g IV daily',
        rationale: `Isolated ${organism} is susceptible to Ceftriaxone. De-escalating from broad-spectrum ${currentDrug} reduces selective pressure for resistant pathogens (CRE, VRE) and preserves carbapenem utility.`,
      };
    }
    if (susceptibleAntibiotics.some((a) => a.toLowerCase().includes('cefazolin'))) {
      return {
        canDeEscalate: true,
        recommendedNarrowerDrug: 'Cefazolin 2 g IV q8h',
        rationale: `Isolate is fully susceptible to 1st-generation cephalosporin. De-escalate from broad-spectrum coverage.`,
      };
    }
  }

  return {
    canDeEscalate: false,
    recommendedNarrowerDrug: currentDrug,
    rationale: 'Current antimicrobial regimen matches clinical susceptibility and resistance guidelines.',
  };
}
