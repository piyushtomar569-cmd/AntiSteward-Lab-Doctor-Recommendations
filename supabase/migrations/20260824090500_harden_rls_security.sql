/*
# Security Hardening Migration: AntiSteward AMS Platform
# Resolves Critical Vulnerability SEC-01 (Permissive Row-Level Security)
# Updates role constraints to support 'doctor', 'patient', and 'admin'.
# Eliminates anonymous DELETE, UPDATE, and INSERT access.
# Enforces Least Privilege and Role-Based Access Control (RBAC).
*/

-- 1. Update profiles table constraint to support 'patient' role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('doctor', 'patient', 'admin'));

-- 2. Revoke and Drop Insecure Anonymous Policies
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;

DROP POLICY IF EXISTS "anon_delete_patients" ON patients;
DROP POLICY IF EXISTS "anon_update_patients" ON patients;
DROP POLICY IF EXISTS "anon_insert_patients" ON patients;
DROP POLICY IF EXISTS "anon_select_patients" ON patients;

DROP POLICY IF EXISTS "anon_delete_prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "anon_update_prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "anon_insert_prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "anon_select_prescriptions" ON prescriptions;

DROP POLICY IF EXISTS "anon_delete_case_reviews" ON case_reviews;
DROP POLICY IF EXISTS "anon_update_case_reviews" ON case_reviews;
DROP POLICY IF EXISTS "anon_insert_case_reviews" ON case_reviews;
DROP POLICY IF EXISTS "anon_select_case_reviews" ON case_reviews;

DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;

-- 3. Hardened Profiles Policies
CREATE POLICY "authenticated_select_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR (auth.jwt()->>'role') = 'admin')
  WITH CHECK (auth.uid() = id OR (auth.jwt()->>'role') = 'admin');

CREATE POLICY "admin_delete_profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role') = 'admin');

-- 4. Hardened Patients Policies
CREATE POLICY "clinical_and_self_select_patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') IN ('doctor', 'admin')
    OR auth.uid() = id
  );

CREATE POLICY "clinical_insert_patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role') IN ('doctor', 'admin'));

CREATE POLICY "clinical_update_patients"
  ON patients FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role') IN ('doctor', 'admin'))
  WITH CHECK ((auth.jwt()->>'role') IN ('doctor', 'admin'));

CREATE POLICY "admin_delete_patients"
  ON patients FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role') = 'admin');

-- 5. Hardened Prescriptions Policies
CREATE POLICY "clinical_and_patient_select_prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'role') IN ('doctor', 'admin')
    OR patient_id = auth.uid()
  );

CREATE POLICY "clinical_insert_prescriptions"
  ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role') IN ('doctor', 'admin'));

CREATE POLICY "clinical_update_prescriptions"
  ON prescriptions FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role') IN ('doctor', 'admin'))
  WITH CHECK ((auth.jwt()->>'role') IN ('doctor', 'admin'));

CREATE POLICY "admin_delete_prescriptions"
  ON prescriptions FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role') = 'admin');

-- 6. Hardened Case Reviews Policies
CREATE POLICY "clinical_select_case_reviews"
  ON case_reviews FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role') IN ('doctor', 'admin'));

CREATE POLICY "clinical_insert_case_reviews"
  ON case_reviews FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt()->>'role') IN ('doctor', 'admin'));

CREATE POLICY "clinical_update_case_reviews"
  ON case_reviews FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role') IN ('doctor', 'admin'))
  WITH CHECK ((auth.jwt()->>'role') IN ('doctor', 'admin'));

CREATE POLICY "admin_delete_case_reviews"
  ON case_reviews FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role') = 'admin');

-- 7. Hardened Clinical Alerts Policies
CREATE POLICY "clinical_select_alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role') IN ('doctor', 'admin'));

CREATE POLICY "clinical_update_alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING ((auth.jwt()->>'role') IN ('doctor', 'admin'))
  WITH CHECK ((auth.jwt()->>'role') IN ('doctor', 'admin'));

CREATE POLICY "admin_delete_alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING ((auth.jwt()->>'role') = 'admin');
