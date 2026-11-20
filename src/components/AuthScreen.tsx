import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/lib/types';
import { initialProfiles } from '@/lib/initialData';
import { sanitizeInput } from '@/lib/security';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Stethoscope,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Heart,
} from 'lucide-react';

interface AuthScreenProps {
  onAuthenticated: (profile: Profile) => void;
  darkMode: boolean;
}

export function AuthScreen({ onAuthenticated, darkMode }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialty, setSpecialty] = useState('Infectious Disease');
  const [role, setRole] = useState<Role>('doctor');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please provide both email and password.');
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid clinical email address.');
      return;
    }

    setLoading(true);

    try {
      // Execute real Supabase authentication
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (authError) {
        if (
          authError.message.toLowerCase().includes('fetch failed') ||
          authError.name === 'AuthRetryableFetchError' ||
          authError.status === 0
        ) {
          setError(
            'Unable to connect to the Supabase authentication server. You can use the Quick Demo Logins below to explore the clinical platform.'
          );
        } else if (authError.message.toLowerCase().includes('invalid login credentials')) {
          setError('Invalid login credentials. Please check your email and password.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (data.session && data.user) {
        const metadata = data.user.user_metadata || {};
        const userRole = (metadata.role as Role) || role;
        const profile: Profile = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          full_name: metadata.full_name || (userRole === 'doctor' ? 'Dr. ' : '') + cleanEmail.split('@')[0],
          role: userRole,
          specialty: metadata.specialty || (userRole === 'patient' ? 'Patient / Family' : 'General Medicine'),
          points: 100,
          avatar_color: userRole === 'patient' ? '#10b981' : userRole === 'admin' ? '#8b5cf6' : '#0ea5e9',
        };
        onAuthenticated(profile);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = sanitizeInput(email.trim());
    const cleanName = sanitizeInput(fullName.trim());
    const cleanSpecialty = sanitizeInput(specialty);

    if (!cleanName) {
      setError('Please enter your full name and clinical credentials.');
      return;
    }
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setError('Please enter a valid clinical email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
            specialty: cleanSpecialty,
            role: role,
          },
        },
      });

      if (signUpError) {
        if (
          signUpError.message.toLowerCase().includes('fetch failed') ||
          signUpError.name === 'AuthRetryableFetchError' ||
          signUpError.status === 0
        ) {
          setError(
            'Unable to contact Supabase registration server. Please verify network access or use demo login below.'
          );
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        if (data.session) {
          const profile: Profile = {
            id: data.user.id,
            email: cleanEmail,
            full_name: cleanName,
            role: role,
            specialty: cleanSpecialty,
            points: 100,
            avatar_color: role === 'patient' ? '#10b981' : role === 'admin' ? '#8b5cf6' : '#0ea5e9',
          };
          onAuthenticated(profile);
        } else {
          setSuccess('Account created successfully! Please sign in with your clinical credentials.');
          setMode('login');
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred during account creation.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (demoProf: Profile) => {
    try {
      localStorage.setItem('antisteward_demo_session', JSON.stringify(demoProf));
    } catch {
      /* ignore storage errors */
    }
    onAuthenticated(demoProf);
  };

  return (
    <div className={`auth-shell ${darkMode ? 'dark-theme' : ''}`}>
      <div className="auth-card fade-in">
        <div className="auth-brand">
          <div className="brand-mark large">
            <ShieldCheck size={28} />
          </div>
          <h2>AntiSteward AMS</h2>
          <p>AI Clinical Intelligence & Antimicrobial Stewardship Platform</p>
        </div>

        {/* Role Selection on Login Screen */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#526e82', marginBottom: '7px', textAlign: 'center' }}>
            SELECT TARGET PORTAL
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button
              type="button"
              aria-label="Select Doctor Portal"
              onClick={() => {
                setRole('doctor');
                if (mode === 'login') setEmail('sarah.chen@hospital.org');
              }}
              style={{
                border: role === 'doctor' ? '2px solid #0ea5a6' : '1px solid #dce8ee',
                background: role === 'doctor' ? '#f0fbfb' : '#fff',
                color: role === 'doctor' ? '#0b7b83' : '#647c8d',
                borderRadius: '8px',
                padding: '9px 4px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Stethoscope size={16} />
              <span>Doctor</span>
            </button>
            <button
              type="button"
              aria-label="Select Patient Portal"
              onClick={() => {
                setRole('patient');
                if (mode === 'login') setEmail('sofia.martinez@patient.org');
              }}
              style={{
                border: role === 'patient' ? '2px solid #10b981' : '1px solid #dce8ee',
                background: role === 'patient' ? '#f0faf4' : '#fff',
                color: role === 'patient' ? '#1b7d48' : '#647c8d',
                borderRadius: '8px',
                padding: '9px 4px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Heart size={16} />
              <span>Patient</span>
            </button>
            <button
              type="button"
              aria-label="Select Admin Portal"
              onClick={() => {
                setRole('admin');
                if (mode === 'login') setEmail('admin@hospital.org');
              }}
              style={{
                border: role === 'admin' ? '2px solid #8b5cf6' : '1px solid #dce8ee',
                background: role === 'admin' ? '#f7f4fd' : '#fff',
                color: role === 'admin' ? '#6834c8' : '#647c8d',
                borderRadius: '8px',
                padding: '9px 4px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <ShieldCheck size={16} />
              <span>Admin</span>
            </button>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
          >
            Register Account
          </button>
        </div>

        {error && (
          <div className="auth-alert error" role="alert" id="auth-error">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-alert success" role="status" id="auth-success">
            <CheckCircle2 size={17} />
            <span>{success}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="auth-form" noValidate={false}>
            <div>
              <label htmlFor="auth-email" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: '#526e82' }}>
                Clinical Email Address
              </label>
              <div className="input-group">
                <Mail size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  aria-required="true"
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? 'auth-error' : undefined}
                  placeholder={
                    role === 'doctor'
                      ? 'sarah.chen@hospital.org'
                      : role === 'patient'
                      ? 'sofia.martinez@patient.org'
                      : 'admin@hospital.org'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label htmlFor="auth-password" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: '#526e82' }}>
                Password
              </label>
              <div className="input-group">
                <Lock size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  aria-required="true"
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby={error ? 'auth-error' : undefined}
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="primary-button auth-submit" disabled={loading} style={{ marginTop: '16px' }}>
              {loading ? (
                <>
                  <span className="mini-spinner" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In to {role === 'doctor' ? 'Doctor' : role === 'patient' ? 'Patient' : 'Admin'} Portal <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="auth-form" noValidate={false}>
            <div>
              <label htmlFor="reg-fullname" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: '#526e82' }}>
                Full Name
              </label>
              <div className="input-group">
                <User size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  aria-required="true"
                  placeholder={role === 'doctor' ? 'Dr. Sarah Chen, MD' : role === 'patient' ? 'Sofia Martinez' : 'Dr. Robert Thompson'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="form-grid" style={{ marginTop: '12px' }}>
              <div>
                <label htmlFor="reg-role" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: '#526e82' }}>
                  Portal Role
                </label>
                <select id="reg-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="doctor">Doctor / Prescriber</option>
                  <option value="patient">Patient / Family</option>
                  <option value="admin">Stewardship Admin</option>
                </select>
              </div>

              <div>
                <label htmlFor="reg-specialty" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: '#526e82' }}>
                  Specialty / Department
                </label>
                <select id="reg-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                  {role === 'patient' ? (
                    <>
                      <option value="Patient / Family">Inpatient Care</option>
                      <option value="Outpatient Follow-up">Outpatient Follow-up</option>
                    </>
                  ) : (
                    <>
                      <option value="Infectious Disease">Infectious Disease</option>
                      <option value="Internal Medicine">Internal Medicine</option>
                      <option value="Critical Care (ICU)">Critical Care (ICU)</option>
                      <option value="Clinical Microbiology">Clinical Microbiology</option>
                      <option value="Clinical Pharmacy">Clinical Pharmacy</option>
                      <option value="General Surgery">General Surgery</option>
                      <option value="Emergency Medicine">Emergency Medicine</option>
                      <option value="Stewardship Director">Stewardship Director</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label htmlFor="reg-email" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: '#526e82' }}>
                Email Address
              </label>
              <div className="input-group">
                <Mail size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  aria-required="true"
                  placeholder="name@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label htmlFor="reg-password" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: '#526e82' }}>
                Password (min. 6 characters)
              </label>
              <div className="input-group">
                <Lock size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  aria-required="true"
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label htmlFor="reg-confirm-password" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: '#526e82' }}>
                Confirm Password
              </label>
              <div className="input-group">
                <Lock size={16} className="input-icon" aria-hidden="true" />
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  aria-required="true"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="primary-button auth-submit" disabled={loading} style={{ marginTop: '16px' }}>
              {loading ? (
                <>
                  <span className="mini-spinner" /> Creating Account...
                </>
              ) : (
                <>
                  Register {role === 'doctor' ? 'Clinician' : role === 'patient' ? 'Patient' : 'Administrator'} <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="auth-divider">
          <span>Quick Evaluation Demo Logins</span>
        </div>

        <div className="demo-accounts">
          <button
            type="button"
            className="demo-account-card"
            onClick={() => loginAsDemo(initialProfiles[0])}
            aria-label="Demo login as Dr. Sarah Chen, Doctor"
          >
            <div className="demo-avatar" style={{ background: initialProfiles[0].avatar_color }}>
              SC
            </div>
            <div>
              <strong>Dr. Sarah Chen (Doctor)</strong>
              <span>Infectious Disease Specialist · Doctor Portal Demo</span>
            </div>
            <Stethoscope size={16} className="demo-icon" />
          </button>

          <button
            type="button"
            className="demo-account-card"
            onClick={() => loginAsDemo(initialProfiles[2])}
            aria-label="Demo login as Sofia Martinez, Patient"
          >
            <div className="demo-avatar" style={{ background: initialProfiles[2].avatar_color }}>
              SM
            </div>
            <div>
              <strong>Sofia Martinez (Patient)</strong>
              <span>MRN-88412 · Patient Portal Demo</span>
            </div>
            <Heart size={16} style={{ color: '#10b981', flexShrink: 0 }} />
          </button>

          <button
            type="button"
            className="demo-account-card"
            onClick={() => loginAsDemo(initialProfiles[1])}
            aria-label="Demo login as Dr. Robert Thompson, Admin"
          >
            <div className="demo-avatar" style={{ background: initialProfiles[1].avatar_color }}>
              RT
            </div>
            <div>
              <strong>Dr. Robert Thompson (Admin)</strong>
              <span>Stewardship Committee Director · Admin Portal Demo</span>
            </div>
            <ShieldCheck size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
          </button>
        </div>

        <div className="auth-footer-notice">
          <Sparkles size={14} />
          <span>Real Supabase authentication is active with secure token management.</span>
        </div>
      </div>
    </div>
  );
}

