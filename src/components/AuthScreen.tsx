import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/lib/types';
import { initialProfiles } from '@/lib/initialData';
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
        // Check for common auth error responses
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
        const profile: Profile = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          full_name: metadata.full_name || 'Dr. ' + cleanEmail.split('@')[0],
          role: (metadata.role as Role) || 'doctor',
          specialty: metadata.specialty || 'General Medicine',
          points: 100,
          avatar_color: '#0ea5e9',
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

    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    if (!cleanName) {
      setError('Please enter your full name and medical credentials.');
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
      // Execute real Supabase registration
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
            specialty: specialty,
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
          // Direct login after signup (email confirmation disabled)
          const profile: Profile = {
            id: data.user.id,
            email: cleanEmail,
            full_name: cleanName,
            role: role,
            specialty: specialty,
            points: 100,
            avatar_color: '#10b981',
          };
          onAuthenticated(profile);
        } else {
          // Email confirmation required
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
          <h2>AntiSteward</h2>
          <p>AI Clinical Intelligence & Antimicrobial Stewardship Platform</p>
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
            Register Clinician
          </button>
        </div>

        {error && (
          <div className="auth-alert error">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-alert success">
            <CheckCircle2 size={17} />
            <span>{success}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="auth-form">
            <label>
              Clinical Email
              <div className="input-group">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  required
                  placeholder="name@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </label>

            <label>
              Password
              <div className="input-group">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
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
            </label>

            <button type="submit" className="primary-button auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="mini-spinner" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In to Workspace <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="auth-form">
            <label>
              Full Name & Title
              <div className="input-group">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  required
                  placeholder="Dr. Sarah Chen, MD"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </label>

            <div className="form-grid">
              <label>
                Role
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="doctor">Doctor / Prescriber</option>
                  <option value="admin">Stewardship Admin</option>
                </select>
              </label>

              <label>
                Medical Specialty
                <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                  <option value="Infectious Disease">Infectious Disease</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Critical Care (ICU)">Critical Care (ICU)</option>
                  <option value="Pulmonology">Pulmonology</option>
                  <option value="Clinical Microbiology">Clinical Microbiology</option>
                  <option value="Clinical Pharmacy">Clinical Pharmacy</option>
                  <option value="General Surgery">General Surgery</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                </select>
              </label>
            </div>

            <label>
              Hospital Email
              <div className="input-group">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  required
                  placeholder="doctor@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </label>

            <label>
              Password (min. 6 characters)
              <div className="input-group">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
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
            </label>

            <label>
              Confirm Password
              <div className="input-group">
                <Lock size={16} className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
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
            </label>

            <button type="submit" className="primary-button auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="mini-spinner" /> Creating Account...
                </>
              ) : (
                <>
                  Register Account <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="auth-divider">
          <span>Or access clinical evaluation mode</span>
        </div>

        <div className="demo-accounts">
          <button
            type="button"
            className="demo-account-card"
            onClick={() => loginAsDemo(initialProfiles[0])}
          >
            <div className="demo-avatar" style={{ background: initialProfiles[0].avatar_color }}>
              SC
            </div>
            <div>
              <strong>Dr. Sarah Chen (Doctor)</strong>
              <span>Infectious Disease Specialist · Demo Profile</span>
            </div>
            <Stethoscope size={16} className="demo-icon" />
          </button>

          <button
            type="button"
            className="demo-account-card"
            onClick={() => loginAsDemo(initialProfiles[1])}
          >
            <div className="demo-avatar" style={{ background: initialProfiles[1].avatar_color }}>
              RT
            </div>
            <div>
              <strong>Dr. Robert Thompson (Admin)</strong>
              <span>Stewardship Committee Director · Demo Profile</span>
            </div>
            <ShieldCheck size={16} className="demo-icon" />
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
