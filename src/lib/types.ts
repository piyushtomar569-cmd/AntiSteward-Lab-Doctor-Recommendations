export type Role = 'doctor' | 'patient' | 'admin';

export type Page =
  // Doctor Pages
  | 'overview'
  | 'patients'
  | 'prescriptions'
  | 'reviews'
  | 'alerts'
  | 'antibiogram'
  | 'lab-report'
  | 'analytics'
  | 'learning'
  | 'leaderboard'
  | 'doctor-profile'
  // Patient Pages
  | 'patient-dashboard'
  | 'patient-prescriptions'
  | 'patient-history'
  | 'patient-records'
  | 'patient-recommendations'
  | 'patient-notifications'
  | 'patient-appointments'
  | 'patient-profile'
  // Admin Pages
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-doctors'
  | 'admin-patients'
  | 'admin-analytics'
  | 'admin-reports'
  | 'admin-settings'
  | 'admin-profile';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  specialty: string;
  points: number;
  avatar_color: string;
  department?: string;
  mrn?: string;
}

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  sex: string;
  ward: string;
  weight_kg: number;
  creatinine_mg_dl: number;
  allergy_notes: string;
  diagnosis: string;
  admission_date?: string;
  attending_doctor?: string;
  isolation_status?: 'None' | 'Contact Precautions' | 'Droplet Precautions' | 'Strict Airborne';
}

export interface Prescription {
  id: string;
  patient_id: string;
  prescriber_id: string;
  drug_name: string;
  dose: string;
  route: string;
  frequency: string;
  duration_days: number;
  indication: string;
  status: string;
  is_restricted: boolean;
  restriction_reason: string;
  created_at: string;
  patient?: Patient;
  prescriber?: Profile;
  days_completed?: number;
  next_dose?: string;
  instructions?: string;
}

export interface CaseReview {
  id: string;
  prescription_id: string;
  reviewer_id: string;
  decision: string;
  ai_summary: string;
  stewardship_notes: string;
  severity: string;
  reviewed_at: string | null;
  prescription?: Prescription;
}

export interface Alert {
  id: string;
  prescription_id: string;
  patient_id: string;
  alert_type: string;
  severity: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
  patient?: Patient;
  prescription?: Prescription;
}

export interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty: string;
}

export interface PatientAppointment {
  id: string;
  patient_id: string;
  doctor_name: string;
  specialty: string;
  date_time: string;
  location: string;
  purpose: string;
  status: 'Scheduled' | 'Completed' | 'Upcoming';
}

export interface PatientNotification {
  id: string;
  patient_id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'reminder' | 'lab' | 'review' | 'alert';
}

export interface StewardshipReport {
  id: string;
  title: string;
  category: 'CDC Core Elements' | 'Antibiogram' | 'Restricted Formulary' | 'Monthly Audit';
  period: string;
  compliance_rate: number;
  generated_at: string;
  status: 'Ready' | 'Archived';
  file_size: string;
  summary: string;
}

export interface AdminSetting {
  id: string;
  key: string;
  title: string;
  description: string;
  value: boolean;
  category: 'formulary' | 'alerts' | 'protocols' | 'surveillance';
}

