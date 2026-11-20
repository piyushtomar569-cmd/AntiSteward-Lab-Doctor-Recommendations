/*
# AntiSteward Schema - Core Tables

## Overview
Creates the foundational schema for the AntiSteward antimicrobial stewardship platform.
This is a single-tenant demo app with no auth — all data is intentionally shared/public.
All policies use `TO anon, authenticated` so the anon-key frontend can read/write.

## New Tables
1. `profiles` — user profiles with role (doctor/admin), name, specialty, points
2. `patients` — synthetic patient records
3. `prescriptions` — antimicrobial prescriptions linked to patients
4. `case_reviews` — stewardship case reviews linked to prescriptions
5. `alerts` — stewardship alerts generated from prescriptions
6. `quiz_questions` — learning module questions
7. `quiz_attempts` — quiz attempts by users
8. `activity_log` — audit trail of user actions

## Security
- RLS enabled on all tables.
- All tables allow anon + authenticated CRUD (intentionally public shared demo data).
*/

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'doctor' CHECK (role IN ('doctor','admin')),
  specialty text DEFAULT 'General Medicine',
  points integer NOT NULL DEFAULT 0,
  avatar_color text DEFAULT '#0ea5e9',
  created_at timestamptz DEFAULT now()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text UNIQUE NOT NULL,
  name text NOT NULL,
  age integer NOT NULL,
  sex text CHECK (sex IN ('M','F','O')),
  ward text NOT NULL DEFAULT 'General',
  weight_kg numeric DEFAULT 70,
  creatinine_mg_dl numeric DEFAULT 1.0,
  allergy_notes text DEFAULT '',
  diagnosis text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescriber_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  drug_name text NOT NULL,
  dose text NOT NULL,
  route text NOT NULL DEFAULT 'PO',
  frequency text NOT NULL,
  duration_days integer NOT NULL DEFAULT 7,
  indication text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','discontinued')),
  is_restricted boolean NOT NULL DEFAULT false,
  restriction_reason text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Case Reviews
CREATE TABLE IF NOT EXISTS case_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','modified','discontinued')),
  ai_summary text DEFAULT '',
  stewardship_notes text DEFAULT '',
  severity text DEFAULT 'low' CHECK (severity IN ('low','moderate','high','critical')),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'moderate' CHECK (severity IN ('info','low','moderate','high','critical')),
  message text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  options text[] NOT NULL,
  correct_index integer NOT NULL,
  explanation text NOT NULL,
  difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  created_at timestamptz DEFAULT now()
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_index integer NOT NULL,
  is_correct boolean NOT NULL,
  time_spent_sec integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  detail text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_prescriber ON prescriptions(prescriber_id);
CREATE INDEX IF NOT EXISTS idx_case_reviews_prescription ON case_reviews(prescription_id);
CREATE INDEX IF NOT EXISTS idx_alerts_prescription ON alerts(prescription_id);
CREATE INDEX IF NOT EXISTS idx_alerts_patient ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper: generate policies for a table (anon + authenticated full access)
-- profiles
DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE TO anon, authenticated USING (true);

-- patients
DROP POLICY IF EXISTS "anon_select_patients" ON patients;
CREATE POLICY "anon_select_patients" ON patients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_patients" ON patients;
CREATE POLICY "anon_insert_patients" ON patients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_patients" ON patients;
CREATE POLICY "anon_update_patients" ON patients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_patients" ON patients;
CREATE POLICY "anon_delete_patients" ON patients FOR DELETE TO anon, authenticated USING (true);

-- prescriptions
DROP POLICY IF EXISTS "anon_select_prescriptions" ON prescriptions;
CREATE POLICY "anon_select_prescriptions" ON prescriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_prescriptions" ON prescriptions;
CREATE POLICY "anon_insert_prescriptions" ON prescriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_prescriptions" ON prescriptions;
CREATE POLICY "anon_update_prescriptions" ON prescriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_prescriptions" ON prescriptions;
CREATE POLICY "anon_delete_prescriptions" ON prescriptions FOR DELETE TO anon, authenticated USING (true);

-- case_reviews
DROP POLICY IF EXISTS "anon_select_case_reviews" ON case_reviews;
CREATE POLICY "anon_select_case_reviews" ON case_reviews FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_case_reviews" ON case_reviews;
CREATE POLICY "anon_insert_case_reviews" ON case_reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_case_reviews" ON case_reviews;
CREATE POLICY "anon_update_case_reviews" ON case_reviews FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_case_reviews" ON case_reviews;
CREATE POLICY "anon_delete_case_reviews" ON case_reviews FOR DELETE TO anon, authenticated USING (true);

-- alerts
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE TO anon, authenticated USING (true);

-- quiz_questions
DROP POLICY IF EXISTS "anon_select_quiz_questions" ON quiz_questions;
CREATE POLICY "anon_select_quiz_questions" ON quiz_questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_quiz_questions" ON quiz_questions;
CREATE POLICY "anon_insert_quiz_questions" ON quiz_questions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_quiz_questions" ON quiz_questions;
CREATE POLICY "anon_update_quiz_questions" ON quiz_questions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_quiz_questions" ON quiz_questions;
CREATE POLICY "anon_delete_quiz_questions" ON quiz_questions FOR DELETE TO anon, authenticated USING (true);

-- quiz_attempts
DROP POLICY IF EXISTS "anon_select_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_select_quiz_attempts" ON quiz_attempts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_insert_quiz_attempts" ON quiz_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_update_quiz_attempts" ON quiz_attempts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_quiz_attempts" ON quiz_attempts;
CREATE POLICY "anon_delete_quiz_attempts" ON quiz_attempts FOR DELETE TO anon, authenticated USING (true);

-- activity_log
DROP POLICY IF EXISTS "anon_select_activity_log" ON activity_log;
CREATE POLICY "anon_select_activity_log" ON activity_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_activity_log" ON activity_log;
CREATE POLICY "anon_insert_activity_log" ON activity_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_activity_log" ON activity_log;
CREATE POLICY "anon_update_activity_log" ON activity_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_activity_log" ON activity_log;
CREATE POLICY "anon_delete_activity_log" ON activity_log FOR DELETE TO anon, authenticated USING (true);